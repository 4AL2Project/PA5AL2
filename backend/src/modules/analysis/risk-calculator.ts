import { Product, Sale } from '@prisma/client';
import { computeVelocity } from './sales-velocity';
import { getDiscount } from './discount';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'safe';

export interface RiskResult {
  days_to_expiry: number;
  sales_velocity_30d: number;
  expected_sales: number;
  excess_stock: number;
  risk_score: number;
  risk_level: RiskLevel;
  suggested_discount: number;
  recoverable_value: number;
  potential_loss: Float32Array | number;
}

function daysToExpiry(product: Product): number {
  const now = new Date();
  const expiry = new Date(product.expiry_date);
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function classify(score: number): RiskLevel {
  if (score <= 0.2) return 'critical';
  if (score <= 0.4) return 'high';
  if (score <= 0.6) return 'moderate';
  if (score <= 0.8) return 'low';
  return 'safe';
}

export function calculateRisk(product: Product, sales: Sale[]): RiskResult {
  const velocity = computeVelocity(sales);
  const days = daysToExpiry(product);

  const expected = velocity * days;
  const excess = Math.max(0, product.stock_quantity - expected);

  // score = 1 means fully covered by expected sales (safe), 0 means no sales expected (critical)
  const score = product.stock_quantity > 0
    ? Math.min(1, expected / product.stock_quantity)
    : 0;

  const suggestedDiscount = getDiscount(score, days);
  const recoverableValue = excess * product.unit_price * (suggestedDiscount / 100);
  const potentialLoss = excess * (product.cost_price ?? product.unit_price);

  return {
    days_to_expiry: days,
    sales_velocity_30d: velocity,
    expected_sales: expected,
    excess_stock: Math.round(excess),
    risk_score: parseFloat(score.toFixed(4)),
    risk_level: classify(score),
    suggested_discount: suggestedDiscount,
    recoverable_value: parseFloat(recoverableValue.toFixed(2)),
    potential_loss: parseFloat(potentialLoss.toFixed(2)),
  };
}
