import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';

const OFFER_INCLUDE = {
  product: {
    select: { name: true, external_sku: true, category: true, brand: true },
  },
  _count: {
    select: {
      orders: {
        where: {
          status: { in: ['RESERVEE', 'EN_PREPARATION', 'PRETE'] as string[] },
        },
      },
    },
  },
};

export interface CreateOfferDto {
  product_id: string;
  action_id?: string;
  discounted_price: number;
  quantity_offered: number;
  expires_at?: Date;
}

@Injectable()
export class OfferService {
  constructor() {}

  async create(pharmacyId: string, dto: CreateOfferDto) {
    const product = await prisma.product.findFirst({
      where: { product_id: dto.product_id, pharmacy_id: pharmacyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.quantity_offered > product.stock_quantity) {
      throw new BadRequestException('quantity_offered exceeds stock_quantity');
    }

    // One active offer per product
    const existing = await prisma.offer.findFirst({
      where: { product_id: dto.product_id, status: 'ACTIVE' },
    });
    if (existing) {
      throw new BadRequestException(
        'An active offer already exists for this product'
      );
    }

    return prisma.offer.create({
      data: {
        pharmacy_id: pharmacyId,
        product_id: dto.product_id,
        action_id: dto.action_id,
        discounted_price: dto.discounted_price,
        quantity_offered: dto.quantity_offered,
        expires_at: dto.expires_at,
      },
      include: OFFER_INCLUDE,
    });
  }

  async findAllForPharmacy(pharmacyId: string, status?: string) {
    return prisma.offer.findMany({
      where: {
        pharmacy_id: pharmacyId,
        ...(status ? { status } : {}),
      },
      include: {
        product: {
          select: {
            name: true,
            external_sku: true,
            category: true,
            brand: true,
          },
        },
        _count: {
          select: {
            orders: {
              where: {
                status: { in: ['RESERVEE', 'EN_PREPARATION', 'PRETE'] },
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Catalogue public authentifié pour le mobile Customer */
  async findActiveForCustomer(pharmacyId: string) {
    const offers = await prisma.offer.findMany({
      where: { pharmacy_id: pharmacyId, status: 'ACTIVE' },
      include: {
        product: {
          select: { name: true, category: true, brand: true, unit_price: true },
        },
        pharmacy: { select: { name: true, address: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Compute available quantity = quantity_offered - active holds
    return Promise.all(
      offers.map(async (offer) => {
        const holds = await prisma.order.aggregate({
          where: {
            offer_id: offer.offer_id,
            status: { in: ['RESERVEE', 'EN_PREPARATION', 'PRETE'] },
          },
          _sum: { quantity: true },
        });
        const reserved = holds._sum.quantity ?? 0;
        return {
          ...offer,
          available_quantity: offer.quantity_offered - reserved,
        };
      })
    );
  }

  async suspend(pharmacyId: string, offerId: string) {
    return this.updateStatus(pharmacyId, offerId, 'ACTIVE', 'SUSPENDUE');
  }

  async resume(pharmacyId: string, offerId: string) {
    return this.updateStatus(pharmacyId, offerId, 'SUSPENDUE', 'ACTIVE');
  }

  async terminate(pharmacyId: string, offerId: string) {
    await this.findOwned(pharmacyId, offerId);
    // Cancel all active orders on this offer
    await prisma.order.updateMany({
      where: {
        offer_id: offerId,
        status: { in: ['RESERVEE', 'EN_PREPARATION'] },
      },
      data: { status: 'ANNULEE', cancelled_at: new Date() },
    });
    return prisma.offer.update({
      where: { offer_id: offerId },
      data: { status: 'TERMINEE' },
      include: OFFER_INCLUDE,
    });
  }

  private async findOwned(pharmacyId: string, offerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { offer_id: offerId },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your offer');
    return offer;
  }

  private async updateStatus(
    pharmacyId: string,
    offerId: string,
    from: string,
    to: string
  ) {
    const offer = await this.findOwned(pharmacyId, offerId);
    if (offer.status !== from) {
      throw new BadRequestException(
        `Offer status must be ${from} to transition to ${to}`
      );
    }
    return prisma.offer.update({
      where: { offer_id: offerId },
      data: { status: to },
      include: OFFER_INCLUDE,
    });
  }
}
