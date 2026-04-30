/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Domain Service CalculateurRisque
 */
import { CalculateurRisque } from './CalculateurRisque';
import { DLP } from '../model/DLP';
import { Quantite } from '../model/Quantite';
import { NiveauRisque } from '../model/NiveauRisque';

function dateDans(jours: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe('CalculateurRisque', () => {
  const calculateur = new CalculateurRisque();
  const qte10 = Quantite.create(10);

  describe('Niveau CRITICAL', () => {
    it('CRITICAL si DLP dans 15 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(15)), qte10);
      expect(score.niveau).toBe(NiveauRisque.CRITICAL);
    });

    it('CRITICAL si DLP dans 1 jour', () => {
      const score = calculateur.calculer(DLP.create(dateDans(1)), qte10);
      expect(score.niveau).toBe(NiveauRisque.CRITICAL);
    });

    it('CRITICAL si DLP dans 30 jours exactement', () => {
      const score = calculateur.calculer(DLP.create(dateDans(30)), qte10);
      expect(score.niveau).toBe(NiveauRisque.CRITICAL);
    });

    it('CRITICAL si produit périmé (DLP hier)', () => {
      const score = calculateur.calculer(DLP.create(dateDans(-1)), qte10);
      expect(score.niveau).toBe(NiveauRisque.CRITICAL);
    });

    it('CRITICAL si produit périmé depuis longtemps', () => {
      const score = calculateur.calculer(DLP.create(dateDans(-365)), qte10);
      expect(score.niveau).toBe(NiveauRisque.CRITICAL);
      expect(score.score).toBe(100);
    });
  });

  describe('Niveau HIGH', () => {
    it('HIGH si DLP dans 60 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(60)), qte10);
      expect(score.niveau).toBe(NiveauRisque.HIGH);
    });

    it('HIGH si DLP dans 31 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(31)), qte10);
      expect(score.niveau).toBe(NiveauRisque.HIGH);
    });

    it('HIGH si DLP dans 90 jours exactement', () => {
      const score = calculateur.calculer(DLP.create(dateDans(90)), qte10);
      expect(score.niveau).toBe(NiveauRisque.HIGH);
    });
  });

  describe('Niveau SAFE', () => {
    it('SAFE si DLP dans 120 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(120)), qte10);
      expect(score.niveau).toBe(NiveauRisque.SAFE);
    });

    it('SAFE si DLP dans 91 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(91)), qte10);
      expect(score.niveau).toBe(NiveauRisque.SAFE);
    });

    it('SAFE si DLP dans 365 jours', () => {
      const score = calculateur.calculer(DLP.create(dateDans(365)), qte10);
      expect(score.niveau).toBe(NiveauRisque.SAFE);
    });
  });

  describe('Score numérique', () => {
    it('le score est entre 0 et 100', () => {
      const cas = [dateDans(-1), dateDans(15), dateDans(60), dateDans(180)];
      for (const date of cas) {
        const score = calculateur.calculer(DLP.create(date), qte10);
        expect(score.score).toBeGreaterThanOrEqual(0);
        expect(score.score).toBeLessThanOrEqual(100);
      }
    });

    it('le score est plus élevé pour un produit CRITICAL que HIGH', () => {
      const scoreCritical = calculateur.calculer(DLP.create(dateDans(15)), qte10);
      const scoreHigh = calculateur.calculer(DLP.create(dateDans(60)), qte10);
      expect(scoreCritical.score).toBeGreaterThan(scoreHigh.score);
    });

    it('le score est plus élevé pour un produit HIGH que SAFE', () => {
      const scoreHigh = calculateur.calculer(DLP.create(dateDans(60)), qte10);
      const scoreSafe = calculateur.calculer(DLP.create(dateDans(180)), qte10);
      expect(scoreHigh.score).toBeGreaterThan(scoreSafe.score);
    });
  });

  describe('Rupture de stock', () => {
    it('score réduit pour un produit HIGH en rupture', () => {
      const avecStock = calculateur.calculer(DLP.create(dateDans(60)), Quantite.create(10));
      const rupture = calculateur.calculer(DLP.create(dateDans(60)), Quantite.create(0));
      expect(rupture.score).toBeLessThanOrEqual(avecStock.score);
    });
  });
});
