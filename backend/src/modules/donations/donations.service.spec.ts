// Cahier de tests : lectures titulaire du cycle don
// Couvre : liste isolée par tenant, détail (reliquat + annulabilité),
// bilan RSE basé sur les allocations RETIREE, aperçu des assos éligibles.

import { NotFoundException } from '@nestjs/common';

import { AssociationStatsService } from '../associations/association-stats.service';
import { DonationMatchingService } from './donation-matching.service';
import { DonationsService } from './donations.service';
import { createFakeDb, FakeDb } from './testing/fake-db';

jest.mock('../../database/client', () => ({ prisma: {} }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = require('../../database/client') as { prisma: FakeDb };

const PHARMACY_ID = 'pharma-1';
const OTHER_PHARMACY_ID = 'pharma-2';

let db: FakeDb;
let service: DonationsService;

function seedDonation(
  pharmacyId: string,
  overrides: Record<string, unknown> = {}
) {
  const product = db.seed('product', {
    pharmacy_id: pharmacyId,
    external_sku: `SKU-${Math.random()}`,
    name: 'Crème',
    category: 'Cosmétique',
    stock_quantity: 10,
    unit_price: 8,
  });
  const donation = db.seed('donation', {
    pharmacy_id: pharmacyId,
    ...overrides,
  });
  const line = db.seed('donationLine', {
    donation_id: donation.donation_id,
    product_id: product.product_id,
    quantity_total: 5,
    unit_value: 8,
  });
  return { donation, product, line };
}

beforeEach(() => {
  db = createFakeDb();
  Object.assign(clientModule.prisma, db);
  db.seed('pharmacy', {
    pharmacy_id: PHARMACY_ID,
    name: 'Pharmacie',
    email: 'p@x.fr',
    lat: 48.8566,
    lng: 2.3522,
  });
  service = new DonationsService(
    new DonationMatchingService(new AssociationStatsService())
  );
});

describe('DonationsService — listes et détail', () => {
  it('ne liste que les dons de la pharmacie du token (isolation tenant)', async () => {
    seedDonation(PHARMACY_ID);
    seedDonation(OTHER_PHARMACY_ID);

    const list = await service.listForPharmacy(PHARMACY_ID);
    expect(list).toHaveLength(1);
    expect(list[0].pharmacy_id).toBe(PHARMACY_ID);
  });

  it('filtre par statut', async () => {
    seedDonation(PHARMACY_ID, { status: 'EN_COURS' });
    seedDonation(PHARMACY_ID, { status: 'COMPLETEE' });

    const done = await service.listForPharmacy(PHARMACY_ID, 'COMPLETEE');
    expect(done).toHaveLength(1);
    expect(done[0].status).toBe('COMPLETEE');
  });

  it('getDetail expose le reliquat et l’annulabilité', async () => {
    const { donation, line } = seedDonation(PHARMACY_ID);
    await db.donationLine.updateMany({
      where: { line_id: line.line_id },
      data: { quantity_allocated: 2 },
    });

    const detail = await service.getDetail(donation.donation_id, PHARMACY_ID);
    expect(detail.remaining[0].quantity_remaining).toBe(3);
    expect(detail.cancellable).toBe(true);
  });

  it('getDetail : non annulable dès qu’un retrait est planifié', async () => {
    const { donation, line } = seedDonation(PHARMACY_ID);
    const asso = db.seed('association', { name: 'A' });
    const proposal = db.seed('donationProposal', {
      donation_id: donation.donation_id,
      association_id: asso.association_id,
      status: 'ACCEPTEE',
      proposed_lines: [],
      expires_at: new Date(),
    });
    db.seed('donationAllocation', {
      donation_id: donation.donation_id,
      association_id: asso.association_id,
      proposal_id: proposal.proposal_id,
      lines: [
        {
          product_id: line.product_id,
          name: 'Crème',
          quantity: 5,
          unit_value: 8,
        },
      ],
      pickup_slot_start: new Date(),
      pickup_slot_end: new Date(),
    });

    const detail = await service.getDetail(donation.donation_id, PHARMACY_ID);
    expect(detail.cancellable).toBe(false);
  });

  it('getDetail refuse l’accès cross-tenant', async () => {
    const { donation } = seedDonation(OTHER_PHARMACY_ID);
    await expect(
      service.getDetail(donation.donation_id, PHARMACY_ID)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DonationsService — bilan RSE', () => {
  it('ne compte que les allocations RETIREE, valeurs des lignes retirées', async () => {
    const { donation, product } = seedDonation(PHARMACY_ID, {
      status: 'COMPLETEE',
    });
    const asso = db.seed('association', { name: 'A' });
    const mk = (status: string, qty: number) => {
      const proposal = db.seed('donationProposal', {
        donation_id: donation.donation_id,
        association_id: asso.association_id,
        status: 'ACCEPTEE',
        proposed_lines: [],
        expires_at: new Date(),
      });
      db.seed('donationAllocation', {
        donation_id: donation.donation_id,
        association_id: asso.association_id,
        proposal_id: proposal.proposal_id,
        status,
        lines: [
          {
            product_id: product.product_id,
            name: 'Crème',
            quantity: qty,
            unit_value: 8,
          },
        ],
        pickup_slot_start: new Date(),
        pickup_slot_end: new Date(),
      });
    };
    mk('RETIREE', 3);
    mk('NON_RECUPEREE', 2);

    const bilan = await service.getBilan(PHARMACY_ID);
    expect(bilan.total_withdrawn).toBe(1);
    // 3 × 8 € ; la non-récupérée ne compte pas
    expect(bilan.total_value_donated).toBe(24);
    expect(bilan.total_associations).toBe(1);
    expect(bilan.donations_by_status.COMPLETEE).toBe(1);
  });
});

describe('DonationsService — aperçu éligibilité', () => {
  it('retourne le nombre d’assos éligibles pour le dialog de validation', async () => {
    const { product } = seedDonation(PHARMACY_ID);
    db.seed('association', {
      name: 'Éligible',
      status: 'ACTIVE',
      email_verified_at: new Date(),
      lat: 48.8566 + 10 / 111.19,
      lng: 2.3522,
      action_radius_km: 30,
      categories: ['Cosmétique'],
      pickup_sla_days: 7,
      response_sla_hours: 72,
      last_proposal_at: null,
    });

    const preview = await service.eligiblePreview(PHARMACY_ID, [
      { product_id: product.product_id, quantity: 2 },
    ]);
    expect(preview.count).toBe(1);
    expect(preview.associations[0].name).toBe('Éligible');
  });
});
