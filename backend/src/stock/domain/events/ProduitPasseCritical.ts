/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Domain Event — un produit a atteint un niveau de risque HIGH ou CRITICAL
 */
import { DomainEvent } from './DomainEvent';
import { ProduitId } from '../model/ProduitId';
import { PharmacyId } from '../model/PharmacyId';
import { NiveauRisque } from '../model/NiveauRisque';
import { DLP } from '../model/DLP';
import { Quantite } from '../model/Quantite';

export class ProduitPasseCritical implements DomainEvent {
  readonly occurredOn: Date = new Date();

  constructor(
    public readonly payload: {
      produitId: ProduitId;
      pharmacyId: PharmacyId;
      nom: string;
      niveau: NiveauRisque;
      dlp: DLP;
      quantite: Quantite;
    },
  ) {}
}
