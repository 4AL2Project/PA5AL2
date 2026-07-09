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

/**
 * Capacités effectives par rôle, dérivées des `@Roles(...)` posés sur les
 * contrôleurs. Sert de source unique pour l'endpoint `/api/auth/me`.
 */
export interface RolePermissions {
  can_view_financials: boolean;
  can_manage_pharmacy: boolean;
  can_manage_offers: boolean;
  can_manage_categories: boolean;
  can_validate_actions: boolean;
  can_upload_data: boolean;
  can_manage_orders: boolean;
  can_manage_associations: boolean;
  can_access_admin: boolean;
}

export function permissionsForRole(role: UserRole): RolePermissions {
  switch (role) {
    case UserRole.ADMIN_SAVELY:
      return {
        can_view_financials: true,
        can_manage_pharmacy: false,
        can_manage_offers: false,
        can_manage_categories: false,
        can_validate_actions: false,
        can_upload_data: false,
        can_manage_orders: false,
        can_manage_associations: true,
        can_access_admin: true,
      };
    case UserRole.PREPARATEUR:
      return {
        can_view_financials: false,
        can_manage_pharmacy: false,
        can_manage_offers: false,
        can_manage_categories: false,
        can_validate_actions: false,
        can_upload_data: true,
        can_manage_orders: true,
        can_manage_associations: false,
        can_access_admin: false,
      };
    case UserRole.TITULAIRE:
    default:
      return {
        can_view_financials: true,
        can_manage_pharmacy: true,
        can_manage_offers: true,
        can_manage_categories: true,
        can_validate_actions: true,
        can_upload_data: true,
        can_manage_orders: true,
        can_manage_associations: false,
        can_access_admin: false,
      };
  }
}

export function scopeForRole(role: UserRole): UserScope {
  return role === UserRole.ADMIN_SAVELY ? 'PLATFORM' : 'PHARMACY';
}
