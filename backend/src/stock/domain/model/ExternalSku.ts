/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object ExternalSku — identifiant produit côté LGO
 */

export class ExternalSku {
  private constructor(private readonly _value: string) {}

  static create(value: string): ExternalSku {
    if (!value || value.trim() === '') {
      throw new Error('ExternalSku ne peut pas être vide');
    }
    return new ExternalSku(value.trim());
  }

  value(): string {
    return this._value;
  }

  equals(other: ExternalSku): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
