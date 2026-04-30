/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port Out — interface du bus d'événements
 */
import { DomainEvent } from '../../domain/events/DomainEvent';

export interface EventBusPort {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}

export const EVENT_BUS_TOKEN = Symbol('EVENT_BUS_TOKEN');
