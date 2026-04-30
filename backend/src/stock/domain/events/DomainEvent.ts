/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Interface de base pour tous les Domain Events
 */

export interface DomainEvent {
  readonly occurredOn: Date;
}
