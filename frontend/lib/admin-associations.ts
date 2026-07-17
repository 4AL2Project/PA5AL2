// Client API helpers pour le back-office « Associations partenaires ».
// Toutes les requêtes passent par le proxy same-origin `/api/be` qui injecte
// le Bearer token de session (cookie httpOnly) — pas de token en localStorage.

export interface AssoPickupWindow {
  day: string;
  start: string;
  end: string;
}

export interface AssoActivityStats {
  total_dons: number;
  dons_en_cours: number;
  last_activity_at: string | null;
}

export interface AssociationAdminRow {
  association_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  categories: string[];
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  status: string;
  agrement_numero: string | null;
  agrement_valide: boolean;
  blacklisted_at: string | null;
  is_onboarded: boolean;
  magic_link_token_hash: string | null;
  magic_link_expires_at: string | null;
  pickup_windows: AssoPickupWindow[] | null;
  created_at: string;
  fiabilite_score: number;
  stats: AssoActivityStats;
}

export interface AssociationAdminList {
  data: AssociationAdminRow[];
  total: number;
  page: number;
  limit: number;
  stats: { total: number; actives: number; agrement_manquant: number };
}

export interface AssoFiabilite {
  score: number;
  total_acceptes: number;
  pickups_confirmes: number;
  echecs_pickup: number;
  refus: number;
  avg_response_hours: number | null;
  officines_partenaires: number;
  valeur_totale_ht: number;
  tax_savings: number;
  last_donation_at: string | null;
}

export interface AssoActiveDon {
  allocation_id: string;
  status: string;
  pickup_slot_start: string;
  pickup_slot_end: string;
  donation: {
    donation_id: string;
    pharmacy: { name: string | null; address: string | null };
  };
  lines: { name: string; quantity: number; unit_value: number }[];
}

export interface AssoLog {
  log_id: string;
  admin_email: string | null;
  action: string;
  details: string | null;
  created_at: string;
}

export interface AssoNote {
  note_id: string;
  admin_email: string;
  contenu: string;
  created_at: string;
}

export interface AssociationAdminDetail extends AssociationAdminRow {
  fiabilite: AssoFiabilite;
  active_dons: AssoActiveDon[];
  logs: AssoLog[];
  notes: AssoNote[];
}

export interface CreateAssoDto {
  name: string;
  email: string;
  telephone?: string;
  address: string;
  city: string;
  postal_code?: string;
  agrement_numero?: string;
  agrement_valide?: boolean;
  categories?: string[];
  pickup_windows?: AssoPickupWindow[];
  send_invitation?: boolean;
}

export type UpdateAssoDto = Partial<Omit<CreateAssoDto, 'send_invitation'>>;

export interface PatchStatutDto {
  statut: 'ACTIVE' | 'SUSPENDUE' | 'BLACKLISTEE';
  raison?: string;
}

export interface AssoListParams {
  statut?: string;
  agrement?: string;
  onboarding?: string;
  fiabilite?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

const BASE = '/api/be/api/admin/associations';

// Le backend enveloppe toutes les réponses dans { success: true, data: ... }.
// Cette fonction extrait le contenu et propage les erreurs proprement.
async function parseData<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      payload?.error?.message ??
      payload?.message ??
      'Une erreur est survenue. Réessayez.';
    throw new Error(msg);
  }
  return ('success' in (payload ?? {}) ? payload.data : payload) as T;
}

export async function fetchAdminAssociations(
  params: AssoListParams
): Promise<AssociationAdminList> {
  const qs = new URLSearchParams();
  if (params.statut) qs.set('statut', params.statut);
  if (params.agrement) qs.set('agrement', params.agrement);
  if (params.onboarding) qs.set('onboarding', params.onboarding);
  if (params.fiabilite) qs.set('fiabilite', params.fiabilite);
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.sortBy) qs.set('sortBy', params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  const url = qs.size ? `${BASE}?${qs}` : BASE;

  const res = await fetch(url, { cache: 'no-store' });
  return parseData<AssociationAdminList>(res);
}

export async function fetchAdminAssociationDetail(
  id: string
): Promise<AssociationAdminDetail> {
  const res = await fetch(`${BASE}/${id}`, { cache: 'no-store' });
  return parseData<AssociationAdminDetail>(res);
}

