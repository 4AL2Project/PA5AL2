import 'server-only';

import { PharmacyDetail, PharmacyListItem } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

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
