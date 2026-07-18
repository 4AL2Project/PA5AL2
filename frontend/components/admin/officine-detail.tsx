'use client';

import { FileText, Heart, UserPlus } from 'lucide-react';
import Link from 'next/link';

import { OfficineInfoForm } from '@/components/admin/officine-info-form';
import { OfficineTeam } from '@/components/admin/officine-team';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminDonationItem,
  AdminDonationList,
  AdminDonParametres,
} from '@/lib/admin';
import { PharmacyDetail } from '@/lib/auth';

const TAB_LIST =
  'h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0';
const TAB_TRIGGER =
  'flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-sm text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none';

const STATUS_VARIANTS: Record<string, string> = {
  EN_COURS: 'bg-blue-100 text-blue-800',
  COMPLETEE: 'bg-emerald-100 text-emerald-800',
  ECHOUEE: 'bg-red-100 text-red-800',
  ANNULEE: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  COMPLETEE: 'Complétée',
  ECHOUEE: 'Échouée',
  ANNULEE: 'Annulée',
};

export function OfficineDetail({
  pharmacy,
  recentDons,
  donParams,
}: {
  pharmacy: PharmacyDetail;
  recentDons?: AdminDonationList;
  donParams?: AdminDonParametres | null;
}) {
  const completees =
    recentDons?.items.filter((d) => d.status === 'COMPLETEE').length ?? 0;
  const total = recentDons?.total ?? 0;
  const completionRate = total > 0 ? (completees / total) * 100 : 0;
  const blocked =
    recentDons?.items.filter(
      (d) =>
        d.status === 'EN_COURS' &&
        new Date(d.created_at) < new Date(Date.now() - 5 * 24 * 3600 * 1000)
    ) ?? [];

  return (
    <Tabs defaultValue="informations" className="gap-6">
      <TabsList className={TAB_LIST}>
        <TabsTrigger value="informations" className={TAB_TRIGGER}>
          <FileText className="h-4 w-4" />
          Informations
        </TabsTrigger>
        <TabsTrigger value="equipes" className={TAB_TRIGGER}>
          <UserPlus className="h-4 w-4" />
          Équipes
        </TabsTrigger>
        <TabsTrigger value="dons" className={TAB_TRIGGER}>
          <Heart className="h-4 w-4" />
          Dons
        </TabsTrigger>
      </TabsList>

      <TabsContent value="informations" className="pt-2">
        <OfficineInfoForm pharmacy={pharmacy} />
      </TabsContent>

      <TabsContent value="equipes" className="pt-2">
        <OfficineTeam
          pharmacyId={pharmacy.pharmacy_id}
          preparateurs={pharmacy.preparateurs}
        />
      </TabsContent>

      <TabsContent value="dons" className="space-y-6 pt-2">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total dons</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{total}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Taux de complétion</p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${completionRate >= 50 ? 'text-emerald-700' : 'text-amber-600'}`}
            >
              {completionRate.toFixed(0)} %
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">
              Dons bloqués (&gt;5j)
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${blocked.length > 0 ? 'text-red-600' : 'text-emerald-700'}`}
            >
              {blocked.length}
            </p>
          </div>
        </div>

        {/* Paramètres */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Paramètres don</h3>
          {donParams ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Seuil dormance
                </dt>
                <dd className="mt-0.5 font-medium">
                  {donParams.seuil_dormance_jours} jours
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Rayon matching
                </dt>
                <dd className="mt-0.5 font-medium">
                  {donParams.rayon_matching_km} km
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              Paramètres par défaut (90 j · 50 km)
            </p>
          )}
        </div>

        {/* Dons bloqués */}
        {blocked.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-red-800">
              Dons bloqués
            </h3>
            <ul className="space-y-2">
              {blocked.map((d) => (
                <li
                  key={d.donation_id}
                  className="flex items-center justify-between text-xs text-red-700"
                >
                  <span>
                    Créé le {new Date(d.created_at).toLocaleDateString('fr-FR')}
                    {d.proposals[0]?.association?.name &&
                      ` · ${d.proposals[0].association.name}`}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="ml-3 h-6 text-xs"
                  >
                    <Link href={`/admin/dons/${d.donation_id}`}>Voir</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 5 derniers dons */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Derniers dons</h3>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link href={`/admin/dons?pharmacy_id=${pharmacy.pharmacy_id}`}>
                Voir tous
              </Link>
            </Button>
          </div>
          {!recentDons || recentDons.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              Aucun don pour cette officine.
            </p>
          ) : (
            <ul className="divide-y">
              {recentDons.items.slice(0, 5).map((d) => (
                <DonRow key={d.donation_id} don={d} />
              ))}
            </ul>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function DonRow({ don }: { don: AdminDonationItem }) {
  const produits = don.lines
    .map((l) => `${l.product?.name ?? '?'} ×${l.quantity_total}`)
    .join(', ');
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{produits || '—'}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {new Date(don.created_at).toLocaleDateString('fr-FR')}
          {don.proposals[0]?.association?.name &&
            ` · ${don.proposals[0].association.name}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_VARIANTS[don.status] ?? ''}`}
        >
          {STATUS_LABELS[don.status] ?? don.status}
        </span>
        <Button asChild size="sm" variant="outline" className="h-6 text-xs">
          <Link href={`/admin/dons/${don.donation_id}`}>Voir</Link>
        </Button>
      </div>
    </li>
  );
}
