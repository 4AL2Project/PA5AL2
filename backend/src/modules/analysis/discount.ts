/**
 * Returns a suggested discount percentage based on risk score and days to expiry.
 */
export function getDiscount(riskScore: number, daysToExpiry: number): number {
  if (daysToExpiry <= 7 || riskScore >= 0.8) return 50;
  if (daysToExpiry <= 14 || riskScore >= 0.6) return 30;
  if (daysToExpiry <= 30 || riskScore >= 0.4) return 20;
  if (riskScore >= 0.2) return 10;
  return 0;
}
