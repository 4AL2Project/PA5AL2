import { Injectable } from '@nestjs/common';

import { prisma } from '../../database/client';

// Lissage bayésien du taux de récupération : une asso sans historique part à
// PRIOR_RATE au lieu de 0/0, et il faut PRIOR_WEIGHT retraits pour que son
// historique réel pèse autant que le prior (les nouvelles ne sont pas écrasées).
export const RELIABILITY_PRIOR_RATE = 0.7;
export const RELIABILITY_PRIOR_WEIGHT = 5;

const CACHE_TTL_MS = 60 * 1000;

export interface AssociationStats {
  proposals_received: number;
  response_rate: number | null;
  pickup_rate: number | null;
  smoothed_reliability: number;
  avg_response_hours: number | null;
  last_donation_at: Date | null;
}

interface CacheEntry {
  at: number;
  stats: AssociationStats;
}

@Injectable()
export class AssociationStatsService {
  private readonly cache = new Map<string, CacheEntry>();

  /**
   * Taux de récupération lissé, pour le matching.
   * = (RETIREE + prior×poids) / (RETIREE + NON_RECUPEREE + poids)
   */
  async getReliability(associationIds: string[]): Promise<Map<string, number>> {
    const grouped = await prisma.donationAllocation.groupBy({
      by: ['association_id', 'status'],
      where: {
        association_id: { in: associationIds },
        status: { in: ['RETIREE', 'NON_RECUPEREE'] },
      },
      _count: { _all: true },
    });

    const counts = new Map<string, { ok: number; missed: number }>();
    for (const row of grouped) {
      const entry = counts.get(row.association_id) ?? { ok: 0, missed: 0 };
      if (row.status === 'RETIREE') entry.ok += row._count._all;
      else entry.missed += row._count._all;
      counts.set(row.association_id, entry);
    }

    const result = new Map<string, number>();
    for (const id of associationIds) {
      const { ok, missed } = counts.get(id) ?? { ok: 0, missed: 0 };
      result.set(id, smoothedReliability(ok, missed));
    }
    return result;
  }

  /** Stats complètes pour la fiche admin (cache court, calcul à la volée). */
  async getStats(associationId: string): Promise<AssociationStats> {
    const cached = this.cache.get(associationId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.stats;

    const [proposals, allocations] = await Promise.all([
      prisma.donationProposal.findMany({
        where: { association_id: associationId },
        select: { status: true, sent_at: true, responded_at: true },
      }),
      prisma.donationAllocation.findMany({
        where: { association_id: associationId },
        select: { status: true, picked_up_at: true },
      }),
    ]);

    const answered = proposals.filter((p) => p.responded_at != null);
    const decided = proposals.filter((p) => p.status !== 'ENVOYEE');
    const ok = allocations.filter((a) => a.status === 'RETIREE').length;
    const missed = allocations.filter(
      (a) => a.status === 'NON_RECUPEREE'
    ).length;

    const responseDelays = answered
      .filter((p) => p.responded_at)
      .map((p) => (p.responded_at!.getTime() - p.sent_at.getTime()) / 3600000);

    const lastPickup = allocations
      .filter((a) => a.picked_up_at)
      .map((a) => a.picked_up_at!)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const stats: AssociationStats = {
      proposals_received: proposals.length,
      response_rate:
        decided.length > 0 ? answered.length / decided.length : null,
      pickup_rate: ok + missed > 0 ? ok / (ok + missed) : null,
      smoothed_reliability: smoothedReliability(ok, missed),
      avg_response_hours:
        responseDelays.length > 0
          ? responseDelays.reduce((s, d) => s + d, 0) / responseDelays.length
          : null,
      last_donation_at: lastPickup ?? null,
    };

    this.cache.set(associationId, { at: Date.now(), stats });
    return stats;
  }
}

export function smoothedReliability(ok: number, missed: number): number {
  return (
    (ok + RELIABILITY_PRIOR_RATE * RELIABILITY_PRIOR_WEIGHT) /
    (ok + missed + RELIABILITY_PRIOR_WEIGHT)
  );
}
