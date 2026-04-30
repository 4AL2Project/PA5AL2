/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object DLP (Date Limite de Péremption) — BC Stock/Import
 */
import { NiveauRisque } from './NiveauRisque';
import { DLPInvalideException } from '../exceptions/DLPInvalideException';

export class DLP {
  private constructor(private readonly _value: Date) {}

  static create(date: Date | string): DLP {
    const parsed = date instanceof Date ? date : new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new DLPInvalideException(`Date invalide : ${date}`);
    }
    return new DLP(parsed);
  }

  joursRestants(): number {
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dlpMidnight = new Date(
      this._value.getFullYear(),
      this._value.getMonth(),
      this._value.getDate(),
    );
    return Math.ceil(
      (dlpMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  estPerime(): boolean {
    return this.joursRestants() < 0;
  }

  niveauRisque(): NiveauRisque {
    const jours = this.joursRestants();
    if (jours <= 30) return NiveauRisque.CRITICAL;
    if (jours <= 90) return NiveauRisque.HIGH;
    return NiveauRisque.SAFE;
  }

  equals(other: DLP): boolean {
    return this._value.getTime() === other._value.getTime();
  }

  toDate(): Date {
    return new Date(this._value);
  }

  toString(): string {
    return this._value.toISOString().split('T')[0];
  }
}
