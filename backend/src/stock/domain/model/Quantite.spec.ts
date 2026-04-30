/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Value Object Quantite
 */
import { Quantite } from './Quantite';
import { QuantiteNegativeException } from '../exceptions/QuantiteNegativeException';

describe('Quantite', () => {
  describe('create()', () => {
    it('accepte 0 (rupture de stock)', () => {
      const q = Quantite.create(0);
      expect(q.value()).toBe(0);
    });

    it('accepte un entier positif', () => {
      const q = Quantite.create(42);
      expect(q.value()).toBe(42);
    });

    it('lève QuantiteNegativeException si < 0', () => {
      expect(() => Quantite.create(-1)).toThrow(QuantiteNegativeException);
    });

    it('lève QuantiteNegativeException pour un nombre décimal', () => {
      expect(() => Quantite.create(1.5)).toThrow(QuantiteNegativeException);
    });

    it('lève QuantiteNegativeException pour -0.1', () => {
      expect(() => Quantite.create(-0.1)).toThrow(QuantiteNegativeException);
    });
  });

  describe('estRupture()', () => {
    it('retourne true si quantité = 0', () => {
      expect(Quantite.create(0).estRupture()).toBe(true);
    });

    it('retourne false si quantité > 0', () => {
      expect(Quantite.create(5).estRupture()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('retourne true pour deux quantités identiques', () => {
      expect(Quantite.create(10).equals(Quantite.create(10))).toBe(true);
    });

    it('retourne false pour des quantités différentes', () => {
      expect(Quantite.create(10).equals(Quantite.create(20))).toBe(false);
    });
  });
});
