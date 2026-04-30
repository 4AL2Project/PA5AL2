/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Value Object NiveauRisque
 */
import { NiveauRisque, estActionnable, niveauRisqueLabel } from './NiveauRisque';

describe('NiveauRisque', () => {
  describe('estActionnable()', () => {
    it('retourne true pour CRITICAL', () => {
      expect(estActionnable(NiveauRisque.CRITICAL)).toBe(true);
    });

    it('retourne true pour HIGH', () => {
      expect(estActionnable(NiveauRisque.HIGH)).toBe(true);
    });

    it('retourne false pour SAFE', () => {
      expect(estActionnable(NiveauRisque.SAFE)).toBe(false);
    });
  });

  describe('niveauRisqueLabel()', () => {
    it('retourne un label pour CRITICAL', () => {
      expect(niveauRisqueLabel(NiveauRisque.CRITICAL)).toContain('urgent');
    });

    it('retourne un label pour HIGH', () => {
      expect(niveauRisqueLabel(NiveauRisque.HIGH)).toContain('promo');
    });

    it('retourne un label pour SAFE', () => {
      expect(niveauRisqueLabel(NiveauRisque.SAFE)).toContain('Aucune');
    });
  });
});
