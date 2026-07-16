'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmptyActions, RoiSummary } from '@/components/actions/action-row';
import { ActionsTable, PAGE_SIZE } from '@/components/actions/actions-table';
import { BulkActionsBar } from '@/components/actions/bulk-actions-bar';
import {
  ValidateActionDialog,
  ValidateActionPayload,
} from '@/components/actions/validate-action-dialog';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  CreneauxDonModal,
  PickupSlot,
} from '@/components/donations/creneaux-don-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createDonation,
  createOffer,
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
  const [pendingAction, setPendingAction] = useState<DormantAction | null>(
    null
  );
  const [ignoreTarget, setIgnoreTarget] = useState<DormantAction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkIgnoreOpen, setBulkIgnoreOpen] = useState(false);
  const [creneauxOpen, setCreneauxOpen] = useState(false);
  const pendingDonPayloadRef = useRef<{
    id: string;
    payload: ValidateActionPayload;
    action: DormantAction;
  } | null>(null);

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

  const handleFilterChange = (value: FilterLevel) => {
    setFilter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const removeAction = useCallback(
    (id: string) => {
      setActions((prev) => {
        const next = prev.filter((a) => a.id !== id);
        const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [page]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectPage = useCallback((ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const runBulk = useCallback(
    async (
      apiCall: (id: string) => Promise<void>,
      verb: { done: string; failed: string }
    ) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      setMutating(true);
      try {
        const results = await Promise.allSettled(ids.map(apiCall));
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') removeAction(ids[i]);
        });
        if (ok > 0)
          toast.success(`${ok} produit${ok > 1 ? 's' : ''} ${verb.done}`);
        const failed = ids.length - ok;
        if (failed > 0)
          toast.error(
            `${failed} produit${failed > 1 ? 's' : ''} ${verb.failed}`
          );
      } finally {
        setMutating(false);
      }
    },
    [selectedIds, removeAction]
  );

  const handleBulkSnooze = useCallback(
    () =>
      runBulk(snoozeAction, {
        done: 'reporté(s) de 48 h',
        failed: "n'ont pas pu être reportés",
      }),
    [runBulk]
  );

  const handleBulkIgnore = useCallback(
    () =>
      runBulk(ignoreAction, {
        done: 'ignoré(s)',
        failed: "n'ont pas pu être ignorés",
      }),
    [runBulk]
  );

  const handleConfirmValidate = useCallback(
    async (id: string, payload: ValidateActionPayload) => {
      const action = actions.find((a) => a.id === id) ?? null;

      if (payload.type === 'DON' && action && payload.donQuantity) {
        // Open créneaux modal before finalising the donation
        pendingDonPayloadRef.current = { id, payload, action };
        setPendingAction(null);
        setCreneauxOpen(true);
        return;
      }

      // B2C path — direct validation
      setMutating(true);
      try {
        await validateAction(id, payload.type);
        removeAction(id);
        setPendingAction(null);
        if (action && payload.discountedPrice && payload.quantityOffered) {
          await createOffer({
            product_id: action.productId,
            action_id: id,
            discounted_price: payload.discountedPrice,
            quantity_offered: payload.quantityOffered,
            description: payload.description,
            category_ids: payload.categoryIds,
          });
          toast.success('Offre B2C publiée avec succès');
        }
      } catch {
        toast.error('Impossible de valider cette action');
      } finally {
        setMutating(false);
      }
    },
    [removeAction, actions]
  );

  const handleCreneauxConfirm = useCallback(
    async (slots: PickupSlot[] | undefined) => {
      const pending = pendingDonPayloadRef.current;
      if (!pending) return;
      const { id, payload, action } = pending;
      pendingDonPayloadRef.current = null;
      setCreneauxOpen(false);
      setMutating(true);
      try {
        await validateAction(id, payload.type);
        removeAction(id);
        await createDonation({
          action_id: id,
          lines: [
            { product_id: action.productId, quantity: payload.donQuantity! },
          ],
          preferred_association_id: payload.preferredAssociationId,
          ...(slots ? { pickup_windows: slots } : {}),
        });
        toast.success(
          'Don validé — Savely propose le lot aux associations de la zone'
        );
      } catch {
        toast.error('Impossible de valider cette action');
      } finally {
        setMutating(false);
      }
    },
    [removeAction]
  );

  const handleIgnore = useCallback(
    async (id: string) => {
      setMutating(true);
      try {
        await ignoreAction(id);
        toast.success('Produit ignoré');
        removeAction(id);
      } catch {
        toast.error("Impossible d'ignorer cette action");
      } finally {
        setMutating(false);
      }
    },
    [removeAction]
  );

  const handleSnooze = useCallback(
    async (id: string) => {
      setMutating(true);
      try {
        await snoozeAction(id);
        toast.success('Reporté de 48 h');
        removeAction(id);
      } catch {
        toast.error('Impossible de snoozer cette action');
      } finally {
        setMutating(false);
      }
    },
    [removeAction]
  );

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
          <>
            {selectedIds.size > 0 && (
              <BulkActionsBar
                count={selectedIds.size}
                onSnooze={handleBulkSnooze}
                onIgnore={() => setBulkIgnoreOpen(true)}
                onClear={clearSelection}
                loading={mutating}
              />
            )}
            <ActionsTable
              actions={filtered}
              page={page}
              onPageChange={setPage}
              onOpenValidate={setPendingAction}
              loading={mutating}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectPage={toggleSelectPage}
            />
          </>
        ) : (
          <EmptyActions filtered={filter !== 'all'} />
        )}
      </div>

      <ValidateActionDialog
        action={pendingAction}
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        onConfirm={handleConfirmValidate}
        onSnooze={(id) => {
          handleSnooze(id);
          setPendingAction(null);
        }}
        loading={mutating}
      />

      <ConfirmDialog
        open={!!ignoreTarget}
        onOpenChange={(open) => {
          if (!open) setIgnoreTarget(null);
        }}
        title="Ignorer ce produit ?"
        description={
          ignoreTarget
            ? `"${ignoreTarget.productName}" ne sera plus suggéré dans le centre d'actions. Vous pourrez le retrouver dans la liste des produits si vous changez d'avis.`
            : ''
        }
        confirmLabel="Ignorer"
        onConfirm={() => {
          if (ignoreTarget) {
            handleIgnore(ignoreTarget.id);
            setIgnoreTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={bulkIgnoreOpen}
        onOpenChange={setBulkIgnoreOpen}
        title={`Ignorer ${selectedIds.size} produit${selectedIds.size > 1 ? 's' : ''} ?`}
        description={`${selectedIds.size} produit${selectedIds.size > 1 ? 's' : ''} ne ${selectedIds.size > 1 ? 'seront' : 'sera'} plus suggéré${selectedIds.size > 1 ? 's' : ''} dans le centre d'actions. Vous pourrez les retrouver dans la liste des produits si vous changez d'avis.`}
        confirmLabel="Ignorer"
        onConfirm={() => {
          setBulkIgnoreOpen(false);
          handleBulkIgnore();
        }}
      />

      <CreneauxDonModal
        open={creneauxOpen}
        onOpenChange={(open) => {
          if (!open) pendingDonPayloadRef.current = null;
          setCreneauxOpen(open);
        }}
        productName={
          pendingDonPayloadRef.current?.action.productName ?? 'ce produit'
        }
        onConfirm={handleCreneauxConfirm}
        loading={mutating}
      />
    </DashboardLayout>
  );
}
