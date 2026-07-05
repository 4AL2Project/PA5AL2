import 'server-only';

import { Preparateur } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

/**
 * Récupère les préparateurs de l'officine du titulaire connecté.
 * Le backend dérive l'officine du token (pas de pharmacy_id exposé).
 */
export async function fetchMyPreparateurs(
  accessToken: string
): Promise<Preparateur[]> {
  const res = await fetch(`${API_BASE}/api/pharmacies/me/preparateurs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as
    | { success: true; data: Preparateur[] }
    | { success: false; error: unknown }
    | Preparateur[];
  if (Array.isArray(payload)) return payload;
  return 'success' in payload && payload.success ? payload.data : [];
}
