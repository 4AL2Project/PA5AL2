export type RiskLevel = 'critical' | 'high' | 'safe';
export type ActionStatus = 'EN_ATTENTE' | 'VALIDEE' | 'IGNOREE' | 'SNOOZEE';
export type ActionType = 'B2C' | 'DON';

export interface DormantAction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  type: ActionType;
  status: ActionStatus;
  snoozeUntil: string | null;
  daysOfCover: number;
  capitalLocked: number | null; // null si masqué (PREPARATEUR)
  recoverableValue: number | null;
}

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
  salesVelocity30d: number;
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
