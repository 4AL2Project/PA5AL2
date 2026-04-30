/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object PharmacyId — isolation multi-tenant
 */

export class PharmacyId {
  private constructor(private readonly _value: string) {}

  static create(value: string): PharmacyId {
    if (!value || value.trim() === '') {
      throw new Error('PharmacyId ne peut pas être vide');
    }
    return new PharmacyId(value.trim());
  }

  static reconstituer(value: string): PharmacyId {
    return PharmacyId.create(value);
  }

  value(): string {
    return this._value;
  }

  equals(other: PharmacyId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
