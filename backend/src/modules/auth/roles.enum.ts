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
] as const;
