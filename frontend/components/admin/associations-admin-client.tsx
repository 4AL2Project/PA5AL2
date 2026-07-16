'use client';

import {
  Download,
  Loader2,
  MailPlus,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/admin/admin-shell';
import { AssoAdminForm } from '@/components/admin/asso-admin-form';
import {
  AssoStatutModal,
  StatutAction,
  statutForAction,
} from '@/components/admin/asso-statut-modal';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AssociationAdminList,
  AssociationAdminRow,
  createAdminAssociation,
  exportAssoCsv,
  fetchAdminAssociations,
  invitationStale,
  inviterAsso,
  patchAssoStatut,
  reliabilityColor,
  STATUS_BADGE,
  STATUS_LABELS,
} from '@/lib/admin-associations';

const PAGE_SIZE = 20;
const EMPTY: AssociationAdminList = {
  data: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  stats: { total: 0, actives: 0, agrement_manquant: 0 },
};

export function AssociationsAdminClient({
  adminEmail,
}: {
  adminEmail?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statut = searchParams.get('statut') ?? 'TOUS';
  const agrement = searchParams.get('agrement') ?? 'TOUS';
  const onboarding = searchParams.get('onboarding') ?? 'TOUS';
  const fiabilite = searchParams.get('fiabilite') ?? 'TOUS';
  const search = searchParams.get('search') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [data, setData] = useState<AssociationAdminList>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [statutTarget, setStatutTarget] = useState<{
    asso: AssociationAdminRow;
    action: StatutAction;
  } | null>(null);
  const [statutBusy, setStatutBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminAssociations({
        statut: statut !== 'TOUS' ? statut : undefined,
        agrement: agrement !== 'TOUS' ? agrement : undefined,
        onboarding: onboarding !== 'TOUS' ? onboarding : undefined,
        fiabilite: fiabilite !== 'TOUS' ? fiabilite : undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [statut, agrement, onboarding, fiabilite, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Met à jour un filtre dans l'URL (persistance) et repart page 1.
  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'TOUS') params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter('search', searchInput.trim());
  };

  const handleCreate = async (
    dto: Parameters<typeof createAdminAssociation>[0]
  ) => {
    setCreating(true);
    try {
      await createAdminAssociation(dto);
      toast.success(
        dto.send_invitation
          ? `${dto.name} créée et invitée`
          : `${dto.name} créée`
      );
      setCreateOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setCreating(false);
    }
  };

  const handleStatut = async (raison: string | undefined) => {
    if (!statutTarget) return;
    setStatutBusy(true);
    try {
      await patchAssoStatut(statutTarget.asso.association_id, {
        ...statutForAction(statutTarget.action),
        raison,
      });
      toast.success('Statut mis à jour');
      setStatutTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Changement impossible');
    } finally {
      setStatutBusy(false);
    }
  };

  const handleInvite = async (asso: AssociationAdminRow) => {
    try {
      await inviterAsso(asso.association_id);
      toast.success(`Invitation envoyée à ${asso.name}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAssoCsv();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  };

  const stats = data?.stats ?? { total: 0, actives: 0, agrement_manquant: 0 };
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <AdminShell
      title="Associations partenaires"
      description={`${stats.total} asso${stats.total > 1 ? 's' : ''} · ${stats.actives} active${stats.actives > 1 ? 's' : ''} · ${stats.agrement_manquant} agrément manquant`}
      adminEmail={adminEmail}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Créer une association
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Exporter CSV
          </Button>
        </div>
      }
    >
      {/* Bandeaux d'alerte */}
      <div className="mb-4 space-y-2">
        {stats.agrement_manquant > 0 && (
          <AlertBanner
            color="amber"
            message={`${stats.agrement_manquant} association${stats.agrement_manquant > 1 ? 's' : ''} sans agrément`}
            onFilter={() => setFilter('agrement', 'MANQUANT')}
          />
        )}
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          value={statut}
          onChange={(v) => setFilter('statut', v)}
          placeholder="Statut"
          options={[
            { value: 'TOUS', label: 'Tous statuts' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDUE', label: 'Suspendue' },
            { value: 'BLACKLISTEE', label: 'Blacklistée' },
            { value: 'EN_ATTENTE_VALIDATION', label: 'En attente' },
            { value: 'REJETEE', label: 'Rejetée' },
          ]}
        />
        <FilterSelect
          value={agrement}
          onChange={(v) => setFilter('agrement', v)}
          placeholder="Agrément"
          options={[
            { value: 'TOUS', label: 'Tout agrément' },
            { value: 'VALIDE', label: 'Validé' },
            { value: 'MANQUANT', label: 'Manquant' },
          ]}
        />
        <FilterSelect
          value={onboarding}
          onChange={(v) => setFilter('onboarding', v)}
          placeholder="Onboarding"
          options={[
            { value: 'TOUS', label: 'Tout onboarding' },
            { value: 'ONBOARDEE', label: 'Onboardée' },
            { value: 'EN_ATTENTE', label: 'Invitée, en attente' },
            { value: 'JAMAIS_INVITEE', label: 'Jamais invitée' },
          ]}
        />
        <FilterSelect
          value={fiabilite}
          onChange={(v) => setFilter('fiabilite', v)}
          placeholder="Fiabilité"
          options={[
            { value: 'TOUS', label: 'Toute fiabilité' },
            { value: 'BONNE', label: 'Bonne (≥75%)' },
            { value: 'FAIBLE', label: 'Faible (50-74%)' },
            { value: 'CRITIQUE', label: 'Critique (<50%)' },
          ]}
        />
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Rechercher (nom, ville, email)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" size="sm" variant="outline">
            Rechercher
          </Button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data.data.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Aucune association ne correspond à ces filtres.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nom / ville</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs">Agrément</TableHead>
                <TableHead className="text-xs">Onboarding</TableHead>
                <TableHead className="text-xs">Fiabilité</TableHead>
                <TableHead className="text-xs">Dons</TableHead>
                <TableHead className="text-xs">Dernière activité</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((a) => (
                <AssoRow
                  key={a.association_id}
                  asso={a}
                  onSuspendre={() =>
                    setStatutTarget({ asso: a, action: 'SUSPENDRE' })
                  }
                  onReactiver={() =>
                    setStatutTarget({ asso: a, action: 'REACTIVER' })
                  }
                  onBlacklister={() =>
                    setStatutTarget({ asso: a, action: 'BLACKLISTER' })
                  }
                  onInvite={() => handleInvite(a)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {data.total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setFilter('page', String(page - 1))}
          >
            Précédent
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setFilter('page', String(page + 1))}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal création */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une association</DialogTitle>
          </DialogHeader>
          <AssoAdminForm
            submitting={creating}
            onSubmit={handleCreate}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal statut */}
      <AssoStatutModal
        action={statutTarget?.action ?? null}
        assoName={statutTarget?.asso.name ?? ''}
        submitting={statutBusy}
        onConfirm={handleStatut}
        onClose={() => setStatutTarget(null)}
      />
    </AdminShell>
  );
}

function AssoRow({
  asso,
  onSuspendre,
  onReactiver,
  onBlacklister,
  onInvite,
}: {
  asso: AssociationAdminRow;
  onSuspendre: () => void;
  onReactiver: () => void;
  onBlacklister: () => void;
  onInvite: () => void;
}) {
  const problematic = asso.fiabilite_score < 50 && asso.stats.total_dons >= 3;
  const blacklisted = asso.status === 'BLACKLISTEE';
  const neverInvited = !asso.is_onboarded && !asso.magic_link_token_hash;
  const stale = invitationStale(asso.magic_link_expires_at);
  const showInvite = !asso.is_onboarded || stale;

  const rowClass = blacklisted
    ? 'bg-gray-50 opacity-50'
    : problematic
      ? 'bg-red-50'
      : '';

  return (
    <TableRow className={rowClass}>
      <TableCell className="text-xs">
        <div className="font-medium">{asso.name}</div>
        <div className="text-muted-foreground">{asso.city}</div>
        {problematic && (
          <span className="mt-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            ⚠️ Problématique
          </span>
        )}
      </TableCell>
      <TableCell>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[asso.status] ?? 'bg-muted'}`}
        >
          {STATUS_LABELS[asso.status] ?? asso.status}
        </span>
      </TableCell>
      <TableCell>
        {asso.agrement_valide ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            Validé
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
            ⚠️ Manquant
          </span>
        )}
      </TableCell>
      <TableCell>
        {asso.is_onboarded ? (
          <span className="text-[11px] text-emerald-700">Onboardée</span>
        ) : neverInvited ? (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            Non invitée
          </span>
        ) : (
          <span className="text-[11px] text-amber-700">En attente</span>
        )}
      </TableCell>
      <TableCell className="min-w-[120px]">
        {asso.stats.total_dons < 3 ? (
          <span className="text-[11px] text-muted-foreground">N/A</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${reliabilityColor(asso.fiabilite_score)}`}
                style={{ width: `${asso.fiabilite_score}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums">
              {asso.fiabilite_score}%
            </span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs">
        <span className="font-medium">{asso.stats.total_dons}</span>
        {asso.stats.dons_en_cours > 0 && (
          <span className="text-muted-foreground">
            {' '}
            ({asso.stats.dons_en_cours} en cours)
          </span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {asso.stats.last_activity_at
          ? new Date(asso.stats.last_activity_at).toLocaleDateString('fr-FR')
          : '—'}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/associations/${asso.association_id}`}>
                Voir détail
              </Link>
            </DropdownMenuItem>
            {asso.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={onSuspendre}>
                Suspendre
              </DropdownMenuItem>
            )}
            {asso.status === 'SUSPENDUE' && (
              <>
                <DropdownMenuItem onClick={onReactiver}>
                  Réactiver
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onBlacklister}
                  className="text-destructive"
                >
                  Blacklister
                </DropdownMenuItem>
              </>
            )}
            {showInvite && asso.contact_email && (
              <DropdownMenuItem onClick={onInvite}>
                <MailPlus className="mr-2 h-3.5 w-3.5" />
                {asso.magic_link_token_hash
                  ? 'Renvoyer invitation'
                  : 'Envoyer invitation'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-44">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AlertBanner({
  color,
  message,
  onFilter,
}: {
  color: 'red' | 'amber';
  message: string;
  onFilter: () => void;
}) {
  const cls =
    color === 'red'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-sm ${cls}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onFilter}
        className="text-xs font-medium underline"
      >
        Filtrer
      </button>
    </div>
  );
}
