/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object TypeAction — nature de l'action DLP recommandée
 */

export enum TypeAction {
  DON = 'DON',                     // CRITICAL — don à une association
  VENTE_PROMOTIONNELLE = 'VENTE_PROMOTIONNELLE', // HIGH — vente soldée
  RETOUR_FOURNISSEUR = 'RETOUR_FOURNISSEUR',     // Cas particulier
}
