import {
  AnalysisStats,
  Category,
  DormantAction,
  ImportRecord,
  Offer,
  OfferDetail,
  Order,
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
  upcoming_donation_pickups?: {
    allocation_id: string;
    association_name: string;
    pickup_slot_start: string;
    pickup_slot_end: string;
    lines: { name: string; quantity: number }[];
  }[];
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
  upcomingDonationPickups: {
    allocationId: string;
    associationName: string;
    pickupSlotStart: string;
    pickupSlotEnd: string;
    lines: { name: string; quantity: number }[];
  }[];
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
  import: ImportRecord;
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
  let res: Response;
  try {
    res = await fetch(url, { cache: 'no-store', ...init, headers });
  } catch {
    throw new Error('API indisponible');
  }
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

export async function uploadImport(files: {
  products?: File;
  sales?: File;
}): Promise<UploadResponse> {
  const form = new FormData();
  if (files.products) form.append('products', files.products);
  if (files.sales) form.append('sales', files.sales);
  return apiFetch<UploadResponse>(`/api/upload`, {
    method: 'POST',
    body: form,
  });
}

export async function uploadFile(
  file: File,
  fileType: 'products' | 'sales'
): Promise<UploadResponse> {
  return uploadImport({ [fileType]: file });
}

export async function fetchImports(): Promise<ImportRecord[]> {
  return apiFetch<ImportRecord[]>('/api/imports');
}

export async function fetchImport(importId: string): Promise<ImportRecord> {
  return apiFetch<ImportRecord>(`/api/imports/${importId}`);
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
    unit_price: number;
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
    unitPrice: raw.product.unit_price,
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
    upcomingDonationPickups: (data.upcoming_donation_pickups ?? []).map(
      (a) => ({
        allocationId: a.allocation_id,
        associationName: a.association_name,
        pickupSlotStart: a.pickup_slot_start,
        pickupSlotEnd: a.pickup_slot_end,
        lines: a.lines,
      })
    ),
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

// ─── B2C chain ───────────────────────────────────────────────────────────────

export async function fetchOffers(status?: string): Promise<Offer[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<Offer[]>(`/api/offers${qs}`);
}

export interface CreateOfferPayload {
  product_id: string;
  action_id?: string;
  description?: string;
  category_ids?: string[];
  discounted_price: number;
  quantity_offered: number;
}

export async function createOffer(payload: CreateOfferPayload): Promise<Offer> {
  return apiFetch<Offer>('/api/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function suspendOffer(offerId: string): Promise<Offer> {
  return apiFetch<Offer>(`/api/offers/${offerId}/suspend`, { method: 'PATCH' });
}

export async function resumeOffer(offerId: string): Promise<Offer> {
  return apiFetch<Offer>(`/api/offers/${offerId}/resume`, { method: 'PATCH' });
}

export async function terminateOffer(offerId: string): Promise<Offer> {
  return apiFetch<Offer>(`/api/offers/${offerId}`, { method: 'DELETE' });
}

export async function fetchOfferDetail(offerId: string): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/offers/${offerId}/manage`);
}

export interface UpdateOfferPayload {
  description?: string | null;
  category_ids?: string[];
  discounted_price?: number;
  quantity_offered?: number;
  expires_at?: string | null;
}

export async function updateOffer(
  offerId: string,
  payload: UpdateOfferPayload
): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/offers/${offerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function uploadOfferImages(
  offerId: string,
  files: File[]
): Promise<OfferDetail> {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  return apiFetch<OfferDetail>(`/api/offers/${offerId}/images`, {
    method: 'POST',
    body: form,
  });
}

export async function deleteOfferImage(
  offerId: string,
  imageId: string
): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/offers/${offerId}/images/${imageId}`, {
    method: 'DELETE',
  });
}

// Résout une image d'offre (chemin relatif servi par le backend) en URL
// same-origin passant par le proxy `/api/be`.
export function resolveOfferImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `/api/be${path}`;
}

export async function fetchOrders(status?: string): Promise<Order[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<Order[]>(`/api/orders${qs}`);
}

