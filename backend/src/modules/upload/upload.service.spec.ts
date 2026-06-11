/**
 * US-11 — Déduplication des ventes (bug critique)
 * Clé de dédup : product_id + sale_date + quantity_sold
 */
import { ActionsService } from '../actions/actions.service';
import { AnalysisService } from '../analysis/analysis.service';
import { UploadService } from './upload.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    pharmacy: { update: jest.fn() },
    product: { findFirst: jest.fn(), findUnique: jest.fn() },
    sale: { upsert: jest.fn(), count: jest.fn() },
  },
}));

jest.mock('../analysis/analysis.service');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    pharmacy: { update: jest.Mock };
    product: { findFirst: jest.Mock; findUnique: jest.Mock };
    sale: { upsert: jest.Mock; count: jest.Mock };
  };
};

// --- Helpers -----------------------------------------------------------------
function makeSalesFile(rows: string): Express.Multer.File {
  const csv = `external_sku,sale_date,quantity_sold,unit_price_sold\n${rows}`;
  return {
    buffer: Buffer.from(csv),
    mimetype: 'text/csv',
    originalname: 'sales.csv',
  } as Express.Multer.File;
}

const PHARMACY_ID = 'pharma-uuid';
const PRODUCT_ID = 'product-uuid';

// --- Tests -------------------------------------------------------------------
describe('UploadService — déduplication des ventes (US-11)', () => {
  let service: UploadService;
  let analysisMock: jest.Mocked<AnalysisService>;

  beforeEach(() => {
    jest.clearAllMocks();
    analysisMock = new AnalysisService(
      {} as ActionsService
    ) as jest.Mocked<AnalysisService>;
    analysisMock.analyzeAllForPharmacy = jest
      .fn()
      .mockResolvedValue({ succeeded: 0, failed: 0, total: 0 });
    service = new UploadService(analysisMock);

    prisma.pharmacy.update.mockResolvedValue({} as never);
    prisma.product.findFirst.mockResolvedValue({
      product_id: PRODUCT_ID,
      external_sku: 'SKU-001',
    } as never);
  });

  describe('Critère : aucune vente dupliquée à la ré-importation', () => {
    it('importer deux fois le même fichier ne crée pas de doublon', async () => {
      const file = makeSalesFile('SKU-001,2024-01-15,10,5.50');

      // Premier import
      await service.processUpload(PHARMACY_ID, undefined, file);
      const firstCallCount = prisma.sale.upsert.mock.calls.length;
      expect(firstCallCount).toBe(1);

      jest.clearAllMocks();
      prisma.pharmacy.update.mockResolvedValue({} as never);
      prisma.product.findFirst.mockResolvedValue({
        product_id: PRODUCT_ID,
        external_sku: 'SKU-001',
      } as never);
      analysisMock.analyzeAllForPharmacy.mockResolvedValue({
        succeeded: 0,
        failed: 0,
        total: 0,
      });

      // Deuxième import du même fichier
      await service.processUpload(PHARMACY_ID, undefined, file);
      const secondCallCount = prisma.sale.upsert.mock.calls.length;
      expect(secondCallCount).toBe(1);

      // Vérifie que l'upsert utilise la clé de dédup
      const upsertCall = prisma.sale.upsert.mock.calls[0][0];
      expect(upsertCall.where).toMatchObject({
        product_id_sale_date_quantity_sold: {
          product_id: PRODUCT_ID,
          sale_date: new Date('2024-01-15'),
          quantity_sold: 10,
        },
      });
    });

    it('utilise upsert (pas create) pour chaque ligne de vente', async () => {
      const file = makeSalesFile('SKU-001,2024-01-15,10,5.50');
      await service.processUpload(PHARMACY_ID, undefined, file);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Critère : clé de dédup = external_sku + sale_date + quantity_sold', () => {
    it('deux lignes avec même SKU + date + quantité → un seul upsert', async () => {
      const file = makeSalesFile(
        'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-15,10,6.00'
      );
      await service.processUpload(PHARMACY_ID, undefined, file);

      // Deux appels upsert (l'idempotence est gérée par la DB via la contrainte unique)
      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      // Les deux calls ont la même clé where → la DB déduplique
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).toEqual(call2.where);
    });

    it('deux lignes avec même SKU + date mais quantité différente → deux upserts distincts', async () => {
      const file = makeSalesFile(
        'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-15,5,5.50'
      );
      await service.processUpload(PHARMACY_ID, undefined, file);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).not.toEqual(call2.where);
    });

    it('deux lignes avec même SKU + quantité mais dates différentes → deux upserts distincts', async () => {
      const file = makeSalesFile(
        'SKU-001,2024-01-15,10,5.50\nSKU-001,2024-01-16,10,5.50'
      );
      await service.processUpload(PHARMACY_ID, undefined, file);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      const [call1, call2] = prisma.sale.upsert.mock.calls.map((c) => c[0]);
      expect(call1.where).not.toEqual(call2.where);
    });
  });

  describe('Comportement existant préservé', () => {
    it('saute une vente si le SKU produit est inconnu', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      const file = makeSalesFile('SKU-INCONNU,2024-01-15,10,5.50');

      const result = await service.processUpload(PHARMACY_ID, undefined, file);

      expect(prisma.sale.upsert).not.toHaveBeenCalled();
      expect(result.sales?.skipped).toBe(1);
    });

    it('traite plusieurs ventes de SKUs différents', async () => {
      prisma.product.findFirst
        .mockResolvedValueOnce({
          product_id: 'product-1',
          external_sku: 'SKU-001',
        } as never)
        .mockResolvedValueOnce({
          product_id: 'product-2',
          external_sku: 'SKU-002',
        } as never);

      const file = makeSalesFile(
        'SKU-001,2024-01-15,10,5.50\nSKU-002,2024-01-15,3,12.00'
      );
      const result = await service.processUpload(PHARMACY_ID, undefined, file);

      expect(prisma.sale.upsert).toHaveBeenCalledTimes(2);
      expect(result.sales?.inserted).toBe(2);
    });
  });
});