export async function createAdminAssociation(
  dto: CreateAssoDto
): Promise<AssociationAdminRow> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseData<AssociationAdminRow>(res);
}

export async function updateAdminAssociation(
  id: string,
  dto: UpdateAssoDto
): Promise<AssociationAdminRow> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseData<AssociationAdminRow>(res);
}

export async function patchAssoStatut(
  id: string,
  dto: PatchStatutDto
): Promise<AssociationAdminRow> {
  const res = await fetch(`${BASE}/${id}/statut`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseData<AssociationAdminRow>(res);
}

export async function inviterAsso(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/inviter`, { method: 'POST' });
  await parseData<unknown>(res);
}

export async function fetchAssoNotes(id: string): Promise<AssoNote[]> {
  const res = await fetch(`${BASE}/${id}/notes`, { cache: 'no-store' });
  return parseData<AssoNote[]>(res);
}

export async function addAssoNote(
  id: string,
  contenu: string
): Promise<AssoNote> {
  const res = await fetch(`${BASE}/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contenu }),
  });
  return parseData<AssoNote>(res);
}

export interface AssoLogsPage {
  data: AssoLog[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAssoLogs(
  id: string,
  page = 1
): Promise<AssoLogsPage> {
  const res = await fetch(`${BASE}/${id}/logs?page=${page}`, {
    cache: 'no-store',
  });
  return parseData<AssoLogsPage>(res);
}

// Historique complet des allocations (tous statuts) — sert la section
// « Historique tous les dons ». Réutilise la route admin existante.
export interface AssoAllocationHistoryItem {
  allocation_id: string;
  status: string;
  pickup_slot_start: string;
  picked_up_at: string | null;
  cerfa_number: string | null;
  cerfa_url: string | null;
  lines: { name: string; quantity: number; unit_value: number }[];
  donation: {
    donation_id: string;
    pharmacy: { name: string | null; address: string | null } | null;
  };
}

export async function fetchAssoAllocationHistory(
  id: string
): Promise<AssoAllocationHistoryItem[]> {
  const res = await fetch(`/api/be/api/associations/${id}/allocations`, {
    cache: 'no-store',
  });
  return parseData<AssoAllocationHistoryItem[]>(res);
}

export async function exportAssoCsv(): Promise<void> {
  const res = await fetch(`${BASE}/export`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? 'Export impossible. Réessayez.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'associations.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Helpers d'affichage partagés ────────────────────────────────────────────

export const ASSO_CATEGORY_OPTIONS = [
  { value: 'cosmetiques', label: 'Cosmétiques' },
  { value: 'parapharmacie', label: 'Parapharmacie' },
  { value: 'hygiene', label: 'Hygiène' },
  { value: 'autre', label: 'Autre' },
];

export const PICKUP_DAYS: { value: string; label: string }[] = [
  { value: 'MON', label: 'Lundi' },
  { value: 'TUE', label: 'Mardi' },
  { value: 'WED', label: 'Mercredi' },
  { value: 'THU', label: 'Jeudi' },
  { value: 'FRI', label: 'Vendredi' },
  { value: 'SAT', label: 'Samedi' },
  { value: 'SUN', label: 'Dimanche' },
];

export function reliabilityColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function reliabilityStars(score: number): string {
  if (score >= 90) return '⭐⭐⭐';
  if (score >= 75) return '⭐⭐';
  if (score >= 50) return '⭐';
  return '⚠️';
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  SUSPENDUE: 'Suspendue',
  BLACKLISTEE: 'Blacklistée',
  EN_ATTENTE_VALIDATION: 'En attente',
  REJETEE: 'Rejetée',
};

export const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  SUSPENDUE: 'bg-amber-100 text-amber-800',
  BLACKLISTEE: 'bg-gray-200 text-gray-700',
  EN_ATTENTE_VALIDATION: 'bg-blue-100 text-blue-800',
  REJETEE: 'bg-red-100 text-red-800',
};

// Une invitation est « ancienne » si le magic link a été envoyé il y a > 7j.
export function invitationStale(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  // magic link TTL = 24h → si expiré depuis > 6j, l'envoi date de > 7j
  const expiry = new Date(expiresAt).getTime();
  return Date.now() - expiry > 6 * 24 * 3600 * 1000;
}
