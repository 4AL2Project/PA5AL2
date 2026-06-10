// US-20 — Pivot stock dormant : days_of_cover remplace days_to_expiry
// Kani — v1
import { computeVelocity } from './sales-velocity';

interface Product {
  stock_quantity: number;
  unit_price: number;
  cost_price?: number | null;
}

interface Sale {
  sale_date: Date;
  quantity_sold: number;
}

export type RiskLevel = 'critical' | 'high' | 'safe';

export interface DormanceResult {
  days_of_cover: number;
  sales_velocity_30d: number;
  capital_locked: number;
  risk_level: RiskLevel;
  suggested_action: string;
  recoverable_value: number;
  potential_loss: number;
}

// Couverture < 60j → stock sain, 60–179j → excédentaire, ≥ 180j → dormant
const COVER_SAFE_MAX = 60;
const COVER_HIGH_MAX = 180;
// Valeur sentinelle pour velocity == 0 (stock ne tourne pas)
const INFINITE_COVER = 9999;

function classify(velocity: number, daysOfCover: number): RiskLevel {
  if (velocity === 0) return 'critical';
  if (daysOfCover < COVER_SAFE_MAX) return 'safe';
  if (daysOfCover < COVER_HIGH_MAX) return 'high';
  return 'critical';
}

function deriveAction(level: RiskLevel): string {
  switch (level) {
    case 'safe':
      return 'Aucune action';
    case 'high':
      return 'Mise en vente B2C';
    case 'critical':
      return 'Don associatif';
  }
}

export function calculateRisk(product: Product, sales: Sale[]): DormanceResult {
  const velocity = computeVelocity(sales);
  const rawCover =
    velocity > 0 ? product.stock_quantity / velocity : INFINITE_COVER;
  const daysOfCover = parseFloat(Math.min(rawCover, INFINITE_COVER).toFixed(1));

  const costPerUnit = product.cost_price ?? product.unit_price;
  const capitalLocked = parseFloat(
    (product.stock_quantity * costPerUnit).toFixed(2),
  );

  const level = classify(velocity, daysOfCover);

  // 50 % du prix de vente estimé récupérable en vente B2C soldée ou don
  const recoveryRate = level === 'safe' ? 0 : 0.5;
  const recoverableValue = parseFloat(
    (product.stock_quantity * product.unit_price * recoveryRate).toFixed(2),
  );

  return {
    days_of_cover: daysOfCover,
    sales_velocity_30d: parseFloat(velocity.toFixed(4)),
    capital_locked: capitalLocked,
    risk_level: level,
    suggested_action: deriveAction(level),
    recoverable_value: recoverableValue,
    potential_loss: capitalLocked,
  };
}
