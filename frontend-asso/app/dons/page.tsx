'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
import { type Don, fetchDons } from '@/lib/api';

type Filter = 'Tous' | 'En cours' | 'Récupérés' | 'Refusés';

const STATUS_LABELS: Record<string, string> = {
  PLANIFIEE: 'En attente pickup',
  RETIREE: 'Récupéré',
  NON_RECUPEREE: 'Non récupéré',
};

function matchFilter(don: Don, filter: Filter): boolean {
  if (filter === 'Tous') return true;
  if (filter === 'Récupérés') return don.status === 'RETIREE';
  if (filter === 'En cours') return don.status === 'PLANIFIEE';
  return false;
}

export default function DonsPage() {
  const router = useRouter();
  const [dons, setDons] = useState<Don[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('Tous');

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/verify');
      return;
    }
    fetchDons()
      .then(setDons)
      .catch(() => router.replace('/auth/verify'))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = dons.filter((d) => matchFilter(d, filter));

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes dons</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['Tous', 'En cours', 'Récupérés'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-savely-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-savely-400'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📦</div>
          <p className="font-medium">Aucun don</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((don) => (
            <Link
              key={don.allocation_id}
              href={`/dons/${don.allocation_id}`}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {don.donation?.pharmacy?.name ?? 'Officine'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {don.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(don.pickup_slot_start).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {don.cerfa_url && (
                  <a
                    href={don.cerfa_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors font-medium"
                  >
                    ⬇ Cerfa
                  </a>
                )}
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${don.status === 'RETIREE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                >
                  {STATUS_LABELS[don.status] ?? don.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
