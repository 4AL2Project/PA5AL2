'use client';
import { Gift } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssoLayout } from '@/components/asso-layout';
import { type Don, fetchDons } from '@/lib/api';

type Filter = 'Tous' | 'En cours' | 'Récupérés';

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: 'Planifié',
  RETIREE: 'Récupéré',
  NON_RECUPEREE: 'Non récupéré',
};

const STATUS_COLORS: Record<string, string> = {
  PLANIFIEE: 'bg-amber-100 text-amber-700',
  RETIREE: 'bg-emerald-100 text-emerald-700',
  NON_RECUPEREE: 'bg-muted text-muted-foreground',
};

function matchFilter(don: Don, filter: Filter): boolean {
  if (filter === 'Tous') return true;
  if (filter === 'Récupérés') return don.status === 'RETIREE';
  if (filter === 'En cours') return don.status === 'PLANIFIEE';
  return false;
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function DonsPage() {
  const router = useRouter();
  const [dons, setDons] = useState<Don[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('Tous');

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/login');
      return;
    }
    fetchDons()
      .then(setDons)
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = dons.filter((d) => matchFilter(d, filter));

  return (
    <AssoLayout
      title="Mes dons"
      description="Dons acceptés et leur statut de récupération"
    >
      {/* Filtres */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['Tous', 'En cours', 'Récupérés'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Gift className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Aucun don</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceptez des offres pour les voir apparaître ici.
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((don) => (
            <Link
              key={don.allocation_id}
              href={`/dons/${don.allocation_id}`}
              className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent first:rounded-t-xl last:rounded-b-xl"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {don.donation?.pharmacy?.name ?? 'Officine'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {don.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Retrait :{' '}
                  {new Date(don.pickup_slot_start).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {don.cerfa_url && (
                  <a
                    href={don.cerfa_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    ⬇ Cerfa
                  </a>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[don.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {STATUS_LABELS[don.status] ?? don.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AssoLayout>
  );
}
