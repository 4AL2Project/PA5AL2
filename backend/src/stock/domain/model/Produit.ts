/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Aggregate Root Produit — BC Stock/Import
 *
 * Invariants protégés :
 *   - La quantité ne peut pas être négative (garanti par Quantite VO)
 *   - Un produit périmé ne peut pas avoir un score SAFE
 *   - ExternalSku est unique par pharmacyId (garanti au niveau repository)
 */
import { ProduitId } from './ProduitId';
import { PharmacyId } from './PharmacyId';
import { ExternalSku } from './ExternalSku';
import { Quantite } from './Quantite';
import { DLP } from './DLP';
import { ScoreRisque } from './ScoreRisque';
import { NiveauRisque } from './NiveauRisque';
import { DomainEvent } from '../events/DomainEvent';
import { ProduitPasseCritical } from '../events/ProduitPasseCritical';
import { CalculateurRisque } from '../services/CalculateurRisque';

export class Produit {
  private _domainEvents: DomainEvent[] = [];

  private constructor(
    private readonly _id: ProduitId,
    private readonly _pharmacyId: PharmacyId,
    private readonly _externalSku: ExternalSku,
    private _nom: string,
    private _quantite: Quantite,
    private _dlp: DLP,
    private _scoreRisque: ScoreRisque | null,
  ) {}

  // ─── Factory : création d'un nouveau produit ────────────────────────────────

  static create(params: {
    pharmacyId: PharmacyId;
    externalSku: ExternalSku;
    nom: string;
    quantite: Quantite;
    dlp: DLP;
  }): Produit {
    if (!params.nom || params.nom.trim() === '') {
      throw new Error('Le nom du produit ne peut pas être vide');
    }
    const id = ProduitId.create();
    return new Produit(
      id,
      params.pharmacyId,
      params.externalSku,
      params.nom.trim(),
      params.quantite,
      params.dlp,
      null,
    );
  }

  // ─── Factory : reconstitution depuis la persistance ─────────────────────────

  static reconstituer(params: {
    id: ProduitId;
    pharmacyId: PharmacyId;
    externalSku: ExternalSku;
    nom: string;
    quantite: Quantite;
    dlp: DLP;
    scoreRisque: ScoreRisque | null;
  }): Produit {
    return new Produit(
      params.id,
      params.pharmacyId,
      params.externalSku,
      params.nom,
      params.quantite,
      params.dlp,
      params.scoreRisque,
    );
  }

  // ─── Comportements métier ───────────────────────────────────────────────────

  calculerRisque(calculateur: CalculateurRisque): void {
    const score = calculateur.calculer(this._dlp, this._quantite);

    // Invariant : un produit périmé ne peut pas être SAFE
    if (this._dlp.estPerime() && score.niveau === NiveauRisque.SAFE) {
      throw new Error(
        `Invariant violé : le produit ${this._externalSku.value()} est périmé mais classé SAFE`,
      );
    }

    this._scoreRisque = score;

    if (
      score.niveau === NiveauRisque.CRITICAL ||
      score.niveau === NiveauRisque.HIGH
    ) {
      this.recordEvent(
        new ProduitPasseCritical({
          produitId: this._id,
          pharmacyId: this._pharmacyId,
          nom: this._nom,
          niveau: score.niveau,
          dlp: this._dlp,
          quantite: this._quantite,
        }),
      );
    }
  }

  mettreAJour(params: { nom: string; quantite: Quantite; dlp: DLP }): void {
    this._nom = params.nom.trim();
    this._quantite = params.quantite;
    this._dlp = params.dlp;
    this._scoreRisque = null; // À recalculer
  }

  // ─── Accesseurs (lecture seule) ─────────────────────────────────────────────

  id(): ProduitId {
    return this._id;
  }

  pharmacyId(): PharmacyId {
    return this._pharmacyId;
  }

  externalSku(): ExternalSku {
    return this._externalSku;
  }

  nom(): string {
    return this._nom;
  }

  quantite(): Quantite {
    return this._quantite;
  }

  dlp(): DLP {
    return this._dlp;
  }

  scoreRisque(): ScoreRisque | null {
    return this._scoreRisque;
  }

  // ─── Gestion des Domain Events ──────────────────────────────────────────────

  releaseEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  private recordEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }
}
