import 'server-only';

import { SERVER_API_BASE as API_BASE } from './api-base';

export interface MyPharmacy {
  pharmacy_id: string;
  name: string;
  email: string;
  address: string | null;
  siret: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  donation_pickup_windows: { day: string; start: string; end: string }[] | null;
  subscription_tier: string | null;
  last_upload_at: string | null;
  created_at: string;
}

/**
 * Récupère la fiche de l'officine du titulaire connecté.
 * Le backend dérive l'officine du token (pas de pharmacy_id exposé).
 */
export async function fetchMyPharmacy(
  accessToken: string
): Promise<MyPharmacy | null> {
  const res = await fetch(`${API_BASE}/api/pharmacies/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const payload = (await res.json()) as
    | { success: true; data: MyPharmacy }
    | { success: false; error: unknown }
    | MyPharmacy;
  if ('success' in payload) {
    return payload.success ? payload.data : null;
  }
  return payload;
}
