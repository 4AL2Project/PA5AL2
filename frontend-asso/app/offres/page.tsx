'use client';
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ENVOYEE: 'bg-amber-100 text-amber-700',
    ACCEPTEE: 'bg-green-100 text-green-700',
    REFUSEE: 'bg-red-100 text-red-700',
    EXPIREE: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    ENVOYEE: 'En attente',
    ACCEPTEE: 'Acceptée',
    REFUSEE: 'Refusée',
    EXPIREE: 'Expirée',
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {labels[status] ?? status}
    </span>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Offres de dons</h1>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            En attente de votre réponse ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="block bg-white border border-amber-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {offre.donation?.pharmacy?.name ?? 'Officine'}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
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
          <div className="space-y-2">
            {history.map((offre) => (
              <Link
                key={offre.proposal_id}
                href={`/offres/${offre.proposal_id}`}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
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
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-medium">Aucune offre pour le moment</p>
          <p className="text-sm mt-1">
            Vous recevrez un email dès qu'une officine vous propose un don.
          </p>
        </div>
      )}
    </Shell>
  );
}
