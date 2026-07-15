import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../../database/client';
import {
  DONATION_TAX_REDUCTION_RATE,
  DonationLineSnapshot,
  DonationStatus,
} from './donation.types';
import { DonationMatchingService } from './donation-matching.service';
import { UpdateDonParametresDto } from './dto/donation.dto';

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

  /** Paramètres de don de la pharmacie. Crée un enregistrement avec les valeurs
   *  par défaut si aucun n'existe encore (pattern upsert idempotent). */
  async getParametres(pharmacyId: string) {
    return prisma.donParametres.upsert({
      where: { pharmacy_id: pharmacyId },
      update: {},
      create: { pharmacy_id: pharmacyId },
    });
  }

  /** Met à jour (ou initialise) les paramètres de don de la pharmacie. */
  async updateParametres(pharmacyId: string, dto: UpdateDonParametresDto) {
    return prisma.donParametres.upsert({
      where: { pharmacy_id: pharmacyId },
      update: {
        seuil_dormance_jours: dto.seuil_dormance_jours,
        rayon_matching_km: dto.rayon_matching_km,
      },
      create: {
        pharmacy_id: pharmacyId,
        seuil_dormance_jours: dto.seuil_dormance_jours,
        rayon_matching_km: dto.rayon_matching_km,
      },
    });
  }

  // ── Admin ───────────────────────────────────────────────────────────────────

  /** Liste tous les dons (toutes pharmacies). Admin uniquement. */
  async adminList(opts?: {
    status?: string;
    pharmacy_id?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const take = Math.min(opts?.limit ?? 50, 200);
    const skip = ((opts?.page ?? 1) - 1) * take;
    const where = {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.pharmacy_id ? { pharmacy_id: opts.pharmacy_id } : {}),
      ...(opts?.from || opts?.to
        ? {
            created_at: {
              ...(opts.from ? { gte: new Date(opts.from) } : {}),
              ...(opts.to ? { lte: new Date(opts.to) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await Promise.all([
      prisma.donation.count({ where }),
      prisma.donation.findMany({
        where,
        include: {
          pharmacy: { select: { name: true, address: true } },
          lines: {
            include: { product: { select: { name: true } } },
          },
          proposals: {
            orderBy: { sent_at: 'desc' },
            take: 1,
            include: { association: { select: { name: true } } },
          },
          allocations: {
            where: { status: 'RETIREE' },
            select: { lines: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take,
        skip,
      }),
    ]);
    return { total, page: opts?.page ?? 1, limit: take, items };
  }

  /** Détail complet d'un don (admin, sans restriction de tenant). */
  async adminDetail(donationId: string) {
    const donation = await prisma.donation.findUnique({
      where: { donation_id: donationId },
      include: {
        pharmacy: { select: { pharmacy_id: true, name: true } },
        lines: {
          include: { product: { select: { name: true, external_sku: true } } },
        },
        proposals: {
          include: {
            association: { select: { name: true, contact_email: true } },
          },
          orderBy: { sent_at: 'asc' },
        },
        allocations: {
          include: { association: { select: { name: true } } },
        },
        events: { orderBy: { created_at: 'asc' } },
      },
    });
    if (!donation) throw new NotFoundException('Don introuvable');
    return donation;
  }

  /** Force le statut d'un don (admin uniquement — bypass state machine). */
  async adminForceStatus(donationId: string, status: DonationStatus) {
    const donation = await prisma.donation.findUnique({
      where: { donation_id: donationId },
    });
    if (!donation) throw new NotFoundException('Don introuvable');
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: { status, updated_at: new Date() },
    });
  }

  /** Régénère le token de la proposition active/expirée d'un don. */
  async adminRegenToken(donationId: string) {
    const proposal = await prisma.donationProposal.findFirst({
      where: {
        donation_id: donationId,
        status: { in: ['ENVOYEE', 'EXPIREE'] },
      },
      orderBy: { sent_at: 'desc' },
    });
    if (!proposal)
      throw new NotFoundException('Aucune proposition active ou expirée');
    const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
    return prisma.donationProposal.update({
      where: { proposal_id: proposal.proposal_id },
      data: { status: 'ENVOYEE', expires_at: newExpiry },
    });
  }

  /** KPIs plateforme + alertes pour le dashboard monitoring admin. */
  async getMonitoring() {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      totalDonations,
      donationsByStatus,
      blockedDonations,
      expiredProposals,
      missedAllocations,
    ] = await Promise.all([
      prisma.donation.count(),
      prisma.donation.groupBy({ by: ['status'], _count: true }),
      prisma.donation.findMany({
        where: { status: 'EN_COURS', created_at: { lt: fiveDaysAgo } },
        select: {
          donation_id: true,
          created_at: true,
          pharmacy: { select: { name: true } },
          proposals: {
            orderBy: { sent_at: 'desc' },
            take: 1,
            include: { association: { select: { name: true } } },
          },
        },
        orderBy: { created_at: 'asc' },
        take: 20,
      }),
      prisma.donationProposal.count({
        where: { status: 'EXPIREE', donation: { status: 'EN_COURS' } },
      }),
      prisma.donationAllocation.count({
        where: { status: 'NON_RECUPEREE', pickup_slot_end: { lt: now } },
      }),
    ]);

    // Associations avec fiabilité faible (< 50 %) — basé sur allocations
    const assoByStat = await prisma.association.findMany({
      where: { status: 'ACTIVE' },
      select: {
        association_id: true,
        name: true,
        allocations: {
          select: { status: true },
        },
        proposals: {
          where: {
            status: { in: ['ACCEPTEE', 'ACCEPTEE_PARTIELLEMENT', 'REFUSEE'] },
          },
          select: { status: true },
        },
      },
    });

    const lowReliabilityAssos = assoByStat
      .map((a) => {
        const accepted = a.proposals.filter((p) =>
          ['ACCEPTEE', 'ACCEPTEE_PARTIELLEMENT'].includes(p.status)
        ).length;
        const withdrawn = a.allocations.filter(
          (al) => al.status === 'RETIREE'
        ).length;
        const reliability = accepted > 0 ? withdrawn / accepted : null;
        return { association_id: a.association_id, name: a.name, reliability };
      })
      .filter((a) => a.reliability !== null && a.reliability < 0.5);

    const statusMap = Object.fromEntries(
      donationsByStatus.map((r) => [r.status, r._count])
    );

    return {
      kpis: {
        total: totalDonations,
        by_status: statusMap,
        completion_rate:
          totalDonations > 0
            ? ((statusMap['COMPLETEE'] ?? 0) / totalDonations) * 100
            : 0,
        failure_rate:
          totalDonations > 0
            ? ((statusMap['ECHOUEE'] ?? 0) / totalDonations) * 100
            : 0,
      },
      alerts: {
        blocked_donations: blockedDonations,
        blocked_count: blockedDonations.length,
        expired_proposals: expiredProposals,
        missed_pickups: missedAllocations,
        low_reliability_assos: lowReliabilityAssos,
      },
    };
  }

  /** Paramètres de don d'une pharmacie, accès admin (retourne null si non configurés). */
  async getParametresAdmin(pharmacyId: string) {
    return prisma.donParametres.findUnique({
      where: { pharmacy_id: pharmacyId },
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
