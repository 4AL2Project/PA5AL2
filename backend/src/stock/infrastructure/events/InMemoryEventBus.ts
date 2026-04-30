/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Adapter Out — bus d'événements en mémoire (développement / tests)
 *
 * En production, remplacer par un adapter RabbitMQ, Redis Streams, etc.
 */
import { DomainEvent } from '../../domain/events/DomainEvent';
import { EventBusPort } from '../../application/ports/EventBusPort';

export class InMemoryEventBus implements EventBusPort {
  /** Événements publiés — utile pour l'inspection en tests */
  public readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
    // TODO : brancher les handlers (notifications, dashboard, etc.)
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
