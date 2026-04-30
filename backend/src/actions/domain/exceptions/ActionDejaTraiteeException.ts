/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Exception domaine — tentative de modification d'une action déjà traitée
 */

export class ActionDejaTraiteeException extends Error {
  constructor(actionId: string) {
    super(`L'action ${actionId} est déjà traitée et ne peut plus être modifiée.`);
    this.name = 'ActionDejaTraiteeException';
    Object.setPrototypeOf(this, ActionDejaTraiteeException.prototype);
  }
}
