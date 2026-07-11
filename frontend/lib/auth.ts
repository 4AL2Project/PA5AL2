export type Role = 'TITULAIRE' | 'PREPARATEUR' | 'ADMIN_SAVELY';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface JwtClaims {
  sub: string;
  email: string;
  pharmacy_id: string;
  role: Role;
  exp: number;
  iat: number;
}

export interface InvitationInfo {
  role: string;
  pharmacy: {
    pharmacy_id: string;
    name: string;
    address: string | null;
    siret: string | null;
  };
  titulaire: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  };
  expires_at: string;
}

export interface AcceptInvitationPayload {
  pharmacy: { name: string; address: string; siret: string };
  titulaire: { first_name: string; last_name: string; phone: string };
  accepted_terms: boolean;
}

export interface CreatePharmacyPayload {
  pharmacy: { name: string; address: string; siret: string };
  titulaire: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

export interface CreatePharmacyResponse {
  pharmacy_id: string;
  pharmacy_name: string;
  titulaire_email: string;
  titulaire_status: string;
}

export interface TitulaireSummary {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | string;
}

export interface PharmacyListItem {
  pharmacy_id: string;
  name: string;
  address: string | null;
  siret: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  created_at: string;
  titulaire: TitulaireSummary | null;
}

export interface Preparateur {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | string;
}

export interface PharmacyDetail extends PharmacyListItem {
  preparateurs: Preparateur[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

export function decodeJwt(token: string): JwtClaims | null {
  try {
    if (typeof token !== 'string') {
      console.error('[auth] decodeJwt: token is not a string', token);
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error(
        '[auth] decodeJwt: token does not have 3 parts',
        parts.length
      );
      return null;
    }
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padding);

    let bytes: Uint8Array;
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      bytes = new Uint8Array(Buffer.from(padded, 'base64'));
    } else if (typeof atob === 'function') {
      const binary = atob(padded);
      bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } else {
      console.error('[auth] decodeJwt: no base64 decoder available');
      return null;
    }

    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json) as JwtClaims;
  } catch (err) {
    console.error('[auth] decodeJwt failed:', err);
    return null;
  }
}

export function landingPathForRole(role: Role): string {
  return role === 'ADMIN_SAVELY' ? '/admin' : '/';
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
}
interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

function unwrap<T>(payload: unknown, status: number): T {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const env = payload as SuccessEnvelope<T> | ErrorEnvelope;
    if (env.success) return env.data;
    const err = new Error(env.error?.message ?? `HTTP ${status}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = status;
    err.code = env.error?.code;
    throw err;
  }
  return payload as T;
}

async function backendFetch<T>(
  path: string,
  init?: RequestInit & { accessToken?: string }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.accessToken) {
    headers.set('Authorization', `Bearer ${init.accessToken}`);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...init,
    headers,
  });
  const payload = await res.json().catch(() => ({
    success: false,
    error: { code: 'PARSE', message: res.statusText },
  }));
  if (!res.ok) {
    // Laisse unwrap construire l'Error avec status + code si l'enveloppe est là.
    return unwrap<T>(payload, res.status);
  }
  return unwrap<T>(payload, res.status);
}

export async function requestMagicLink(email: string): Promise<void> {
  await backendFetch('/api/auth/magic-link', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(token: string): Promise<AuthTokens> {
  return backendFetch<AuthTokens>('/api/auth/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getInvitation(token: string): Promise<InvitationInfo> {
  return backendFetch<InvitationInfo>(
    `/api/auth/invitations/${encodeURIComponent(token)}`
  );
}

export async function acceptInvitation(
  token: string,
  payload: AcceptInvitationPayload
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>(
    `/api/auth/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// Pas de mot de passe : le préparateur se connecte ensuite par code OTP.
export interface AcceptPreparateurPayload {
  first_name: string;
  last_name: string;
  phone?: string;
  accepted_terms: boolean;
}

export async function acceptPreparateurInvitation(
  token: string,
  payload: AcceptPreparateurPayload
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>(
    `/api/auth/invitations/${encodeURIComponent(token)}/accept-preparateur`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export interface AcceptAdminPayload {
  password: string;
  first_name?: string;
  last_name?: string;
}

export async function acceptAdminInvitation(
  token: string,
  payload: AcceptAdminPayload
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>(
    `/api/auth/invitations/${encodeURIComponent(token)}/accept-admin`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function adminLogin(
  email: string,
  password: string
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Connexion préparateur, étape 1 : demande d'un code à 6 chiffres par email.
 * La réponse est volontairement identique que le compte existe ou non.
 */
export async function requestPreparateurCode(
  email: string
): Promise<{ message: string }> {
  return backendFetch<{ message: string }>(
    '/api/auth/preparateur/request-code',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  );
}

/** Connexion préparateur, étape 2 : échange du code contre une session. */
export async function verifyPreparateurCode(
  email: string,
  code: string
): Promise<AuthTokens> {
  return backendFetch<AuthTokens>('/api/auth/preparateur/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export async function adminCreatePharmacy(
  payload: CreatePharmacyPayload,
  accessToken: string
): Promise<CreatePharmacyResponse> {
  return backendFetch<CreatePharmacyResponse>('/api/admin/pharmacies', {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return backendFetch<AuthTokens>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function startSession(tokens: AuthTokens): Promise<void> {
  const res = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens),
  });
  if (!res.ok) throw new Error('Impossible de démarrer la session');
}

export async function endSession(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' });
}
