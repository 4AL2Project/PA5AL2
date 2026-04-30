/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Value Object DLP
 */
import { DLP } from './DLP';
import { NiveauRisque } from './NiveauRisque';
import { DLPInvalideException } from '../exceptions/DLPInvalideException';

function dateDans(jours: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe('DLP', () => {
  describe('create()', () => {
    it('accepte une Date valide', () => {
      const dlp = DLP.create(dateDans(30));
      expect(dlp).toBeDefined();
    });

    it('accepte une string ISO valide', () => {
      const dlp = DLP.create('2099-12-31');
      expect(dlp).toBeDefined();
    });

    it('lève DLPInvalideException pour une date invalide', () => {
      expect(() => DLP.create('pas-une-date')).toThrow(DLPInvalideException);
    });

    it('lève DLPInvalideException pour NaN', () => {
      expect(() => DLP.create(new Date('invalid'))).toThrow(DLPInvalideException);
    });
  });

  describe('joursRestants()', () => {
    it('retourne un nombre positif pour une date future', () => {
      const dlp = DLP.create(dateDans(50));
      expect(dlp.joursRestants()).toBeCloseTo(50, 0);
    });

    it('retourne un nombre négatif pour une date passée', () => {
      const dlp = DLP.create(dateDans(-10));
      expect(dlp.joursRestants()).toBeLessThan(0);
    });

    it('retourne 0 ou -1 pour une date passée d\'hier', () => {
      const dlp = DLP.create(dateDans(-1));
      expect(dlp.joursRestants()).toBeLessThanOrEqual(0);
    });
  });

  describe('estPerime()', () => {
    it('retourne false pour une date future', () => {
      expect(DLP.create(dateDans(1)).estPerime()).toBe(false);
    });

    it('retourne true pour une date passée', () => {
      expect(DLP.create(dateDans(-1)).estPerime()).toBe(true);
    });
  });

  describe('niveauRisque()', () => {
    it('retourne CRITICAL si DLP <= 30 jours', () => {
      expect(DLP.create(dateDans(15)).niveauRisque()).toBe(NiveauRisque.CRITICAL);
    });

    it('retourne CRITICAL si DLP = 0 jours (périmé aujourd\'hui)', () => {
      const hier = dateDans(-1);
      expect(DLP.create(hier).niveauRisque()).toBe(NiveauRisque.CRITICAL);
    });

    it('retourne CRITICAL si DLP = 30 jours exactement', () => {
      expect(DLP.create(dateDans(30)).niveauRisque()).toBe(NiveauRisque.CRITICAL);
    });

    it('retourne HIGH si DLP entre 31 et 90 jours', () => {
      expect(DLP.create(dateDans(60)).niveauRisque()).toBe(NiveauRisque.HIGH);
    });

    it('retourne HIGH si DLP = 31 jours', () => {
      expect(DLP.create(dateDans(31)).niveauRisque()).toBe(NiveauRisque.HIGH);
    });

    it('retourne HIGH si DLP = 90 jours', () => {
      expect(DLP.create(dateDans(90)).niveauRisque()).toBe(NiveauRisque.HIGH);
    });

    it('retourne SAFE si DLP > 90 jours', () => {
      expect(DLP.create(dateDans(120)).niveauRisque()).toBe(NiveauRisque.SAFE);
    });

    it('retourne SAFE si DLP = 91 jours', () => {
      expect(DLP.create(dateDans(91)).niveauRisque()).toBe(NiveauRisque.SAFE);
    });
  });

  describe('equals()', () => {
    it('retourne true pour deux DLP identiques', () => {
      const date = dateDans(60);
      expect(DLP.create(date).equals(DLP.create(new Date(date)))).toBe(true);
    });

    it('retourne false pour deux DLP différentes', () => {
      expect(DLP.create(dateDans(30)).equals(DLP.create(dateDans(60)))).toBe(false);
    });
  });

  describe('toDate()', () => {
    it('retourne une copie défensive de la date', () => {
      const date = dateDans(60);
      const dlp = DLP.create(date);
      const returned = dlp.toDate();
      returned.setFullYear(2000);
      // La mutation externe ne doit pas affecter la DLP
      expect(dlp.toDate().getFullYear()).not.toBe(2000);
    });
  });
});
