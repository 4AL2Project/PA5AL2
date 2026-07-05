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
import { deleteUploadByUrl } from '../../core/uploads';
import { prisma } from '../../database/client';
import { CategoryService } from '../category/category.service';

const ACTIVE_HOLD_STATUSES = ['RESERVEE', 'EN_PREPARATION', 'PRETE'] as const;

const CATEGORY_SELECT = {
  select: { category_id: true, name: true, slug: true },
} as const;

const OFFER_INCLUDE = {
  product: {
    select: { name: true, external_sku: true, category: true, brand: true },
  },
  categories: CATEGORY_SELECT,
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
  categories: CATEGORY_SELECT,
  pharmacy: { select: { name: true, address: true, lat: true, lng: true } },
};

// Vue détaillée côté Titulaire (page de gestion d'une offre)
const OFFER_MANAGE_INCLUDE = {
  product: {
    select: {
      name: true,
      external_sku: true,
      category: true,
      brand: true,
      unit_price: true,
      stock_quantity: true,
    },
  },
  categories: CATEGORY_SELECT,
  images: { orderBy: { position: 'asc' as const } },
  _count: {
    select: {
      orders: { where: { status: { in: [...ACTIVE_HOLD_STATUSES] } } },
    },
  },
};

export interface CreateOfferDto {
  product_id: string;
  action_id?: string;
  description?: string;
  category_ids?: string[];
  discounted_price: number;
  quantity_offered: number;
  expires_at?: Date;
}

export interface UpdateOfferDto {
  description?: string | null;
  category_ids?: string[];
  discounted_price?: number;
  quantity_offered?: number;
  expires_at?: Date | null;
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

  constructor(private readonly categoryService: CategoryService) {}

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

    // Catégories : sélection du Titulaire, ou repli "Autres" si aucune fournie.
    const requestedIds = dto.category_ids ?? [];
    await this.categoryService.assertVisibleIds(pharmacyId, requestedIds);
    const categoryIds =
      requestedIds.length > 0
        ? [...new Set(requestedIds)]
        : [await this.categoryService.getFallbackCategoryId()];

    const offer = await prisma.offer.create({
      data: {
        pharmacy_id: pharmacyId,
        product_id: dto.product_id,
        action_id: dto.action_id,
        description: dto.description,
        discounted_price: dto.discounted_price,
        quantity_offered: dto.quantity_offered,
        expires_at: dto.expires_at,
        categories: {
          connect: categoryIds.map((category_id) => ({ category_id })),
        },
      },
      include: OFFER_INCLUDE,
    });
    this.logger.log(
      `[${pharmacyId}] Offer created: product=${dto.product_id}, qty=${dto.quantity_offered}, price=${dto.discounted_price}, categories=${categoryIds.length} → offer_id=${offer.offer_id}`
    );
    return offer;
  }

  async findAllForPharmacy(pharmacyId: string, status?: string) {
    return prisma.offer.findMany({
      where: { pharmacy_id: pharmacyId, ...(status ? { status } : {}) },
      include: OFFER_INCLUDE,
      orderBy: { created_at: 'desc' },
    });
  }

  /** Détail d'une offre pour le Titulaire (page de gestion) */
  async findOneForPharmacy(pharmacyId: string, offerId: string) {
    const offer = await prisma.offer.findUnique({
      where: { offer_id: offerId },
      include: OFFER_MANAGE_INCLUDE,
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.pharmacy_id !== pharmacyId)
      throw new ForbiddenException('Not your offer');

    const holds = await prisma.order.aggregate({
      where: { offer_id: offerId, status: { in: [...ACTIVE_HOLD_STATUSES] } },
      _sum: { quantity: true },
    });
    const reserved = holds._sum.quantity ?? 0;

    return { ...offer, reserved_quantity: reserved };
  }

  /** Modification des informations d'une offre (prix, quantité, expiration) */
  async update(pharmacyId: string, offerId: string, dto: UpdateOfferDto) {
    const offer = await this.findOwned(pharmacyId, offerId);
    if (offer.status === 'TERMINEE') {
      throw new BadRequestException('Cannot edit a terminated offer');
    }

    if (dto.discounted_price != null && dto.discounted_price <= 0) {
      throw new BadRequestException('discounted_price must be greater than 0');
    }

    if (dto.quantity_offered != null) {
      if (dto.quantity_offered <= 0) {
        throw new BadRequestException(
          'quantity_offered must be greater than 0'
        );
      }
      const product = await prisma.product.findUnique({
        where: { product_id: offer.product_id },
        select: { stock_quantity: true },
      });
      if (product && dto.quantity_offered > product.stock_quantity) {
        throw new BadRequestException(
          'quantity_offered exceeds stock_quantity'
        );
      }
    }

    // Remplacement complet du jeu de catégories si fourni (set).
    let categoriesData:
      | { set: { category_id: string }[] }
      | undefined;
    if (dto.category_ids !== undefined) {
      const unique = [...new Set(dto.category_ids)];
      await this.categoryService.assertVisibleIds(pharmacyId, unique);
      categoriesData = {
        set: unique.map((category_id) => ({ category_id })),
      };
    }

    this.logger.log(`[${pharmacyId}] Offer ${offerId} updated`);
    return prisma.offer.update({
      where: { offer_id: offerId },
      data: {
        ...(dto.discounted_price != null
          ? { discounted_price: dto.discounted_price }
          : {}),
        ...(dto.quantity_offered != null
          ? { quantity_offered: dto.quantity_offered }
          : {}),
        ...(dto.expires_at !== undefined ? { expires_at: dto.expires_at } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(categoriesData ? { categories: categoriesData } : {}),
      },
      include: OFFER_MANAGE_INCLUDE,
    });
  }

  /** Ajoute une ou plusieurs images produit à une offre (append, ordonnées) */
  async addImages(pharmacyId: string, offerId: string, urls: string[]) {
    await this.findOwned(pharmacyId, offerId);

    const last = await prisma.offerImage.findFirst({
      where: { offer_id: offerId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const start = (last?.position ?? -1) + 1;

    await prisma.offerImage.createMany({
      data: urls.map((url, i) => ({
        offer_id: offerId,
        url,
        position: start + i,
      })),
    });
    this.logger.log(
      `[${pharmacyId}] Offer ${offerId}: +${urls.length} image(s)`
    );
    return this.findOneForPharmacy(pharmacyId, offerId);
  }

  /** Supprime une image d'une offre (et le fichier associé, best-effort) */
  async removeImage(pharmacyId: string, offerId: string, imageId: string) {
    await this.findOwned(pharmacyId, offerId);

    const image = await prisma.offerImage.findUnique({
      where: { image_id: imageId },
    });
    if (!image || image.offer_id !== offerId) {
      throw new NotFoundException('Image not found');
    }

    await prisma.offerImage.delete({ where: { image_id: imageId } });
    deleteUploadByUrl(image.url);
    this.logger.log(
      `[${pharmacyId}] Offer ${offerId}: image ${imageId} removed`
    );
    return this.findOneForPharmacy(pharmacyId, offerId);
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
        // Filtre catégorie côté catalogue mobile : sur les catégories de
        // l'Offer (référentiel global), et non plus sur product.category.
        ...(category
          ? {
              categories: {
                some: {
                  OR: [{ slug: category }, { category_id: category }],
                },
              },
            }
          : {}),
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
          categories: (offer as { categories?: unknown }).categories ?? [],
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
