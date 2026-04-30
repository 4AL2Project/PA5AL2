/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Application Handler — génère une Action en réaction à ProduitPasseCritical
 *
 * Ce handler écoute le Domain Event ProduitPasseCritical et crée
 * l'Action DLP correspondante selon le niveau de risque.
 */
import { ProduitPasseCritical } from '../../../stock/domain/events/ProduitPasseCritical';
import { NiveauRisque } from '../../../stock/domain/model/NiveauRisque';
import { Action } from '../../domain/model/Action';
import { TypeAction } from '../../domain/model/TypeAction';
import { ActionRepository } from '../../domain/repository/ActionRepository';

export class GenererActionHandler {
  constructor(private readonly actionRepo: ActionRepository) {}

  async handle(event: ProduitPasseCritical): Promise<void> {
    const typeAction =
      event.payload.niveau === NiveauRisque.CRITICAL
        ? TypeAction.DON
        : TypeAction.VENTE_PROMOTIONNELLE;

    const action = Action.creer({
      produitId: event.payload.produitId.value(),
      pharmacyId: event.payload.pharmacyId.value(),
      typeAction,
    });

    await this.actionRepo.save(action);
  }
}
