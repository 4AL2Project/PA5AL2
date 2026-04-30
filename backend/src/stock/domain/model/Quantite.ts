/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object Quantite — stock en unités entières
 */
import { QuantiteNegativeException } from '../exceptions/QuantiteNegativeException';

export class Quantite {
  private constructor(private readonly _value: number) {}

  static create(value: number): Quantite {
    if (!Number.isInteger(value) || value < 0) {
      throw new QuantiteNegativeException(
        `La quantité doit être un entier >= 0, reçu : ${value}`,
      );
    }
    return new Quantite(value);
  }

  value(): number {
    return this._value;
  }

  estRupture(): boolean {
    return this._value === 0;
  }

  equals(other: Quantite): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return String(this._value);
  }
}
