/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object NiveauRisque — classification du risque produit
 */

export enum NiveauRisque {
  SAFE = 'SAFE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export function estActionnable(niveau: NiveauRisque): boolean {
  return niveau === NiveauRisque.HIGH || niveau === NiveauRisque.CRITICAL;
}

export function niveauRisqueLabel(niveau: NiveauRisque): string {
  switch (niveau) {
    case NiveauRisque.SAFE:
      return 'Aucune action requise';
    case NiveauRisque.HIGH:
      return 'Vente promotionnelle recommandée';
    case NiveauRisque.CRITICAL:
      return 'Action urgente — don ou liquidation';
  }
}
