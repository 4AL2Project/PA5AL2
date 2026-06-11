// Roger — v1.0
// Cahier de tests US-30 : Don associatif
// Couvre : création, machine à états, isolation tenant, matching géoloc, Cerfa, bilan RSE

import { BadRequestException, NotFoundException } from '@nestjs/common';

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
    product: { findFirst: jest.Mock };
    association: { findUnique: jest.Mock };
    donation: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
    };
  };
};

const PHARMACY_ID = 'pharma-uuid-1';
const OTHER_PHARMACY_ID = 'pharma-uuid-2';
const PRODUCT_ID = 'prod-uuid-1';
const ASSOCIATION_ID = 'asso-uuid-1';
const DONATION_ID = 'don-uuid-1';

function makeProduct(overrides: Partial<{ stock_quantity: number; unit_price: number }> = {}) {
  return {
    product_id: PRODUCT_ID,
    pharmacy_id: PHARMACY_ID,
    stock_quantity: overrides.stock_quantity ?? 10,
    unit_price: overrides.unit_price ?? 5.5,
    name: 'Crème dormante',
    external_sku: 'SKU-001',
  };
}

function makeAssociation(active = true) {
  return {
    association_id: ASSOCIATION_ID,
    name: 'Croix Bleue',
    active,
    city: 'Paris',
  };
}

