import 'server-only';

import { redirect } from 'next/navigation';

import { SERVER_API_BASE as API_BASE } from './api-base';
import { PharmacyDetail, PharmacyListItem } from './auth';

/** Échec d'un appel backend : API injoignable (`status: null`) ou réponse en erreur. */
export class ApiError extends Error {
  constructor(
    readonly status: number | null,
    readonly endpoint: string,
    options?: ErrorOptions
  ) {
    super(
      status === null
        ? `API injoignable : ${endpoint}`
        : `API ${status} sur ${endpoint}`,
      options
    );
    this.name = 'ApiError';
  }
}

/**
 * Appelle le backend et laisse remonter les échecs : une API en panne ne doit pas
 * se déguiser en résultat vide. Les 401/403 renvoient au login (session expirée).
 */
async function request(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
    });
  } catch (cause) {
    throw new ApiError(null, path, { cause });
  }

  if (res.status === 401 || res.status === 403) redirect('/admin/login');
  return res;
}

/** Déballe l'enveloppe `{ success, data }` posée par le backend sur toute réponse. */
function unwrap<T>(payload: unknown): T {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    'data' in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

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
  const path = `/api/associations${qs}`;

  const res = await request(accessToken, path);
  if (!res.ok) throw new ApiError(res.status, path);
  return unwrap<Association[]>(await res.json()) ?? [];
}

export async function fetchPendingAssociations(
  accessToken: string
): Promise<Association[]> {
  const path = '/api/associations/pending';
  const res = await request(accessToken, path);
  if (!res.ok) throw new ApiError(res.status, path);
  return unwrap<Association[]>(await res.json()) ?? [];
}

export async function fetchPharmacies(
  accessToken: string
): Promise<PharmacyListItem[]> {
  const path = '/api/admin/pharmacies';
  const res = await request(accessToken, path);
  if (!res.ok) throw new ApiError(res.status, path);
  const data = unwrap<{ pharmacies?: PharmacyListItem[] }>(await res.json());
  return data?.pharmacies ?? [];
}

/** `null` uniquement si l'officine n'existe pas — une panne API lève. */
export async function fetchPharmacy(
  accessToken: string,
  pharmacyId: string
): Promise<PharmacyDetail | null> {
  const path = `/api/admin/pharmacies/${encodeURIComponent(pharmacyId)}`;
  const res = await request(accessToken, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, path);
  return unwrap<PharmacyDetail>(await res.json());
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
    low_reliability_assos: {
      association_id: string;
      name: string;
      reliability: number | null;
    }[];
  };
}

/** `null` uniquement sur 404 (ressource absente) — une panne API lève. */
async function adminFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const res = await request(accessToken, path, init);
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(res.status, path);
  return unwrap<T>(await res.json());
}

export async function fetchAdminDonations(
  accessToken: string,
  opts: {
    status?: string;
    pharmacy_id?: string;
    page?: number;
    limit?: number;
  } = {}
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
  return adminFetch<AdminMonitoring>(
    accessToken,
    '/api/admin/donations/monitoring'
  );
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

type DevCounts = Record<string, number>;

/**
 * Compteurs de lignes par table (page développeur, dev uniquement).
 * L'endpoint n'existe pas quand les outils sont désactivés : `adminFetch`
 * renvoie alors `null` sur le 404.
 */
export async function fetchDevCounts(
  accessToken: string
): Promise<DevCounts | null> {
  return adminFetch<DevCounts>(accessToken, '/api/dev/counts');
}
