import {
  AnalysisStats,
  Product,
  RiskDistribution,
  RiskLevel,
} from '@/lib/types';

// Côté navigateur : NEXT_PUBLIC_API_URL (ex. http://localhost:3005).
// Côté serveur (SSR en conteneur) : INTERNAL_API_URL vise le service Compose
// `backend` (ex. http://backend:3005), car `localhost` y désigne le conteneur frontend.
const API_BASE =
  (typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    : process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:3000';
const PHARMACY_ID = process.env.NEXT_PUBLIC_PHARMACY_ID ?? '';

// ─── Formes brutes renvoyées par l'API backend ─────────────────────────────────

interface RawProduct {
  name: string;
  external_sku?: string | null;
  category?: string | null;
  stock_quantity: number;
  expiry_date: string;
}

interface RawRiskAnalysis {
  product_id: string;
  product: RawProduct;
  risk_score: number;
  risk_level: string;
  recoverable_value: number;
  suggested_action?: string | null;
  analysis_date: string;
}

interface RawSummary {
  by_risk_level?: { critical?: number; high?: number; safe?: number };
  total_products?: number;
  total_recoverable?: number;
  recoverable?: number;
  last_upload_at?: string;
  critical?: number;
  high?: number;
  safe?: number;
}

export interface UploadFileResult {
  inserted?: number;
  updated?: number;
  skipped?: number;
  total?: number;
}

export interface UploadResponse {
  products?: UploadFileResult;
  sales?: UploadFileResult;
  analysis?: unknown;
}

// ─── Adapteurs ────────────────────────────────────────────────────────────────

function adaptRiskAnalysis(raw: RawRiskAnalysis): Product {
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
  };
}

function adaptStats(summary: RawSummary): AnalysisStats {
  const s = summary.by_risk_level ?? summary;
  return {
    totalProducts: summary.total_products ?? 0,
    criticalProducts: s.critical ?? 0,
    highProducts: s.high ?? 0,
    safeProducts: s.safe ?? 0,
    totalRecoveryValue: summary.total_recoverable ?? summary.recoverable ?? 0,
    lastAnalysisDate: summary.last_upload_at ?? new Date().toISOString(),
  };
}

export function adaptToRiskDistribution(
  stats: AnalysisStats
): RiskDistribution[] {
  const total = stats.totalProducts || 1;
  const entries: { level: RiskLevel; count: number }[] = [
    { level: 'critical', count: stats.criticalProducts },
    { level: 'high', count: stats.highProducts },
    { level: 'safe', count: stats.safeProducts },
  ];
  return entries
    .filter((e) => e.count > 0)
    .map((e) => ({
      level: e.level,
      count: e.count,
      percentage: Math.round((e.count / total) * 100),
    }));
}

// ─── Helpers fetch ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Fonctions publiques ───────────────────────────────────────────────────────

export async function fetchLatestAnalysis(): Promise<{
  products: Product[];
  stats: AnalysisStats;
}> {
  const data = await apiFetch<{
    products?: RawRiskAnalysis[];
    summary?: RawSummary;
  }>(`/api/analysis/latest?pharmacy_id=${PHARMACY_ID}`);
  return {
    products: (data.products ?? []).map(adaptRiskAnalysis),
    stats: adaptStats(data.summary ?? {}),
  };
}

export async function fetchProducts(filters?: {
  risk_level?: string;
  category?: string;
}): Promise<{ products: Product[]; total: number }> {
  const params = new URLSearchParams({ pharmacy_id: PHARMACY_ID });
  if (filters?.risk_level) params.set('risk_level', filters.risk_level);
  if (filters?.category) params.set('category', filters.category);

  const data = await apiFetch<{ products?: RawRiskAnalysis[]; total?: number }>(
    `/api/products?${params.toString()}`
  );
  return {
    products: (data.products ?? []).map(adaptRiskAnalysis),
    total: data.total ?? 0,
  };
}

export async function uploadFile(
  file: File,
  fileType: 'products' | 'sales'
): Promise<UploadResponse> {
  const form = new FormData();
  form.append(fileType, file);
  return apiFetch<UploadResponse>(`/api/upload?pharmacy_id=${PHARMACY_ID}`, {
    method: 'POST',
    body: form,
  });
}
