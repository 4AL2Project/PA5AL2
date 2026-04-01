export type RiskLevel = 'critical' | 'high' | 'moderate' | 'medium' | 'low' | 'safe'

export interface Product {
  id: string
  name: string
  sku: string
  category: string
  riskLevel: RiskLevel
  riskScore: number
  stock: number
  expirationDate: string
  recoveryValue: number
  action: string
  lastUpdated: string
}

export interface AnalysisStats {
  totalProducts: number
  criticalProducts: number
  highRiskProducts: number
  mediumRiskProducts: number
  lowRiskProducts: number
  safeProducts: number
  totalRecoveryValue: number
  lastAnalysisDate: string
}

export interface RiskDistribution {
  level: RiskLevel
  count: number
  percentage: number
}
