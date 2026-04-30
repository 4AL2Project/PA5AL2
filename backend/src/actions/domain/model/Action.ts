/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Aggregate Root Action — BC Actions/DLP
 *
 * Une Action représente une recommandation d'action sur un produit à risque.
 * Elle suit un cycle de vie : EN_ATTENTE → EN_COURS → VALIDEE | ANNULEE
 */
import { ActionId } from './ActionId';
import { TypeAction } from './TypeAction';
import { StatutAction } from './StatutAction';
import { ActionDejaTraiteeException } from '../exceptions/ActionDejaTraiteeException';
import { DomainEvent } from '../../../stock/domain/events/DomainEvent';
import { ActionValidee } from '../events/ActionValidee';

export class Action {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: ActionId,
    private readonly _produitId: string,
    private readonly _pharmacyId: string,
    private readonly _typeAction: TypeAction,
    private _statut: StatutAction,
    private readonly _createdAt: Date,
  ) {}

  static creer(params: {
    produitId: string;
    pharmacyId: string;
    typeAction: TypeAction;
  }): Action {
    return new Action(
      ActionId.create(),
      params.produitId,
      params.pharmacyId,
      params.typeAction,
      StatutAction.EN_ATTENTE,
      new Date(),
    );
  }

  static reconstituer(params: {
    id: ActionId;
    produitId: string;
    pharmacyId: string;
    typeAction: TypeAction;
    statut: StatutAction;
    createdAt: Date;
  }): Action {
    return new Action(
      params.id,
      params.produitId,
      params.pharmacyId,
      params.typeAction,
      params.statut,
      params.createdAt,
    );
  }

  valider(): void {
    if (
      this._statut === StatutAction.VALIDEE ||
      this._statut === StatutAction.ANNULEE
    ) {
      throw new ActionDejaTraiteeException(this._id.value());
    }
    this._statut = StatutAction.VALIDEE;
    this.recordEvent(
      new ActionValidee({
        actionId: this._id,
        produitId: this._produitId,
        pharmacyId: this._pharmacyId,
      }),
    );
  }

  annuler(): void {
    if (
      this._statut === StatutAction.VALIDEE ||
      this._statut === StatutAction.ANNULEE
    ) {
      throw new ActionDejaTraiteeException(this._id.value());
    }
    this._statut = StatutAction.ANNULEE;
  }

  id(): ActionId {
    return this._id;
  }

  typeAction(): TypeAction {
    return this._typeAction;
  }

  statut(): StatutAction {
    return this._statut;
  }

  releaseEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private recordEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}
