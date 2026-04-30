/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Domain Event — une action DLP a été validée par le titulaire
 */
import { DomainEvent } from '../../../stock/domain/events/DomainEvent';
import { ActionId } from '../model/ActionId';

export class ActionValidee implements DomainEvent {
  readonly occurredOn: Date = new Date();

  constructor(
    public readonly payload: {
      actionId: ActionId;
      produitId: string;
      pharmacyId: string;
    },
  ) {}
}
