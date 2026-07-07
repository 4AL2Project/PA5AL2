'use client';

import { FileStack, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { fetchImports } from '@/lib/api';
import { ImportFileType, ImportRecord, ImportStatus } from '@/lib/types';
import { importFileTypeLabel } from '@/lib/utils';

type StatusFilter = ImportStatus | 'all';
type TypeFilter = ImportFileType | 'all';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINÉ', label: 'Terminé' },
  { value: 'ÉCHOUÉ', label: 'Échoué' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tous les types' },
  { value: 'products+sales', label: 'Produits + Ventes' },
  { value: 'products', label: 'Produits' },
  { value: 'sales', label: 'Ventes' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ImportsPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadImports = useCallback(async () => {
    try {
      const data = await fetchImports();
      setImports(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  // Auto-refresh while imports are in progress
  useEffect(() => {
    const hasLive = imports.some(
      (i) => i.status === 'EN_ATTENTE' || i.status === 'EN_COURS'
    );
    if (hasLive && !pollingRef.current) {
      pollingRef.current = setInterval(loadImports, 3000);
    } else if (!hasLive && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [imports, loadImports]);

  const filtered = imports.filter((imp) => {
    const matchStatus = statusFilter === 'all' || imp.status === statusFilter;
    const matchType = typeFilter === 'all' || imp.file_type === typeFilter;
    return matchStatus && matchType;
  });

  const hasLive = imports.some(
    (i) => i.status === 'EN_ATTENTE' || i.status === 'EN_COURS'
  );

  return (
    <DashboardLayout
      title="Imports"
      description={
        loading
          ? 'Chargement…'
          : `${filtered.length} import${filtered.length !== 1 ? 's' : ''}`
      }
      actions={
        <Link href="/upload">
          <Button size="sm">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Nouvel import
          </Button>
        </Link>
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasLive && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <Loader2 className="h-3 w-3 animate-spin" />
              Mise à jour automatique…
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Aucun import</p>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Aucun résultat pour ces filtres.'
                : 'Importez votre premier fichier depuis la page Import.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fichier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Lignes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((imp) => (
                  <tr
                    key={imp.import_id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="truncate font-medium text-sm">
                        {imp.file_name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                        {imp.import_id.slice(0, 8)}…
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {importFileTypeLabel(imp.file_type)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(imp.uploaded_at)}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {imp.status === 'TERMINÉ' && imp.rows_ok != null ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {imp.rows_ok} ok
                        </span>
                      ) : imp.status === 'ÉCHOUÉ' && imp.rows_failed != null ? (
                        <span className="text-destructive font-medium">
                          {imp.rows_failed} err.
                        </span>
                      ) : imp.rows_total != null ? (
                        <span className="text-muted-foreground">
                          {imp.rows_total}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ImportStatusBadge status={imp.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/imports/${imp.import_id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Détails →
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
