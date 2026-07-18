// Règles métier Offer B2C côté Titulaire :
//  - la quantité proposée est verrouillée dès qu'une réservation est en cours ;
//  - une offre avec réservation en cours ne peut pas être suspendue.
import { BadRequestException } from '@nestjs/common';

import { StorageService } from '../../core/storage/storage.service';
import { CategoryService } from '../category/category.service';
import { OfferService } from './offer.service';

jest.mock('../../database/client', () => ({
  prisma: {
    offer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: { findUnique: jest.fn() },
    orderLine: { groupBy: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    offer: { findUnique: jest.Mock; update: jest.Mock };
    product: { findUnique: jest.Mock };
    orderLine: { groupBy: jest.Mock };
  };
};

const PHARMACY_ID = 'pharma-uuid-1';
const OFFER_ID = 'offer-uuid-1';

function makeOffer(overrides: Record<string, unknown> = {}) {
  return {
    offer_id: OFFER_ID,
    pharmacy_id: PHARMACY_ID,
    product_id: 'product-uuid-1',
    status: 'ACTIVE',
    quantity_offered: 10,
    ...overrides,
  };
}

/** Simule le résultat de getActiveHolds (groupBy) pour N réservations actives. */
function mockActiveReservations(count: number, quantity = count) {
  prisma.orderLine.groupBy.mockResolvedValue(
    count > 0
      ? [{ offer_id: OFFER_ID, _sum: { quantity }, _count: { _all: count } }]
      : []
  );
}

describe('OfferService — verrouillage quantité (réservations en cours)', () => {
  let service: OfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OfferService(
      {} as unknown as CategoryService,
      {} as unknown as StorageService
    );
    prisma.offer.findUnique.mockResolvedValue(makeOffer());
    prisma.product.findUnique.mockResolvedValue({ stock_quantity: 50 });
    prisma.offer.update.mockResolvedValue(makeOffer({ quantity_offered: 8 }));
  });

  it('refuse de modifier la quantité proposée quand une réservation est en cours', async () => {
    mockActiveReservations(2);
    await expect(
      service.update(PHARMACY_ID, OFFER_ID, { quantity_offered: 8 })
    ).rejects.toThrow(BadRequestException);
    expect(prisma.offer.update).not.toHaveBeenCalled();
  });

  it('autorise la modification de la quantité quand aucune réservation', async () => {
    mockActiveReservations(0);
    await expect(
      service.update(PHARMACY_ID, OFFER_ID, { quantity_offered: 8 })
    ).resolves.toBeDefined();
    expect(prisma.offer.update).toHaveBeenCalled();
  });

  it('autorise la modification du prix seul même avec une réservation en cours', async () => {
    mockActiveReservations(2);
    await expect(
      service.update(PHARMACY_ID, OFFER_ID, { discounted_price: 9.9 })
    ).resolves.toBeDefined();
    expect(prisma.offer.update).toHaveBeenCalled();
  });
});

describe('OfferService — suspension (réservations en cours)', () => {
  let service: OfferService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OfferService(
      {} as unknown as CategoryService,
      {} as unknown as StorageService
    );
    prisma.offer.findUnique.mockResolvedValue(makeOffer());
    prisma.offer.update.mockResolvedValue(makeOffer({ status: 'SUSPENDUE' }));
  });

  it('refuse de suspendre une offre avec une réservation en cours', async () => {
    mockActiveReservations(1);
    await expect(service.suspend(PHARMACY_ID, OFFER_ID)).rejects.toThrow(
      BadRequestException
    );
    expect(prisma.offer.update).not.toHaveBeenCalled();
  });

  it('suspend l offre quand aucune réservation en cours', async () => {
    mockActiveReservations(0);
    await service.suspend(PHARMACY_ID, OFFER_ID);
    expect(prisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUSPENDUE' }),
      })
    );
  });
});
