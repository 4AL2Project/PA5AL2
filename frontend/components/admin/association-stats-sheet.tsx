'use client';

// Fiche enrichie d'une association : zone d'action, stats de fiabilité
// (utilisées par le matching) et historique des retraits.

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Association } from '@/lib/admin';

interface Stats {
  proposals_received: number;
  response_rate: number | null;
  pickup_rate: number | null;
  smoothed_reliability: number;
  avg_response_hours: number | null;
  last_donation_at: string | null;
}

interface AllocationHistoryItem {
  allocation_id: string;
  status: string;
  pickup_slot_start: string;
  picked_up_by: string | null;
  lines: { name: string; quantity: number }[];
  donation: { pharmacy: { name: string } };
}

const ALLOCATION_LABEL: Record<string, { label: string; className: string }> = {
  PLANIFIEE: {
    label: 'Planifié',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RETIREE: {
    label: 'Retiré',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  NON_RECUPEREE: {
    label: 'Non récupéré',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

function pct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)} %`;
}

export function AssociationStatsSheet({
  association,
  open,
  onOpenChange,
}: {
  association: Association;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<AllocationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/be/api/associations/${association.association_id}/stats`)
        .then((r) => r.json())
        .then((p) => (p?.success ? (p.data as Stats) : null)),
      fetch(
        `/api/be/api/associations/${association.association_id}/allocations`
      )
        .then((r) => r.json())
        .then((p) => (p?.success ? (p.data as AllocationHistoryItem[]) : [])),
    ])
      .then(([s, h]) => {
        setStats(s);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  }, [open, association.association_id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">{association.name}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Zone d&apos;action
            </h3>
            <p className="text-sm">
              Rayon de {association.action_radius_km} km autour de{' '}
              {association.city} ({association.postal_code})
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Récupération sous {association.pickup_sla_days} j · réponse sous{' '}
              {association.response_sla_hours} h
              {association.fiscal_receipt_verified &&
                ' · éligibilité reçu fiscal vérifiée'}
            </p>
          </section>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Fiabilité
                </h3>
                {stats ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Propositions reçues
                      </dt>
                      <dd className="font-medium">
                        {stats.proposals_received}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Taux de réponse
                      </dt>
                      <dd className="font-medium">
                        {pct(stats.response_rate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Taux de récupération
                      </dt>
                      <dd className="font-medium">{pct(stats.pickup_rate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Score matching (lissé)
                      </dt>
                      <dd className="font-medium">
                        {pct(stats.smoothed_reliability)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Délai moyen de réponse
                      </dt>
                      <dd className="font-medium">
                        {stats.avg_response_hours == null
                          ? '—'
                          : `${Math.round(stats.avg_response_hours)} h`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Dernier don retiré
                      </dt>
                      <dd className="font-medium">
                        {stats.last_donation_at
                          ? new Date(stats.last_donation_at).toLocaleDateString(
                              'fr-FR'
                            )
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Stats indisponibles.
                  </p>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                  Historique des retraits
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune allocation pour l&apos;instant.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((a) => {
                      const badge =
                        ALLOCATION_LABEL[a.status] ??
                        ALLOCATION_LABEL.PLANIFIEE;
                      return (
                        <li
                          key={a.allocation_id}
                          className="rounded-lg border px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium">
                              {a.donation.pharmacy.name}
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${badge.className}`}
                            >
                              {badge.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(a.pickup_slot_start).toLocaleDateString(
                              'fr-FR'
                            )}
                            {' · '}
                            {a.lines
                              .map((l) => `${l.name} ×${l.quantity}`)
                              .join(', ')}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
