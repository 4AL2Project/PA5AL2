/**
 * US-11 — Déduplication des ventes (bug critique)
 * Clé de dédup : product_id + sale_date + quantity_sold
 *
 * Ces tests couvrent la phase d'écriture des ventes du worker (writeSales).
 * On teste le comportement observable : les appels Prisma upsert avec la bonne clé.
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';

import { ActionsService } from '../actions/actions.service';
import { AnalysisService } from '../analysis/analysis.service';
import { IngestionWorker } from './ingestion.worker';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    pharmacy: { update: jest.fn() },
    product: { findMany: jest.fn(), findFirst: jest.fn() },
    sale: { upsert: jest.fn() },
    import: { update: jest.fn() },
    $transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
  },
}));

jest.mock('../analysis/analysis.service');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    pharmacy: { update: jest.Mock };
    product: { findMany: jest.Mock; findFirst: jest.Mock };
    sale: { upsert: jest.Mock };
    import: { update: jest.Mock };
    $transaction: jest.Mock;
  };
};

// --- Helpers -----------------------------------------------------------------
function makeSalesJobData(rows: string) {
  const csv = `external_sku,sale_date,quantity_sold,unit_price_sold\n${rows}`;
  return {
    import_id: 'import-uuid',
    pharmacy_id: 'pharma-uuid',
    file_type: 'sales' as const,
    buffer: Buffer.from(csv).toString('base64'),
    mimetype: 'text/csv',
  };
}

function makeJob(data: ReturnType<typeof makeSalesJobData>) {
  return { data } as Job<typeof data>;
}

const PHARMACY_ID = 'pharma-uuid';
const PRODUCT_ID = 'product-uuid';

// --- Tests -------------------------------------------------------------------
describe('IngestionWorker — déduplication des ventes (US-11)', () => {
  let worker: IngestionWorker;
  let analysisMock: jest.Mocked<AnalysisService>;
  let emitterMock: EventEmitter2;

  beforeEach(() => {
    jest.clearAllMocks();

    analysisMock = new AnalysisService(
      {} as ActionsService
    ) as jest.Mocked<AnalysisService>;
    analysisMock.analyzeAllForPharmacy = jest
      .fn()
      .mockResolvedValue({ succeeded: 0, failed: 0, total: 0 });

    emitterMock = { emit: jest.fn() } as unknown as EventEmitter2;
    worker = new IngestionWorker(emitterMock, analysisMock);

    prisma.import.update.mockResolvedValue({} as never);
    prisma.pharmacy.update.mockResolvedValue({} as never);
    prisma.product.findMany.mockResolvedValue([
      { product_id: PRODUCT_ID, external_sku: 'SKU-001' },
    ] as never);
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
    prisma.sale.upsert.mockResolvedValue({} as never);
  });

  describe('Critère : aucune vente dupliquée à la ré-importation', () => {
    it('importer deux fois le même fichier appelle upsert avec la même clé', async () => {
      const job = makeJob(makeSalesJobData('SKU-001,2024-01-15,10,5.50'));

      await worker.process(job);
      const firstUpsertCall = prisma.sale.upsert.mock.calls[0][0];

      jest.clearAllMocks();
      prisma.import.update.mockResolvedValue({} as never);
      prisma.pharmacy.update.mockResolvedValue({} as never);
      prisma.product.findMany.mockResolvedValue([
        { product_id: PRODUCT_ID, external_sku: 'SKU-001' },
      ] as never);
      prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
      prisma.sale.upsert.mockResolvedValue({} as never);
      analysisMock.analyzeAllForPharmacy.mockResolvedValue({
        succeeded: 0,
        failed: 0,
        total: 0,
      });

      await worker.process(job);
      const secondUpsertCall = prisma.sale.upsert.mock.calls[0][0];

      expect(firstUpsertCall.where).toEqual(secondUpsertCall.where);
      expect(firstUpsertCall.where).toMatchObject({
        product_id_sale_date_quantity_sold: {
          product_id: PRODUCT_ID,
          sale_date: new Date('2024-01-15'),
          quantity_sold: 10,
        },
      });
    });
  });

  describe('Critère : clé de dédup = external_sku + sale_date + quantity_sold', () => {
    it('deux lignes avec même SKU + date + quantité → même clé where', async () => {
      const job = makeJob(
        makeSalesJobData(
          'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-15,10,6.00'
        )
      );
      await worker.process(job);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).toEqual(call2.where);
    });

    it('deux lignes avec même SKU + date mais quantité différente → clés distinctes', async () => {
      const job = makeJob(
        makeSalesJobData(
          'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-15,5,5.50'
        )
      );
      await worker.process(job);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).not.toEqual(call2.where);
    });

    it('deux lignes avec même SKU + quantité mais dates différentes → clés distinctes', async () => {
      const job = makeJob(
        makeSalesJobData(
          'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-16,10,5.50'
        )
      );
      await worker.process(job);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).not.toEqual(call2.where);
    });
  });

  describe('Comportement existant préservé', () => {
    it('saute silencieusement les lignes avec SKU inconnu', async () => {
      prisma.product.findMany.mockResolvedValue([] as never);
      const job = makeJob(makeSalesJobData('SKU-INCONNU,2024-01-15,10,5.50'));

      await worker.process(job);

      expect(prisma.sale.upsert).not.toHaveBeenCalled();
    });

    it('traite plusieurs ventes de SKUs différents', async () => {
      prisma.product.findMany.mockResolvedValue([
        { product_id: 'product-1', external_sku: 'SKU-001' },
        { product_id: 'product-2', external_sku: 'SKU-002' },
      ] as never);

      const job = makeJob(
        makeSalesJobData(
          'SKU-001,2024-01-15,10,5.50\nSKU-002,2024-01-15,3,12.00'
        )
      );
      await worker.process(job);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tout-ou-rien : échec de validation', () => {
    it('une ligne invalide → aucun upsert sale, Import marqué ÉCHOUÉ', async () => {
      const csv = `external_sku,sale_date,quantity_sold\nSKU-001,invalid-date,10`;
      const jobData = {
        import_id: 'import-uuid',
        pharmacy_id: PHARMACY_ID,
        file_type: 'sales' as const,
        buffer: Buffer.from(csv).toString('base64'),
        mimetype: 'text/csv',
      };

      await worker.process(makeJob(jobData));

      expect(prisma.sale.upsert).not.toHaveBeenCalled();
      expect(prisma.import.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ÉCHOUÉ' }),
        })
      );
    });
  });
});
