'use client';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
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
  EXPIREE: 'bg-gray-100 text-gray-500 border-gray-200',
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
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
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
    fetchOffres()
      .then(setOffres)
      .catch(() => router.replace('/auth/verify'))
      .finally(() => setLoading(false));
  }, [router]);

  const pending = offres.filter((o) => o.status === 'ENVOYEE');
  const history = offres.filter((o) => o.status !== 'ENVOYEE');

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Offres de dons</h1>
        <p className="text-sm text-gray-500 mt-1">
          Propositions reçues des officines partenaires
        </p>
      </div>

      {loading && <Spinner />}

      {!loading && pending.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              En attente de réponse
            </h2>
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          </div>
          <div className="space-y-3">
            {pending.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="block bg-white border border-amber-200 rounded-xl p-5 hover:shadow-sm hover:border-amber-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {offre.donation?.pharmacy?.name ?? 'Officine'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {offre.proposed_lines
                        .map((l) => `${l.name} × ${l.quantity}`)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-amber-600 mt-2 font-medium">
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
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Historique
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {history.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {offre.donation?.pharmacy?.name ?? 'Officine'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16 px-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700">
            Aucune offre pour le moment
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Vous recevrez un email dès qu&apos;une officine vous propose un don.
          </p>
        </div>
      )}
    </Shell>
  );
}
