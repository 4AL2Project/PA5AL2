/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object ProduitId — BC Stock/Import
 */
import { randomUUID } from 'crypto';

export class ProduitId {
  private constructor(private readonly _value: string) {}

  static create(): ProduitId {
    return new ProduitId(randomUUID());
  }

  static reconstituer(value: string): ProduitId {
    if (!value || value.trim() === '') {
      throw new Error('ProduitId ne peut pas être vide');
    }
    return new ProduitId(value.trim());
  }

  value(): string {
    return this._value;
  }

  equals(other: ProduitId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
