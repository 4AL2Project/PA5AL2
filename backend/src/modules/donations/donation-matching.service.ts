import { Injectable } from '@nestjs/common';

import { haversineKm } from '../../core/geo.util';
import { prisma } from '../../database/client';
import { AssociationStatsService } from '../associations/association-stats.service';

// ── Pondérations du classement (somme = 1, ajustables) ──────────────────────
// fiabilité : taux de récupération lissé (prior géré par AssociationStatsService)
export const WEIGHT_RELIABILITY = 0.5;
// équité : ancienneté depuis la dernière proposition reçue, toutes officines
// confondues — à fiabilité égale on tourne entre les assos
export const WEIGHT_EQUITY = 0.3;
// proximité : distance normalisée sur le rayon d'action de l'asso
export const WEIGHT_PROXIMITY = 0.2;
// Au-delà de cet âge sans proposition, le score d'équité est au maximum
export const EQUITY_HORIZON_DAYS = 30;
// Garde-fou anti-saturation : une asso ne peut pas accumuler plus de
// N retraits planifiés simultanés, toutes officines confondues
export const MAX_PLANNED_ALLOCATIONS = 3;

export interface RemainingLine {
  product_id: string;
  category: string | null;
  quantity: number;
}

export interface RankedAssociation {
  association_id: string;
  name: string;
  contact_email: string | null;
  distance_km: number;
  pickup_sla_days: number;
  response_sla_hours: number;
  score: number;
}

@Injectable()
export class DonationMatchingService {
  constructor(private readonly stats: AssociationStatsService) {}

  /**
   * Classe les assos éligibles pour le reliquat d'un lot, la plus pertinente
   * d'abord. La cascade de l'orchestrateur consomme cette liste.
   *
   * Filtres durs : ACTIVE + email vérifié, distance(officine, siège) dans le
   * rayon d'action DE L'ASSO, au moins une catégorie du lot acceptée, pas déjà
   * sollicitée sur ce don, moins de MAX_PLANNED_ALLOCATIONS retraits planifiés.
   */
  async rankEligible(
    pharmacy: { lat: number | null; lng: number | null },
    remainingLines: RemainingLine[],
    donationId?: string
  ): Promise<RankedAssociation[]> {
    if (pharmacy.lat == null || pharmacy.lng == null) return [];

    const lotCategories = new Set(
      remainingLines
        .map((l) => l.category)
        .filter((c): c is string => c != null && c !== '')
    );

    const [candidates, alreadySolicited, plannedCounts] = await Promise.all([
      prisma.association.findMany({
        where: {
          status: 'ACTIVE',
          email_verified_at: { not: null },
          lat: { not: null },
          lng: { not: null },
        },
      }),
      donationId
        ? prisma.donationProposal.findMany({
            where: { donation_id: donationId },
            select: { association_id: true },
          })
        : Promise.resolve([]),
      prisma.donationAllocation.groupBy({
        by: ['association_id'],
        where: { status: 'PLANIFIEE' },
        _count: { _all: true },
      }),
    ]);

    const solicitedIds = new Set(alreadySolicited.map((p) => p.association_id));
    const planned = new Map(
      plannedCounts.map((row) => [row.association_id, row._count._all])
    );

    const eligible = candidates
      .map((asso) => ({
        asso,
        distance: haversineKm(
          pharmacy.lat!,
          pharmacy.lng!,
          asso.lat!,
          asso.lng!
        ),
      }))
      .filter(({ asso, distance }) => {
        if (solicitedIds.has(asso.association_id)) return false;
        if (distance > asso.action_radius_km) return false;
        if ((planned.get(asso.association_id) ?? 0) >= MAX_PLANNED_ALLOCATIONS)
          return false;
        // Produits sans catégorie (exports LGO incomplets) : acceptables par
        // toutes les assos — le filtre ne s'applique qu'aux catégories connues
        if (lotCategories.size > 0) {
          const accepts = asso.categories.some((c) => lotCategories.has(c));
          if (!accepts && remainingLines.every((l) => l.category)) return false;
        }
        return true;
      });

    if (eligible.length === 0) return [];

    const reliability = await this.stats.getReliability(
      eligible.map(({ asso }) => asso.association_id)
    );
    const now = Date.now();

    return eligible
      .map(({ asso, distance }) => {
        const rel = reliability.get(asso.association_id) ?? 0;
        const equity = equityScore(asso.last_proposal_at, now);
        const proximity = 1 - distance / asso.action_radius_km;
        return {
          association_id: asso.association_id,
          name: asso.name,
          contact_email: asso.contact_email,
          distance_km: Math.round(distance * 10) / 10,
          pickup_sla_days: asso.pickup_sla_days,
          response_sla_hours: asso.response_sla_hours,
          score:
            WEIGHT_RELIABILITY * rel +
            WEIGHT_EQUITY * equity +
            WEIGHT_PROXIMITY * proximity,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}

function equityScore(lastProposalAt: Date | null, now: number): number {
  if (!lastProposalAt) return 1;
  const days = (now - lastProposalAt.getTime()) / 86400000;
  return Math.min(days / EQUITY_HORIZON_DAYS, 1);
}
