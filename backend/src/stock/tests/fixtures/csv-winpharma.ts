/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Fixture CSV — format Winpharma (séparateur ';')
 */

/**
 * Génère une date future à partir d'aujourd'hui + n jours.
 * Utilisé pour garantir que les fixtures restent valides dans le temps.
 */
function dateDansJours(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/** 3 produits : 1 CRITICAL (15j), 1 HIGH (60j), 1 SAFE (180j) */
export const csvWinpharma = [
  `SKU;NOM_PRODUIT;QUANTITE;DATE_PEREMPTION`,
  `PROD001;Crème Hydratante SPF50;45;${dateDansJours(15)}`,
  `PROD002;Sérum Vitamine C;12;${dateDansJours(60)}`,
  `PROD003;Gel Douche Apaisant;3;${dateDansJours(180)}`,
].join('\n');

/** Fixture statique pour les tests de parsing de format */
export const csvWinpharmaStatique = `SKU;NOM_PRODUIT;QUANTITE;DATE_PEREMPTION
PROD001;Crème Hydratante SPF50;45;2025-08-15
PROD002;Sérum Vitamine C;12;2026-03-20
PROD003;Gel Douche Apaisant;3;2025-02-10`.trim();
