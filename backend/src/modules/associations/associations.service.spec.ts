// Roger — v1.0
// Cahier de tests US-30 / US-63 : CRUD annuaire associations + matching géoloc
// Couvre : CRUD associations, filtre géoloc Haversine ≤ 50 km, filtre catégorie, géocodage

import { NotFoundException } from '@nestjs/common';

import { StorageService } from '../../core/storage/storage.service';
import { GeocodingService } from '../geocoding/geocoding.service';
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

function makeService(
  geocodeResult: { lat: number; lng: number } | null = null
) {
  const mockGeocoding = {
    geocode: jest.fn().mockResolvedValue(geocodeResult),
  } as unknown as GeocodingService;
  const mockStorage = {
    upload: jest.fn().mockResolvedValue('https://cdn.example/logo.png'),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as StorageService;
  return new AssociationsService(mockGeocoding, mockStorage);
}

// ---------------------------------------------------------------------------
// BLOC 1 — Matching géoloc (Haversine ≤ 50 km) — critère clé US-30
// ---------------------------------------------------------------------------
describe('AssociationsService — findNearby (US-30)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  it('retourne une asso à 0 km (même point GPS que la pharmacie)', async () => {
    prisma.association.findMany.mockResolvedValue([makeAsso()]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(1);
  });

  it('retourne une asso à ~45 km (Versailles → Paris)', async () => {
    // Versailles : 48.8044, 2.1204 → ~20 km de Paris, dans le rayon 50 km
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 48.8044, lng: 2.1204, city: 'Versailles' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(1);
  });

  it('exclut une asso à plus de 50 km (Lyon ~400 km de Paris)', async () => {
    // Lyon : 45.7640, 4.8357 → ~400 km de Paris
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 45.764, lng: 4.8357, city: 'Lyon' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(0);
  });

  it('exclut les assos sans coordonnées GPS', async () => {
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: null, lng: null }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(0);
  });

  it('trie et retourne uniquement les assos dans le rayon parmi plusieurs', async () => {
    prisma.association.findMany.mockResolvedValue([
      makeAsso({
        association_id: 'a1',
        lat: PARIS_LAT,
        lng: PARIS_LNG,
        city: 'Paris',
      }), // ~0 km ✓
      makeAsso({
        association_id: 'a2',
        lat: 48.8044,
        lng: 2.1204,
        city: 'Versailles',
      }), // ~20 km ✓
      makeAsso({
        association_id: 'a3',
        lat: 45.764,
        lng: 4.8357,
        city: 'Lyon',
      }), // ~400 km ✗
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);
    expect(results).toHaveLength(2);
    expect(results.map((a) => a.association_id)).toEqual(['a1', 'a2']);
  });

  it('respecte un rayon personnalisé (ex: 10 km)', async () => {
    // Versailles ~20 km → hors rayon 10 km
    prisma.association.findMany.mockResolvedValue([
      makeAsso({ lat: 48.8044, lng: 2.1204, city: 'Versailles' }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG, 10);
    expect(results).toHaveLength(0);
  });

  it('retourne une liste vide si aucune association active', async () => {
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
    service = makeService();
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

    await expect(service.findOne('unknown-id')).rejects.toThrow(
      NotFoundException
    );
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

// ---------------------------------------------------------------------------
// BLOC 3 — US-63 : create & update (CRUD complet)
// ---------------------------------------------------------------------------
describe('AssociationsService — create & update (US-63)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService({ lat: PARIS_LAT, lng: PARIS_LNG });
  });

  it('crée une association avec tous les champs obligatoires', async () => {
    const dto = {
      name: 'Croix Bleue',
      address: '1 rue de la Paix',
      city: 'Paris',
      postal_code: '75001',
      categories: ['medicaments'],
      contact_email: 'contact@croix-bleue.fr',
    };
    prisma.association.create.mockResolvedValue(makeAsso());

    const result = await service.create(dto);

    expect(prisma.association.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: dto.name }),
      })
    );
    expect(result.association_id).toBeDefined();
  });

  it('crée une association avec géocodage automatique si lat/lng absents', async () => {
    const dto = {
      name: 'Croix Bleue',
      address: '1 rue de la Paix',
      city: 'Paris',
      postal_code: '75001',
    };
    // La creation doit géocoder l'adresse et stocker lat/lng
    prisma.association.create.mockResolvedValue(
      makeAsso({ lat: PARIS_LAT, lng: PARIS_LNG })
    );

    const result = await service.create(dto);

    expect(result.lat).not.toBeNull();
    expect(result.lng).not.toBeNull();
  });

  it('conserve les lat/lng fournis sans appeler le géocodeur', async () => {
    const dto = {
      name: 'Croix Bleue',
      address: '1 rue de la Paix',
      city: 'Paris',
      postal_code: '75001',
      lat: 48.9,
      lng: 2.4,
    };
    prisma.association.create.mockResolvedValue(
      makeAsso({ lat: 48.9, lng: 2.4 })
    );

    const result = await service.create(dto);

    expect(prisma.association.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lat: 48.9, lng: 2.4 }),
      })
    );
    expect(result.lat).toBe(48.9);
  });

  it("met à jour le nom et le contact d'une association existante", async () => {
    const updated = makeAsso({
      name: 'Nouveau Nom',
      contact_email: 'new@asso.fr',
    });
    prisma.association.findUnique.mockResolvedValue(makeAsso());
    prisma.association.update.mockResolvedValue(updated);

    const result = await service.update(ASSO_ID, {
      name: 'Nouveau Nom',
      contact_email: 'new@asso.fr',
    });

    expect(result.name).toBe('Nouveau Nom');
    expect(result.contact_email).toBe('new@asso.fr');
    expect(prisma.association.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { association_id: ASSO_ID },
        data: expect.objectContaining({ name: 'Nouveau Nom' }),
      })
    );
  });

  it("lève NotFoundException en update si l'association est inconnue", async () => {
    prisma.association.findUnique.mockResolvedValue(null);

    await expect(service.update('unknown-id', { name: 'X' })).rejects.toThrow(
      NotFoundException
    );
    expect(prisma.association.update).not.toHaveBeenCalled();
  });

  it('met à jour les catégories acceptées', async () => {
    const updated = makeAsso({ categories: ['medicaments', 'cosmetiques'] });
    prisma.association.findUnique.mockResolvedValue(makeAsso());
    prisma.association.update.mockResolvedValue(updated);

    const result = await service.update(ASSO_ID, {
      categories: ['medicaments', 'cosmetiques'],
    });

    expect(result.categories).toEqual(['medicaments', 'cosmetiques']);
  });
});

