// Roger — v1.0
// Cahier de tests US-30 : Matching géoloc associations
// Couvre : CRUD associations, filtre géoloc Haversine ≤ 50 km

import { NotFoundException } from '@nestjs/common';

import { AssociationsService } from './associations.service';

jest.mock('../../database/client', () => ({
  prisma: {
    association: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    association: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
};

const ASSO_ID = 'asso-uuid-1';

// Coordonnées de référence : Paris centre (48.8566, 2.3522)
const PARIS_LAT = 48.8566;
const PARIS_LNG = 2.3522;

function makeAsso(overrides: Record<string, unknown> = {}) {
  return {
    association_id: ASSO_ID,
    name: 'Croix Bleue',
    address: '1 rue de la Paix',
    city: 'Paris',
    postal_code: '75001',
    lat: PARIS_LAT,
    lng: PARIS_LNG,
    categories: ['medicaments'],
    contact_email: 'contact@croix-bleue.fr',
    contact_phone: null,
    active: true,
    created_at: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BLOC 1 — Matching géoloc (Haversine ≤ 50 km) — critère clé US-30
// ---------------------------------------------------------------------------
describe('AssociationsService — findNearby (US-30)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssociationsService();
  });

  it("retourne une asso à 0 km (même point GPS que la pharmacie)", async () => {
    prisma.association.findMany.mockResolvedValue([makeAsso()]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(1);
  });

  it("retourne une asso à ~45 km (Versailles → Paris)", async () => {
    // Versailles : 48.8044, 2.1204 → ~20 km de Paris, dans le rayon 50 km
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 48.8044, lng: 2.1204, city: 'Versailles' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(1);
  });

  it("exclut une asso à plus de 50 km (Lyon ~400 km de Paris)", async () => {
    // Lyon : 45.7640, 4.8357 → ~400 km de Paris
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 45.764, lng: 4.8357, city: 'Lyon' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(0);
  });

  it("exclut les assos sans coordonnées GPS", async () => {
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: null, lng: null }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(0);
  });

  it("trie et retourne uniquement les assos dans le rayon parmi plusieurs", async () => {
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ association_id: 'a1', lat: PARIS_LAT, lng: PARIS_LNG, city: 'Paris' }),      // ~0 km ✓
      makeAsso({ association_id: 'a2', lat: 48.8044, lng: 2.1204, city: 'Versailles' }),        // ~20 km ✓
      makeAsso({ association_id: 'a3', lat: 45.764, lng: 4.8357, city: 'Lyon' }),               // ~400 km ✗
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(2);
    expect(results.map((a) => a.association_id)).toEqual(['a1', 'a2']);
  });

  it("respecte un rayon personnalisé (ex: 10 km)", async () => {
    // Versailles ~20 km → hors rayon 10 km
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 48.8044, lng: 2.1204, city: 'Versailles' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG, 10);
    expect(results).toHaveLength(0);
  });

  it("retourne une liste vide si aucune association active", async () => {
    prisma.association.findMany.mockResolvedValue([]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BLOC 2 — CRUD associations
// ---------------------------------------------------------------------------
describe('AssociationsService — CRUD (US-30)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AssociationsService();
  });

  it('retourne toutes les associations actives via findAll', async () => {
    const assos = [makeAsso(), makeAsso({ association_id: 'asso-2' })];
    prisma.association.findMany.mockResolvedValue(assos);

    const result = await service.findAll();
    expect(result).toHaveLength(2);
    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
  });

  it('retourne une association par ID via findOne', async () => {
    prisma.association.findUnique.mockResolvedValue(makeAsso());

    const result = await service.findOne(ASSO_ID);
    expect(result.association_id).toBe(ASSO_ID);
  });

  it("lève NotFoundException si l'association est introuvable", async () => {
    prisma.association.findUnique.mockResolvedValue(null);

    await expect(service.findOne('unknown-id')).rejects.toThrow(NotFoundException);
  });

  it('désactive une association (soft delete)', async () => {
    prisma.association.findUnique.mockResolvedValue(makeAsso());
    prisma.association.update.mockResolvedValue(makeAsso({ active: false }));

    const result = await service.deactivate(ASSO_ID);
    expect(result.active).toBe(false);
    expect(prisma.association.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { active: false },
      })
    );
  });
});
