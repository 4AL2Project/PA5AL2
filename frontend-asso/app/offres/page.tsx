'use client';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssoLayout } from '@/components/asso-layout';
import { fetchOffres, type Offre } from '@/lib/api';

function timeLeft(expires: string): string {
  const diff = new Date(expires).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h restantes`;
  return `${Math.floor(h / 24)}j restants`;
}

const STATUS_COLORS: Record<string, string> = {
  ENVOYEE: 'bg-amber-100 text-amber-700 border-amber-200',
  ACCEPTEE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REFUSEE: 'bg-red-100 text-red-700 border-red-200',
  EXPIREE: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  ENVOYEE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  EXPIREE: 'Expirée',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground border-border'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function OffresPage() {
  const router = useRouter();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/verify');
      return;
    }

    const load = () =>
      fetchOffres()
        .then(setOffres)
        .catch(() => router.replace('/auth/verify'))
        .finally(() => setLoading(false));

    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [router]);

  const pending = offres.filter((o) => o.status === 'ENVOYEE');
  const history = offres.filter((o) => o.status !== 'ENVOYEE');

  return (
    <AssoLayout
      title="Offres de dons"
      description="Propositions reçues des officines partenaires"
    >
      {loading && <Spinner />}

      {!loading && pending.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              En attente de réponse
            </h2>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="block rounded-xl border border-amber-200 bg-card p-5 transition-all hover:border-amber-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {offre.donation?.pharmacy?.name ?? 'Officine'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {offre.proposed_lines
                        .map((l) => `${l.name} × ${l.quantity}`)
                        .join(' · ')}
                    </p>
                    <p className="mt-2 text-xs font-medium text-amber-600">
                      ⏰ {timeLeft(offre.expires_at)}
                    </p>
                  </div>
                  <StatusBadge status={offre.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && history.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Historique
          </h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {history.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {offre.donation?.pharmacy?.name ?? 'Officine'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {offre.proposed_lines
                      .map((l) => `${l.name} ×${l.quantity}`)
                      .join(', ')}
                  </p>
                </div>
                <StatusBadge status={offre.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && offres.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            Aucune offre pour le moment
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vous recevrez un email dès qu&apos;une officine vous propose un don.
          </p>
        </div>
      )}
    </AssoLayout>
  );
}
