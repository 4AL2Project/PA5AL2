import { Sale } from '@prisma/client';

/**
 * Computes average daily sales velocity over the last 30 days.
 * Returns units sold per day.
 */
export function computeVelocity(sales: Sale[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSales = sales.filter((s) => new Date(s.sale_date) >= thirtyDaysAgo);

  if (recentSales.length === 0) return 0;

  const totalSold = recentSales.reduce((sum, s) => sum + s.quantity_sold, 0);
  return totalSold / 30;
}
