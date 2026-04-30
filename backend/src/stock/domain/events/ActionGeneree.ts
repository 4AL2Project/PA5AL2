/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Domain Event — une action DLP a été générée pour un produit à risque
 */
import { DomainEvent } from './DomainEvent';
import { ProduitId } from '../model/ProduitId';
import { PharmacyId } from '../model/PharmacyId';

export class ActionGeneree implements DomainEvent {
  readonly occurredOn: Date = new Date();

  constructor(
    public readonly payload: {
      actionId: string;
      produitId: ProduitId;
      pharmacyId: PharmacyId;
      typeAction: string;
    },
  ) {}
}
