import 'server-only';

import { PharmacyDetail, PharmacyListItem } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

export interface Association {
  association_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  categories: string[];
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  status: string;
  action_radius_km: number;
  pickup_sla_days: number;
  response_sla_hours: number;
  rna_or_siren: string | null;
  email_verified_at: string | null;
  fiscal_receipt_verified: boolean;
  rejection_reason: string | null;
  created_at: string;
}

export async function fetchAssociations(
  accessToken: string,
  opts: { category?: string } = {}
): Promise<Association[]> {
  const params = new URLSearchParams();
  if (opts.category) params.set('category', opts.category);
  const qs = params.size ? `?${params}` : '';

  const res = await fetch(`${API_BASE}/api/associations${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as Association[] | { data: Association[] };
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

export async function fetchPendingAssociations(
  accessToken: string
): Promise<Association[]> {
  const res = await fetch(`${API_BASE}/api/associations/pending`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as Association[] | { data: Association[] };
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

export async function fetchPharmacies(
  accessToken: string
): Promise<PharmacyListItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/pharmacies`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as
    | { success: true; data: { pharmacies?: PharmacyListItem[] } }
    | { success: false; error: unknown }
    | { pharmacies?: PharmacyListItem[] };
  const data =
    'success' in payload && payload.success
      ? payload.data
      : 'pharmacies' in payload
        ? payload
        : { pharmacies: [] };
  return data.pharmacies ?? [];
}

export async function fetchPharmacy(
  accessToken: string,
  pharmacyId: string
): Promise<PharmacyDetail | null> {
  const res = await fetch(
    `${API_BASE}/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }
  );
  if (!res.ok) return null;
  const payload = (await res.json()) as
    | { success: true; data: PharmacyDetail }
    | { success: false; error: unknown }
    | PharmacyDetail;
  if ('success' in payload) {
    return payload.success ? payload.data : null;
  }
  return payload;
}

// ─── Admin donations ──────────────────────────────────────────────────────────

export interface AdminDonationItem {
  donation_id: string;
  status: string;
  created_at: string;
  pharmacy: { name: string; address: string | null } | null;
  lines: { product: { name: string } | null; quantity_total: number }[];
  proposals: { association: { name: string } | null }[];
  allocations: { lines: unknown[] }[];
}

export interface AdminDonationList {
  total: number;
  page: number;
  limit: number;
  items: AdminDonationItem[];
}

export interface AdminDonationDetail {
  donation_id: string;
  status: string;
  attempt_count: number;
  created_at: string;
  updated_at: string;
  pharmacy: { pharmacy_id: string; name: string } | null;
  lines: {
    line_id: string;
    quantity_total: number;
    quantity_allocated: number;
    unit_value: number;
    product: { name: string; external_sku: string } | null;
  }[];
  proposals: {
    proposal_id: string;
    status: string;
    sent_at: string;
    responded_at: string | null;
    expires_at: string;
    refusal_reason: string | null;
    association: { name: string; contact_email: string | null } | null;
  }[];
  allocations: {
    allocation_id: string;
    status: string;
    pickup_slot_start: string;
    pickup_slot_end: string;
    picked_up_at: string | null;
    picked_up_by: string | null;
    cerfa_number: string | null;
    qr_code: string;
    association: { name: string } | null;
    lines: unknown[];
  }[];
  events: {
    event_id: string;
    type: string;
    actor: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }[];
}

export interface AdminMonitoring {
  kpis: {
    total: number;
    by_status: Record<string, number>;
    completion_rate: number;
    failure_rate: number;
  };
  alerts: {
    blocked_donations: {
      donation_id: string;
      created_at: string;
      pharmacy: { name: string } | null;
      proposals: { association: { name: string } | null }[];
    }[];
    blocked_count: number;
    expired_proposals: number;
    missed_pickups: number;
    low_reliability_assos: { association_id: string; name: string; reliability: number | null }[];
  };
}

async function adminFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
    cache: 'no-store',
    ...init,
  });
  if (!res.ok) return null;
  const payload = await res.json();
  if ('success' in payload) return payload.success ? payload.data : null;
  return payload as T;
}

export async function fetchAdminDonations(
  accessToken: string,
  opts: { status?: string; pharmacy_id?: string; page?: number; limit?: number } = {}
): Promise<AdminDonationList> {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.pharmacy_id) params.set('pharmacy_id', opts.pharmacy_id);
  if (opts.page) params.set('page', String(opts.page));
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.size ? `?${params}` : '';
  const result = await adminFetch<AdminDonationList>(
    accessToken,
    `/api/admin/donations${qs}`
  );
  return result ?? { total: 0, page: 1, limit: 50, items: [] };
}

export async function fetchAdminDonationDetail(
  accessToken: string,
  id: string
): Promise<AdminDonationDetail | null> {
  return adminFetch<AdminDonationDetail>(
    accessToken,
    `/api/admin/donations/${encodeURIComponent(id)}`
  );
}

export async function fetchAdminMonitoring(
  accessToken: string
): Promise<AdminMonitoring | null> {
  return adminFetch<AdminMonitoring>(accessToken, '/api/admin/donations/monitoring');
}

export interface AdminDonParametres {
  id: string;
  pharmacy_id: string;
  seuil_dormance_jours: number;
  rayon_matching_km: number;
  created_at: string;
  updated_at: string;
}

export async function fetchAdminDonParametres(
  accessToken: string,
  pharmacyId: string
): Promise<AdminDonParametres | null> {
  return adminFetch<AdminDonParametres>(
    accessToken,
    `/api/admin/donations/parametres/${encodeURIComponent(pharmacyId)}`
  );
}
