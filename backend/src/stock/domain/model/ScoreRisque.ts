/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Value Object ScoreRisque — score numérique + niveau associé
 */
import { NiveauRisque } from './NiveauRisque';

export class ScoreRisque {
  private constructor(
    private readonly _score: number,
    private readonly _niveau: NiveauRisque,
  ) {}

  static create(score: number, niveau: NiveauRisque): ScoreRisque {
    if (score < 0 || score > 100) {
      throw new Error(`Score invalide : ${score}. Doit être entre 0 et 100.`);
    }
    return new ScoreRisque(score, niveau);
  }

  get score(): number {
    return this._score;
  }

  get niveau(): NiveauRisque {
    return this._niveau;
  }

  equals(other: ScoreRisque): boolean {
    return this._score === other._score && this._niveau === other._niveau;
  }

  toString(): string {
    return `${this._niveau}(${this._score})`;
  }
}
