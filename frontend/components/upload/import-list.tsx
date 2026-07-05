'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';

import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { ImportRecord } from '@/lib/types';
import { importFileTypeLabel } from '@/lib/utils';

interface ImportListProps {
  imports: ImportRecord[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ImportList({ imports }: ImportListProps) {
  if (imports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Aucun import pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {imports.map((imp) => (
        <Link
          key={imp.import_id}
          href={`/imports/${imp.import_id}`}
          className="flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/40 transition-colors"
        >
          <div className="rounded-lg bg-muted p-2 shrink-0">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{imp.file_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {importFileTypeLabel(imp.file_type)} ·{' '}
              {formatDate(imp.uploaded_at)}
            </p>
            {imp.status === 'TERMINÉ' && imp.rows_ok != null && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                {imp.rows_ok} ligne{imp.rows_ok !== 1 ? 's' : ''} importée
                {imp.rows_ok !== 1 ? 's' : ''}
              </p>
            )}
            {imp.status === 'ÉCHOUÉ' &&
              imp.rows_failed != null &&
              imp.rows_failed > 0 && (
                <p className="text-xs text-destructive mt-0.5">
                  {imp.rows_failed} erreur{imp.rows_failed !== 1 ? 's' : ''} —
                  voir détails
                </p>
              )}
          </div>
          <ImportStatusBadge status={imp.status} className="shrink-0 mt-0.5" />
        </Link>
      ))}
    </div>
  );
}