export async function prepareOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/prepare`, { method: 'PATCH' });
}

export async function markOrderReady(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/ready`, { method: 'PATCH' });
}

export async function withdrawOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/withdraw`, {
    method: 'PATCH',
  });
}

export async function cancelOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/${orderId}/cancel`, { method: 'PATCH' });
}

export async function fetchOrderByQr(qrCode: string): Promise<Order> {
  return apiFetch<Order>(`/api/orders/qr/${qrCode}`);
}

// ─── Catégories d'offre ────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/categories');
}

export async function createCategory(name: string): Promise<Category> {
  return apiFetch<Category>('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function updateCategory(
  id: string,
  name: string
): Promise<Category> {
  return apiFetch<Category>(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  status: string;
  created_at: string;
}

export async function fetchAdminUsers(): Promise<{
  users: AdminUser[];
  total: number;
}> {
  try {
    return await apiFetch('/api/admin/users');
  } catch {
    return { users: [], total: 0 };
  }
}

export async function createAdminUser(payload: {
  email: string;
  first_name: string;
  last_name: string;
}): Promise<AdminUser> {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(
  id: string,
  payload: { first_name?: string; last_name?: string }
): Promise<AdminUser> {
  return apiFetch(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function setAdminUserStatus(
  id: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<AdminUser> {
  return apiFetch(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function resendAdminUserInvitation(id: string): Promise<void> {
  await apiFetch(`/api/admin/users/${id}/resend-invitation`, {
    method: 'POST',
  });
}

export async function deactivateAdminUser(id: string): Promise<AdminUser> {
  return apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
}

// ─── Dons (cycle de vie piloté par l'orchestrateur) ─────────────────────────

export interface DonationLinePayload {
  product_id: string;
  quantity: number;
}

export interface EligiblePreview {
  count: number;
  associations: {
    association_id: string;
    name: string;
    distance_km: number;
  }[];
  // Coût de revient HT du lot (null si un prix d'achat manque)
  cost_value: number | null;
  // 60 % du coût de revient (art. 238 bis CGI)
  tax_savings: number | null;
}

export interface DonationLineItem {
  line_id: string;
  product_id: string;
  quantity_total: number;
  quantity_allocated: number;
  unit_value: number;
  product: { name: string; external_sku: string | null };
}

export interface DonationAllocationItem {
  allocation_id: string;
  association_id: string;
  status: 'PLANIFIEE' | 'RETIREE' | 'NON_RECUPEREE';
  lines: {
    product_id: string;
    name: string;
    quantity: number;
    unit_value: number;
  }[];
  pickup_slot_start: string;
  pickup_slot_end: string;
  picked_up_by: string | null;
  picked_up_at: string | null;
  cerfa_number: string | null;
  association: { name: string; contact_phone?: string | null };
}

export interface DonationEventItem {
  event_id: string;
  type: string;
  actor: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface DonationSummary {
  donation_id: string;
  status: 'EN_COURS' | 'COMPLETEE' | 'ECHOUEE' | 'ANNULEE';
  attempt_count: number;
  created_at: string;
  lines: DonationLineItem[];
  proposals: { association: { name: string }; expires_at: string }[];
  allocations: DonationAllocationItem[];
}

export interface DonationDetail extends DonationSummary {
  events: DonationEventItem[];
  remaining: {
    product_id: string;
    name: string;
    quantity_total: number;
    quantity_allocated: number;
    quantity_remaining: number;
    unit_value: number;
  }[];
  cancellable: boolean;
  pickup_windows?: { start: string; end: string }[] | null;
}

export async function donationEligiblePreview(
  lines: DonationLinePayload[]
): Promise<EligiblePreview> {
  return apiFetch('/api/donations/eligible-preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
}

export async function createDonation(payload: {
  action_id?: string;
  lines: DonationLinePayload[];
  preferred_association_id?: string;
  pickup_windows?: { start: string; end: string }[];
}): Promise<DonationSummary> {
  return apiFetch('/api/donations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchDonations(): Promise<DonationSummary[]> {
  return apiFetch('/api/donations');
}

export async function fetchDonationDetail(id: string): Promise<DonationDetail> {
  return apiFetch(`/api/donations/${id}`);
}

export async function cancelDonation(id: string): Promise<void> {
  await apiFetch(`/api/donations/${id}/cancel`, { method: 'POST' });
}

export async function fetchUpcomingPickups(): Promise<
  DonationAllocationItem[]
> {
  return apiFetch('/api/donations/upcoming-pickups');
}

export async function confirmPickup(
  allocationId: string,
  pickedUpBy: string
): Promise<void> {
  await apiFetch(`/api/donations/allocations/${allocationId}/confirm-pickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ picked_up_by: pickedUpBy }),
  });
}

export function donationCerfaUrl(allocationId: string): string {
  return `/api/be/api/donations/allocations/${allocationId}/cerfa`;
}

export interface DonationBilan {
  total_donations: number;
  total_withdrawn: number;
  // Valeur au coût de revient HT (art. 238 bis CGI)
  total_value_donated: number;
  // 60 % de la valeur donnée (plafond 20 000 € ou 0,5 % du CA HT)
  tax_savings: number;
  total_associations: number;
  total_products_donated: number;
  donations_by_status: Record<string, number>;
}

export async function fetchDonationBilan(): Promise<DonationBilan> {
  return apiFetch('/api/donations/bilan');
}

// ─── Annuaire des associations (titulaire) ──────────────────────────────────

export interface AssociationWindow {
  day: string;
  start: string;
  end: string;
}

export interface AnnuaireEntry {
  association_id: string;
  name: string;
  city: string;
  postal_code: string;
  logo_url: string | null;
  categories: string[];
  pickup_windows: AssociationWindow[] | null;
  action_radius_km: number;
  distance_km: number | null;
  reliability: number | null;
}

export interface AssociationFiche {
  association_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  categories: string[];
  pickup_windows: AssociationWindow[] | null;
  action_radius_km: number;
  distance_km: number | null;
  stats: {
    proposals_received: number;
    response_rate: number | null;
    pickup_rate: number | null;
    smoothed_reliability: number;
    avg_response_hours: number | null;
    last_donation_at: string | null;
  };
  history: {
    allocation_id: string;
    status: string;
    pickup_slot_start: string;
    picked_up_at: string | null;
    lines: { name: string; quantity: number; unit_value: number }[];
    value: number | null;
    cerfa_available: boolean;
  }[];
  totals: { total_value: number; tax_savings: number };
}

export async function fetchAnnuaire(opts?: {
  category?: string;
  search?: string;
}): Promise<AnnuaireEntry[]> {
  const params = new URLSearchParams();
  if (opts?.category) params.set('category', opts.category);
  if (opts?.search) params.set('search', opts.search);
  const qs = params.size ? `?${params}` : '';
  return apiFetch(`/api/associations/annuaire${qs}`);
}

export async function fetchAssociationFiche(
  id: string
): Promise<AssociationFiche> {
  return apiFetch(`/api/associations/${id}/fiche`);
}

export async function updateAssociation(
  id: string,
  payload: Partial<{
    name: string;
    address: string;
    city: string;
    postal_code: string;
    contact_email: string;
    contact_phone: string;
    categories: string[];
    pickup_windows: AssociationWindow[];
  }>
): Promise<void> {
  await apiFetch(`/api/associations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ─── Paramètres de don ────────────────────────────────────────────────────────

export interface DonParametres {
  id: string;
  pharmacy_id: string;
  seuil_dormance_jours: number;
  rayon_matching_km: number;
}

export async function fetchDonParametres(): Promise<DonParametres> {
  return apiFetch<DonParametres>('/api/donations/parametres');
}

export async function saveDonParametres(
  data: Pick<DonParametres, 'seuil_dormance_jours' | 'rayon_matching_km'>
): Promise<DonParametres> {
  return apiFetch<DonParametres>('/api/donations/parametres', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
