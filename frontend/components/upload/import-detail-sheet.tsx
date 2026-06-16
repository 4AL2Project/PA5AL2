'use client';

import { AlertCircle, FileText, RotateCcw } from 'lucide-react';

import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useImportPolling } from '@/hooks/use-import-polling';
import { ImportRecord } from '@/lib/types';

interface ImportDetailSheetProps {
  importRecord: ImportRecord | null;
  open: boolean;
  onClose: () => void;
  /** Ouvre le wizard pour relancer un import du même type */
  onRelaunch?: (fileType: 'products' | 'sales') => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function ImportDetailSheet({
  importRecord,
  open,
  onClose,
  onRelaunch,
}: ImportDetailSheetProps) {
  // Live-poll while in-progress
  const polled = useImportPolling(
    importRecord &&
      (importRecord.status === 'EN_ATTENTE' ||
        importRecord.status === 'EN_COURS')
      ? importRecord.import_id
      : null
  );

  const record = polled ?? importRecord;
  if (!record) return null;

  const fileTypeLabel = record.file_type === 'products' ? 'Produits' : 'Ventes';
  const isFailed = record.status === 'ÉCHOUÉ';
  const errors: string[] = Array.isArray(record.errors) ? record.errors : [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2 shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate text-base">
                {record.file_name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {fileTypeLabel} · {formatDate(record.uploaded_at)}
              </SheetDescription>
            </div>
            <ImportStatusBadge status={record.status} />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-5">
            {/* Stats */}
            <div className="rounded-lg border border-border/40 px-4 py-2">
              <StatRow label="Lignes totales" value={record.rows_total} />
              <StatRow label="Importées avec succès" value={record.rows_ok} />
              <StatRow
                label="Lignes en erreur"
                value={
                  record.rows_failed != null && record.rows_failed > 0
                    ? record.rows_failed
                    : null
                }
              />
              <StatRow label="ID import" value={record.import_id} />
            </div>

            {/* Errors */}
            {isFailed && errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
                  {errors.length} erreur{errors.length !== 1 ? 's' : ''} de
                  validation
                </p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 divide-y divide-destructive/10 max-h-80">
                  <ScrollArea className="max-h-80">
                    {errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 px-3 py-2 text-xs text-destructive"
                      >
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
                <p className="text-xs text-muted-foreground">
                  Corrigez ces lignes dans le fichier source puis relancez
                  l&apos;import.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {isFailed && onRelaunch && (
          <div className="px-6 py-4 border-t border-border/40">
            <Button
              className="w-full"
              onClick={() => {
                onClose();
                onRelaunch(record.file_type);
              }}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Relancer avec un nouveau fichier
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
