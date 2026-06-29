// Gilles — v1.1
// US-80 : recherche géolocalisée + US-81 : détail offre (mobile)
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { haversineKm } from '../../core/geo.util';
import { prisma } from '../../database/client';

const ACTIVE_HOLD_STATUSES = ['RESERVEE', 'EN_PREPARATION', 'PRETE'] as const;

const OFFER_INCLUDE = {
  product: {
    select: { name: true, external_sku: true, category: true, brand: true },
  },
  _count: {
    select: {
      orders: {
        where: { status: { in: ACTIVE_HOLD_STATUSES as unknown as string[] } },
      },
    },
  },
};

const OFFER_CUSTOMER_INCLUDE = {
  product: {
    select: { name: true, category: true, brand: true, unit_price: true },
  },
  pharmacy: { select: { name: true, address: true, lat: true, lng: true } },
};

export interface CreateOfferDto {
  product_id: string;
  action_id?: string;
  discounted_price: number;
  quantity_offered: number;
  expires_at?: Date;
}

export interface GeoOfferQuery {
  lat: number;
  lng: number;
  radius?: number;
  category?: string;
  minDiscount?: number;
  maxDistance?: number;
  sortBy?: 'distance' | 'discount' | 'price';
}

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor() {}

  async create(pharmacyId: string, dto: CreateOfferDto) {
    const product = await prisma.product.findFirst({
      where: { product_id: dto.product_id, pharmacy_id: pharmacyId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (dto.quantity_offered > product.stock_quantity) {
      throw new BadRequestException('quantity_offered exceeds stock_quantity');
    }

    const existing = await prisma.offer.findFirst({
      where: { product_id: dto.product_id, status: 'ACTIVE' },
    });
    if (existing) {
      throw new BadRequestException(
        'An active offer already exists for this product'
      );
    }

    const offer = await prisma.offer.create({
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
    this.logger.log(
      `[${pharmacyId}] Offer created: product=${dto.product_id}, qty=${dto.quantity_offered}, price=${dto.discounted_price} → offer_id=${offer.offer_id}`
    );
    return offer;
  }

  async findAllForPharmacy(pharmacyId: string, status?: string) {
    return prisma.offer.findMany({
      where: { pharmacy_id: pharmacyId, ...(status ? { status } : {}) },
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
            orders: { where: { status: { in: [...ACTIVE_HOLD_STATUSES] } } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /** Catalogue mobile géolocalisé — US-80 */
  async searchNearby(query: GeoOfferQuery) {
    const {
      lat,
      lng,
      radius = 3,
      category,
      minDiscount,
      sortBy = 'distance',
    } = query;
    const maxDist = query.maxDistance ?? radius;

    const offers = await prisma.offer.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { product: { is: { category } } } : {}),
      },
      include: {
        ...OFFER_CUSTOMER_INCLUDE,
        _count: {
          select: {
            orders: { where: { status: { in: [...ACTIVE_HOLD_STATUSES] } } },
          },
        },
      },
    });

    const enriched = await Promise.all(
      offers.map(async (offer) => {
        const pharmacy = offer.pharmacy as {
          lat: number | null;
          lng: number | null;
          name: string;
          address: string;
        };
        if (pharmacy.lat == null || pharmacy.lng == null) return null;

        const distanceKm = haversineKm(lat, lng, pharmacy.lat, pharmacy.lng);
        if (distanceKm > maxDist) return null;

        const originalPrice = (offer.product as { unit_price: number })
          .unit_price;
        const discountPercent =
          originalPrice > 0
            ? Math.round(
                ((originalPrice - offer.discounted_price) / originalPrice) * 100
              )
            : 0;

        if (minDiscount != null && discountPercent < minDiscount) return null;

        const holds = await prisma.order.aggregate({
          where: {
            offer_id: offer.offer_id,
            status: { in: [...ACTIVE_HOLD_STATUSES] },
          },
          _sum: { quantity: true },
        });
        const reserved = holds._sum.quantity ?? 0;

        return {
          offer_id: offer.offer_id,
          product: offer.product,
          discounted_price: offer.discounted_price,
          original_price: originalPrice,
          discount_percent: discountPercent,
          available_quantity: offer.quantity_offered - reserved,
          distanceKm: Math.round(distanceKm * 10) / 10,
          pharmacy: {
            name: pharmacy.name,
            address: pharmacy.address,
            pharmacy_id: offer.pharmacy_id,
          },
          expires_at: offer.expires_at,
        };
      })
    );

    const filtered = enriched.filter(Boolean) as NonNullable<
      (typeof enriched)[number]
    >[];

    const sorted = filtered.sort((a, b) => {
      if (sortBy === 'discount') return b.discount_percent - a.discount_percent;
      if (sortBy === 'price') return a.discounted_price - b.discounted_price;
      return a.distanceKm - b.distanceKm;
    });

    return { total: sorted.length, offers: sorted };
  }

  /** Détail d'une offre active pour le Customer — US-81 */
  async findActiveById(offerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { offer_id: offerId },
      include: {
        ...OFFER_CUSTOMER_INCLUDE,
      },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'ACTIVE')
      throw new NotFoundException('Offer not available');

    const holds = await prisma.order.aggregate({
      where: { offer_id: offerId, status: { in: [...ACTIVE_HOLD_STATUSES] } },
      _sum: { quantity: true },
    });
    const reserved = holds._sum.quantity ?? 0;
    const originalPrice = (offer.product as { unit_price: number }).unit_price;

    return {
      ...offer,
      original_price: originalPrice,
      discount_percent:
        originalPrice > 0
          ? Math.round(
              ((originalPrice - offer.discounted_price) / originalPrice) * 100
            )
          : 0,
      available_quantity: offer.quantity_offered - reserved,
    };
  }

  /** Catalogue par pharmacie (endpoint hérité) */
  async findActiveForCustomer(pharmacyId: string) {
    const offers = await prisma.offer.findMany({
      where: { pharmacy_id: pharmacyId, status: 'ACTIVE' },
      include: OFFER_CUSTOMER_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    return Promise.all(
      offers.map(async (offer) => {
        const holds = await prisma.order.aggregate({
          where: {
            offer_id: offer.offer_id,
            status: { in: [...ACTIVE_HOLD_STATUSES] },
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
    this.logger.log(`[${pharmacyId}] Offer ${offerId} → SUSPENDUE`);
    return this.updateStatus(pharmacyId, offerId, 'ACTIVE', 'SUSPENDUE');
  }

  async resume(pharmacyId: string, offerId: string) {
    this.logger.log(`[${pharmacyId}] Offer ${offerId} → ACTIVE (resumed)`);
    return this.updateStatus(pharmacyId, offerId, 'SUSPENDUE', 'ACTIVE');
  }

  async terminate(pharmacyId: string, offerId: string) {
    await this.findOwned(pharmacyId, offerId);
    await prisma.order.updateMany({
      where: {
        offer_id: offerId,
        status: { in: ['RESERVEE', 'EN_PREPARATION'] },
      },
      data: { status: 'ANNULEE', cancelled_at: new Date() },
    });
    this.logger.log(`[${pharmacyId}] Offer ${offerId} → TERMINEE`);
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
