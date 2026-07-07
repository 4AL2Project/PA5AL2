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
  active: boolean;
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
