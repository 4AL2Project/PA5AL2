/**
 * Validation et formatage des saisies utilisateur (email, téléphone FR).
 * Centralisé ici pour rester cohérent entre tous les formulaires.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valide une adresse email (format simple, non ambigu). */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Réduit une saisie à ses chiffres au format national français (10 chiffres,
 * commençant par 0). Gère les préfixes internationaux `+33` / `0033`.
 */
export function normalizeFrenchPhoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0033')) {
    digits = `0${digits.slice(4)}`;
  } else if (digits.startsWith('33') && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }
  return digits.slice(0, 10);
}

/**
 * Formate un numéro français par paires : `06 12 34 56 78`.
 * Utilisable en direct à la frappe (idempotent).
 */
export function formatFrenchPhone(value: string): string {
  const digits = normalizeFrenchPhoneDigits(value);
  if (!digits) return '';
  const groups: string[] = [digits.slice(0, 2)];
  for (let i = 2; i < digits.length; i += 2) {
    groups.push(digits.slice(i, i + 2));
  }
  return groups.join(' ');
}

/** Valide un numéro de téléphone français (10 chiffres, `0[1-9]…`). */
export function isValidFrenchPhone(value: string): boolean {
  return /^0[1-9]\d{8}$/.test(normalizeFrenchPhoneDigits(value));
}
