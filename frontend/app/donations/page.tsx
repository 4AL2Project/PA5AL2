'use client';

// Suivi des dons côté titulaire : retraits à venir (avec confirmation) et
// liste des lots avec leur statut — le pilotage de la cascade est automatique.

import { CalendarClock, Heart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { ConfirmPickupDialog } from '@/components/donations/confirm-pickup-dialog';
import { DonationStatusBadge } from '@/components/donations/donation-status-badge';
import { Button } from '@/components/ui/button';
import {
  DonationAllocationItem,
  DonationSummary,
  fetchDonations,
  fetchUpcomingPickups,
} from '@/lib/api';

export default function DonationsPage() {
  const [donations, setDonations] = useState<DonationSummary[]>([]);
  const [pickups, setPickups] = useState<DonationAllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickupToConfirm, setPickupToConfirm] =
    useState<DonationAllocationItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dons, upcoming] = await Promise.all([
        fetchDonations(),
        fetchUpcomingPickups(),
      ]);
      setDonations(dons);
      setPickups(upcoming);
    } catch {
      toast.error('Impossible de charger les dons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout
      title="Dons associatifs"
      description="Savely propose vos lots aux associations de la zone et gère les relances — vous n'intervenez qu'au retrait."
    >
      <div className="space-y-6">
        {/* Retraits à venir */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Retraits à venir</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pickups.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Aucun retrait planifié cette semaine.
            </p>
          ) : (
            <ul className="divide-y">
              {pickups.map((p) => (
                <li
                  key={p.allocation_id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.association.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.pickup_slot_start).toLocaleString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {p.lines
                        .map((l) => `${l.name} ×${l.quantity}`)
                        .join(', ')}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setPickupToConfirm(p)}>
                    Confirmer le retrait
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Liste des dons */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Tous les dons</h2>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : donations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Aucun don pour l&apos;instant. Validez une action « Don associatif
              » depuis le centre d&apos;actions.
            </p>
          ) : (
            <ul className="divide-y">
              {donations.map((d) => {
                const products = d.lines
                  .map((l) => `${l.product.name} ×${l.quantity_total}`)
                  .join(', ');
                const activeProposal = d.proposals[0];
                return (
                  <li key={d.donation_id}>
                    <Link
                      href={`/donations/${d.donation_id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {products}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Créé le{' '}
                          {new Date(d.created_at).toLocaleDateString('fr-FR')}
                          {activeProposal &&
                            ` · proposé à ${activeProposal.association.name}`}
                        </p>
                      </div>
                      <DonationStatusBadge status={d.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmPickupDialog
        allocation={pickupToConfirm}
        onOpenChange={(open) => !open && setPickupToConfirm(null)}
        onConfirmed={() => {
          setPickupToConfirm(null);
          void load();
        }}
      />
    </DashboardLayout>
  );
}
