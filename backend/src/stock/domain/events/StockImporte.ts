/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Domain Event — un import de stock a été réalisé avec succès
 */
import { DomainEvent } from './DomainEvent';
import { PharmacyId } from '../model/PharmacyId';

export class StockImporte implements DomainEvent {
  readonly occurredOn: Date = new Date();

  constructor(
    public readonly payload: {
      pharmacyId: PharmacyId;
      nbProduitsImportes: number;
      nbProduitsErreur: number;
    },
  ) {}
}
