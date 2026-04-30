/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port Out — interface du repository Produit (zéro Prisma/SQL ici)
 */
import { Produit } from '../model/Produit';
import { ProduitId } from '../model/ProduitId';
import { ExternalSku } from '../model/ExternalSku';
import { PharmacyId } from '../model/PharmacyId';

export interface ProduitRepository {
  nextIdentity(): ProduitId;
  save(produit: Produit): Promise<void>;
  findByExternalSku(sku: ExternalSku, pharmacyId: PharmacyId): Promise<Produit | null>;
  findByPharmacy(pharmacyId: PharmacyId): Promise<Produit[]>;
  findCritiquesParPharmacy(pharmacyId: PharmacyId): Promise<Produit[]>;
}
