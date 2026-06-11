// Roger — v1
// Tests unitaires DonationsService.getBilan (US-21)

import { DonationsService } from './donations.service';

jest.mock('../../database/client', () => ({
  prisma: {
    product: { findFirst: jest.fn() },
    association: { findUnique: jest.fn() },
    donation: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    donation: {
      findMany: jest.Mock;
    };
  };
};

const PHARMACY_ID = 'pharma-uuid';

function makeDonation(
  status: string,
  association_id: string,
  product_id: string,
  estimated_value: number
) {
  return { status, association_id, product_id, estimated_value };
}

describe('DonationsService — getBilan (US-21)', () => {
  let service: DonationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationsService();
  });

  it('retourne des zéros quand aucun don', async () => {
    prisma.donation.findMany.mockResolvedValue([]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_donations).toBe(0);
    expect(bilan.total_withdrawn).toBe(0);
    expect(bilan.total_value_donated).toBe(0);
    expect(bilan.total_associations).toBe(0);
    expect(bilan.total_products_donated).toBe(0);
    expect(bilan.donations_by_status).toEqual({
      PROPOSEE: 0,
      ACCEPTEE: 0,
      RETIREE: 0,
      REFUSEE: 0,
    });
  });

  it('compte correctement total_donations et donations_by_status', async () => {
    prisma.donation.findMany.mockResolvedValue([
      makeDonation('PROPOSEE', 'asso-1', 'prod-1', 100),
      makeDonation('ACCEPTEE', 'asso-2', 'prod-2', 200),
      makeDonation('RETIREE', 'asso-1', 'prod-3', 150),
      makeDonation('REFUSEE', 'asso-3', 'prod-4', 80),
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_donations).toBe(4);
    expect(bilan.donations_by_status).toEqual({
      PROPOSEE: 1,
      ACCEPTEE: 1,
      RETIREE: 1,
      REFUSEE: 1,
    });
  });

  it('calcule total_withdrawn et total_value_donated sur les dons RETIREE', async () => {
    prisma.donation.findMany.mockResolvedValue([
      makeDonation('RETIREE', 'asso-1', 'prod-1', 100),
      makeDonation('RETIREE', 'asso-2', 'prod-2', 250),
      makeDonation('PROPOSEE', 'asso-3', 'prod-3', 999),
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_withdrawn).toBe(2);
    expect(bilan.total_value_donated).toBeCloseTo(350, 2);
  });

  it('déduplique les associations et produits dans total_associations et total_products_donated', async () => {
    prisma.donation.findMany.mockResolvedValue([
      makeDonation('RETIREE', 'asso-1', 'prod-1', 50),
      makeDonation('RETIREE', 'asso-1', 'prod-1', 75),
      makeDonation('RETIREE', 'asso-2', 'prod-2', 30),
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_associations).toBe(2);
    expect(bilan.total_products_donated).toBe(2);
  });

  it('ne compte que les dons RETIREE dans les totaux RSE', async () => {
    prisma.donation.findMany.mockResolvedValue([
      makeDonation('PROPOSEE', 'asso-1', 'prod-1', 500),
      makeDonation('ACCEPTEE', 'asso-2', 'prod-2', 300),
      makeDonation('REFUSEE', 'asso-3', 'prod-3', 200),
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_withdrawn).toBe(0);
    expect(bilan.total_value_donated).toBe(0);
    expect(bilan.total_associations).toBe(0);
    expect(bilan.total_products_donated).toBe(0);
  });
});
