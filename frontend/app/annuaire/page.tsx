'use client';

// Annuaire des associations partenaires (titulaire) : recherche, filtres
// catégorie / tri distance ou fiabilité, accès à la fiche détaillée.

import { Building2, Loader2, Search, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnnuaireEntry, fetchAnnuaire } from '@/lib/api';
import { DONATION_CATEGORIES } from '@/lib/donation-categories';

type SortKey = 'distance' | 'reliability';

export default function AnnuairePage() {
  const [entries, setEntries] = useState<AnnuaireEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<SortKey>('distance');

  useEffect(() => {
    setLoading(true);
    fetchAnnuaire({ category: category === 'ALL' ? undefined : category })
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [category]);

  const visible = useMemo(() => {
    const filtered = search.trim()
      ? entries.filter((e) =>
          e.name.toLowerCase().includes(search.trim().toLowerCase())
        )
      : entries;
    if (sort === 'reliability') {
      return [...filtered].sort(
        (a, b) => (b.reliability ?? 0) - (a.reliability ?? 0)
      );
    }
    return filtered; // déjà triées par distance côté API
  }, [entries, search, sort]);

  return (
    <DashboardLayout
      title="Annuaire des associations"
      description="Les associations partenaires éligibles aux dons de votre zone."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Rechercher une association…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes catégories</SelectItem>
              {DONATION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Tri : distance</SelectItem>
              <SelectItem value="reliability">Tri : fiabilité</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            Aucune association ne correspond à ces critères.
          </div>
        ) : (
          <ul className="space-y-3">
            {visible.map((entry) => (
              <li key={entry.association_id}>
                <Link
                  href={`/annuaire/${entry.association_id}`}
                  className="block cursor-pointer rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{entry.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {entry.categories.map((c) => (
                            <Badge
                              key={c}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-sm">
                      {entry.distance_km != null && (
                        <span className="text-muted-foreground">
                          {entry.distance_km} km
                        </span>
                      )}
                      {entry.reliability != null && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          {Math.round(entry.reliability * 100)} %
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
