/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Exception domaine — quantité négative ou invalide
 */

export class QuantiteNegativeException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantiteNegativeException';
    Object.setPrototypeOf(this, QuantiteNegativeException.prototype);
  }
}
