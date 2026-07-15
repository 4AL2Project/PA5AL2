/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Dashboard monitoring admin — KPIs plateforme, alertes actives
 *   (dons bloqués, tokens expirés, retraits manqués, assos peu fiables).
 * @module DonAssociatif
 */
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Heart,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { fetchAdminMonitoring } from '@/lib/admin';
import { getSession } from '@/lib/session';

export default async function AdminMonitoringPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const monitoring = await fetchAdminMonitoring(session.access_token);

  if (!monitoring) {
    return (
      <AdminShell title="Monitoring" adminEmail={session.claims.email}>
        <p className="text-sm text-muted-foreground">
          Impossible de charger les données de monitoring.
        </p>
      </AdminShell>
    );
  }

  const { kpis, alerts } = monitoring;
  const hasAlerts =
    alerts.blocked_count > 0 ||
    alerts.expired_proposals > 0 ||
    alerts.missed_pickups > 0 ||
    alerts.low_reliability_assos.length > 0;

  return (
    <AdminShell
      title="Monitoring dons"
      description="Supervision en temps réel du cycle de vie des dons sur la plateforme."
      adminEmail={session.claims.email}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dons">Voir tous les dons</Link>
        </Button>
      }
    >
      {/* Alertes actives */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Alertes actives</h2>
        {!hasAlerts ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Aucune alerte — tout est nominal.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.blocked_count > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                  <Clock className="h-4 w-4" />
                  {alerts.blocked_count} don{alerts.blocked_count > 1 ? 's' : ''} bloqué{alerts.blocked_count > 1 ? 's' : ''} depuis plus de 5 jours
                </div>
                {alerts.blocked_donations.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {alerts.blocked_donations.slice(0, 5).map((d) => (
                      <li key={d.donation_id} className="flex items-center justify-between">
                        <span className="text-xs text-red-700">
                          {d.pharmacy?.name ?? '?'} — créé le{' '}
                          {new Date(d.created_at).toLocaleDateString('fr-FR')}
                          {d.proposals[0]?.association?.name &&
                            ` · en attente de ${d.proposals[0].association.name}`}
                        </span>
                        <Button asChild size="sm" variant="outline" className="ml-3 h-6 text-xs">
                          <Link href={`/admin/dons/${d.donation_id}`}>Voir</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {alerts.expired_proposals > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                {alerts.expired_proposals} proposition{alerts.expired_proposals > 1 ? 's' : ''} expirée{alerts.expired_proposals > 1 ? 's' : ''} non relancée{alerts.expired_proposals > 1 ? 's' : ''}
              </div>
            )}

            {alerts.missed_pickups > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <XCircle className="h-4 w-4" />
                {alerts.missed_pickups} retrait{alerts.missed_pickups > 1 ? 's' : ''} manqué{alerts.missed_pickups > 1 ? 's' : ''}
              </div>
            )}

            {alerts.low_reliability_assos.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <TrendingDown className="h-4 w-4" />
                  {alerts.low_reliability_assos.length} association{alerts.low_reliability_assos.length > 1 ? 's' : ''} avec fiabilité &lt; 50 %
                </div>
                <ul className="mt-3 space-y-1">
                  {alerts.low_reliability_assos.map((a) => (
                    <li key={a.association_id} className="flex items-center justify-between text-xs text-amber-700">
                      <span>
                        {a.name} — {a.reliability !== null ? `${Math.round(a.reliability * 100)} %` : 'N/A'}
                      </span>
                      <Button asChild size="sm" variant="outline" className="ml-3 h-6 text-xs">
                        <Link href={`/admin/associations`}>Voir</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* KPIs plateforme */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">KPIs plateforme</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Heart className="h-4 w-4" />}
            label="Total dons"
            value={String(kpis.total)}
          />
          <KpiCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Taux de complétion"
            value={`${kpis.completion_rate.toFixed(1)} %`}
            green
          />
          <KpiCard
            icon={<XCircle className="h-4 w-4 text-red-500" />}
            label="Taux d'échec"
            value={`${kpis.failure_rate.toFixed(1)} %`}
          />
          <KpiCard
            icon={<Clock className="h-4 w-4 text-blue-500" />}
            label="En cours"
            value={String(kpis.by_status['EN_COURS'] ?? 0)}
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(kpis.by_status).map(([status, count]) => (
                <tr key={status}>
                  <td className="px-4 py-2.5 text-xs font-medium">{status}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums">{count}</td>
                  <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">
                    {kpis.total > 0 ? ((count / kpis.total) * 100).toFixed(1) : '0'} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  green,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${green ? 'text-emerald-700' : ''}`}>
        {value}
      </p>
    </div>
  );
}
