/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Aggregate Root Action
 */
import { Action } from './Action';
import { TypeAction } from './TypeAction';
import { StatutAction } from './StatutAction';
import { ActionDejaTraiteeException } from '../exceptions/ActionDejaTraiteeException';
import { ActionValidee } from '../events/ActionValidee';

function creerAction(): Action {
  return Action.creer({
    produitId: 'produit-123',
    pharmacyId: 'pharmacy-456',
    typeAction: TypeAction.DON,
  });
}

describe('Action', () => {
  describe('creer()', () => {
    it('crée une action en statut EN_ATTENTE', () => {
      const action = creerAction();
      expect(action.statut()).toBe(StatutAction.EN_ATTENTE);
    });

    it('génère un ID non vide', () => {
      const action = creerAction();
      expect(action.id().value()).toBeTruthy();
    });

    it('conserve le typeAction', () => {
      const action = creerAction();
      expect(action.typeAction()).toBe(TypeAction.DON);
    });

    it('ne génère aucun event à la création', () => {
      const action = creerAction();
      expect(action.releaseEvents()).toHaveLength(0);
    });
  });

  describe('valider()', () => {
    it('passe en statut VALIDEE', () => {
      const action = creerAction();
      action.valider();
      expect(action.statut()).toBe(StatutAction.VALIDEE);
    });

    it('émet ActionValidee', () => {
      const action = creerAction();
      action.valider();
      const events = action.releaseEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ActionValidee);
    });

    it('lève ActionDejaTraiteeException si déjà VALIDEE', () => {
      const action = creerAction();
      action.valider();
      action.releaseEvents();
      expect(() => action.valider()).toThrow(ActionDejaTraiteeException);
    });

    it('lève ActionDejaTraiteeException si déjà ANNULEE', () => {
      const action = creerAction();
      action.annuler();
      expect(() => action.valider()).toThrow(ActionDejaTraiteeException);
    });
  });

  describe('annuler()', () => {
    it('passe en statut ANNULEE', () => {
      const action = creerAction();
      action.annuler();
      expect(action.statut()).toBe(StatutAction.ANNULEE);
    });

    it('lève ActionDejaTraiteeException si déjà ANNULEE', () => {
      const action = creerAction();
      action.annuler();
      expect(() => action.annuler()).toThrow(ActionDejaTraiteeException);
    });

    it('lève ActionDejaTraiteeException si déjà VALIDEE', () => {
      const action = creerAction();
      action.valider();
      action.releaseEvents();
      expect(() => action.annuler()).toThrow(ActionDejaTraiteeException);
    });
  });

  describe('VENTE_PROMOTIONNELLE', () => {
    it('crée une action de type VENTE_PROMOTIONNELLE', () => {
      const action = Action.creer({
        produitId: 'produit-123',
        pharmacyId: 'pharmacy-456',
        typeAction: TypeAction.VENTE_PROMOTIONNELLE,
      });
      expect(action.typeAction()).toBe(TypeAction.VENTE_PROMOTIONNELLE);
    });
  });

  describe('reconstituer()', () => {
    it('reconstitue une action avec le statut persisté', () => {
      const original = creerAction();
      const { ActionId } = require('./ActionId');
      const reconstitue = Action.reconstituer({
        id: original.id(),
        produitId: 'produit-123',
        pharmacyId: 'pharmacy-456',
        typeAction: TypeAction.DON,
        statut: StatutAction.EN_COURS,
        createdAt: new Date(),
      });
      expect(reconstitue.statut()).toBe(StatutAction.EN_COURS);
      expect(reconstitue.releaseEvents()).toHaveLength(0);
    });
  });
});
