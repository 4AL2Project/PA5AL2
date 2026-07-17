import {
  Building2,
  PiggyBank,
  ShoppingBag,
  UserCog,
  Users,
} from 'lucide-react';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { fetchStats } from '@/lib/admin';
import { getSession } from '@/lib/session';

const ORDER_STATUS_LABELS: Record<string, string> = {
  RESERVEE: 'Réservées',
  EN_PREPARATION: 'En préparation',
  PRETE: 'Prêtes',
  RETIREE: 'Retirées',
  ANNULEE: 'Annulées',
  EXPIREE: 'Expirées',
};

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat('fr-FR');

export default async function AdminAccueilPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const stats = await fetchStats(session.access_token);

  const cards = [
    { label: 'Officines', value: num.format(stats.officines), icon: Building2 },
    {
      label: 'Clients B2C',
      value: num.format(stats.clients_b2c),
      icon: Users,
    },
    {
      label: 'Préparateurs',
      value: num.format(stats.preparateurs),
      icon: UserCog,
    },
    {
      label: 'Transactions',
      value: num.format(stats.orders.total),
      icon: ShoppingBag,
    },
  ];

  const statusBreakdown = Object.entries(stats.orders.by_status).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <AdminShell
      title="Accueil"
      description="Vue d’ensemble de la plateforme."
      adminEmail={session.claims.email}
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {/* Répartition des commandes par statut */}
        {statusBreakdown.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Commandes par statut</h2>
            <div className="flex flex-wrap gap-2">
              {statusBreakdown.map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs"
                >
                  <span className="text-muted-foreground">
                    {ORDER_STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Capital économisé par officine */}
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Capital économisé par officine
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p className="text-sm font-bold tabular-nums text-emerald-700">
                {eur.format(stats.capital_total)}
              </p>
            </div>
          </div>

          {stats.capital_by_pharmacy.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              Aucune officine pour le moment.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.capital_by_pharmacy.map((p) => (
                <li
                  key={p.pharmacy_id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {p.orders} commande{p.orders > 1 ? 's' : ''} retirée
                      {p.orders > 1 ? 's' : ''}
                    </p>
                  </div>
                  <p className="flex-none text-sm font-semibold tabular-nums">
                    {eur.format(p.capital)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Capital économisé = chiffre d’affaires récupéré sur le stock dormant
          (commandes effectivement retirées).
        </p>
      </div>
    </AdminShell>
  );
}