function makeDonation(status: string, overrides: Record<string, unknown> = {}) {
  return {
    donation_id: DONATION_ID,
    product_id: PRODUCT_ID,
    pharmacy_id: PHARMACY_ID,
    association_id: ASSOCIATION_ID,
    quantity: 3,
    estimated_value: 16.5,
    status,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BLOC 1 — Création d'un don (PROPOSEE)
// ---------------------------------------------------------------------------
describe('DonationsService — create (US-30)', () => {
  let service: DonationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationsService();
  });

  it('crée un don PROPOSEE avec la valeur estimée correcte (quantité × prix unitaire)', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct({ unit_price: 5.5 }));
    prisma.association.findUnique.mockResolvedValue(makeAssociation());
    prisma.donation.create.mockResolvedValue({
      ...makeDonation('PROPOSEE'),
      product: { name: 'Crème dormante', external_sku: 'SKU-001' },
      association: { name: 'Croix Bleue', city: 'Paris' },
    });

    const result = await service.create(PHARMACY_ID, {
      product_id: PRODUCT_ID,
      association_id: ASSOCIATION_ID,
      quantity: 3,
    });

    expect(prisma.donation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROPOSEE',
          estimated_value: 16.5,
          quantity: 3,
        }),
      })
    );
    expect(result.status).toBe('PROPOSEE');
  });

  it("lève NotFoundException si le produit n'appartient pas à la pharmacie (isolation tenant)", async () => {
    prisma.product.findFirst.mockResolvedValue(null);

    await expect(
      service.create(OTHER_PHARMACY_ID, {
        product_id: PRODUCT_ID,
        association_id: ASSOCIATION_ID,
        quantity: 1,
      })
    ).rejects.toThrow(NotFoundException);
  });

  it("lève NotFoundException si l'association est inconnue ou inactive", async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct());
    prisma.association.findUnique.mockResolvedValue(null);

    await expect(
      service.create(PHARMACY_ID, {
        product_id: PRODUCT_ID,
        association_id: 'asso-inconnue',
        quantity: 1,
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si la quantité est 0', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct({ stock_quantity: 10 }));
    prisma.association.findUnique.mockResolvedValue(makeAssociation());

    await expect(
      service.create(PHARMACY_ID, {
        product_id: PRODUCT_ID,
        association_id: ASSOCIATION_ID,
        quantity: 0,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException si la quantité dépasse le stock disponible', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct({ stock_quantity: 5 }));
    prisma.association.findUnique.mockResolvedValue(makeAssociation());

    await expect(
      service.create(PHARMACY_ID, {
        product_id: PRODUCT_ID,
        association_id: ASSOCIATION_ID,
        quantity: 6,
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('accepte une quantité égale au stock total (cas limite)', async () => {
    prisma.product.findFirst.mockResolvedValue(makeProduct({ stock_quantity: 5 }));
    prisma.association.findUnique.mockResolvedValue(makeAssociation());
    prisma.donation.create.mockResolvedValue(makeDonation('PROPOSEE', { quantity: 5 }));

    await expect(
      service.create(PHARMACY_ID, {
        product_id: PRODUCT_ID,
        association_id: ASSOCIATION_ID,
        quantity: 5,
      })
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// BLOC 2 — Machine à états du don
// ---------------------------------------------------------------------------
describe('DonationsService — machine à états (US-30)', () => {
  let service: DonationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationsService();
  });

  it('accepte un don PROPOSEE → statut passe à ACCEPTEE', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('PROPOSEE'));
    prisma.donation.update.mockResolvedValue(makeDonation('ACCEPTEE'));

    const result = await service.accept(DONATION_ID, PHARMACY_ID);
    expect(result.status).toBe('ACCEPTEE');
    expect(prisma.donation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTEE' }),
      })
    );
  });

  it("lève BadRequestException si on tente d'accepter un don déjà ACCEPTEE", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('ACCEPTEE'));

    await expect(service.accept(DONATION_ID, PHARMACY_ID)).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException si on tente d'accepter un don REFUSEE", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('REFUSEE'));

    await expect(service.accept(DONATION_ID, PHARMACY_ID)).rejects.toThrow(BadRequestException);
  });

  it('refuse un don PROPOSEE → statut passe à REFUSEE', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('PROPOSEE'));
    prisma.donation.update.mockResolvedValue(makeDonation('REFUSEE'));

    const result = await service.refuse(DONATION_ID, PHARMACY_ID);
    expect(result.status).toBe('REFUSEE');
  });

  it("lève BadRequestException si on tente de refuser un don ACCEPTEE", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('ACCEPTEE'));

    await expect(service.refuse(DONATION_ID, PHARMACY_ID)).rejects.toThrow(BadRequestException);
  });

  it('marque un don ACCEPTEE → RETIREE et génère un numéro Cerfa non vide', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('ACCEPTEE'));
    prisma.donation.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(makeDonation('RETIREE', { cerfa_number: data['cerfa_number'] }))
    );

    const result = await service.withdraw(DONATION_ID, PHARMACY_ID);
    expect(result.status).toBe('RETIREE');
    expect(result.cerfa_number).toBeTruthy();
  });

  it("lève BadRequestException si on tente de retirer un don PROPOSEE (pas encore accepté)", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('PROPOSEE'));

    await expect(service.withdraw(DONATION_ID, PHARMACY_ID)).rejects.toThrow(BadRequestException);
  });

  it("lève BadRequestException si on tente de retirer un don déjà RETIREE", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('RETIREE'));

    await expect(service.withdraw(DONATION_ID, PHARMACY_ID)).rejects.toThrow(BadRequestException);
  });

  it("lève NotFoundException si la pharmacie ne possède pas le don (isolation tenant)", async () => {
    prisma.donation.findFirst.mockResolvedValue(null);

    await expect(service.accept(DONATION_ID, OTHER_PHARMACY_ID)).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// BLOC 3 — Listing des dons
// ---------------------------------------------------------------------------
describe('DonationsService — listForPharmacy (US-30)', () => {
  let service: DonationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DonationsService();
  });

  it('retourne tous les dons de la pharmacie sans filtre de statut', async () => {
    const dons = [makeDonation('PROPOSEE'), makeDonation('ACCEPTEE')];
    prisma.donation.findMany.mockResolvedValue(dons);

    const result = await service.listForPharmacy(PHARMACY_ID);
    expect(result).toHaveLength(2);
    expect(prisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pharmacy_id: PHARMACY_ID }),
      })
    );
  });

  it('filtre par statut PROPOSEE si demandé', async () => {
    prisma.donation.findMany.mockResolvedValue([makeDonation('PROPOSEE')]);

    await service.listForPharmacy(PHARMACY_ID, 'PROPOSEE');
    expect(prisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PROPOSEE' }),
      })
    );
  });

  it('retourne une liste vide si aucun don pour la pharmacie', async () => {
    prisma.donation.findMany.mockResolvedValue([]);

    const result = await service.listForPharmacy(PHARMACY_ID);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BLOC 4 — Bilan RSE
// ---------------------------------------------------------------------------
describe('DonationsService — getBilan (US-30)', () => {
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

  it('calcule total_value_donated uniquement sur les dons RETIREE', async () => {
    prisma.donation.findMany.mockResolvedValue([
      { status: 'RETIREE', estimated_value: 100, association_id: 'asso-1', product_id: 'prod-1' },
      { status: 'RETIREE', estimated_value: 250, association_id: 'asso-2', product_id: 'prod-2' },
      { status: 'PROPOSEE', estimated_value: 999, association_id: 'asso-3', product_id: 'prod-3' },
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_withdrawn).toBe(2);
    expect(bilan.total_value_donated).toBeCloseTo(350, 2);
    expect(bilan.total_products_donated).toBe(2);
    expect(bilan.total_associations).toBe(2);
  });

  it('déduplique les associations et produits dans les totaux RSE', async () => {
    prisma.donation.findMany.mockResolvedValue([
      { status: 'RETIREE', estimated_value: 50, association_id: 'asso-1', product_id: 'prod-1' },
      { status: 'RETIREE', estimated_value: 75, association_id: 'asso-1', product_id: 'prod-1' },
      { status: 'RETIREE', estimated_value: 30, association_id: 'asso-2', product_id: 'prod-2' },
    ]);

    const bilan = await service.getBilan(PHARMACY_ID);

    expect(bilan.total_associations).toBe(2);
    expect(bilan.total_products_donated).toBe(2);
  });

  it('compte tous les statuts dans donations_by_status', async () => {
    prisma.donation.findMany.mockResolvedValue([
      { status: 'PROPOSEE', estimated_value: 10, association_id: 'a1', product_id: 'p1' },
      { status: 'ACCEPTEE', estimated_value: 20, association_id: 'a2', product_id: 'p2' },
      { status: 'RETIREE', estimated_value: 30, association_id: 'a3', product_id: 'p3' },
      { status: 'REFUSEE', estimated_value: 40, association_id: 'a4', product_id: 'p4' },
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
});
