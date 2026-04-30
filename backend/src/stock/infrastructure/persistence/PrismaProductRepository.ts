/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Adapter Out — repository Produit via Prisma (PostgreSQL)
 */
import { PrismaClient } from '@prisma/client';
import { Produit } from '../../domain/model/Produit';
import { ProduitId } from '../../domain/model/ProduitId';
import { PharmacyId } from '../../domain/model/PharmacyId';
import { ExternalSku } from '../../domain/model/ExternalSku';
import { Quantite } from '../../domain/model/Quantite';
import { DLP } from '../../domain/model/DLP';
import { NiveauRisque } from '../../domain/model/NiveauRisque';
import { ScoreRisque } from '../../domain/model/ScoreRisque';
import { ProduitRepository } from '../../domain/repository/ProduitRepository';

export class PrismaProductRepository implements ProduitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  nextIdentity(): ProduitId {
    return ProduitId.create();
  }

  async save(produit: Produit): Promise<void> {
    const score = produit.scoreRisque();

    await this.prisma.product.upsert({
      where: {
        pharmacy_id_external_sku: {
          pharmacy_id: produit.pharmacyId().value(),
          external_sku: produit.externalSku().value(),
        },
      },
      create: {
        product_id: produit.id().value(),
        pharmacy_id: produit.pharmacyId().value(),
        external_sku: produit.externalSku().value(),
        name: produit.nom(),
        stock_quantity: produit.quantite().value(),
        expiry_date: produit.dlp().toDate(),
      },
      update: {
        name: produit.nom(),
        stock_quantity: produit.quantite().value(),
        expiry_date: produit.dlp().toDate(),
        updated_at: new Date(),
      },
    });

    // Persister l'analyse de risque si calculée
    if (score) {
      await this.prisma.riskAnalysis.upsert({
        where: {
          product_id_analysis_date: {
            product_id: produit.id().value(),
            analysis_date: new Date(new Date().toDateString()),
          },
        },
        create: {
          product_id: produit.id().value(),
          pharmacy_id: produit.pharmacyId().value(),
          days_to_expiry: produit.dlp().joursRestants(),
          risk_score: score.score / 100,
          risk_level: score.niveau.toLowerCase(),
          suggested_action: this.suggestedAction(score.niveau),
          sales_velocity_30d: 0,
          expected_sales: 0,
          excess_stock: 0,
          recoverable_value: 0,
          potential_loss: 0,
        },
        update: {
          days_to_expiry: produit.dlp().joursRestants(),
          risk_score: score.score / 100,
          risk_level: score.niveau.toLowerCase(),
          suggested_action: this.suggestedAction(score.niveau),
        },
      });
    }
  }

  async findByExternalSku(
    sku: ExternalSku,
    pharmacyId: PharmacyId,
  ): Promise<Produit | null> {
    const row = await this.prisma.product.findFirst({
      where: {
        external_sku: sku.value(),
        pharmacy_id: pharmacyId.value(),
      },
    });

    if (!row) return null;
    return this.toDomain(row);
  }

  async findByPharmacy(pharmacyId: PharmacyId): Promise<Produit[]> {
    const rows = await this.prisma.product.findMany({
      where: { pharmacy_id: pharmacyId.value() },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findCritiquesParPharmacy(pharmacyId: PharmacyId): Promise<Produit[]> {
    const rows = await this.prisma.product.findMany({
      where: { pharmacy_id: pharmacyId.value() },
      include: { analyses: { orderBy: { analysis_date: 'desc' }, take: 1 } },
    });

    return rows
      .filter((r) => {
        const latest = r.analyses[0];
        return latest && (latest.risk_level === 'critical' || latest.risk_level === 'high');
      })
      .map((r) => this.toDomain(r));
  }

  // ─── Mapping Prisma → Domain ────────────────────────────────────────────────

  private toDomain(row: {
    product_id: string;
    pharmacy_id: string;
    external_sku: string | null;
    name: string;
    stock_quantity: number;
    expiry_date: Date | null;
  }): Produit {
    return Produit.reconstituer({
      id: ProduitId.reconstituer(row.product_id),
      pharmacyId: PharmacyId.reconstituer(row.pharmacy_id),
      externalSku: ExternalSku.create(row.external_sku ?? row.product_id),
      nom: row.name,
      quantite: Quantite.create(row.stock_quantity),
      dlp: DLP.create(row.expiry_date ?? new Date()),
      scoreRisque: null,
    });
  }

  private suggestedAction(niveau: NiveauRisque): string {
    switch (niveau) {
      case NiveauRisque.CRITICAL:
        return 'Don à une association';
      case NiveauRisque.HIGH:
        return 'Vente promotionnelle';
      case NiveauRisque.SAFE:
        return 'Aucune action requise';
    }
  }
}
