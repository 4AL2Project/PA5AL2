/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object ActionId — BC Actions/DLP
 */
import { randomUUID } from 'crypto';

export class ActionId {
  private constructor(private readonly _value: string) {}

  static create(): ActionId {
    return new ActionId(randomUUID());
  }

  static reconstituer(value: string): ActionId {
    if (!value || value.trim() === '') {
      throw new Error('ActionId ne peut pas être vide');
    }
    return new ActionId(value.trim());
  }

  value(): string {
    return this._value;
  }

  equals(other: ActionId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
