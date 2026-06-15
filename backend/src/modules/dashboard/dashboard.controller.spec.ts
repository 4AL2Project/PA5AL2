// Cahier de tests US-40 — Dashboard dormance KPIs
// Couvre : capital immobilisé, comptages, top10, pending_actions, missing_cost_price

import { DashboardController } from './dashboard.controller';

jest.mock('../../database/client', () => ({
  prisma: {
    pharmacy: { findUnique: jest.fn() },
    riskAnalysis: { findMany: jest.fn() },
    action: { count: jest.fn() },
    product: { count: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    pharmacy: { findUnique: jest.Mock };
    riskAnalysis: { findMany: jest.Mock };
    action: { count: jest.Mock };
    product: { count: jest.Mock };
  };
};

const PHARMACY_ID = 'pharma-uuid-test';

function makeAnalysis(
  productId: string,
  riskLevel: string,
  capitalLocked: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    analysis_id: `analysis-${productId}`,
    product_id: productId,
    pharmacy_id: PHARMACY_ID,
    analysis_date: new Date(),
    days_of_cover: riskLevel === 'critical' ? 999 : 90,
    sales_velocity_30d: riskLevel === 'critical' ? 0 : 5,
    capital_locked: capitalLocked,
    risk_level: riskLevel,
    suggested_action: riskLevel === 'critical' ? 'DON' : 'B2C',
    recoverable_value: capitalLocked * 0.7,
    potential_loss: capitalLocked * 0.3,
    product: {
      name: `Produit ${productId}`,
      external_sku: `SKU-${productId}`,
      category: 'Soins',
    },
    ...overrides,
  };
}

function makePharmacy(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Pharmacie Test',
    last_upload_at: new Date(),
    subscription_tier: 'free',
    ...overrides,
  };
}

describe('DashboardController — US-40', () => {
  let controller: DashboardController;

  beforeEach(() => {
    controller = new DashboardController();
    jest.clearAllMocks();
  });

  describe('TC-01 — Capital immobilisé = somme des capital_locked', () => {
    it('additionne correctement le capital_locked de toutes les analyses', async () => {
      const analyses = [
        makeAnalysis('prod-1', 'critical', 1000),
        makeAnalysis('prod-2', 'high', 2500),
        makeAnalysis('prod-3', 'safe', 200),
      ];
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue(analyses);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.summary.total_capital_locked).toBe(3700);
    });

    it('renvoie 0 si aucun produit analysé', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue([]);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.summary.total_capital_locked).toBe(0);
      expect(result.summary.total_products).toBe(0);
    });
  });

  describe('TC-02/03 — Comptage produits dormants et critique', () => {
    it('by_risk_level reflète la répartition exacte', async () => {
      const analyses = [
        makeAnalysis('prod-1', 'critical', 1000),
        makeAnalysis('prod-2', 'critical', 800),
        makeAnalysis('prod-3', 'critical', 600),
        makeAnalysis('prod-4', 'high', 300),
        makeAnalysis('prod-5', 'high', 200),
        makeAnalysis('prod-6', 'safe', 50),
        makeAnalysis('prod-7', 'safe', 30),
      ];
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue(analyses);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.summary.by_risk_level.critical).toBe(3);
      expect(result.summary.by_risk_level.high).toBe(2);
      expect(result.summary.by_risk_level.safe).toBe(2);
      expect(result.summary.total_products).toBe(7);
    });
  });

  describe('TC-04 — Pending actions count', () => {
    it('expose le nombre d`actions EN_ATTENTE', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue([]);
      prisma.action.count.mockResolvedValue(4);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.summary.pending_actions).toBe(4);
      expect(prisma.action.count).toHaveBeenCalledWith({
        where: { pharmacy_id: PHARMACY_ID, status: 'EN_ATTENTE' },
      });
    });
  });

  describe('TC-05 — Top 10 produits dormants triés par capital desc', () => {
    it('renvoie au plus 10 produits (high + critical), triés par capital desc', async () => {
      const analyses = Array.from({ length: 12 }, (_, i) =>
        makeAnalysis(
          `prod-${i}`,
          i % 3 === 0 ? 'critical' : 'high',
          (12 - i) * 100
        )
      ).concat([makeAnalysis('prod-safe', 'safe', 9999)]);

      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue(analyses);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.top10_dormants).toHaveLength(10);
      // Trié par capital desc
      for (let i = 1; i < result.top10_dormants.length; i++) {
        expect(
          result.top10_dormants[i - 1].capital_locked
        ).toBeGreaterThanOrEqual(result.top10_dormants[i].capital_locked);
      }
      // Pas de produits safe dans le top 10
      expect(result.top10_dormants.every((d) => d.risk_level !== 'safe')).toBe(
        true
      );
    });

    it('renvoie moins de 10 entrées si peu de produits dormants', async () => {
      const analyses = [
        makeAnalysis('prod-1', 'critical', 500),
        makeAnalysis('prod-2', 'high', 300),
        makeAnalysis('prod-3', 'safe', 100),
      ];
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue(analyses);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.top10_dormants).toHaveLength(2);
    });
  });

  describe('TC-09 — Warning cost_price manquant', () => {
    it('expose le nombre de produits sans cost_price', async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue([]);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(3);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.summary.missing_cost_price_count).toBe(3);
    });
  });

  describe('TC-10 — Isolation tenant', () => {
    it("n'interroge la DB qu'avec le pharmacy_id du token", async () => {
      prisma.pharmacy.findUnique.mockResolvedValue(makePharmacy());
      prisma.riskAnalysis.findMany.mockResolvedValue([]);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      await controller.getDashboard(PHARMACY_ID);

      expect(prisma.riskAnalysis.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pharmacy_id: PHARMACY_ID }),
        })
      );
      expect(prisma.action.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pharmacy_id: PHARMACY_ID }),
        })
      );
    });
  });

  describe('last_upload_at — données stales', () => {
    it('expose last_upload_at depuis la pharmacie', async () => {
      const lastUpload = new Date('2024-01-01');
      prisma.pharmacy.findUnique.mockResolvedValue(
        makePharmacy({ last_upload_at: lastUpload })
      );
      prisma.riskAnalysis.findMany.mockResolvedValue([]);
      prisma.action.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);

      const result = await controller.getDashboard(PHARMACY_ID);

      expect(result.pharmacy?.last_upload_at).toEqual(lastUpload);
    });
  });
});
