const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('savely_asso_token');
}

export function saveToken(token: string): void {
  localStorage.setItem('savely_asso_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('savely_asso_token');
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers,
  });

  const payload = await res.json().catch(() => null);
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const env = payload as
      | { success: true; data: T }
      | { success: false; error: { message: string } };
    if (env.success) return env.data;
    throw new Error(
      (env as { success: false; error: { message: string } }).error?.message ??
        `Erreur ${res.status}`
    );
  }
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return payload as T;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function verifyAssoToken(
  token: string
): Promise<{ access_token: string; is_onboarded: boolean }> {
  const res = await fetch(
    `${API_BASE}/asso/auth/verify?token=${encodeURIComponent(token)}`,
    { cache: 'no-store' }
  );
  const payload = await res.json();
  if (!res.ok)
    throw new Error(payload?.error?.message ?? 'Lien invalide ou expiré');
  return payload.data ?? payload;
}

// ── Profil ───────────────────────────────────────────────────────────────────

export interface AssoProfile {
  association_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  site_web: string | null;
  categories: string[];
  pickup_windows: unknown;
  is_onboarded: boolean;
  logo_url: string | null;
  status: string;
}

export async function fetchProfile(): Promise<AssoProfile> {
  return apiFetch('/asso/me');
}

export async function updateProfile(
  data: Partial<AssoProfile>
): Promise<AssoProfile> {
  return apiFetch('/asso/me', { method: 'PUT', body: JSON.stringify(data) });
}

// ── Offres ───────────────────────────────────────────────────────────────────

export interface Offre {
  proposal_id: string;
  status: string;
  sent_at: string;
  expires_at: string;
  proposed_lines: Array<{ name: string; quantity: number; unit_value: number }>;
  donation: {
    donation_id: string;
    pharmacy: {
      name: string;
      address: string | null;
      contact_phone?: string | null;
    } | null;
  } | null;
}

export async function fetchOffres(): Promise<Offre[]> {
  return apiFetch('/asso/offres');
}

export async function fetchOffre(id: string): Promise<Offre> {
  return apiFetch(`/asso/offres/${id}`);
}

export async function accepterOffre(
  id: string,
  data: {
    pickup_slot_start: string;
    pickup_slot_end: string;
    picked_up_by: string;
  }
): Promise<unknown> {
  return apiFetch(`/asso/offres/${id}/accepter`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function refuserOffre(
  id: string,
  data: { reason?: string }
): Promise<unknown> {
  return apiFetch(`/asso/offres/${id}/refuser`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Dons ─────────────────────────────────────────────────────────────────────

export interface Don {
  allocation_id: string;
  status: string;
  pickup_slot_start: string;
  pickup_slot_end: string;
  picked_up_at: string | null;
  cerfa_url: string | null;
  qr_code_url: string | null;
  qr_code: string;
  lines: Array<{ name: string; quantity: number; unit_value: number }>;
  donation: {
    pharmacy: { name: string; address: string | null } | null;
  } | null;
}

export async function fetchDons(): Promise<Don[]> {
  return apiFetch('/asso/dons');
}

export async function fetchDon(id: string): Promise<Don> {
  return apiFetch(`/asso/dons/${id}`);
}
