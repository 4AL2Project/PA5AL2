'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ActionsTable, PAGE_SIZE } from '@/components/actions/actions-table';
import { EmptyActions, RoiSummary } from '@/components/actions/action-row';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchPendingActions,
  ignoreAction,
  snoozeAction,
  validateAction,
} from '@/lib/api';
import { DormantAction } from '@/lib/types';

type FilterLevel = 'all' | 'high' | 'critical';

const FILTER_OPTIONS: { value: FilterLevel; label: string }[] = [
  { value: 'all', label: 'Tous les niveaux' },
  { value: 'critical', label: 'Don associatif (critique)' },
  { value: 'high', label: 'Vente B2C (élevé)' },
];

export default function ActionsPage() {
  const [actions, setActions] = useState<DormantAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPendingActions();
      setActions(data);
    } catch {
      toast.error('Impossible de charger les actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return actions;
    const typeMap: Record<FilterLevel, DormantAction['type'] | null> = {
      all: null,
      critical: 'DON',
      high: 'B2C',
    };
    return actions.filter((a) => a.type === typeMap[filter]);
  }, [actions, filter]);

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: FilterLevel) => {
    setFilter(value);
    setPage(1);
  };

  const handleValidate = useCallback(async (id: string, type: DormantAction['type']) => {
    setMutating(true);
    try {
      await validateAction(id, type);
      setActions((prev) => prev.filter((a) => a.id !== id));
      if (type === 'B2C') toast.success('Action validée — offre B2C à publier (V2)');
    } catch {
      toast.error('Impossible de valider cette action');
    } finally {
      setMutating(false);
    }
  }, []);

  const handleIgnore = useCallback(async (id: string) => {
    setMutating(true);
    try {
      await ignoreAction(id);
      toast.success('Produit ignoré');
      setActions((prev) => {
        const next = prev.filter((a) => a.id !== id);
        // Stay on current page unless it's now empty
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
    } catch {
      toast.error("Impossible d'ignorer cette action");
    } finally {
      setMutating(false);
    }
  }, [page]);

  const handleSnooze = useCallback(async (id: string) => {
    setMutating(true);
    try {
      await snoozeAction(id);
      toast.success('Reporté de 48 h');
      setActions((prev) => {
        const next = prev.filter((a) => a.id !== id);
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
    } catch {
      toast.error('Impossible de snoozer cette action');
    } finally {
      setMutating(false);
    }
  }, [page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <DashboardLayout
      title="Centre d'actions"
      description={
        loading
          ? 'Chargement...'
          : `${filtered.length} produit${filtered.length !== 1 ? 's' : ''} dormant${filtered.length !== 1 ? 's' : ''}`
      }
    >
      <div className="space-y-4">
        <RoiSummary actions={filtered} />

        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Produits dormants</h2>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par niveau" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length > 0 ? (
          <ActionsTable
            actions={filtered}
            page={page}
            onPageChange={setPage}
            onValidate={handleValidate}
            onIgnore={handleIgnore}
            onSnooze={handleSnooze}
            loading={mutating}
          />
        ) : (
          <EmptyActions filtered={filter !== 'all'} />
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Page {page} sur {totalPages} · {PAGE_SIZE} produits par page
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
