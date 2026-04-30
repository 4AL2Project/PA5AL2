/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Exception domaine — DLP invalide ou absente
 */

export class DLPInvalideException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DLPInvalideException';
    Object.setPrototypeOf(this, DLPInvalideException.prototype);
  }
}
