// Cahier de tests : reçu Cerfa par ALLOCATION retirée
// Couvre : invariant RETIREE, isolation tenant, valeurs des lignes de
// l'allocation uniquement, PDF généré.

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CerfaService } from './cerfa.service';
import { createFakeDb, FakeDb } from './testing/fake-db';

jest.mock('../../database/client', () => ({ prisma: {} }));
jest.mock('./cerfa.generator', () => ({
  generateCerfaPdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateCerfaPdf } = require('./cerfa.generator') as {
  generateCerfaPdf: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = require('../../database/client') as { prisma: FakeDb };

const PHARMACY_ID = 'pharma-1';

let db: FakeDb;
let service: CerfaService;

function seedAllocation(overrides: Record<string, unknown> = {}) {
  db.seed('pharmacy', {
    pharmacy_id: PHARMACY_ID,
    name: 'Pharmacie du Test',
    email: 'p@x.fr',
    address: '1 rue du Test',
    siret: '12345678900011',
  });
  const product = db.seed('product', {
    pharmacy_id: PHARMACY_ID,
    external_sku: 'SKU-1',
    name: 'Crème',
    lot_number: 'LOT-42',
    stock_quantity: 10,
    unit_price: 8,
  });
  const asso = db.seed('association', {
    name: 'Les Restos',
    address: '2 rue des Assos',
    city: 'Paris',
    postal_code: '75011',
  });
  const donation = db.seed('donation', { pharmacy_id: PHARMACY_ID });
  const proposal = db.seed('donationProposal', {
    donation_id: donation.donation_id,
    association_id: asso.association_id,
    status: 'ACCEPTEE',
    proposed_lines: [],
    expires_at: new Date(),
  });
  return db.seed('donationAllocation', {
    donation_id: donation.donation_id,
    association_id: asso.association_id,
    proposal_id: proposal.proposal_id,
    status: 'RETIREE',
    cerfa_number: 'CERFA-DON-1',
    picked_up_at: new Date('2026-07-10'),
    picked_up_by: 'Marie',
    lines: [
      {
        product_id: product.product_id,
        name: 'Crème',
        quantity: 3,
        unit_value: 8,
      },
    ],
    pickup_slot_start: new Date(),
    pickup_slot_end: new Date(),
    ...overrides,
  });
}

beforeEach(() => {
  db = createFakeDb();
  Object.assign(clientModule.prisma, db);
  service = new CerfaService();
});

describe('CerfaService', () => {
  it('génère le PDF avec les valeurs des lignes de CETTE allocation uniquement', async () => {
    const allocation = seedAllocation();
    const pdf = await service.generateCerfa(
      allocation.allocation_id,
      PHARMACY_ID
    );
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(generateCerfaPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        cerfa_number: 'CERFA-DON-1',
        association_name: 'Les Restos',
        pharmacy_name: 'Pharmacie du Test',
        lines: [
          {
            product_name: 'Crème',
            lot_number: 'LOT-42',
            quantity: 3,
            unit_value: 8,
          },
        ],
      })
    );
  });

  it('refuse une allocation encore PLANIFIEE', async () => {
    const allocation = seedAllocation({
      status: 'PLANIFIEE',
      cerfa_number: null,
      picked_up_at: null,
    });
    await expect(
      service.generateCerfa(allocation.allocation_id, PHARMACY_ID)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse l’accès cross-tenant', async () => {
    const allocation = seedAllocation();
    await expect(
      service.generateCerfa(allocation.allocation_id, 'autre-pharmacie')
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allocation inconnue → 404', async () => {
    seedAllocation();
    await expect(
      service.generateCerfa('inconnue', PHARMACY_ID)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
