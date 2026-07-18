import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../../database/client';
import {
  DONATION_TAX_REDUCTION_RATE,
  DonationLineSnapshot,
  DonationStatus,
} from './donation.types';
import { DonationMatchingService } from './donation-matching.service';

// Lecture côté titulaire : listes, détail (timeline), bilan RSE, retraits à
// venir. Les transitions d'état vivent dans DonationOrchestratorService.
@Injectable()
export class DonationsService {
  constructor(private readonly matching: DonationMatchingService) {}

  async listForPharmacy(pharmacyId: string, status?: DonationStatus) {
    return prisma.donation.findMany({
      where: { pharmacy_id: pharmacyId, ...(status ? { status } : {}) },
      include: {
        lines: {
          include: {
            product: { select: { name: true, external_sku: true } },
          },
        },
        proposals: {
          where: { status: 'ENVOYEE' },
          include: { association: { select: { name: true } } },
        },
        allocations: {
          include: { association: { select: { name: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getDetail(donationId: string, pharmacyId: string) {
    const donation = await prisma.donation.findFirst({
      where: { donation_id: donationId, pharmacy_id: pharmacyId },
      include: {
        lines: {
          include: {
            product: { select: { name: true, external_sku: true } },
          },
        },
        proposals: {
          include: { association: { select: { name: true } } },
          orderBy: { sent_at: 'asc' },
        },
        allocations: {
          include: { association: { select: { name: true } } },
        },
        events: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!donation) throw new NotFoundException('Don introuvable');

    const remaining = donation.lines.map((l) => ({
      product_id: l.product_id,
      name: l.product.name,
      quantity_total: l.quantity_total,
      quantity_allocated: l.quantity_allocated,
      quantity_remaining: l.quantity_total - l.quantity_allocated,
      unit_value: l.unit_value,
    }));
    const cancellable =
      donation.status === 'EN_COURS' &&
      !donation.allocations.some((a) => a.status === 'PLANIFIEE');

    return { ...donation, remaining, cancellable };
  }

  /**
   * Aperçu pour le dialog de validation : « N associations éligibles dans la
   * zone ». Le titulaire ne choisit plus l'asso — l'orchestrateur décide.
   */
  async eligiblePreview(
    pharmacyId: string,
    lines: { product_id: string; quantity: number }[]
  ) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacie introuvable');
    const products = await prisma.product.findMany({
      where: {
        product_id: { in: lines.map((l) => l.product_id) },
        pharmacy_id: pharmacyId,
      },
    });
    const byId = new Map(products.map((p) => [p.product_id, p]));
    const ranked = await this.matching.rankEligible(
      pharmacy,
      lines.map((l) => ({
        product_id: l.product_id,
        category: byId.get(l.product_id)?.category ?? null,
        quantity: l.quantity,
      }))
    );
    // Valorisation fiscale du lot (coût de revient HT, art. 238 bis CGI)
    // pour l'arbitrage Promo B2C vs Don du dialog de validation
    let costValue: number | null = 0;
    for (const l of lines) {
      const cost = byId.get(l.product_id)?.cost_price;
      if (cost == null || cost <= 0) {
        costValue = null;
        break;
      }
      costValue += cost * l.quantity;
    }

    return {
      count: ranked.length,
      associations: ranked.map((r) => ({
        association_id: r.association_id,
        name: r.name,
        distance_km: r.distance_km,
      })),
      // null si un cost_price manque — le don sera refusé tant qu'il n'est
      // pas renseigné
      cost_value: costValue,
      tax_savings:
        costValue != null ? costValue * DONATION_TAX_REDUCTION_RATE : null,
    };
  }

  /** Allocations PLANIFIEE des prochains jours (dashboard + app préparateur). */
  async upcomingPickups(pharmacyId: string, days = 7) {
    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 3600 * 1000);
    return prisma.donationAllocation.findMany({
      where: {
        donation: { pharmacy_id: pharmacyId },
        status: 'PLANIFIEE',
        pickup_slot_start: { lte: horizon },
      },
      include: {
        association: { select: { name: true, contact_phone: true } },
      },
      orderBy: { pickup_slot_start: 'asc' },
    });
  }

  /** Bilan RSE : basé sur les allocations RETIREE (valeur réellement donnée). */
  async getBilan(pharmacyId: string) {
    const [donations, allocations] = await Promise.all([
      prisma.donation.findMany({
        where: { pharmacy_id: pharmacyId },
        select: { status: true },
      }),
      prisma.donationAllocation.findMany({
        where: { donation: { pharmacy_id: pharmacyId }, status: 'RETIREE' },
        select: { lines: true, association_id: true },
      }),
    ]);

    const donations_by_status: Record<DonationStatus, number> = {
      EN_COURS: 0,
      COMPLETEE: 0,
      ECHOUEE: 0,
      ANNULEE: 0,
    };
    for (const d of donations) {
      donations_by_status[d.status as DonationStatus]++;
    }

    let totalValue = 0;
    const productIds = new Set<string>();
    for (const allocation of allocations) {
      const lines = allocation.lines as unknown as DonationLineSnapshot[];
      for (const line of lines) {
        totalValue += line.quantity * line.unit_value;
        productIds.add(line.product_id);
      }
    }

    return {
      total_donations: donations.length,
      total_withdrawn: allocations.length,
      // Valeur au coût de revient HT (art. 238 bis CGI)
      total_value_donated: totalValue,
      // Réduction d'impôt entreprise : 60 % de la valeur du don
      // (plafond 20 000 € ou 0,5 % du CA HT, affiché côté front)
      tax_savings: totalValue * DONATION_TAX_REDUCTION_RATE,
      total_associations: new Set(allocations.map((a) => a.association_id))
        .size,
      total_products_donated: productIds.size,
      donations_by_status,
    };
  }
}
