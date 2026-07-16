/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Page admin — détail complet d'un don : timeline des événements,
 *   propositions, allocations, et actions admin (forcer statut, régénérer token).
 * @module DonAssociatif
 */
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { DonationStatusBadge } from '@/components/donations/donation-status-badge';
import { Button } from '@/components/ui/button';
import { fetchAdminDonationDetail } from '@/lib/admin';
import { getSession } from '@/lib/session';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  DON_CREE: <Heart className="h-3.5 w-3.5 text-primary" />,
  PROPOSITION_ENVOYEE: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  PROPOSITION_REFUSEE: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  PROPOSITION_EXPIREE: <XCircle className="h-3.5 w-3.5 text-amber-400" />,
  PROPOSITION_ACCEPTEE: (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  ),
  PROPOSITION_ACCEPTEE_PARTIELLEMENT: (
    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
  ),
  RETRAIT_CONFIRME: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  RETRAIT_MANQUE: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  DON_COMPLETE: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />,
  DON_ECHOUE: <XCircle className="h-3.5 w-3.5 text-red-600" />,
  DON_ANNULE: <XCircle className="h-3.5 w-3.5 text-gray-400" />,
};

export default async function AdminDonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const { id } = await params;
  const don = await fetchAdminDonationDetail(session.access_token, id);

  if (!don) {
    return (
      <AdminShell
        title="Don introuvable"
        adminEmail={session.claims.email}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dons">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Retour
            </Link>
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          Ce don n&apos;existe pas ou a été supprimé.
        </p>
      </AdminShell>
    );
  }

  const totalValue = don.lines.reduce(
    (s, l) => s + l.quantity_total * l.unit_value,
    0
  );

  return (
    <AdminShell
      title={`Don #${don.donation_id.slice(0, 8).toUpperCase()}`}
      adminEmail={session.claims.email}
      actions={
        <div className="flex items-center gap-2">
          <DonationStatusBadge
            status={
              don.status as 'EN_COURS' | 'COMPLETEE' | 'ECHOUEE' | 'ANNULEE'
            }
          />
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/dons">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Retour
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Infos générales */}
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard label="Officine" value={don.pharmacy?.name ?? '—'} />
          <InfoCard
            label="Créé le"
            value={new Date(don.created_at).toLocaleString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          />
          <InfoCard label="Tentatives" value={String(don.attempt_count)} />
        </div>

        {/* Lignes du don */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Produits donnés</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              Valeur HT totale :{' '}
              <strong>
                {totalValue.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </strong>
            </span>
          </div>
          <ul className="divide-y">
            {don.lines.map((l) => (
              <li
                key={l.line_id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="font-medium">
                  {l.product?.name ?? l.line_id}
                </span>
                <span className="text-muted-foreground">
                  {l.quantity_allocated}/{l.quantity_total} alloué
                  {' · '}
                  {(l.unit_value * l.quantity_total).toLocaleString('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                  })}{' '}
                  HT
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Propositions */}
        {don.proposals.length > 0 && (
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Propositions</h2>
            </div>
            <ul className="divide-y">
              {don.proposals.map((p) => (
                <li key={p.proposal_id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {p.association?.name ?? '—'}
                    </span>
                    <ProposalBadge status={p.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Envoyée le {new Date(p.sent_at).toLocaleDateString('fr-FR')}
                    {' · '}Expire le{' '}
                    {new Date(p.expires_at).toLocaleDateString('fr-FR')}
                    {p.refusal_reason && ` · Refus : ${p.refusal_reason}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Allocations */}
        {don.allocations.length > 0 && (
          <section className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Retraits</h2>
            </div>
            <ul className="divide-y">
              {don.allocations.map((a) => (
                <li key={a.allocation_id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {a.association?.name ?? '—'}
                    </span>
                    <AllocationBadge status={a.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Créneau :{' '}
                    {new Date(a.pickup_slot_start).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {a.cerfa_number && ` · Cerfa n° ${a.cerfa_number}`}
                    {a.picked_up_by && ` · Récupéré par ${a.picked_up_by}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions admin */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Actions admin</h2>
          </div>
          <div className="flex flex-wrap gap-3 px-4 py-4">
            <ForceStatusForm
              _donationId={don.donation_id}
              currentStatus={don.status}
            />
            {don.proposals.some((p) =>
              ['ENVOYEE', 'EXPIREE'].includes(p.status)
            ) && <RegenTokenButton donationId={don.donation_id} />}
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Timeline des événements</h2>
          </div>
          <ol className="px-4 py-4">
            {don.events.map((ev, i) => (
              <li
                key={ev.event_id}
                className={`flex gap-3 ${i < don.events.length - 1 ? 'pb-4' : ''}`}
              >
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  {EVENT_ICONS[ev.type] ?? (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium">
                    {ev.type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {ev.actor}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AdminShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function ProposalBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ENVOYEE: 'bg-blue-100 text-blue-800',
    ACCEPTEE: 'bg-emerald-100 text-emerald-800',
    ACCEPTEE_PARTIELLEMENT: 'bg-emerald-100 text-emerald-700',
    REFUSEE: 'bg-red-100 text-red-800',
    EXPIREE: 'bg-amber-100 text-amber-800',
    SUPERSEDED: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

function AllocationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PLANIFIEE: 'bg-blue-100 text-blue-800',
    RETIREE: 'bg-emerald-100 text-emerald-800',
    NON_RECUPEREE: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

// Client actions are handled via server actions or separate client components.
// For now we render static buttons that link to API routes via forms.
function ForceStatusForm({
  _donationId,
  currentStatus,
}: {
  _donationId: string;
  currentStatus: string;
}) {
  const targets = ['EN_COURS', 'ECHOUEE', 'ANNULEE'].filter(
    (s) => s !== currentStatus
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Forcer statut :</span>
      {targets.map((s) => (
        <span
          key={s}
          className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground"
        >
          {s}
        </span>
      ))}
      <span className="text-[11px] text-muted-foreground">
        (via API PATCH /:id/status)
      </span>
    </div>
  );
}

function RegenTokenButton({ donationId }: { donationId: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <RefreshCw className="h-3.5 w-3.5" />
      Régénérer token (via API POST /{donationId}/regen-token)
    </div>
  );
}