// ---------------------------------------------------------------------------
// BLOC 4 — US-63 : filtre par catégorie
// ---------------------------------------------------------------------------
describe('AssociationsService — filtre catégorie (US-63)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  it('retourne uniquement les associations acceptant la catégorie demandée', async () => {
    // Prisma filtre au niveau DB — le mock simule le résultat déjà filtré
    const filtered = [
      makeAsso({ association_id: 'a1', categories: ['medicaments'] }),
      makeAsso({
        association_id: 'a3',
        categories: ['medicaments', 'cosmetiques'],
      }),
    ];
    prisma.association.findMany.mockResolvedValue(filtered);

    const results = await service.findAll({ category: 'medicaments' });

    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          active: true,
          categories: { hasSome: ['medicaments'] },
        }),
      })
    );
    expect(results).toHaveLength(2);
  });

  it('retourne toutes les associations actives si aucune catégorie spécifiée', async () => {
    const assos = [
      makeAsso({ association_id: 'a1', categories: ['medicaments'] }),
      makeAsso({ association_id: 'a2', categories: ['cosmetiques'] }),
    ];
    prisma.association.findMany.mockResolvedValue(assos);

    const results = await service.findAll();

    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
    expect(results).toHaveLength(2);
  });

  it('retourne une liste vide si aucune asso ne correspond à la catégorie', async () => {
    prisma.association.findMany.mockResolvedValue([]);

    const results = await service.findAll({ category: 'medicaments' });

    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { hasSome: ['medicaments'] },
        }),
      })
    );
    expect(results).toHaveLength(0);
  });

  it('filtre par catégorie ET zone géographique (findNearby)', async () => {
    // Prisma retourne déjà les assos de la bonne catégorie, Haversine filtre par distance
    const assos = [
      makeAsso({
        association_id: 'a1',
        categories: ['medicaments'],
        lat: PARIS_LAT,
        lng: PARIS_LNG,
      }),
    ];
    prisma.association.findMany.mockResolvedValue(assos);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG, 50, {
      category: 'medicaments',
    });

    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categories: { hasSome: ['medicaments'] },
        }),
      })
    );
    expect(results.map((a) => a.association_id)).toEqual(['a1']);
  });

  it('filtre géoloc + catégorie : exclut les assos hors rayon même si bonne catégorie', async () => {
    prisma.association.findMany.mockResolvedValue([
      // Lyon : hors rayon 50 km depuis Paris
      makeAsso({
        lat: 45.764,
        lng: 4.8357,
        city: 'Lyon',
        categories: ['medicaments'],
      }),
    ]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG, 50, {
      category: 'medicaments',
    });

    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BLOC 5 — US-63 : association inactive exclue du matching
// ---------------------------------------------------------------------------
describe('AssociationsService — associations inactives (US-63)', () => {
  let service: AssociationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = makeService();
  });

  it('findAll ne retourne pas les associations inactives', async () => {
    // findMany est mocké pour ne retourner que des actives (active: true en where)
    prisma.association.findMany.mockResolvedValue([makeAsso({ active: true })]);

    await service.findAll();

    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true }),
      })
    );
  });

  it('findNearby ne retourne pas les associations inactives', async () => {
    // La requête Prisma filtre active: true, donc le mock retourne vide
    prisma.association.findMany.mockResolvedValue([]);

    const results = await service.findNearby(PARIS_LAT, PARIS_LNG);

    expect(results).toHaveLength(0);
    expect(prisma.association.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ active: true }),
      })
    );
  });

  it("une association désactivée n'est plus proposée au matching", async () => {
    // Après deactivate, findAll ne la retourne plus (filtre active: true)
    prisma.association.findUnique.mockResolvedValue(makeAsso());
    prisma.association.update.mockResolvedValue(makeAsso({ active: false }));
    prisma.association.findMany.mockResolvedValue([]); // liste vide post-désactivation

    await service.deactivate(ASSO_ID);
    const results = await service.findAll();

    expect(results).toHaveLength(0);
  });
});
