// Cahier de tests : orchestrateur du cycle don
// Couvre : cascade (refus, expiration, partiel), concurrence (double POST,
// SUPERSEDED, annulation, dépassement du reliquat), non-récupération,
// épuisement, complétion, idempotence des emails, scénario E2E complet.

import { BadRequestException, ConflictException } from '@nestjs/common';

import { AssociationStatsService } from '../associations/association-stats.service';
import { computePickupSlots, DEFAULT_PICKUP_WINDOWS } from './donation.types';
import { DonationMatchingService } from './donation-matching.service';
import { DonationOrchestratorService } from './donation-orchestrator.service';
import { createFakeDb, FakeDb } from './testing/fake-db';

jest.mock('../../database/client', () => ({ prisma: {} }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = require('../../database/client') as { prisma: FakeDb };

const PHARMACY_POS = { lat: 48.8566, lng: 2.3522 };
const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(
  (day) => ({ day, start: '09:00', end: '12:00' })
);

let db: FakeDb;
let orchestrator: DonationOrchestratorService;
let email: Record<string, jest.Mock>;

function makeEmailMock(): Record<string, jest.Mock> {
  return new Proxy({} as Record<string, jest.Mock>, {
    get: (target, prop: string) => {
      if (!(prop in target))
        target[prop] = jest.fn().mockResolvedValue(undefined);
      return target[prop];
    },
  });
}

function seedPharmacy(overrides: Record<string, unknown> = {}) {
  return db.seed('pharmacy', {
    name: 'Pharmacie du Test',
    email: 'pharma@example.fr',
    address: '1 rue du Test, Paris',
    siret: '12345678900011',
    donation_pickup_windows: ALL_DAYS,
    ...PHARMACY_POS,
    ...overrides,
  });
}

function seedProduct(
  pharmacyId: string,
  overrides: Record<string, unknown> = {}
) {
  return db.seed('product', {
    pharmacy_id: pharmacyId,
    external_sku: `SKU-${Math.random()}`,
    name: 'Crème solaire',
    category: 'Cosmétique',
    stock_quantity: 10,
    unit_price: 8,
    ...overrides,
  });
}

function seedAsso(overrides: Record<string, unknown> = {}) {
  return db.seed('association', {
    name: 'Les Restos',
    status: 'ACTIVE',
    email_verified_at: new Date('2026-01-01'),
    lat: PHARMACY_POS.lat + 10 / 111.19,
    lng: PHARMACY_POS.lng,
    action_radius_km: 30,
    categories: ['Cosmétique'],
    pickup_sla_days: 7,
    response_sla_hours: 72,
    contact_email: 'restos@example.org',
    address: '2 rue des Assos',
    city: 'Paris',
    postal_code: '75011',
    last_proposal_at: null,
    ...overrides,
  });
}

function activeProposal() {
  return db.tables.donationProposal.find((p) => p.status === 'ENVOYEE');
}

function validSlot() {
  const slots = computePickupSlots(ALL_DAYS as never, 7);
  return { slot_start: slots[0].start, slot_end: slots[0].end };
}

beforeEach(() => {
  db = createFakeDb();
  Object.assign(clientModule.prisma, db);
  email = makeEmailMock();
  const matching = new DonationMatchingService(new AssociationStatsService());
  orchestrator = new DonationOrchestratorService(
    matching,
    email as never,
    { generateCerfa: jest.fn().mockResolvedValue(Buffer.from('pdf')) } as never
  );
});

describe('Création et première proposition', () => {
  it('crée le lot, propose à la meilleure asso et journalise', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    seedAsso();

    const donation = await orchestrator.createDonation(
      pharmacy.pharmacy_id,
      'user-1',
      { lines: [{ product_id: product.product_id, quantity: 5 }] }
    );

    expect(donation!.status).toBe('EN_COURS');
    expect(donation!.proposals).toHaveLength(1);
    expect(db.tables.donation[0].attempt_count).toBe(1);
    expect(email.sendDonationProposalEmail).toHaveBeenCalledTimes(1);
    const eventTypes = db.tables.donationEvent.map((e) => e.type);
    expect(eventTypes).toEqual(['DON_CREE', 'PROPOSITION_ENVOYEE']);
  });

  it('refuse une quantité supérieure au stock', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id, { stock_quantity: 3 });
    await expect(
      orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
        lines: [{ product_id: product.product_id, quantity: 5 }],
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mode avancé : propose d’abord à l’asso préférée si elle est éligible', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    seedAsso({ name: 'Mieux classée' });
    const preferred = seedAsso({
      name: 'Choisie par le titulaire',
      lat: PHARMACY_POS.lat + 25 / 111.19,
    });

    await orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
      lines: [{ product_id: product.product_id, quantity: 2 }],
      preferred_association_id: preferred.association_id,
    });

    expect(activeProposal()!.association_id).toBe(preferred.association_id);
  });

  it('échoue immédiatement si aucune asso éligible', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);

    await orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
      lines: [{ product_id: product.product_id, quantity: 2 }],
    });

    expect(db.tables.donation[0].status).toBe('ECHOUEE');
    expect(email.sendDonationFailedEmail).toHaveBeenCalled();
  });
});

