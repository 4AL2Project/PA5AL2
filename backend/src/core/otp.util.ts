import * as crypto from 'crypto';

/** Génère un code OTP numérique de `length` chiffres (avec zéros de tête). */
export function generateOtpCode(length: number): string {
  const max = 10 ** length;
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

/** Hash SHA-256 du code : seul ce hash est stocké, jamais le code en clair. */
export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
