/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Adapter Out — repository en mémoire (usage tests uniquement)
 */
import { ProduitId } from '../../domain/model/ProduitId';
import { ExternalSku } from '../../domain/model/ExternalSku';
import { PharmacyId } from '../../domain/model/PharmacyId';
import { NiveauRisque } from '../../domain/model/NiveauRisque';
import { Produit } from '../../domain/model/Produit';
import { ProduitRepository } from '../../domain/repository/ProduitRepository';

export class InMemoryProduitRepository implements ProduitRepository {
  private readonly store = new Map<string, Produit>();

  nextIdentity(): ProduitId {
    return ProduitId.create();
  }

  async save(produit: Produit): Promise<void> {
    this.store.set(produit.id().value(), produit);
  }

  async findByExternalSku(
    sku: ExternalSku,
    pharmacyId: PharmacyId,
  ): Promise<Produit | null> {
    for (const produit of this.store.values()) {
      if (
        produit.externalSku().equals(sku) &&
        produit.pharmacyId().equals(pharmacyId)
      ) {
        return produit;
      }
    }
    return null;
  }

  async findByPharmacy(pharmacyId: PharmacyId): Promise<Produit[]> {
    return Array.from(this.store.values()).filter((p) =>
      p.pharmacyId().equals(pharmacyId),
    );
  }

  async findCritiquesParPharmacy(pharmacyId: PharmacyId): Promise<Produit[]> {
    return Array.from(this.store.values()).filter((p) => {
      if (!p.pharmacyId().equals(pharmacyId)) return false;
      const score = p.scoreRisque();
      return score?.niveau === NiveauRisque.CRITICAL || score?.niveau === NiveauRisque.HIGH;
    });
  }

  /** Utilitaire test — réinitialise le store */
  clear(): void {
    this.store.clear();
  }

  /** Utilitaire test — nombre de produits stockés */
  count(): number {
    return this.store.size;
  }
}
