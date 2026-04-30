/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Fixture CSV — format LGPI (séparateur ',', dates DD/MM/YYYY)
 */

function dateDansJours(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** 2 produits : 1 CRITICAL (15j), 1 SAFE (120j) */
export const csvLgpi = [
  `code_article,libelle,qte_stock,dluo`,
  `PROD001,Crème Hydratante SPF50,45,${dateDansJours(15)}`,
  `PROD002,Sérum Vitamine C,12,${dateDansJours(120)}`,
].join('\n');

/** Fixture statique pour les tests de parsing de format */
export const csvLgpiStatique = `code_article,libelle,qte_stock,dluo
PROD001,Crème Hydratante SPF50,45,15/08/2025
PROD002,Sérum Vitamine C,12,20/03/2026`.trim();
