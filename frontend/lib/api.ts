import {
  AnalysisStats,
  DormantAction,
  Product,
  RiskDistribution,
  RiskLevel,
} from '@/lib/types';

const IS_SERVER = typeof window === 'undefined';

const DIRECT_API_BASE =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3005';

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
  days_of_cover: number;
  sales_velocity_30d: number;
  capital_locked: number;
  risk_level: string;
  recoverable_value: number;
  suggested_action?: string | null;
  analysis_date: string;
}

interface RawSummary {
  by_risk_level?: { critical?: number; high?: number; safe?: number };
  total_products?: number;
  total_capital_locked?: number;
  total_recoverable?: number;
  recoverable?: number;
  last_upload_at?: string;
  critical?: number;
  high?: number;
  safe?: number;
  pending_actions?: number;
  missing_cost_price_count?: number;
}

interface RawTop10Dormant {
  product_id: string;
  name: string;
  sku: string;
  category: string;
  risk_level: string;
  days_of_cover: number;
  capital_locked: number;
  recoverable_value: number;
}

interface RawDashboard {
  pharmacy?: {
    name?: string;
    last_upload_at?: string | null;
    subscription_tier?: string;
  };
  summary?: RawSummary;
  top10_dormants?: RawTop10Dormant[];
}

export interface DashboardData {
  pharmacyName: string;
  lastUploadAt: string | null;
  totalProducts: number;
  criticalCount: number;
  highCount: number;
  safeCount: number;
  dormantCount: number;
  totalCapitalLocked: number;
  pendingActions: number;
  missingCostPriceCount: number;
  top10Dormants: {
    productId: string;
    name: string;
    sku: string;
    category: string;
    riskLevel: string;
    daysOfCover: number;
    capitalLocked: number;
    recoverableValue: number;
  }[];
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
    daysOfCover: raw.days_of_cover,
    capitalLocked: raw.capital_locked,
    riskLevel: raw.risk_level as RiskLevel,
    stock: raw.product.stock_quantity,
    recoveryValue: raw.recoverable_value,
    salesVelocity30d: raw.sales_velocity_30d ?? 0,
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
    totalCapitalLocked: summary.total_capital_locked ?? 0,
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
  const url = IS_SERVER ? `${DIRECT_API_BASE}${path}` : `/api/be${path}`;
  const headers = new Headers(init?.headers);
  if (IS_SERVER) {
    // Lecture dynamique pour éviter d'importer next/headers depuis un module client.
    const { cookies } = await import('next/headers');
    const access = (await cookies()).get('savely_access')?.value;
    if (access) headers.set('Authorization', `Bearer ${access}`);
  }
  const res = await fetch(url, { cache: 'no-store', ...init, headers });
  const payload = await res.json().catch(() => null);
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const env = payload as
      | { success: true; data: T }
      | { success: false; error: { code: string; message: string } };
    if (env.success) return env.data;
    throw new Error(`API ${res.status}: ${env.error?.message ?? 'error'}`);
  }
  if (!res.ok) {
    throw new Error(`API ${res.status}`);
  }
  return payload as T;
}

// ─── Fonctions publiques ───────────────────────────────────────────────────────

export async function fetchLatestAnalysis(): Promise<{
  products: Product[];
  stats: AnalysisStats;
}> {
  const data = await apiFetch<{
    products?: RawRiskAnalysis[];
    summary?: RawSummary;
  }>(`/api/analysis/latest`);
  return {
    products: (data.products ?? []).map(adaptRiskAnalysis),
    stats: adaptStats(data.summary ?? {}),
  };
}

export async function fetchProducts(filters?: {
  risk_level?: string;
  category?: string;
}): Promise<{ products: Product[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.risk_level) params.set('risk_level', filters.risk_level);
  if (filters?.category) params.set('category', filters.category);
  const qs = params.toString();
  const data = await apiFetch<{ products?: RawRiskAnalysis[]; total?: number }>(
    `/api/products${qs ? `?${qs}` : ''}`
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
  return apiFetch<UploadResponse>(`/api/upload`, {
    method: 'POST',
    body: form,
  });
}

// ─── Actions (US-42) ──────────────────────────────────────────────────────────

interface RawAction {
  action_id: string;
  product_id: string;
  type: string;
  status: string;
  snooze_until: string | null;
  days_of_cover: number;
  capital_locked?: number | null;
  recoverable_value?: number | null;
  product: {
    name: string;
    external_sku: string;
    category?: string | null;
    brand?: string | null;
    stock_quantity: number;
  };
}

function adaptAction(raw: RawAction): DormantAction {
  return {
    id: raw.action_id,
    productId: raw.product_id,
    productName: raw.product.name,
    sku: raw.product.external_sku,
    category: raw.product.category ?? '',
    brand: raw.product.brand ?? '',
    stock: raw.product.stock_quantity,
    type: raw.type as DormantAction['type'],
    status: raw.status as DormantAction['status'],
    snoozeUntil: raw.snooze_until ?? null,
    daysOfCover: raw.days_of_cover,
    capitalLocked: raw.capital_locked ?? null,
    recoverableValue: raw.recoverable_value ?? null,
  };
}

export async function fetchPendingActions(): Promise<DormantAction[]> {
  const data = await apiFetch<RawAction[]>('/api/actions');
  return data.map(adaptAction);
}

export async function validateAction(
  id: string,
  type?: 'B2C' | 'DON'
): Promise<void> {
  await apiFetch(`/api/actions/${id}/validate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: type ? JSON.stringify({ type }) : undefined,
  });
}

export async function ignoreAction(id: string): Promise<void> {
  await apiFetch(`/api/actions/${id}/ignore`, { method: 'PATCH' });
}

export async function snoozeAction(id: string): Promise<void> {
  await apiFetch(`/api/actions/${id}/snooze`, { method: 'PATCH' });
}

// ─── Dashboard (US-40) ────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  const data = await apiFetch<RawDashboard>('/api/dashboard');
  const s = data.summary ?? {};
  const byLevel = s.by_risk_level ?? {};
  const critical = byLevel.critical ?? 0;
  const high = byLevel.high ?? 0;
  return {
    pharmacyName: data.pharmacy?.name ?? '',
    lastUploadAt: data.pharmacy?.last_upload_at ?? null,
    totalProducts: s.total_products ?? 0,
    criticalCount: critical,
    highCount: high,
    safeCount: byLevel.safe ?? 0,
    dormantCount: critical + high,
    totalCapitalLocked: s.total_capital_locked ?? 0,
    pendingActions: s.pending_actions ?? 0,
    missingCostPriceCount: s.missing_cost_price_count ?? 0,
    top10Dormants: (data.top10_dormants ?? []).map((d) => ({
      productId: d.product_id,
      name: d.name,
      sku: d.sku,
      category: d.category,
      riskLevel: d.risk_level,
      daysOfCover: d.days_of_cover,
      capitalLocked: d.capital_locked,
      recoverableValue: d.recoverable_value,
    })),
  };
}
