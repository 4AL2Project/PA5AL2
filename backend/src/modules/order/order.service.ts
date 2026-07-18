import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';
import {
  INotificationService,
  NOTIFICATION_SERVICE,
  OrderLineSummary,
} from '../notification/notification.interface';

const HOLD_DURATION_HOURS = 24;

const ACTIVE_STATUSES = ['RESERVEE', 'EN_PREPARATION', 'PRETE'] as const;

const ORDER_LINE_INCLUDE = {
  lines: {
    include: {
      offer: {
        include: {
          product: { select: { name: true, external_sku: true } },
        },
      },
    },
  },
} as const;

// Ce que le mobile (Customer) a besoin d'afficher sur ses commandes : le nom du
// produit, sa marque, le prix de référence barré (product.unit_price) et la
// galerie d'images de l'offre.
const CUSTOMER_ORDER_LINE_INCLUDE = {
  offer: {
    include: {
      product: {
        select: {
          name: true,
          category: true,
          brand: true,
          unit_price: true,
        },
      },
      images: {
        orderBy: { position: 'asc' },
        select: { url: true, position: true },
      },
    },
  },
} as const;

export interface CheckoutLineDto {
  offer_id: string;
  quantity: number;
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: INotificationService
  ) {}

  /** Checkout atomique d'un panier multi-offres (une seule pharmacie) — tout ou rien. */
  async createOrder(customerId: string, lines: CheckoutLineDto[]) {
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Le panier est vide');
    }
    const offerIds = lines.map((l) => l.offer_id);
    if (new Set(offerIds).size !== offerIds.length) {
      throw new BadRequestException(
        'Une offre ne peut apparaître qu’une seule fois dans le panier'
      );
    }
    // Ordre déterministe : réduit le risque de deadlock entre deux paniers
    // concurrents qui se chevauchent sur les mêmes offres.
    const sortedOfferIds = [...offerIds].sort();
    const quantityByOffer = new Map(lines.map((l) => [l.offer_id, l.quantity]));

    const order = await this.runCheckoutTransaction(async (tx) => {
      const offers = await tx.offer.findMany({
        where: { offer_id: { in: sortedOfferIds } },
      });
      if (offers.length !== sortedOfferIds.length) {
        throw new NotFoundException(
          'Une ou plusieurs offres du panier sont introuvables'
        );
      }

      const pharmacyIds = new Set(offers.map((o) => o.pharmacy_id));
      if (pharmacyIds.size > 1) {
        throw new BadRequestException(
          'Toutes les offres d’un panier doivent venir de la même pharmacie'
        );
      }

      const holds = await tx.orderLine.groupBy({
        by: ['offer_id'],
        where: {
          offer_id: { in: sortedOfferIds },
          order: { status: { in: [...ACTIVE_STATUSES] } },
        },
        _sum: { quantity: true },
      });
      const reservedByOffer = new Map(
        holds.map((h) => [h.offer_id, h._sum.quantity ?? 0])
      );

      const unavailable = offers
        .map((offer) => {
          const requested = quantityByOffer.get(offer.offer_id)!;
          const reserved = reservedByOffer.get(offer.offer_id) ?? 0;
          const available =
            offer.status === 'ACTIVE' ? offer.quantity_offered - reserved : 0;
          return { offer_id: offer.offer_id, available, requested };
        })
        .filter((x) => x.requested > x.available);

      if (unavailable.length > 0) {
        throw new BadRequestException({
          message: 'Certaines offres du panier ne sont plus disponibles',
          unavailable: unavailable.map(({ offer_id, available }) => ({
            offer_id,
            available,
          })),
        });
      }

      const expiresAt = new Date(
        Date.now() + HOLD_DURATION_HOURS * 60 * 60 * 1000
      );

      return tx.order.create({
        data: {
          customer_id: customerId,
          pharmacy_id: offers[0].pharmacy_id,
          expires_at: expiresAt,
          lines: {
            create: offers.map((offer) => ({
              offer_id: offer.offer_id,
              quantity: quantityByOffer.get(offer.offer_id)!,
              unit_price_snapshot: offer.discounted_price,
            })),
          },
        },
        include: {
          pharmacy: { select: { name: true } },
          ...ORDER_LINE_INCLUDE,
        },
      });
    });

    const customer = await prisma.customer.findUniqueOrThrow({
      where: { customer_id: customerId },
      select: { email: true, first_name: true, last_name: true },
    });

    const lineSummaries: OrderLineSummary[] = order.lines.map((l) => ({
      product_name: l.offer.product.name,
      quantity: l.quantity,
    }));

    const notifPayload = {
      order_id: order.order_id,
      customer_id: customerId,
      pharmacy_id: order.pharmacy_id,
      customer_email: customer.email,
      customer_name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' '),
      pharmacy_name: order.pharmacy.name,
      lines: lineSummaries,
      qr_code: order.qr_code,
    };

    await Promise.all([
      this.notifications.orderConfirmed(notifPayload),
      this.notifications.newOrderForPrep(notifPayload),
    ]);

    this.logger.log(
      `[${order.pharmacy_id}] Order created: customer=${customerId}, lines=${order.lines.length} → order_id=${order.order_id}`
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
        ...ORDER_LINE_INCLUDE,
      },
      orderBy: { reserved_at: 'desc' },
    });
  }

  async findOrdersForCustomer(customerId: string) {
    return prisma.order.findMany({
      where: { customer_id: customerId },
      include: {
        pharmacy: { select: { name: true, address: true } },
        lines: { include: CUSTOMER_ORDER_LINE_INCLUDE },
      },
      orderBy: { reserved_at: 'desc' },
    });
  }

  /** Détail d'un Order pour le Customer — US-82 */
  async findOneForCustomer(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        pharmacy: { select: { name: true, address: true } },
        lines: { include: CUSTOMER_ORDER_LINE_INCLUDE },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customer_id !== customerId)
      throw new ForbiddenException('Not your order');

    return order;
  }

  /** Détail d'un Order pour la Pharmacie — US-82 */
  async findOneForPharmacy(orderId: string, pharmacyId: string) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        customer: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
        ...ORDER_LINE_INCLUDE,
        activities: {
          orderBy: { created_at: 'asc' },
          include: {
            actor: {
              select: { first_name: true, last_name: true, role: true },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your order');

    // Masquer qr_code côté pharmacie (confidentiel pour le client)
    const { qr_code: _qr, ...rest } = order;
    return rest;
  }

  async findByQrCode(qrCode: string, pharmacyId: string) {
    const order = await prisma.order.findUnique({
      where: { qr_code: qrCode },
      include: {
        customer: {
          select: { email: true, first_name: true, last_name: true },
        },
        ...ORDER_LINE_INCLUDE,
      },
    });
    if (!order) throw new NotFoundException('QR code not found');
    if (order.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your order');
    return order;
  }

  /** Préparateur: RESERVEE → EN_PREPARATION */
  async startPreparation(pharmacyId: string, orderId: string, actorId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → EN_PREPARATION`);
    return this.transition(
      pharmacyId,
      orderId,
      'RESERVEE',
      'EN_PREPARATION',
      { prepared_at: new Date() },
      actorId
    );
  }

  /** Préparateur: EN_PREPARATION → PRETE */
  async markReady(pharmacyId: string, orderId: string, actorId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → PRETE`);
    const order = await this.transition(
      pharmacyId,
      orderId,
      'EN_PREPARATION',
      'PRETE',
      { ready_at: new Date() },
      actorId
    );

    const { customer, lineSummaries, pharmacyName, qrCode } =
      await this.buildNotificationContext(order.order_id, order.customer_id);

    await this.notifications.orderReady({
      order_id: order.order_id,
      customer_id: order.customer_id,
      pharmacy_id: order.pharmacy_id,
      customer_email: customer.email,
      customer_name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(' '),
      pharmacy_name: pharmacyName,
      lines: lineSummaries,
      qr_code: qrCode,
    });

    return order;
  }

  /** Préparateur: valide le retrait (scan QR) — décrémente le stock de chaque ligne */
  async withdraw(pharmacyId: string, orderId: string, actorId: string) {
    this.logger.log(`[${pharmacyId}] Order ${orderId} → RETIREE`);
    const order = await this.transition(
      pharmacyId,
      orderId,
      'PRETE',
      'RETIREE',
      { withdrawn_at: new Date() },
      actorId
    );

    const lines = await prisma.orderLine.findMany({
      where: { order_id: order.order_id },
      select: { quantity: true, offer: { select: { product_id: true } } },
    });

    // Décrément stock uniquement au retrait, ligne par ligne
    await Promise.all(
      lines.map((line) =>
        prisma.product.update({
          where: { product_id: line.offer.product_id },
          data: { stock_quantity: { decrement: line.quantity } },
        })
      )
    );

    return order;
  }

  /** Customer ou Titulaire: annuler un Order */
  async cancel(
    orderId: string,
    requesterId: string,
    requesterType: 'customer' | 'pharmacy',
    pharmacyId?: string,
    actorId?: string
  ) {
    const order = await prisma.order.findUnique({
      where: { order_id: orderId },
      include: {
        customer: {
          select: { email: true, first_name: true, last_name: true },
        },
        pharmacy: { select: { name: true } },
        ...ORDER_LINE_INCLUDE,
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

    await this.logActivity(orderId, 'ANNULEE', actorId);

    this.logger.log(`[${orderId}] Order cancelled by ${requesterType}`);

    await this.notifications.orderCancelled(
      {
        order_id: order.order_id,
        customer_id: order.customer_id,
        pharmacy_id: order.pharmacy_id,
        customer_email: order.customer.email,
        customer_name: [order.customer.first_name, order.customer.last_name]
          .filter(Boolean)
          .join(' '),
        pharmacy_name: order.pharmacy.name,
        lines: order.lines.map((l) => ({
          product_name: l.offer.product.name,
          quantity: l.quantity,
        })),
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
        pharmacy: { select: { name: true } },
        ...ORDER_LINE_INCLUDE,
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

    await prisma.orderActivity.createMany({
      data: expired.map((order) => ({
        order_id: order.order_id,
        action: 'EXPIREE',
        actor_id: null,
      })),
    });

    await Promise.all(
      expired.map((order) =>
        this.notifications.orderCancelled(
          {
            order_id: order.order_id,
            customer_id: order.customer_id,
            pharmacy_id: order.pharmacy_id,
            customer_email: order.customer.email,
            customer_name: [order.customer.first_name, order.customer.last_name]
              .filter(Boolean)
              .join(' '),
            pharmacy_name: order.pharmacy.name,
            lines: order.lines.map((l) => ({
              product_name: l.offer.product.name,
              quantity: l.quantity,
            })),
          },
          'Réservation expirée (24h dépassées)'
        )
      )
    );

    return expired.length;
  }

  /** Reconstitue le contexte nécessaire à une notification à partir de l'order_id. */
  private async buildNotificationContext(orderId: string, customerId: string) {
    const [customer, order] = await Promise.all([
      prisma.customer.findUniqueOrThrow({
        where: { customer_id: customerId },
        select: { email: true, first_name: true, last_name: true },
      }),
      prisma.order.findUniqueOrThrow({
        where: { order_id: orderId },
        include: {
          pharmacy: { select: { name: true } },
          ...ORDER_LINE_INCLUDE,
        },
      }),
    ]);

    return {
      customer,
      pharmacyName: order.pharmacy.name,
      qrCode: order.qr_code,
      lineSummaries: order.lines.map((l) => ({
        product_name: l.offer.product.name,
        quantity: l.quantity,
      })) satisfies OrderLineSummary[],
    };
  }

  private async transition(
    pharmacyId: string,
    orderId: string,
    from: string,
    to: string,
    extra: Record<string, unknown> = {},
    actorId?: string
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
    const updated = await prisma.order.update({
      where: { order_id: orderId },
      data: { status: to, updated_at: new Date(), ...extra },
    });
    await this.logActivity(orderId, to, actorId);
    return updated;
  }

  private async logActivity(orderId: string, action: string, actorId?: string) {
    await prisma.orderActivity.create({
      data: { order_id: orderId, action, actor_id: actorId ?? null },
    });
  }

  /**
   * Exécute le checkout en isolation Serializable : Postgres détecte les
   * conflits d'écriture entre paniers concurrents sur les mêmes offres et
   * abandonne l'un des deux (P2034) plutôt que de laisser survendre le stock.
   * Un court retry absorbe les faux conflits ; au-delà, on redemande au client.
   */
  private async runCheckoutTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        });
      } catch (err) {
        const isConflict =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2034';
        if (!isConflict) throw err;
        if (attempt === MAX_ATTEMPTS) {
          throw new ConflictException(
            'Une autre réservation est en cours sur ces offres, merci de réessayer'
          );
        }
      }
    }
    throw new ConflictException('Réservation impossible, merci de réessayer');
  }
}
