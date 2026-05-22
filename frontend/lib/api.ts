import { Product, AnalysisStats, RiskDistribution, RiskLevel } from '@/lib/types'

// Côté navigateur : NEXT_PUBLIC_API_URL (ex. http://localhost:3005).
// Côté serveur (SSR en conteneur) : INTERNAL_API_URL vise le service Compose
// `backend` (ex. http://backend:3005), car `localhost` y désigne le conteneur frontend.
const API_BASE =
  (typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:3000'
const PHARMACY_ID = process.env.NEXT_PUBLIC_PHARMACY_ID ?? ''

// ─── Adapteurs ────────────────────────────────────────────────────────────────

function adaptRiskAnalysis(raw: any): Product {
  return {
    id: raw.product_id,
    name: raw.product.name,
    sku: raw.product.external_sku ?? '',
    category: raw.product.category ?? '',
    // backend: 0.0 = critique, 1.0 = sûr → inversion pour affichage (100 = risque max)
    riskScore: Math.round((1 - raw.risk_score) * 100),
    riskLevel: raw.risk_level as RiskLevel,
    stock: raw.product.stock_quantity,
    expirationDate: raw.product.expiry_date,
    recoveryValue: raw.recoverable_value,
    action: raw.suggested_action ?? '',
    lastUpdated: raw.analysis_date,
  }
}

function adaptStats(summary: any): AnalysisStats {
  const s = summary.by_risk_level ?? summary
  return {
    totalProducts: summary.total_products ?? 0,
    criticalProducts: s.critical ?? 0,
    highProducts: s.high ?? 0,
    safeProducts: s.safe ?? 0,
    totalRecoveryValue: summary.total_recoverable ?? summary.recoverable ?? 0,
    lastAnalysisDate: summary.last_upload_at ?? new Date().toISOString(),
  }
}

export function adaptToRiskDistribution(stats: AnalysisStats): RiskDistribution[] {
  const total = stats.totalProducts || 1
  const entries: { level: RiskLevel; count: number }[] = [
    { level: 'critical', count: stats.criticalProducts },
    { level: 'high',     count: stats.highProducts },
    { level: 'safe',     count: stats.safeProducts },
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
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init })
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
  const data = await apiFetch(`/api/analysis/latest?pharmacy_id=${PHARMACY_ID}`)
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
