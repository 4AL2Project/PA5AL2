export type RiskLevel = 'critical' | 'high' | 'safe';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  riskLevel: RiskLevel;
  daysOfCover: number;
  capitalLocked: number;
  stock: number;
  recoveryValue: number;
  action: string;
  lastUpdated: string;
}

export interface AnalysisStats {
  totalProducts: number;
  criticalProducts: number;
  highProducts: number;
  safeProducts: number;
  totalCapitalLocked: number;
  totalRecoveryValue: number;
  lastAnalysisDate: string;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
  percentage: number;
}
