// Types et constantes du cycle de vie don (lot multi-produits, cascade asso)

export type DonationStatus = 'EN_COURS' | 'COMPLETEE' | 'ECHOUEE' | 'ANNULEE';

export type ProposalStatus =
  | 'ENVOYEE'
  | 'ACCEPTEE'
  | 'ACCEPTEE_PARTIELLEMENT'
  | 'REFUSEE'
  | 'EXPIREE'
  | 'SUPERSEDED';

export type AllocationStatus = 'PLANIFIEE' | 'RETIREE' | 'NON_RECUPEREE';

export type AssociationStatus =
  | 'ACTIVE'
  | 'EN_ATTENTE_VALIDATION'
  | 'REJETEE'
  | 'SUSPENDUE';

// Snapshot d'une ligne au moment d'un envoi ou d'une allocation
export interface DonationLineSnapshot {
  product_id: string;
  name: string;
  quantity: number;
  unit_value: number;
}

export type PickupDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

// Créneau hebdo de récupération configuré par l'officine
export interface PickupWindow {
  day: PickupDay;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

// Créneau concret proposé à l'asso
export interface PickupSlot {
  start: string; // ISO
  end: string; // ISO
}

// ── Règles fiscales (art. 238 bis CGI) ──────────────────────────────────────
// La valeur du don est le COÛT DE REVIENT HT (prix d'achat grossiste,
// Product.cost_price) — jamais le prix de vente catalogue. La réduction
// d'impôt entreprise est de 60 % de la valeur du don, plafonnée à 20 000 €
// ou 0,5 % du CA HT (plafond affiché côté front, non calculé ici).
export const DONATION_TAX_REDUCTION_RATE = 0.6;

// ── Constantes d'orchestration (ajustables) ─────────────────────────────────
// Épuisement de la cascade : au-delà, le don passe ECHOUEE et l'action
// revient au centre d'actions
export const MAX_PROPOSALS_PER_DONATION = 5;
export const MAX_DONATION_AGE_DAYS = 21;
// Délai de grâce après la fin du créneau avant de déclarer NON_RECUPEREE
export const MISSED_PICKUP_GRACE_HOURS = 24;
// Plafond de saisie du rayon d'action d'une asso
export const MAX_ACTION_RADIUS_KM = 100;
// Créneaux par défaut si l'officine n'a rien configuré
export const DEFAULT_PICKUP_WINDOWS: PickupWindow[] = [
  { day: 'MON', start: '09:00', end: '12:00' },
  { day: 'TUE', start: '09:00', end: '12:00' },
  { day: 'WED', start: '09:00', end: '12:00' },
  { day: 'THU', start: '09:00', end: '12:00' },
  { day: 'FRI', start: '09:00', end: '12:00' },
];

const DAY_INDEX: Record<PickupDay, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

/**
 * Calcule les créneaux concrets de récupération sur les `slaDays` jours à
 * venir (à partir de demain) depuis les fenêtres hebdo de l'officine.
 */
export function computePickupSlots(
  windows: PickupWindow[],
  slaDays: number,
  from: Date = new Date()
): PickupSlot[] {
  const slots: PickupSlot[] = [];
  for (let offset = 1; offset <= slaDays; offset++) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    for (const w of windows) {
      if (DAY_INDEX[w.day] !== day.getDay()) continue;
      slots.push({
        start: atTime(day, w.start).toISOString(),
        end: atTime(day, w.end).toISOString(),
      });
    }
  }
  return slots;
}

/** Le créneau choisi correspond-il à une fenêtre officine dans le délai ? */
export function isValidPickupSlot(
  windows: PickupWindow[],
  slaDays: number,
  slotStart: Date,
  slotEnd: Date,
  from: Date = new Date()
): boolean {
  if (slotStart <= from) return false;
  const horizon = new Date(from);
  horizon.setDate(horizon.getDate() + slaDays + 1);
  if (slotStart > horizon) return false;
  return windows.some(
    (w) =>
      DAY_INDEX[w.day] === slotStart.getDay() &&
      atTime(slotStart, w.start).getTime() === slotStart.getTime() &&
      atTime(slotStart, w.end).getTime() === slotEnd.getTime()
  );
}

/**
 * Génère un code alphanumérique court de récupération (ex: SAV-4X9K).
 * Exclut les caractères ambigus (0/O, 1/I/L).
 */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return (
    'SAV-' +
    Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  );
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

export function parsePickupWindows(raw: unknown): PickupWindow[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PICKUP_WINDOWS;
  return raw as PickupWindow[];
}

/**
 * Intersecte les fenêtres de l'officine avec les créneaux de passage déclarés
 * par l'asso (V1 statiques, optionnels). Sans déclaration asso, les fenêtres
 * officine s'appliquent telles quelles.
 */
export function intersectWindows(
  pharmacyWindows: PickupWindow[],
  assoWindows: unknown
): PickupWindow[] {
  if (!Array.isArray(assoWindows) || assoWindows.length === 0) {
    return pharmacyWindows;
  }
  const result: PickupWindow[] = [];
  for (const pw of pharmacyWindows) {
    for (const aw of assoWindows as PickupWindow[]) {
      if (aw.day !== pw.day) continue;
      const start = pw.start > aw.start ? pw.start : aw.start;
      const end = pw.end < aw.end ? pw.end : aw.end;
      if (start < end) result.push({ day: pw.day, start, end });
    }
  }
  return result;
}