describe('Cascade', () => {
  async function setupTwoAssos() {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    const assoA = seedAsso({ name: 'Asso A' });
    const assoB = seedAsso({
      name: 'Asso B',
      lat: PHARMACY_POS.lat + 25 / 111.19,
      contact_email: 'b@example.org',
    });
    const donation = await orchestrator.createDonation(
      pharmacy.pharmacy_id,
      'user-1',
      { lines: [{ product_id: product.product_id, quantity: 6 }] }
    );
    return { pharmacy, product, assoA, assoB, donation: donation! };
  }

  it('sur refus, propose immédiatement à l’asso suivante', async () => {
    const { assoA, assoB } = await setupTwoAssos();
    expect(activeProposal()!.association_id).toBe(assoA.association_id);

    const view = await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'REFUSE',
      refusal_reason: 'Pas notre public',
    });

    expect(view.state).toBe('REFUSEE');
    const next = activeProposal();
    expect(next!.association_id).toBe(assoB.association_id);
    expect(db.tables.donation[0].attempt_count).toBe(2);
  });

  it('sur expiration (cron), bascule vers l’asso suivante', async () => {
    const { assoB } = await setupTwoAssos();
    const future = new Date(Date.now() + 100 * 3600 * 1000);

    const expired = await orchestrator.expireOverdueProposals(future);

    expect(expired).toBe(1);
    expect(
      db.tables.donationProposal.filter((p) => p.status === 'EXPIREE')
    ).toHaveLength(1);
    expect(activeProposal()!.association_id).toBe(assoB.association_id);
  });

  it('acceptation totale : allocation PLANIFIEE, pas de nouvelle proposition', async () => {
    await setupTwoAssos();
    const view = await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'ACCEPT',
      ...validSlot(),
    });

    expect(view.state).toBe('ACCEPTEE');
    expect(db.tables.donationAllocation).toHaveLength(1);
    expect(db.tables.donationLine[0].quantity_allocated).toBe(6);
    expect(activeProposal()).toBeUndefined();
    expect(email.sendDonationAcceptedEmail).toHaveBeenCalledTimes(1);
  });

  it('acceptation partielle : le reliquat est re-proposé après commit', async () => {
    const { product, assoB } = await setupTwoAssos();

    await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'ACCEPT',
      lines: [{ product_id: product.product_id, quantity: 4 }],
      ...validSlot(),
    });

    expect(db.tables.donationLine[0].quantity_allocated).toBe(4);
    const next = activeProposal();
    expect(next!.association_id).toBe(assoB.association_id);
    const proposedLines = next!.proposed_lines as { quantity: number }[];
    expect(proposedLines[0].quantity).toBe(2);
  });

  it('acceptation sans créneau → 400 (un seul POST, pas d’état intermédiaire)', async () => {
    await setupTwoAssos();
    await expect(
      orchestrator.respondToProposal(activeProposal()!.token, {
        decision: 'ACCEPT',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('créneau hors fenêtres officine → 400', async () => {
    await setupTwoAssos();
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setHours(22, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 0, 0, 0);
    await expect(
      orchestrator.respondToProposal(activeProposal()!.token, {
        decision: 'ACCEPT',
        slot_start: start.toISOString(),
        slot_end: end.toISOString(),
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Concurrence et cas limites', () => {
  async function setup() {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    seedAsso({ name: 'Asso A' });
    seedAsso({ name: 'Asso B', lat: PHARMACY_POS.lat + 25 / 111.19 });
    const donation = await orchestrator.createDonation(
      pharmacy.pharmacy_id,
      'user-1',
      { lines: [{ product_id: product.product_id, quantity: 5 }] }
    );
    return { pharmacy, product, donation: donation! };
  }

  it('double POST sur le même token : un seul passe, le second reçoit 409', async () => {
    await setup();
    const token = activeProposal()!.token;

    await orchestrator.respondToProposal(token, {
      decision: 'ACCEPT',
      ...validSlot(),
    });
    await expect(
      orchestrator.respondToProposal(token, {
        decision: 'ACCEPT',
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(ConflictException);

    expect(db.tables.donationAllocation).toHaveLength(1);
  });

  it('POST sur une proposal SUPERSEDED → 409 et GET affiche une page d’état', async () => {
    await setup();
    const proposal = activeProposal()!;
    await db.donationProposal.updateMany({
      where: { proposal_id: proposal.proposal_id },
      data: { status: 'SUPERSEDED' },
    });

    await expect(
      orchestrator.respondToProposal(proposal.token, {
        decision: 'ACCEPT',
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(ConflictException);

    const view = await orchestrator.getProposalView(proposal.token);
    expect(view.state).toBe('REMPLACEE');
  });

  it('POST sur une proposal expirée → 409, EXPIREE, et cascade', async () => {
    await setup();
    const proposal = activeProposal()!;
    await db.donationProposal.updateMany({
      where: { proposal_id: proposal.proposal_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });

    await expect(
      orchestrator.respondToProposal(proposal.token, {
        decision: 'ACCEPT',
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(ConflictException);

    const stored = db.tables.donationProposal.find(
      (p) => p.proposal_id === proposal.proposal_id
    );
    expect(stored!.status).toBe('EXPIREE');
    // Cascade vers l'asso B
    expect(activeProposal()).toBeDefined();
  });

  it('annulation titulaire : proposals SUPERSEDED, POST asso → 409 « don annulé »', async () => {
    const { pharmacy, donation } = await setup();
    const token = activeProposal()!.token;

    await orchestrator.cancelDonation(
      donation.donation_id,
      pharmacy.pharmacy_id,
      'user-1'
    );

    await expect(
      orchestrator.respondToProposal(token, {
        decision: 'ACCEPT',
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(ConflictException);
    const view = await orchestrator.getProposalView(token);
    expect(view.state).toBe('DON_ANNULE');
  });

  it('annulation impossible si un retrait est planifié', async () => {
    const { pharmacy, donation } = await setup();
    await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'ACCEPT',
      ...validSlot(),
    });

    await expect(
      orchestrator.cancelDonation(
        donation.donation_id,
        pharmacy.pharmacy_id,
        'user-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('le reliquat ne peut jamais être sur-alloué (garde + rollback)', async () => {
    const { product, donation } = await setup();
    const proposal = activeProposal()!;
    // Une autre allocation a déjà consommé 3 unités entre l'envoi et le POST
    await db.donationLine.updateMany({
      where: { donation_id: donation.donation_id },
      data: { quantity_allocated: { increment: 3 } },
    });

    await expect(
      orchestrator.respondToProposal(proposal.token, {
        decision: 'ACCEPT',
        lines: [{ product_id: product.product_id, quantity: 4 }],
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(ConflictException);

    const line = db.tables.donationLine[0];
    expect(line.quantity_allocated).toBe(3); // rollback : rien n'a bougé
    expect(line.quantity_allocated).toBeLessThanOrEqual(line.quantity_total);
    // La transaction annulée n'a pas consommé la proposal
    expect(
      db.tables.donationProposal.find(
        (p) => p.proposal_id === proposal.proposal_id
      )!.status
    ).toBe('ENVOYEE');
  });

  it('quantités hors bornes (supérieures au proposé) → 400', async () => {
    const { product } = await setup();
    await expect(
      orchestrator.respondToProposal(activeProposal()!.token, {
        decision: 'ACCEPT',
        lines: [{ product_id: product.product_id, quantity: 99 }],
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tout à zéro → 400 (utiliser le refus)', async () => {
    const { product } = await setup();
    await expect(
      orchestrator.respondToProposal(activeProposal()!.token, {
        decision: 'ACCEPT',
        lines: [{ product_id: product.product_id, quantity: 0 }],
        ...validSlot(),
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Retrait, non-récupération, épuisement', () => {
  async function setupAccepted() {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id, { stock_quantity: 10 });
    seedAsso({ name: 'Asso A' });
    seedAsso({ name: 'Asso B', lat: PHARMACY_POS.lat + 25 / 111.19 });
    const donation = (await orchestrator.createDonation(
      pharmacy.pharmacy_id,
      'user-1',
      { lines: [{ product_id: product.product_id, quantity: 5 }] }
    ))!;
    await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'ACCEPT',
      ...validSlot(),
    });
    return {
      pharmacy,
      product,
      donation,
      allocation: db.tables.donationAllocation[0],
    };
  }

  it('confirmPickup : RETIREE, Cerfa, stock décrémenté, don COMPLETEE', async () => {
    const { pharmacy, product, allocation } = await setupAccepted();

    const result = await orchestrator.confirmPickup(
      allocation.allocation_id,
      pharmacy.pharmacy_id,
      'Marie Bénévole',
      'TITULAIRE:user-1'
    );

    expect(result!.status).toBe('RETIREE');
    expect(result!.cerfa_number).toMatch(/^CERFA-DON-/);
    expect(
      db.tables.product.find((p) => p.product_id === product.product_id)!
        .stock_quantity
    ).toBe(5);
    expect(db.tables.donation[0].status).toBe('COMPLETEE');
    expect(email.sendPickupConfirmedEmail).toHaveBeenCalledTimes(1);
  });

  it('confirmPickup exige le nom du récupérateur et refuse le double appel', async () => {
    const { pharmacy, allocation } = await setupAccepted();
    await expect(
      orchestrator.confirmPickup(
        allocation.allocation_id,
        pharmacy.pharmacy_id,
        '  ',
        'TITULAIRE:user-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    await orchestrator.confirmPickup(
      allocation.allocation_id,
      pharmacy.pharmacy_id,
      'Marie',
      'TITULAIRE:user-1'
    );
    await expect(
      orchestrator.confirmPickup(
        allocation.allocation_id,
        pharmacy.pharmacy_id,
        'Marie',
        'TITULAIRE:user-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('non-récupération : quantités reversées, asso exclue, re-proposition', async () => {
    const { allocation } = await setupAccepted();
    const after = new Date(
      allocation.pickup_slot_end.getTime() + 25 * 3600 * 1000
    );

    const handled = await orchestrator.handleMissedPickups(after);

    expect(handled).toBe(1);
    expect(db.tables.donationAllocation[0].status).toBe('NON_RECUPEREE');
    expect(db.tables.donationLine[0].quantity_allocated).toBe(0);
    // Reliquat re-proposé à l'asso B (A est exclue : déjà sollicitée)
    const next = activeProposal();
    expect(next).toBeDefined();
    expect(next!.association_id).not.toBe(allocation.association_id);
    expect(email.sendPickupMissedAssociationEmail).toHaveBeenCalledTimes(1);
    expect(email.sendPickupMissedPharmacyEmail).toHaveBeenCalledTimes(1);
  });

  it('épuisement après 5 assos sollicitées : ECHOUEE + action au centre d’actions', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    const action = db.seed('action', {
      product_id: product.product_id,
      pharmacy_id: pharmacy.pharmacy_id,
      type: 'DON',
      status: 'VALIDEE',
      days_of_cover: 200,
      capital_locked: 100,
      recoverable_value: 50,
    });
    for (let i = 0; i < 6; i++) {
      seedAsso({
        name: `Asso ${i}`,
        lat: PHARMACY_POS.lat + (5 + i) / 111.19,
        contact_email: `asso${i}@example.org`,
      });
    }

    await orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
      action_id: action.action_id,
      lines: [{ product_id: product.product_id, quantity: 2 }],
    });
    // 5 refus successifs → 5 propositions consommées → épuisement
    for (let i = 0; i < 5; i++) {
      const proposal = activeProposal();
      if (!proposal) break;
      await orchestrator.respondToProposal(proposal.token, {
        decision: 'REFUSE',
      });
    }

    expect(db.tables.donation[0].status).toBe('ECHOUEE');
    expect(db.tables.donation[0].attempt_count).toBe(5);
    expect(
      db.tables.action.find((a) => a.action_id === action.action_id)!.status
    ).toBe('EN_ATTENTE');
    expect(email.sendDonationFailedEmail).toHaveBeenCalledTimes(1);
    const failEvent = db.tables.donationEvent.find(
      (e) => e.type === 'DON_ECHOUE'
    );
    expect(failEvent!.payload.reason).toBe('EPUISEMENT');
  });
});

describe('Idempotence des emails (cron)', () => {
  it('la relance mi-délai n’est jamais envoyée deux fois', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    seedAsso();
    await orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
      lines: [{ product_id: product.product_id, quantity: 2 }],
    });
    const midpoint = new Date(Date.now() + 40 * 3600 * 1000); // > 36h sur 72h

    expect(await orchestrator.sendResponseReminders(midpoint)).toBe(1);
    expect(await orchestrator.sendResponseReminders(midpoint)).toBe(0);
    expect(email.sendDonationReminderEmail).toHaveBeenCalledTimes(1);
  });

  it('rappels J-3 et J-1 idempotents', async () => {
    const pharmacy = seedPharmacy();
    const product = seedProduct(pharmacy.pharmacy_id);
    seedAsso();
    await orchestrator.createDonation(pharmacy.pharmacy_id, 'user-1', {
      lines: [{ product_id: product.product_id, quantity: 2 }],
    });
    const slots = computePickupSlots(ALL_DAYS as never, 7);
    const slot = slots[slots.length - 1]; // le plus lointain (≈ 7 jours)
    await orchestrator.respondToProposal(activeProposal()!.token, {
      decision: 'ACCEPT',
      slot_start: slot.start,
      slot_end: slot.end,
    });

    const j3 = new Date(
      new Date(slot.start).getTime() - 2.5 * 24 * 3600 * 1000
    );
    expect(await orchestrator.sendPickupReminders(j3)).toBe(1);
    expect(await orchestrator.sendPickupReminders(j3)).toBe(0);

    const j1 = new Date(new Date(slot.start).getTime() - 20 * 3600 * 1000);
    expect(await orchestrator.sendPickupReminders(j1)).toBe(1);
    expect(await orchestrator.sendPickupReminders(j1)).toBe(0);
    expect(email.sendPickupReminderEmail).toHaveBeenCalledTimes(2);
  });
});

describe('Scénario E2E : partiel → reliquat → 2 retraits → COMPLETEE', () => {
  it('déroule le cycle complet avec un Cerfa par allocation', async () => {
    const pharmacy = seedPharmacy();
    const cream = seedProduct(pharmacy.pharmacy_id, {
      name: 'Crème hydratante',
      stock_quantity: 10,
    });
    const shampoo = seedProduct(pharmacy.pharmacy_id, {
      name: 'Shampoing doux',
      stock_quantity: 8,
      unit_price: 5,
    });
    seedAsso({ name: 'Asso A', contact_email: 'a@example.org' });
    seedAsso({
      name: 'Asso B',
      lat: PHARMACY_POS.lat + 20 / 111.19,
      contact_email: 'b@example.org',
    });

    // 1. Le titulaire valide le don (multi-produits) — une seule fois
    const donation = (await orchestrator.createDonation(
      pharmacy.pharmacy_id,
      'user-1',
      {
        lines: [
          { product_id: cream.product_id, quantity: 6 },
          { product_id: shampoo.product_id, quantity: 4 },
        ],
      }
    ))!;

    // 2. L'asso A accepte partiellement (4 crèmes, 0 shampoing)
    const viewA = await orchestrator.respondToProposal(
      activeProposal()!.token,
      {
        decision: 'ACCEPT',
        lines: [
          { product_id: cream.product_id, quantity: 4 },
          { product_id: shampoo.product_id, quantity: 0 },
        ],
        ...validSlot(),
      }
    );
    expect(viewA.state).toBe('ACCEPTEE');

    // 3. Le reliquat (2 crèmes + 4 shampoings) est proposé à l'asso B
    const proposalB = activeProposal()!;
    const linesB = proposalB.proposed_lines as {
      product_id: string;
      quantity: number;
    }[];
    expect(linesB).toEqual([
      expect.objectContaining({ product_id: cream.product_id, quantity: 2 }),
      expect.objectContaining({ product_id: shampoo.product_id, quantity: 4 }),
    ]);

    // 4. L'asso B accepte tout le reliquat
    await orchestrator.respondToProposal(proposalB.token, {
      decision: 'ACCEPT',
      ...validSlot(),
    });
    expect(db.tables.donationAllocation).toHaveLength(2);
    expect(activeProposal()).toBeUndefined();

    // 5. Les deux retraits sont confirmés, chacun avec son Cerfa
    for (const allocation of [...db.tables.donationAllocation]) {
      await orchestrator.confirmPickup(
        allocation.allocation_id,
        pharmacy.pharmacy_id,
        'Bénévole',
        'TITULAIRE:user-1'
      );
    }
    const cerfas = db.tables.donationAllocation.map((a) => a.cerfa_number);
    expect(cerfas[0]).toBeTruthy();
    expect(cerfas[1]).toBeTruthy();
    expect(cerfas[0]).not.toBe(cerfas[1]);

    // 6. Don COMPLETEE, stock décrémenté, audit trail complet
    const finalDonation = db.tables.donation.find(
      (d) => d.donation_id === donation.donation_id
    );
    expect(finalDonation!.status).toBe('COMPLETEE');
    expect(
      db.tables.product.find((p) => p.product_id === cream.product_id)!
        .stock_quantity
    ).toBe(4);
    expect(
      db.tables.product.find((p) => p.product_id === shampoo.product_id)!
        .stock_quantity
    ).toBe(4);
    const types = db.tables.donationEvent.map((e) => e.type);
    expect(types).toEqual([
      'DON_CREE',
      'PROPOSITION_ENVOYEE',
      'PROPOSITION_ACCEPTEE_PARTIELLEMENT',
      'PROPOSITION_ENVOYEE',
      'PROPOSITION_ACCEPTEE',
      'RETRAIT_CONFIRME',
      'RETRAIT_CONFIRME',
      'DON_COMPLETE',
    ]);
  });
});

describe('computePickupSlots', () => {
  it('génère des créneaux sur les fenêtres par défaut', () => {
    const slots = computePickupSlots(DEFAULT_PICKUP_WINDOWS, 7);
    expect(slots.length).toBeGreaterThanOrEqual(5);
    for (const slot of slots) {
      expect(new Date(slot.start).getTime()).toBeGreaterThan(Date.now());
      expect(new Date(slot.end) > new Date(slot.start)).toBe(true);
    }
  });
});
