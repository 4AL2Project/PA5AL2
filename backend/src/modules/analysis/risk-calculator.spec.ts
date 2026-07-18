// US-20 — Tests moteur dormance (days_of_cover)
// Kani — v1
import { calculateRisk, DormanceResult, RiskLevel } from './risk-calculator';

function makeSales(
  quantityPerDay: number,
  days = 30
): { sale_date: Date; quantity_sold: number }[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { sale_date: d, quantity_sold: quantityPerDay };
  });
}

const BASE_PRODUCT = {
  stock_quantity: 60,
  unit_price: 10,
  cost_price: 6,
};

describe('calculateRisk — stock dormant (US-20)', () => {
  describe('classification par jours de couverture', () => {
    it('< 60 jours → safe', () => {
      // velocity = 2/j → cover = 60/2 = 30j
      const result = calculateRisk(BASE_PRODUCT, makeSales(2));
      expect(result.risk_level).toBe<RiskLevel>('safe');
      expect(result.days_of_cover).toBeCloseTo(30, 0);
    });

    it('60–179 jours → high', () => {
      // velocity = 0.5/j → cover = 60/0.5 = 120j
      const result = calculateRisk(BASE_PRODUCT, makeSales(0.5));
      expect(result.risk_level).toBe<RiskLevel>('high');
      expect(result.days_of_cover).toBeCloseTo(120, 0);
    });

    it('≥ 180 jours → critical', () => {
      // velocity ≈ 0.1/j → cover = 60/0.1 = 600j
      const result = calculateRisk(
        { ...BASE_PRODUCT, stock_quantity: 60 },
        makeSales(0.1)
      );
      expect(result.risk_level).toBe<RiskLevel>('critical');
    });

    it('velocity = 0 → critical (stock dormant)', () => {
      const result = calculateRisk(BASE_PRODUCT, []);
      expect(result.risk_level).toBe<RiskLevel>('critical');
      expect(result.days_of_cover).toBe(9999);
      expect(result.suggested_action).toBe('Don associatif');
    });
  });

  describe('cas limites', () => {
    it('stock = 0, velocity > 0 → safe (cover = 0)', () => {
      const result = calculateRisk(
        { ...BASE_PRODUCT, stock_quantity: 0 },
        makeSales(1)
      );
      expect(result.days_of_cover).toBe(0);
      expect(result.risk_level).toBe<RiskLevel>('safe');
    });

    it('cost_price absent → utilise unit_price pour capital_locked', () => {
      const result = calculateRisk(
        { stock_quantity: 10, unit_price: 20, cost_price: null },
        []
      );
      expect(result.capital_locked).toBeCloseTo(200, 2);
    });

    it('capital_locked = stock × cost_price', () => {
      const result = calculateRisk(BASE_PRODUCT, makeSales(2));
      expect(result.capital_locked).toBeCloseTo(60 * 6, 2);
    });

    it('recoverable_value = 0 pour safe', () => {
      const result = calculateRisk(BASE_PRODUCT, makeSales(2));
      expect(result.recoverable_value).toBe(0);
    });

    it('recoverable_value = 50% du prix de vente pour high/critical', () => {
      // critical (velocity=0)
      const result = calculateRisk(BASE_PRODUCT, []);
      expect(result.recoverable_value).toBeCloseTo(
        BASE_PRODUCT.stock_quantity * BASE_PRODUCT.unit_price * 0.5,
        2
      );
    });

    it('potential_loss = capital_locked', () => {
      const result = calculateRisk(BASE_PRODUCT, makeSales(0.1));
      expect(result.potential_loss).toBe(result.capital_locked);
    });
  });

  describe('actions suggérées', () => {
    it('safe → Aucune action', () => {
      expect(calculateRisk(BASE_PRODUCT, makeSales(2)).suggested_action).toBe(
        'Aucune action'
      );
    });
    it('high → Mise en vente B2C', () => {
      expect(calculateRisk(BASE_PRODUCT, makeSales(0.5)).suggested_action).toBe(
        'Mise en vente B2C'
      );
    });
    it('critical → Don associatif', () => {
      expect(calculateRisk(BASE_PRODUCT, []).suggested_action).toBe(
        'Don associatif'
      );
    });
  });

  describe('champs retournés', () => {
    it('retourne tous les champs DormanceResult', () => {
      const result: DormanceResult = calculateRisk(BASE_PRODUCT, makeSales(1));
      expect(result).toMatchObject<Partial<DormanceResult>>({
        days_of_cover: expect.any(Number),
        sales_velocity_30d: expect.any(Number),
        capital_locked: expect.any(Number),
        risk_level: expect.stringMatching(/^(safe|high|critical)$/),
        suggested_action: expect.any(String),
        recoverable_value: expect.any(Number),
        potential_loss: expect.any(Number),
      });
    });
  });
});
