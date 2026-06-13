// Roger — v1.0
// Cahier de tests US-32 : Génération du reçu Cerfa PDF
// Couvre : génération PDF sur don RETIREE, blocage non-RETIREE,
//          isolation tenant, re-téléchargement (idempotence), données transmises

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CerfaService } from './cerfa.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    donation: { findFirst: jest.fn() },
  },
}));

jest.mock('./cerfa.generator', () => ({
  generateCerfaPdf: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: { donation: { findFirst: jest.Mock } };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateCerfaPdf } = require('./cerfa.generator') as {
  generateCerfaPdf: jest.Mock;
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const PHARMACY_ID = 'pharma-uuid-1';
const OTHER_PHARMACY_ID = 'pharma-uuid-2';
const DONATION_ID = 'don-uuid-1';
const FAKE_PDF = Buffer.from('%PDF-1.4 fake');

function makeDonation(status: string, overrides: Record<string, unknown> = {}) {
  return {
    donation_id: DONATION_ID,
    pharmacy_id: PHARMACY_ID,
    quantity: 5,
    estimated_value: 27.5,
    status,
    cerfa_number: status === 'RETIREE' ? 'CERFA-DON-1717000000000' : null,
    withdrawn_at:
      status === 'RETIREE' ? new Date('2026-06-01T10:00:00Z') : null,
    product: { name: 'Doliprane 500mg', lot_number: 'LOT-2024-A' },
    association: {
      name: 'Croix Bleue Paris',
      address: '10 rue Voltaire',
      city: 'Paris',
      postal_code: '75011',
    },
    pharmacy: {
      name: 'Pharmacie de la Paix',
      address: '1 rue de la Paix, 75001 Paris',
      siret: '12345678901234',
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BLOC 1 — Génération PDF sur un don RETIREE
// ---------------------------------------------------------------------------
describe('CerfaService — generateCerfa (US-32)', () => {
  let service: CerfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CerfaService();
    generateCerfaPdf.mockResolvedValue(FAKE_PDF);
  });

  it('retourne un Buffer non vide pour un don RETIREE appartenant à la pharmacie', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('RETIREE'));

    const result = await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('appelle generateCerfaPdf avec les données complètes du don', async () => {
    const donation = makeDonation('RETIREE');
    prisma.donation.findFirst.mockResolvedValue(donation);

    await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        cerfa_number: 'CERFA-DON-1717000000000',
        pharmacy_name: 'Pharmacie de la Paix',
        association_name: 'Croix Bleue Paris',
        product_name: 'Doliprane 500mg',
        quantity: 5,
        estimated_value: 27.5,
        withdrawn_at: new Date('2026-06-01T10:00:00Z'),
      })
    );
  });

  it('transmet le SIRET de la pharmacie au générateur', async () => {
    prisma.donation.findFirst.mockResolvedValue(
      makeDonation('RETIREE', {
        pharmacy: {
          name: 'Pharma Test',
          address: '1 rue Test',
          siret: '98765432100019',
        },
      })
    );

    await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({ pharmacy_siret: '98765432100019' })
    );
  });

  it("transmet l'adresse complète de l'association (adresse, ville, code postal)", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('RETIREE'));

    await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        association_address: '10 rue Voltaire',
        association_city: 'Paris',
        association_postal_code: '75011',
      })
    );
  });

  it('transmet le numéro de lot du produit quand il est présent', async () => {
    prisma.donation.findFirst.mockResolvedValue(
      makeDonation('RETIREE', {
        product: { name: 'Doliprane 500mg', lot_number: 'LOT-2024-A' },
      })
    );

    await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({ lot_number: 'LOT-2024-A' })
    );
  });

  it("transmet lot_number null si le produit n'a pas de numéro de lot", async () => {
    prisma.donation.findFirst.mockResolvedValue(
      makeDonation('RETIREE', {
        product: { name: 'Crème sans lot', lot_number: null },
      })
    );

    await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({ lot_number: null })
    );
  });
});

// ---------------------------------------------------------------------------
// BLOC 2 — Blocage : seul un don RETIREE peut générer un Cerfa
// ---------------------------------------------------------------------------
describe('CerfaService — blocage statut non RETIREE (US-32)', () => {
  let service: CerfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CerfaService();
  });

  it('lève BadRequestException pour un don PROPOSEE (non encore accepté)', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('PROPOSEE'));

    await expect(
      service.generateCerfa(DONATION_ID, PHARMACY_ID)
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException pour un don ACCEPTEE (accepté mais pas encore retiré)', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('ACCEPTEE'));

    await expect(
      service.generateCerfa(DONATION_ID, PHARMACY_ID)
    ).rejects.toThrow(BadRequestException);
  });

  it('lève BadRequestException pour un don REFUSEE', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('REFUSEE'));

    await expect(
      service.generateCerfa(DONATION_ID, PHARMACY_ID)
    ).rejects.toThrow(BadRequestException);
  });

  it("le message d'erreur indique que le don doit être retiré", async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('PROPOSEE'));

    const error = await service
      .generateCerfa(DONATION_ID, PHARMACY_ID)
      .catch((e: Error) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toMatch(/retiré|RETIREE/i);
  });
});

// ---------------------------------------------------------------------------
// BLOC 3 — Isolation tenant
// ---------------------------------------------------------------------------
describe('CerfaService — isolation tenant (US-32)', () => {
  let service: CerfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CerfaService();
  });

  it("lève NotFoundException si le don n'appartient pas à la pharmacie demandeuse", async () => {
    prisma.donation.findFirst.mockResolvedValue(null);

    await expect(
      service.generateCerfa(DONATION_ID, OTHER_PHARMACY_ID)
    ).rejects.toThrow(NotFoundException);
  });

  it('lève NotFoundException si le donation_id est inconnu', async () => {
    prisma.donation.findFirst.mockResolvedValue(null);

    await expect(
      service.generateCerfa('don-inexistant', PHARMACY_ID)
    ).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// BLOC 4 — Re-téléchargement idempotent
// ---------------------------------------------------------------------------
describe('CerfaService — re-téléchargement idempotent (US-32)', () => {
  let service: CerfaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CerfaService();
    generateCerfaPdf.mockResolvedValue(FAKE_PDF);
  });

  it('génère un PDF valide lors de deux appels successifs sur le même don', async () => {
    prisma.donation.findFirst.mockResolvedValue(makeDonation('RETIREE'));

    const first = await service.generateCerfa(DONATION_ID, PHARMACY_ID);
    const second = await service.generateCerfa(DONATION_ID, PHARMACY_ID);

    expect(first).toEqual(second);
    expect(generateCerfaPdf).toHaveBeenCalledTimes(2);
  });
});
