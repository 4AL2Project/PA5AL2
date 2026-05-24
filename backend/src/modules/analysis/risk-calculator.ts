interface Product {
  expiry_date: Date;
  stock_quantity: number;
  unit_price: number;
  cost_price?: number | null;
}

interface Sale {
  sale_date: Date;
  quantity_sold: number;
}

import { computeVelocity } from './sales-velocity';

export type RiskLevel = 'critical' | 'high' | 'safe';

export interface RiskResult {
  days_to_expiry: number;
  sales_velocity_30d: number;
  expected_sales: number;
  excess_stock: number;
  risk_score: number;
  risk_level: RiskLevel;
  suggested_action: string;
  recoverable_value: number;
  potential_loss: number;
}

function daysToExpiry(product: Product): number {
  const now = new Date();
  const expiry = new Date(product.expiry_date);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Classifie en 3 niveaux :
 * - safe     : les ventes couvrent le stock → aucune action
 * - high     : stock excédentaire mais il reste du temps → mise en vente B2C
 * - critical : le stock ne s'écoulera pas avant péremption → don associatif
 *
 * Seuils :
 *   score > 0.70  → safe
 *   score > 0.30  → high
 *   score ≤ 0.30  → critical
 */
function classify(score: number): RiskLevel {
  if (score > 0.7) return 'safe';
  if (score > 0.3) return 'high';
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

export function calculateRisk(product: Product, sales: Sale[]): RiskResult {
  const velocity = computeVelocity(sales);
  const days = daysToExpiry(product);

  const expected = velocity * days;
  const excess = Math.max(0, product.stock_quantity - expected);

  const score =
    product.stock_quantity > 0
      ? Math.min(1, expected / product.stock_quantity)
      : 0;

  const level = classify(score);
  const potentialLoss = excess * (product.cost_price ?? product.unit_price);

  // La valeur récupérable est estimée à 50 % du prix de vente de l'excédent
  // pour les niveaux high et critical (don ou vente B2C soldée)
  const recoveryRate = level === 'safe' ? 0 : 0.5;
  const recoverableValue = excess * product.unit_price * recoveryRate;

  return {
    days_to_expiry: days,
    sales_velocity_30d: velocity,
    expected_sales: expected,
    excess_stock: Math.round(excess),
    risk_score: parseFloat(score.toFixed(4)),
    risk_level: level,
    suggested_action: deriveAction(level),
    recoverable_value: parseFloat(recoverableValue.toFixed(2)),
    potential_loss: parseFloat(potentialLoss.toFixed(2)),
  };
}
