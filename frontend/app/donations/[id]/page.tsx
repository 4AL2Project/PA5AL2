'use client';

// Détail d'un don : timeline verticale des événements, reliquat, annulation
// (possible tant qu'aucun retrait n'est planifié), téléchargement des Cerfa.

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  Loader2,
  Mail,
  PackageX,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { DonationStatusBadge } from '@/components/donations/donation-status-badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  cancelDonation,
  donationCerfaUrl,
  DonationDetail,
  fetchDonationDetail,
} from '@/lib/api';

const EVENT_META: Record<
  string,
  {
    label: (payload: Record<string, unknown> | null) => string;
    icon: React.ElementType;
  }
> = {
  DON_CREE: { label: () => 'Don validé par la pharmacie', icon: Heart },
  PROPOSITION_ENVOYEE: {
    label: (p) => `Proposé à ${p?.association_name ?? 'une association'}`,
    icon: Mail,
  },
  PROPOSITION_REFUSEE: {
    label: (p) =>
      p?.reason ? `Refusé (« ${p.reason} »)` : "Refusé par l'association",
    icon: XCircle,
  },
  PROPOSITION_ACCEPTEE: {
    label: (p) => `Accepté par ${p?.association_name ?? "l'association"}`,
    icon: CheckCircle2,
  },
  PROPOSITION_ACCEPTEE_PARTIELLEMENT: {
    label: (p) =>
      `Accepté partiellement par ${p?.association_name ?? "l'association"} — reliquat re-proposé`,
    icon: CheckCircle2,
  },
  PROPOSITION_EXPIREE: {
    label: () => 'Sans réponse dans le délai — proposition suivante',
    icon: Clock,
  },
  RETRAIT_CONFIRME: {
    label: (p) =>
      `Retiré par ${p?.association_name ?? "l'association"} (${p?.picked_up_by ?? '?'})`,
    icon: CheckCircle2,
  },
  RETRAIT_MANQUE: {
    label: (p) =>
      `${p?.association_name ?? "L'association"} n'est pas venue — quantités re-proposées`,
    icon: PackageX,
  },
  DON_COMPLETE: { label: () => 'Don complété 🎉', icon: CheckCircle2 },
  DON_ECHOUE: {
    label: () => "Le don n'a pas trouvé preneur",
    icon: AlertTriangle,
  },
  DON_ANNULE: { label: () => 'Don annulé par la pharmacie', icon: Ban },
};

export default function DonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDonation(await fetchDonationDetail(id));
    } catch {
      toast.error('Impossible de charger ce don');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelDonation(id);
      toast.success("Don annulé — le produit revient au centre d'actions");
      await load();
    } catch {
      toast.error("Impossible d'annuler ce don");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  };

  const failedEvent = donation?.events.find((e) => e.type === 'DON_ECHOUE');
  const failedRemaining = (failedEvent?.payload?.remaining ?? []) as {
    name: string;
    quantity: number;
  }[];

  return (
    <DashboardLayout
      title="Détail du don"
      breadcrumb={
        <Link
          href="/donations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux dons
        </Link>
      }
      actions={
        donation?.cancellable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmCancel(true)}
          >
            <Ban className="mr-1.5 h-4 w-4" />
            Annuler le don
          </Button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !donation ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Don introuvable.
        </div>
      ) : (
        <div className="space-y-6">
          {donation.status === 'ECHOUEE' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">
                  Le don n&apos;a pas trouvé preneur
                  {failedRemaining.length > 0 &&
                    ` pour ${failedRemaining.reduce((s, l) => s + l.quantity, 0)} produit(s)`}
                  .
                </p>
                <p className="mt-0.5">
                  L&apos;action est revenue dans votre{' '}
                  <Link href="/actions" className="underline">
                    centre d&apos;actions
                  </Link>{' '}
                  — vous pouvez tenter une vente B2C ou re-valider un don plus
                  tard.
                </p>
              </div>
            </div>
          )}

          {/* Créneaux proposés aux associations */}
          {donation.pickup_windows && donation.pickup_windows.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Créneaux proposés aux associations
                </h2>
              </div>
              <ul className="divide-y">
                {donation.pickup_windows.map((slot, i) => {
                  const start = new Date(slot.start);
                  const end = new Date(slot.end);
                  const past = start < new Date();
                  return (
                    <li
                      key={i}
                      className={`flex items-center justify-between px-4 py-3 text-sm ${past ? 'opacity-50' : ''}`}
                    >
                      <span className="capitalize text-gray-800">
                        {start.toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span className="text-muted-foreground">
                        {start.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' – '}
                        {end.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {past && (
                          <span className="ml-2 text-xs text-amber-600">
                            passé
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Lot et reliquat */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Lot</h2>
              <DonationStatusBadge status={donation.status} />
            </div>
            <ul className="divide-y">
              {donation.remaining.map((line) => (
                <li
                  key={line.product_id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>{line.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {line.quantity_allocated}/{line.quantity_total} alloué
                    {line.quantity_remaining > 0 &&
                      donation.status === 'EN_COURS' &&
                      ` · reliquat ${line.quantity_remaining}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Retraits / Cerfa */}
          {donation.allocations.length > 0 && (
            <section className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Retraits</h2>
              </div>
              <ul className="divide-y">
                {donation.allocations.map((a) => (
                  <li
                    key={a.allocation_id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {a.association.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.pickup_slot_start).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {' · '}
                        {a.lines
                          .map((l) => `${l.name} ×${l.quantity}`)
                          .join(', ')}
                      </p>
                    </div>
                    {a.status === 'RETIREE' ? (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={donationCerfaUrl(a.allocation_id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="mr-1.5 h-4 w-4" />
                          Reçu Cerfa
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {a.status === 'PLANIFIEE'
                          ? 'Retrait planifié'
                          : 'Non récupéré'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Timeline */}
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Historique</h2>
            </div>
            <ol className="space-y-0 p-4">
              {donation.events.map((event, i) => {
                const meta = EVENT_META[event.type] ?? {
                  label: () => event.type,
                  icon: Clock,
                };
                const Icon = meta.icon;
                return (
                  <li key={event.event_id} className="relative flex gap-3 pb-5">
                    {i < donation.events.length - 1 && (
                      <span className="absolute left-[11px] top-6 h-full w-px bg-border" />
                    )}
                    <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm">{meta.label(event.payload)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Annuler ce don ?"
        description={
          donation?.allocations.some((a) => a.status === 'PLANIFIEE')
            ? "Une association a déjà accepté ce don. Elle sera notifiée par email de l'annulation. Le produit reviendra dans votre centre d'actions."
            : "Les propositions en cours seront retirées. Le produit reviendra dans votre centre d'actions."
        }
        confirmLabel={cancelling ? 'Annulation…' : 'Annuler le don'}
        onConfirm={handleCancel}
      />
    </DashboardLayout>
  );
}
