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

type DevCounts = Record<string, number>;

type DevCountsEnvelope =
  | { success: true; data: DevCounts }
  | { success: false; error: unknown };

// `DevCounts` a une signature d'index : la seule présence de `success` ne suffit
// pas à distinguer l'enveloppe des compteurs, d'où le test sur son type.
function isEnvelope(
  payload: DevCountsEnvelope | DevCounts
): payload is DevCountsEnvelope {
  return typeof (payload as DevCountsEnvelope).success === 'boolean';
}

/**
 * Compteurs de lignes par table (page développeur, dev uniquement).
 * L'endpoint n'existe pas quand les outils sont désactivés : on renvoie `null`.
 */
export async function fetchDevCounts(
  accessToken: string
): Promise<DevCounts | null> {
  const res = await fetch(`${API_BASE}/api/dev/counts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as DevCountsEnvelope | DevCounts;
  if (isEnvelope(payload)) {
    return payload.success ? payload.data : null;
  }
  return payload;
}
