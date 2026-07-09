export enum UserRole {
  TITULAIRE = 'TITULAIRE',
  PREPARATEUR = 'PREPARATEUR',
  ADMIN_SAVELY = 'ADMIN_SAVELY',
}

export const FINANCIAL_FIELDS = [
  'cost_price',
  'recoverable_value',
  'potential_loss',
  'total_recoverable',
  'total_potential_loss',
  'capital_locked',
] as const;

/**
 * Portée fonctionnelle d'un utilisateur :
 * - PHARMACY : rattaché à une officine (TITULAIRE, PREPARATEUR)
 * - PLATFORM : administrateur Savely, non rattaché à une officine (ADMIN_SAVELY)
 */
export type UserScope = 'PHARMACY' | 'PLATFORM';

export function scopeForRole(role: UserRole): UserScope {
  return role === UserRole.ADMIN_SAVELY ? 'PLATFORM' : 'PHARMACY';
}
