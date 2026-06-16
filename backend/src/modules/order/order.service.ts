import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';
import {
  INotificationService,
  NOTIFICATION_SERVICE,
} from '../notification/notification.interface';

const HOLD_DURATION_HOURS = 24;

const ACTIVE_STATUSES = ['RESERVEE', 'EN_PREPARATION', 'PRETE'] as const;
type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: INotificationService
  ) {}

  async createOrder(customerId: string, offerId: string, quantity: number) {
    const offer = await prisma.offer.findUnique({
      where: { offer_id: offerId },
      include: {
        product: { select: { name: true } },
        pharmacy: { select: { name: true } },
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'ACTIVE')
      throw new BadRequestException('Offer is not active');

    // Compute available quantity
    const holds = await prisma.order.aggregate({
      where: { offer_id: offerId, status: { in: [...ACTIVE_STATUSES] } },
      _sum: { quantity: true },
    });
    const reserved = holds._sum.quantity ?? 0;
    const available = offer.quantity_offered - reserved;
    if (quantity > available) {
      throw new BadRequestException(`Only ${available} unit(s) available`);
    }

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { customer_id: customerId },
      select: { email: true, first_name: true, last_name: true },
    });

    const expiresAt = new Date(
      Date.now() + HOLD_DURATION_HOURS * 60 * 60 * 1000
    );

    const order = await prisma.order.create({
      data: {
        customer_id: customerId,
        offer_id: offerId,
        pharmacy_id: offer.pharmacy_id,
        quantity,
        expires_at: expiresAt,
      },
    });

    const notifPayload = {
      order_id: order.order_id,
      customer_email: customer.email,
      customer_name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' '),
      product_name: offer.product.name,
      pharmacy_name: offer.pharmacy.name,
      quantity,
      qr_code: order.qr_code,
    };

    await Promise.all([
      this.notifications.orderConfirmed(notifPayload),
      this.notifications.newOrderForPrep(notifPayload),
    ]);

    this.logger.log(
      `[${offer.pharmacy_id}] Order created: offer=${offerId}, customer=${customerId}, qty=${quantity} → order_id=${order.order_id}`
    );

    return order;
  }

  async findOrdersForPharmacy(pharmacyId: string, status?: string) {
    return prisma.order.findMany({
      where: {
        pharmacy_id: pharmacyId,
        ...(status ? { status } : {}),
      },
      include: {
        customer: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
        offer: {
          include: {
            product: { select: { name: true, external_sku: true } },
          },
        },
      },
      orderBy: { reserved_at: 'desc' },
    });
  }

  async findOrdersForCustomer(customerId: string) {
    return prisma.order.findMany({
      where: { customer_id: customerId },
      include: {
        offer: {
          include: {
            product: { select: { name: true, category: true } },
            pharmacy: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { reserved_at: 'desc' },
    });
  }

  async findByQrCode(qrCode: string, pharmacyId: string) {
    const order = await prisma.order.findUnique({
      where: { qr_code: qrCode },
      include: {
        customer: {
          select: { email: true, first_name: true, last_name: true },
        },
        offer: { include: { product: { select: { name: true } } } },
      },
    });
    if (!order) throw new NotFoundException('QR code not found');
    if (order.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your order');
    return order;
  }

  /** Préparateur: RESERVEE → EN_PREPARATION */
  async startPreparation(pharmacyId: string, orderId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → EN_PREPARATION`);
    return this.transition(pharmacyId, orderId, 'RESERVEE', 'EN_PREPARATION', {
      prepared_at: new Date(),
    });
  }

  /** Préparateur: EN_PREPARATION → PRETE */
  async markReady(pharmacyId: string, orderId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → PRETE`);
    const order = await this.transition(
      pharmacyId,
      orderId,
      'EN_PREPARATION',
      'PRETE',
      { ready_at: new Date() }
    );

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { customer_id: order.customer_id },
      select: { email: true, first_name: true, last_name: true },
    });
    const offer = await prisma.offer.findUniqueOrThrow({
      where: { offer_id: order.offer_id },
      include: {
        product: { select: { name: true } },
        pharmacy: { select: { name: true } },
      },
    });

    await this.notifications.orderReady({
      order_id: order.order_id,
      customer_email: customer.email,
      customer_name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' '),
      product_name: offer.product.name,
      pharmacy_name: offer.pharmacy.name,
      quantity: order.quantity,
      qr_code: order.qr_code,
    });

    return order;
  }

  /** Préparateur: valide le retrait (scan QR) — décrémente le stock */
  async withdraw(pharmacyId: string, orderId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → RETIREE`);
    const order = await this.transition(
      pharmacyId,
      orderId,
      'PRETE',
      'RETIREE',
      {
        withdrawn_at: new Date(),
      }
    );

    // Decrement stock only at withdrawal
    const offer = await prisma.offer.findUniqueOrThrow({
      where: { offer_id: order.offer_id },
    });
    await prisma.product.update({
      where: { product_id: offer.product_id },
      data: { stock_quantity: { decrement: order.quantity } },
    });

    return order;
  }

  /** Customer ou Titulaire: annuler un Order */
  async cancel(
    orderId: string,
    requesterId: string,
    requesterType: 'customer' | 'pharmacy',
    pharmacyId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        customer: {
          select: { email: true, first_name: true, last_name: true },
        },
        offer: {
          include: {
            product: { select: { name: true } },
            pharmacy: { select: { name: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (requesterType === 'customer') {
      if (order.customer_id !== requesterId)
        throw new ForbiddenException('Not your order');
      if (!(['RESERVEE'] as string[]).includes(order.status)) {
        throw new BadRequestException(
          'Customer can only cancel orders in RESERVEE status'
        );
      }
    } else {
      if (order.pharmacy_id !== pharmacyId)
        throw new ForbiddenException('Not your order');
      if (
        (['RETIREE', 'ANNULEE', 'EXPIREE'] as string[]).includes(order.status)
      ) {
        throw new BadRequestException('Order is already in a terminal state');
      }
    }

    const updated = await prisma.order.update({
      where: { order_id: orderId },
      data: { status: 'ANNULEE', cancelled_at: new Date() },
    });

    this.logger.log(`[${orderId}] Order cancelled by ${requesterType}`);

    await this.notifications.orderCancelled(
      {
        order_id: order.order_id,
        customer_email: order.customer.email,
        customer_name: [order.customer.first_name, order.customer.last_name]
          .filter(Boolean)
          .join(' '),
        product_name: order.offer.product.name,
        pharmacy_name: order.offer.pharmacy.name,
        quantity: order.quantity,
      },
      requesterType === 'customer'
        ? 'Annulé par le client'
        : 'Annulé par la pharmacie'
    );

    return updated;
  }

  /** Cron horaire: expire les Orders dont expires_at est dépassé */
  async expireOverdueOrders(): Promise<number> {
    const now = new Date();
    const expired = await prisma.order.findMany({
      where: {
        status: { in: ['RESERVEE', 'EN_PREPARATION'] },
        expires_at: { lte: now },
      },
      include: {
        customer: {
          select: { email: true, first_name: true, last_name: true },
        },
        offer: {
          include: {
            product: { select: { name: true } },
            pharmacy: { select: { name: true } },
          },
        },
      },
    });

    if (expired.length === 0) return 0;

    this.logger.log(`Expiring ${expired.length} overdue order(s)`);

    await prisma.order.updateMany({
      where: {
        order_id: { in: expired.map((o) => o.order_id) },
      },
      data: { status: 'EXPIREE', cancelled_at: now },
    });

    await Promise.all(
      expired.map((order) =>
        this.notifications.orderCancelled(
          {
            order_id: order.order_id,
            customer_email: order.customer.email,
            customer_name: [order.customer.first_name, order.customer.last_name]
              .filter(Boolean)
              .join(' '),
            product_name: order.offer.product.name,
            pharmacy_name: order.offer.pharmacy.name,
            quantity: order.quantity,
          },
          'Réservation expirée (24h dépassées)'
        )
      )
    );

    return expired.length;
  }

  private async transition(
    pharmacyId: string,
    orderId: string,
    from: string,
    to: string,
    extra: Record<string, unknown> = {}
  ) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your order');
    if (order.status !== from) {
      throw new BadRequestException(
        `Order status must be ${from} to transition to ${to} (current: ${order.status})`
      );
    }
    return prisma.order.update({
      where: { order_id: orderId },
      data: { status: to, updated_at: new Date(), ...extra },
    });
  }
}
