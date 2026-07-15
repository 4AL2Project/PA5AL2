// Cahier de tests : matching et répartition équitable des dons
// Couvre : éligibilité par rayon d'action DE L'ASSO, filtre catégories,
// garde-fou anti-saturation, prior de fiabilité, rotation par équité.

import { AssociationStatsService } from '../associations/association-stats.service';
import { DonationMatchingService } from './donation-matching.service';
import { createFakeDb, FakeDb } from './testing/fake-db';

jest.mock('../../database/client', () => ({ prisma: {} }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = require('../../database/client') as { prisma: FakeDb };

// Officine à Paris ; 1° de latitude ≈ 111 km
const PHARMACY = { lat: 48.8566, lng: 2.3522 };
const KM_40_NORTH = { lat: PHARMACY.lat + 40 / 111.19, lng: PHARMACY.lng };
const KM_10_NORTH = { lat: PHARMACY.lat + 10 / 111.19, lng: PHARMACY.lng };

const LOT = [{ product_id: 'p1', category: 'Cosmétique', quantity: 5 }];

let db: FakeDb;
let service: DonationMatchingService;

function seedAsso(overrides: Record<string, unknown> = {}) {
  return db.seed('association', {
    name: 'Asso',
    status: 'ACTIVE',
    email_verified_at: new Date('2026-01-01'),
    lat: KM_10_NORTH.lat,
    lng: KM_10_NORTH.lng,
    action_radius_km: 30,
    categories: ['Cosmétique'],
    pickup_sla_days: 7,
    response_sla_hours: 72,
    contact_email: 'asso@example.org',
    last_proposal_at: null,
    ...overrides,
  });
}

beforeEach(() => {
  db = createFakeDb();
  Object.assign(clientModule.prisma, db);
  service = new DonationMatchingService(new AssociationStatsService());
});

describe('DonationMatchingService — éligibilité', () => {
  it('exclut une asso à 40 km dont le rayon d’action est 30 km', async () => {
    seedAsso({ name: 'Trop loin', ...KM_40_NORTH, action_radius_km: 30 });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked).toHaveLength(0);
  });

  it('inclut la même asso à 40 km si son rayon est 60 km', async () => {
    seedAsso({ name: 'IDF entière', ...KM_40_NORTH, action_radius_km: 60 });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].distance_km).toBeGreaterThan(35);
  });

  it('exclut une asso qui n’accepte aucune catégorie du lot', async () => {
    seedAsso({ name: 'Alimentaire only', categories: ['Alimentaire'] });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked).toHaveLength(0);
  });

  it('accepte un lot sans catégorie connue (exports LGO incomplets)', async () => {
    seedAsso({ categories: ['Alimentaire'] });
    const ranked = await service.rankEligible(PHARMACY, [
      { product_id: 'p1', category: null, quantity: 5 },
    ]);
    expect(ranked).toHaveLength(1);
  });

  it('exclut les assos non ACTIVE ou sans email vérifié', async () => {
    seedAsso({ name: 'En attente', status: 'EN_ATTENTE_VALIDATION' });
    seedAsso({ name: 'Suspendue', status: 'SUSPENDUE' });
    seedAsso({ name: 'Email non vérifié', email_verified_at: null });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked).toHaveLength(0);
  });

  it('exclut une asso déjà sollicitée sur CE don', async () => {
    const asso = seedAsso({ name: 'Déjà vue' });
    const donation = db.seed('donation', { pharmacy_id: 'ph1' });
    db.seed('donationProposal', {
      donation_id: donation.donation_id,
      association_id: asso.association_id,
      status: 'REFUSEE',
      proposed_lines: [],
      expires_at: new Date(),
    });
    const ranked = await service.rankEligible(
      PHARMACY,
      LOT,
      donation.donation_id
    );
    expect(ranked).toHaveLength(0);
  });

  it('garde-fou : exclut une asso avec 3 retraits planifiés (toutes officines)', async () => {
    const asso = seedAsso({ name: 'Saturée' });
    for (let i = 0; i < 3; i++) {
      const don = db.seed('donation', { pharmacy_id: `autre-${i}` });
      const proposal = db.seed('donationProposal', {
        donation_id: don.donation_id,
        association_id: asso.association_id,
        status: 'ACCEPTEE',
        proposed_lines: [],
        expires_at: new Date(),
      });
      db.seed('donationAllocation', {
        donation_id: don.donation_id,
        association_id: asso.association_id,
        proposal_id: proposal.proposal_id,
        lines: [],
        pickup_slot_start: new Date(),
        pickup_slot_end: new Date(),
      });
    }
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked).toHaveLength(0);
  });
});

describe('DonationMatchingService — classement', () => {
  it('une asso sans historique part avec le prior de fiabilité (0,7), pas 0', async () => {
    seedAsso({ name: 'Nouvelle' });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    // score = 0.5×0.7 + 0.3×1 (jamais servie) + 0.2×proximité
    expect(ranked[0].score).toBeGreaterThan(0.6);
  });

  it('à fiabilité égale, sert d’abord la moins récemment sollicitée (équité)', async () => {
    seedAsso({
      name: 'Servie hier',
      last_proposal_at: new Date(Date.now() - 24 * 3600 * 1000),
    });
    seedAsso({
      name: 'Servie il y a 20 jours',
      last_proposal_at: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    });
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked.map((r) => r.name)).toEqual([
      'Servie il y a 20 jours',
      'Servie hier',
    ]);
  });

  it('une asso non fiable passe derrière une asso fiable plus lointaine', async () => {
    const unreliable = seedAsso({ name: 'Non fiable' });
    seedAsso({
      name: 'Fiable mais loin',
      ...KM_40_NORTH,
      action_radius_km: 60,
    });
    // Historique : 4 retraits manqués sur 4 pour la non fiable
    for (let i = 0; i < 4; i++) {
      const don = db.seed('donation', { pharmacy_id: `ph-${i}` });
      const proposal = db.seed('donationProposal', {
        donation_id: don.donation_id,
        association_id: unreliable.association_id,
        status: 'ACCEPTEE',
        proposed_lines: [],
        expires_at: new Date(),
      });
      db.seed('donationAllocation', {
        donation_id: don.donation_id,
        association_id: unreliable.association_id,
        proposal_id: proposal.proposal_id,
        status: 'NON_RECUPEREE',
        lines: [],
        pickup_slot_start: new Date(),
        pickup_slot_end: new Date(),
      });
    }
    const ranked = await service.rankEligible(PHARMACY, LOT);
    expect(ranked.map((r) => r.name)).toEqual([
      'Fiable mais loin',
      'Non fiable',
    ]);
  });

  it('retourne vide si l’officine n’est pas géolocalisée', async () => {
    seedAsso({});
    const ranked = await service.rankEligible({ lat: null, lng: null }, LOT);
    expect(ranked).toHaveLength(0);
  });
});
