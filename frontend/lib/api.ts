import { Product, AnalysisStats, RiskDistribution, RiskLevel } from '@/lib/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
const PHARMACY_ID = process.env.NEXT_PUBLIC_PHARMACY_ID ?? ''

// ─── Adapteurs ────────────────────────────────────────────────────────────────

function deriveAction(riskLevel: string, suggestedDiscount: number): string {
  switch (riskLevel) {
    case 'critical':
      return suggestedDiscount > 0
        ? `Remise immediate -${suggestedDiscount}%`
        : 'Don association'
    case 'high':
      return suggestedDiscount > 0
        ? `Remise -${suggestedDiscount}%`
        : 'Promotion flash'
    case 'moderate':
    case 'medium':
      return 'Surveillance'
    case 'low':
      return 'Mise en avant'
    case 'safe':
      return 'Aucune action'
    default:
      return 'Surveillance'
  }
}

function adaptRiskAnalysis(raw: any): Product {
  return {
    id: raw.product_id,
    name: raw.product.name,
    sku: raw.product.external_sku ?? '',
    category: raw.product.category ?? '',
    // backend: 0.0 = critical (unsafe), 1.0 = safe → invert for frontend (100 = high risk)
    riskScore: Math.round((1 - raw.risk_score) * 100),
    riskLevel: raw.risk_level as RiskLevel,
    stock: raw.product.stock_quantity,
    expirationDate: raw.product.expiry_date,
    recoveryValue: raw.recoverable_value,
    action: deriveAction(raw.risk_level, raw.suggested_discount),
    lastUpdated: raw.analysis_date,
  }
}

function adaptStats(summary: any): AnalysisStats {
  // handles both /api/analysis/latest summary and /api/dashboard summary shapes
  const byLevel = summary.by_risk_level ?? summary
  return {
    totalProducts: summary.total_products ?? 0,
    criticalProducts: byLevel.critical ?? 0,
    highRiskProducts: byLevel.high ?? 0,
    mediumRiskProducts: byLevel.moderate ?? byLevel.medium ?? 0,
    lowRiskProducts: byLevel.low ?? 0,
    safeProducts: byLevel.safe ?? 0,
    totalRecoveryValue: summary.total_recoverable ?? summary.recoverable ?? 0,
    lastAnalysisDate: summary.last_upload_at ?? new Date().toISOString(),
  }
}

export function adaptToRiskDistribution(stats: AnalysisStats): RiskDistribution[] {
  const total = stats.totalProducts || 1
  const entries: { level: RiskLevel; count: number }[] = [
    { level: 'critical', count: stats.criticalProducts },
    { level: 'high', count: stats.highRiskProducts },
    { level: 'moderate', count: stats.mediumRiskProducts },
    { level: 'low', count: stats.lowRiskProducts },
    { level: 'safe', count: stats.safeProducts },
  ]
  return entries
    .filter((e) => e.count > 0)
    .map((e) => ({
      level: e.level,
      count: e.count,
      percentage: Math.round((e.count / total) * 100),
    }))
}

// ─── Helpers fetch ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { cache: 'no-store', ...init })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Fonctions publiques ───────────────────────────────────────────────────────

export async function fetchLatestAnalysis(): Promise<{
  products: Product[]
  stats: AnalysisStats
}> {
  const data = await apiFetch(
    `/api/analysis/latest?pharmacy_id=${PHARMACY_ID}`,
  )
  return {
    products: (data.products ?? []).map(adaptRiskAnalysis),
    stats: adaptStats(data.summary ?? {}),
  }
}

export async function fetchProducts(filters?: {
  risk_level?: string
  category?: string
}): Promise<{ products: Product[]; total: number }> {
  const params = new URLSearchParams({ pharmacy_id: PHARMACY_ID })
  if (filters?.risk_level) params.set('risk_level', filters.risk_level)
  if (filters?.category) params.set('category', filters.category)

  const data = await apiFetch(`/api/products?${params.toString()}`)
  return {
    products: (data.products ?? []).map(adaptRiskAnalysis),
    total: data.total ?? 0,
  }
}

export async function fetchDashboard(): Promise<{
  stats: AnalysisStats
  pharmacyName: string
}> {
  const data = await apiFetch(`/api/dashboard?pharmacy_id=${PHARMACY_ID}`)
  return {
    stats: adaptStats({
      ...data.summary,
      last_upload_at: data.pharmacy?.last_upload_at,
    }),
    pharmacyName: data.pharmacy?.name ?? '',
  }
}

export async function uploadFile(
  file: File,
  fileType: 'products' | 'sales',
): Promise<{ products?: any; sales?: any; analysis?: any }> {
  const form = new FormData()
  form.append(fileType, file)

  return apiFetch(`/api/upload?pharmacy_id=${PHARMACY_ID}`, {
    method: 'POST',
    body: form,
  })
}
