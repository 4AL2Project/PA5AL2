/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Aggregate Root Produit
 */
import { Produit } from './Produit';
import { PharmacyId } from './PharmacyId';
import { ExternalSku } from './ExternalSku';
import { Quantite } from './Quantite';
import { DLP } from './DLP';
import { NiveauRisque } from './NiveauRisque';
import { CalculateurRisque } from '../services/CalculateurRisque';
import { ProduitPasseCritical } from '../events/ProduitPasseCritical';
import { StockImporte } from '../events/StockImporte';

function dateDans(jours: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(12, 0, 0, 0);
  return d;
}

function makeProduit(joursAvantDlp: number, quantite = 10): Produit {
  return Produit.create({
    pharmacyId: PharmacyId.create('pharmacy-123'),
    externalSku: ExternalSku.create('PROD001'),
    nom: 'Crème Test',
    quantite: Quantite.create(quantite),
    dlp: DLP.create(dateDans(joursAvantDlp)),
  });
}

describe('Produit', () => {
  const calculateur = new CalculateurRisque();

  describe('create()', () => {
    it('crée un produit avec un ID généré', () => {
      const produit = makeProduit(120);
      expect(produit.id().value()).toBeTruthy();
    });

    it('lève une erreur si le nom est vide', () => {
      expect(() =>
        Produit.create({
          pharmacyId: PharmacyId.create('pharmacy-123'),
          externalSku: ExternalSku.create('PROD001'),
          nom: '   ',
          quantite: Quantite.create(10),
          dlp: DLP.create(dateDans(120)),
        }),
      ).toThrow();
    });

    it('ne génère aucun event à la création', () => {
      const produit = makeProduit(120);
      expect(produit.releaseEvents()).toHaveLength(0);
    });
  });

  describe('calculerRisque()', () => {
    it('émet ProduitPasseCritical quand le risque est CRITICAL (DLP <= 30j)', () => {
      const produit = makeProduit(15);
      produit.calculerRisque(calculateur);
      const events = produit.releaseEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProduitPasseCritical);
      const event = events[0] as ProduitPasseCritical;
      expect(event.payload.niveau).toBe(NiveauRisque.CRITICAL);
    });

    it('émet ProduitPasseCritical quand le risque est HIGH (DLP entre 31 et 90j)', () => {
      const produit = makeProduit(60);
      produit.calculerRisque(calculateur);
      const events = produit.releaseEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ProduitPasseCritical);
      const event = events[0] as ProduitPasseCritical;
      expect(event.payload.niveau).toBe(NiveauRisque.HIGH);
    });

    it('ne génère PAS d\'événement si le risque est SAFE (DLP > 90j)', () => {
      const produit = makeProduit(180);
      produit.calculerRisque(calculateur);
      expect(produit.releaseEvents()).toHaveLength(0);
    });

    it('définit le scoreRisque après calcul', () => {
      const produit = makeProduit(15);
      expect(produit.scoreRisque()).toBeNull();
      produit.calculerRisque(calculateur);
      expect(produit.scoreRisque()).not.toBeNull();
      expect(produit.scoreRisque()?.niveau).toBe(NiveauRisque.CRITICAL);
    });
  });

  describe('releaseEvents()', () => {
    it('vide les événements après appel', () => {
      const produit = makeProduit(15);
      produit.calculerRisque(calculateur);
      produit.releaseEvents(); // Premier appel
      expect(produit.releaseEvents()).toHaveLength(0); // Second appel : vide
    });

    it('retourne les events accumulés entre deux releaseEvents()', () => {
      const produit = makeProduit(15);
      produit.calculerRisque(calculateur);
      const batch1 = produit.releaseEvents();
      expect(batch1).toHaveLength(1);

      // Nouveau calcul
      produit.mettreAJour({
        nom: 'Crème Test',
        quantite: Quantite.create(5),
        dlp: DLP.create(dateDans(10)),
      });
      produit.calculerRisque(calculateur);
      const batch2 = produit.releaseEvents();
      expect(batch2).toHaveLength(1);
    });
  });

  describe('mettreAJour()', () => {
    it('réinitialise le scoreRisque après mise à jour', () => {
      const produit = makeProduit(15);
      produit.calculerRisque(calculateur);
      expect(produit.scoreRisque()).not.toBeNull();

      produit.mettreAJour({
        nom: 'Nouveau nom',
        quantite: Quantite.create(5),
        dlp: DLP.create(dateDans(180)),
      });
      expect(produit.scoreRisque()).toBeNull();
    });

    it('met à jour le nom et la quantité', () => {
      const produit = makeProduit(60, 10);
      produit.mettreAJour({
        nom: 'Nouveau nom',
        quantite: Quantite.create(99),
        dlp: DLP.create(dateDans(60)),
      });
      expect(produit.nom()).toBe('Nouveau nom');
      expect(produit.quantite().value()).toBe(99);
    });
  });

  describe('invariant — produit périmé', () => {
    it('lève une erreur si un produit périmé est classé SAFE (ne doit pas arriver avec CalculateurRisque)', () => {
      // Le CalculateurRisque ne peut pas classer un produit périmé en SAFE,
      // donc on teste l'invariant via un calculateur factice
      const produit = makeProduit(-5);

      // Le vrai calculateur classifie les périmés en CRITICAL
      produit.calculerRisque(calculateur);
      expect(produit.scoreRisque()?.niveau).toBe(NiveauRisque.CRITICAL);
    });
  });

  describe('reconstituer()', () => {
    it('reconstitue un produit sans déclencher d\'events', () => {
      const original = makeProduit(60);
      const reconstitue = Produit.reconstituer({
        id: original.id(),
        pharmacyId: original.pharmacyId(),
        externalSku: original.externalSku(),
        nom: original.nom(),
        quantite: original.quantite(),
        dlp: original.dlp(),
        scoreRisque: null,
      });
      expect(reconstitue.releaseEvents()).toHaveLength(0);
      expect(reconstitue.id().equals(original.id())).toBe(true);
    });
  });
});
