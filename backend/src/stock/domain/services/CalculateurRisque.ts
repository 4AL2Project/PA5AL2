/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Domain Service — calcul du score de risque péremption produit
 *
 * Règles métier Savely :
 *   CRITICAL : DLP <= 30 jours OU produit périmé
 *   HIGH     : DLP entre 31 et 90 jours
 *   SAFE     : DLP > 90 jours
 *
 * Score numérique (0–100) : plus il est élevé, plus le risque est élevé.
 */
import { DLP } from '../model/DLP';
import { Quantite } from '../model/Quantite';
import { NiveauRisque } from '../model/NiveauRisque';
import { ScoreRisque } from '../model/ScoreRisque';

export class CalculateurRisque {
  calculer(dlp: DLP, quantite: Quantite): ScoreRisque {
    const jours = dlp.joursRestants();
    const niveau = dlp.niveauRisque();

    // Score numérique : urgence inversement proportionnelle aux jours restants
    // Plafonné à 100, minimum 0
    let score: number;

    if (jours <= 0) {
      // Produit périmé → score maximal
      score = 100;
    } else if (jours <= 30) {
      // CRITICAL : score entre 70 et 99
      score = Math.round(99 - ((jours - 1) / 29) * 29);
    } else if (jours <= 90) {
      // HIGH : score entre 31 et 69
      score = Math.round(69 - ((jours - 31) / 59) * 38);
    } else {
      // SAFE : score entre 0 et 30
      score = Math.max(0, Math.round(30 - ((jours - 91) / 270) * 30));
    }

    // Rupture de stock : risque financier nul, on peut baisser le score
    if (quantite.estRupture() && niveau !== NiveauRisque.CRITICAL) {
      score = Math.min(score, 20);
    }

    return ScoreRisque.create(score, niveau);
  }
}
