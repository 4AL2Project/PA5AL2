/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Page admin — liste de tous les dons (toutes pharmacies)
 *   avec alertes, filtres statut/pharmacie et accès au détail.
 * @module DonAssociatif
 */
import { AlertTriangle, Clock, Heart, XCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchAdminDonations, fetchAdminMonitoring } from '@/lib/admin';
import { getSession } from '@/lib/session';

const STATUS_LABELS: Record<string, string> = {
  EN_COURS: 'En cours',
  COMPLETEE: 'Complétée',
  ECHOUEE: 'Échouée',
  ANNULEE: 'Annulée',
};

const STATUS_VARIANTS: Record<string, string> = {
  EN_COURS: 'bg-blue-100 text-blue-800',
  COMPLETEE: 'bg-emerald-100 text-emerald-800',
  ECHOUEE: 'bg-red-100 text-red-800',
  ANNULEE: 'bg-gray-100 text-gray-600',
};

export default async function AdminDonsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    pharmacy_id?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const sp = await searchParams;
  const [donations, monitoring] = await Promise.all([
    fetchAdminDonations(session.access_token, {
      status: sp.status,
      pharmacy_id: sp.pharmacy_id,
      page: sp.page ? parseInt(sp.page, 10) : 1,
    }),
    fetchAdminMonitoring(session.access_token),
  ]);

  const alerts = monitoring?.alerts;

  return (
    <AdminShell
      title="Dons associatifs"
      description={`${donations.total} don${donations.total > 1 ? 's' : ''} au total sur la plateforme`}
      adminEmail={session.claims.email}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/monitoring">Tableau de bord monitoring</Link>
        </Button>
      }
    >
      {/* Alertes actives */}
      {alerts &&
        (alerts.blocked_count > 0 ||
          alerts.expired_proposals > 0 ||
          alerts.missed_pickups > 0) && (
          <div className="mb-6 space-y-2">
            {alerts.blocked_count > 0 && (
              <AlertBanner
                icon={<Clock className="h-4 w-4 text-red-600" />}
                color="red"
                message={`${alerts.blocked_count} don${alerts.blocked_count > 1 ? 's' : ''} bloqué${alerts.blocked_count > 1 ? 's' : ''} depuis plus de 5 jours`}
              />
            )}
            {alerts.expired_proposals > 0 && (
              <AlertBanner
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                color="amber"
                message={`${alerts.expired_proposals} proposition${alerts.expired_proposals > 1 ? 's' : ''} expirée${alerts.expired_proposals > 1 ? 's' : ''} non traitée${alerts.expired_proposals > 1 ? 's' : ''}`}
              />
            )}
            {alerts.missed_pickups > 0 && (
              <AlertBanner
                icon={<XCircle className="h-4 w-4 text-amber-600" />}
                color="amber"
                message={`${alerts.missed_pickups} retrait${alerts.missed_pickups > 1 ? 's' : ''} manqué${alerts.missed_pickups > 1 ? 's' : ''}`}
              />
            )}
          </div>
        )}

      {/* Filtres rapides statut */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, 'EN_COURS', 'COMPLETEE', 'ECHOUEE', 'ANNULEE'].map((s) => (
          <Link
            key={s ?? 'all'}
            href={s ? `/admin/dons?status=${s}` : '/admin/dons'}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              sp.status === s || (!sp.status && !s)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Tous'}
          </Link>
        ))}
      </div>

      {donations.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-30" />
          <p className="text-sm text-muted-foreground">
            Aucun don sur cette période.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Officine</TableHead>
                <TableHead className="text-xs">Produit(s)</TableHead>
                <TableHead className="text-xs">Association</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs text-right">Détail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.items.map((don) => {
                const produits = don.lines
                  .map((l) => `${l.product?.name ?? '?'} ×${l.quantity_total}`)
                  .join(', ');
                const asso = don.proposals[0]?.association?.name ?? '—';
                return (
                  <TableRow key={don.donation_id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(don.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {don.pharmacy?.name ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {produits}
                    </TableCell>
                    <TableCell className="text-xs">{asso}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_VARIANTS[don.status] ?? ''}`}
                      >
                        {STATUS_LABELS[don.status] ?? don.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/dons/${don.donation_id}`}>
                          Voir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {donations.total > donations.limit && (
        <div className="mt-4 flex justify-center gap-2">
          {donations.page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/dons?page=${donations.page - 1}${sp.status ? `&status=${sp.status}` : ''}`}
              >
                Précédent
              </Link>
            </Button>
          )}
          <span className="px-3 py-1.5 text-sm text-muted-foreground">
            Page {donations.page} /{' '}
            {Math.ceil(donations.total / donations.limit)}
          </span>
          {donations.page * donations.limit < donations.total && (
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/admin/dons?page=${donations.page + 1}${sp.status ? `&status=${sp.status}` : ''}`}
              >
                Suivant
              </Link>
            </Button>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function AlertBanner({
  icon,
  color,
  message,
}: {
  icon: React.ReactNode;
  color: 'red' | 'amber';
  message: string;
}) {
  const cls =
    color === 'red'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${cls}`}
    >
      {icon}
      {message}
    </div>
  );
}

// Re-export Badge to avoid unused import warning
export { Badge };
