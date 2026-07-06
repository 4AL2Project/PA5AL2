'use client';

import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { useImportPolling } from '@/hooks/use-import-polling';
import { uploadImport } from '@/lib/api';
import { ParsedPreview, previewFile } from '@/lib/file-preview';
import { DetectionResult, detectLgo } from '@/lib/lgo-detector';
import { cn } from '@/lib/utils';

type WizardStep = 1 | 2 | 3;
type FileSlot = 'products' | 'sales';

interface UploadWizardProps {
  /** Slot mis en avant à l'ouverture (ne restreint pas l'import). */
  defaultFileType?: FileSlot;
  /** Appelé après un import réussi (terminal) */
  onSuccess?: () => void;
}

/** Fichier chargé côté client, avec son aperçu et la détection LGO. */
interface LoadedFile {
  file: File;
  preview: ParsedPreview;
  detection: DetectionResult;
}

interface WizardState {
  step: WizardStep;
  products: LoadedFile | null;
  sales: LoadedFile | null;
  parseError: string | null;
  /** import_id retourné par le serveur après POST /upload */
  importId: string | null;
  /** Erreur réseau lors du POST initial */
  uploadError: string | null;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  products: null,
  sales: null,
  parseError: null,
  importId: null,
  uploadError: null,
};

const REQUIRED_COLUMNS: Record<FileSlot, string[]> = {
  products: ['external_sku', 'name', 'stock_quantity', 'unit_price'],
  sales: ['external_sku', 'sale_date', 'quantity_sold'],
};

const SLOT_LABEL: Record<FileSlot, string> = {
  products: 'Fichier produits',
  sales: 'Fichier ventes',
};

function missingColumns(slot: FileSlot, detection: DetectionResult): string[] {
  const mapped = Object.values(detection.mappedHeaders);
  return REQUIRED_COLUMNS[slot].filter((f) => !mapped.includes(f));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1, label: 'Sélection' },
    { n: 2, label: 'Aperçu' },
    { n: 3, label: 'Import' },
  ] as const;

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
              current === s.n && 'bg-primary text-primary-foreground',
              current > s.n && 'bg-primary/20 text-primary',
              current < s.n && 'bg-muted text-muted-foreground'
            )}
          >
            {current > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
          </div>
          <span
            className={cn(
              'text-sm',
              current === s.n ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

function LgoBadge({ lgoName }: { lgoName: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <CheckCircle className="h-3 w-3" />
      Format {lgoName} détecté
    </span>
  );
}

// ─── Step 1 : dual-file selection ───────────────────────────────────────────────

interface FileSlotZoneProps {
  slot: FileSlot;
  loaded: LoadedFile | null;
  highlighted: boolean;
  onFile: (slot: FileSlot, file: File) => void;
  onClear: (slot: FileSlot) => void;
}

function FileSlotZone({
  slot,
  loaded,
  highlighted,
  onFile,
  onClear,
}: FileSlotZoneProps) {
  const [dragging, setDragging] = useState(false);

  const validate = useCallback(
    (file: File) => {
      const ok =
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx');
      if (ok) onFile(slot, file);
    },
    [slot, onFile]
  );

  if (loaded) {
    const missing = missingColumns(slot, loaded.detection);
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-muted p-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {SLOT_LABEL[slot]}
            </p>
            <p className="truncate text-sm font-medium">{loaded.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(loaded.file.size)} · {loaded.preview.totalRows} lignes
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClear(slot)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Retirer le ${SLOT_LABEL[slot].toLowerCase()}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {loaded.detection.lgo && (
          <div className="mt-2">
            <LgoBadge lgoName={loaded.detection.lgo.name} />
          </div>
        )}
        {missing.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Colonnes manquantes : <strong>{missing.join(', ')}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) validate(file);
      }}
      className={cn(
        'relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-all',
        !dragging && 'border-border hover:border-primary/50 hover:bg-muted/30',
        dragging && 'border-primary bg-primary/5',
        highlighted && !dragging && 'border-primary/40'
      )}
    >
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) validate(file);
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={`Sélectionner le ${SLOT_LABEL[slot].toLowerCase()}`}
      />
      <div
        className={cn(
          'mb-2 rounded-full p-3 transition-colors',
          dragging ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        <Upload
          className={cn(
            'h-6 w-6 transition-colors',
            dragging ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>
      <p className="text-sm font-medium">{SLOT_LABEL[slot]}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Glissez ou cliquez — CSV / XLSX
      </p>
    </div>
  );
}

interface Step1Props {
  products: LoadedFile | null;
  sales: LoadedFile | null;
  defaultFileType: FileSlot;
  parseError: string | null;
  canContinue: boolean;
  onFile: (slot: FileSlot, file: File) => void;
  onClear: (slot: FileSlot) => void;
  onContinue: () => void;
}

function Step1({
  products,
  sales,
  defaultFileType,
  parseError,
  canContinue,
  onFile,
  onClear,
  onContinue,
}: Step1Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Un import regroupe le fichier produits et le fichier ventes. Le
        traitement est <strong>tout-ou-rien</strong> : si l&apos;un des fichiers
        échoue, l&apos;import entier est rejeté.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <FileSlotZone
          slot="products"
          loaded={products}
          highlighted={defaultFileType === 'products'}
          onFile={onFile}
          onClear={onClear}
        />
        <FileSlotZone
          slot="sales"
          loaded={sales}
          highlighted={defaultFileType === 'sales'}
          onFile={onFile}
          onClear={onClear}
        />
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {parseError}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {!canContinue && (
          <p className="text-xs text-muted-foreground">
            Importez les deux fichiers (produits et ventes) pour continuer.
          </p>
        )}
        <Button onClick={onContinue} disabled={!canContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2 : preview + confirm ────────────────────────────────────────────────

function PreviewTable({ preview }: { preview: ParsedPreview }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            {preview.headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row, i) => (
            <tr key={i} className="border-t border-border/40">
              {preview.headers.map((h) => (
                <td
                  key={h}
                  className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[160px] truncate"
                >
                  {String(row[h] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface Step2Props {
  products: LoadedFile | null;
  sales: LoadedFile | null;
  hasMissing: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

function Step2({ products, sales, hasMissing, onBack, onConfirm }: Step2Props) {
  const slots: [FileSlot, LoadedFile | null][] = [
    ['products', products],
    ['sales', sales],
  ];

  return (
    <div className="space-y-5">
      {slots.map(([slot, loaded]) => {
        if (!loaded) return null;
        const missing = missingColumns(slot, loaded.detection);
        return (
          <div key={slot} className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <div className="rounded-md bg-muted p-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {SLOT_LABEL[slot]}
                </p>
                <p className="truncate text-sm font-medium">
                  {loaded.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(loaded.file.size)} · {loaded.preview.totalRows}{' '}
                  lignes détectées
                </p>
              </div>
              {loaded.detection.lgo && (
                <LgoBadge lgoName={loaded.detection.lgo.name} />
              )}
            </div>

            {missing.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Colonnes manquantes : <strong>{missing.join(', ')}</strong>
                </span>
              </div>
            )}

            <PreviewTable preview={loaded.preview} />
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button onClick={onConfirm} disabled={hasMissing} className="flex-1">
          Importer
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3 : progress / result ─────────────────────────────────────────────────

interface Step3Props {
  importId: string | null;
  uploadError: string | null;
  fileNames: string[];
  onReset: () => void;
  onSuccess?: () => void;
}

function Step3({
  importId,
  uploadError,
  fileNames,
  onReset,
  onSuccess,
}: Step3Props) {
  const record = useImportPolling(importId);
  const fileLabel = fileNames.join(' + ');
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!record || notifiedRef.current === record.import_id) return;
    if (record.status === 'TERMINÉ') {
      notifiedRef.current = record.import_id;
      const count = record.rows_ok ?? 0;
      toast.success('Import terminé', {
        description: `${count} ligne${count !== 1 ? 's' : ''} importée${count !== 1 ? 's' : ''}.`,
      });
    } else if (record.status === 'ÉCHOUÉ') {
      notifiedRef.current = record.import_id;
      toast.error('Import échoué', {
        description: 'Aucune donnée enregistrée (import tout-ou-rien).',
      });
    }
  }, [record]);

  if (uploadError) {
    return (
      <div className="space-y-4 min-h-[200px] flex flex-col items-center justify-center text-center">
        <div className="mx-auto rounded-full bg-risk-critical/10 p-4">
          <XCircle className="h-10 w-10 text-risk-critical" />
        </div>
        <div>
          <p className="text-lg font-medium text-risk-critical">
            Erreur réseau
          </p>
          <p className="text-sm text-muted-foreground mt-1">{uploadError}</p>
        </div>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Fichiers envoyés, traitement en cours…
        </p>
      </div>
    );
  }

  const isProcessing =
    record.status === 'EN_ATTENTE' || record.status === 'EN_COURS';
  const isDone = record.status === 'TERMINÉ';
  const isFailed = record.status === 'ÉCHOUÉ';

  return (
    <div className="space-y-4 min-h-[200px] flex flex-col items-center justify-center text-center">
      {isProcessing && (
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="rounded-md bg-muted p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="flex-1 truncate text-sm font-medium text-left">
              {fileLabel}
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
          </div>
          <ImportStatusBadge status={record.status} />
          <p className="text-sm text-muted-foreground">
            Validation et écriture en cours…
          </p>
        </div>
      )}

      {isDone && (
        <>
          <div className="mx-auto rounded-full bg-risk-low/10 p-4">
            <CheckCircle className="h-10 w-10 text-risk-low" />
          </div>
          <div>
            <p className="text-lg font-medium text-risk-low">Import réussi</p>
            <p className="text-sm text-muted-foreground mt-1">{fileLabel}</p>
            {record.rows_ok != null && (
              <p className="mt-2 text-sm text-muted-foreground">
                {record.rows_ok} ligne{record.rows_ok !== 1 ? 's' : ''} importée
                {record.rows_ok !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Importer d&apos;autres fichiers
            </Button>
            {onSuccess && (
              <Button onClick={onSuccess}>Voir l&apos;analyse</Button>
            )}
          </div>
        </>
      )}

      {isFailed && (
        <>
          <div className="mx-auto rounded-full bg-risk-critical/10 p-4">
            <XCircle className="h-10 w-10 text-risk-critical" />
          </div>
          <div className="w-full max-w-lg text-left space-y-3">
            <div className="text-center">
              <p className="text-lg font-medium text-risk-critical">
                Import échoué
              </p>
              <p className="text-sm text-muted-foreground mt-1">{fileLabel}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aucune donnée n&apos;a été enregistrée (import tout-ou-rien).
              </p>
            </div>
            {record.errors && record.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1 max-h-52 overflow-y-auto">
                <p className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wide">
                  {record.errors.length} erreur
                  {record.errors.length !== 1 ? 's' : ''} détectée
                  {record.errors.length !== 1 ? 's' : ''}
                </p>
                {record.errors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-destructive"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Corrigez les fichiers puis relancez l&apos;import.
          </p>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Relancer avec de nouveaux fichiers
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function UploadWizard({
  defaultFileType = 'products',
  onSuccess,
}: UploadWizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const handleFile = useCallback(async (slot: FileSlot, file: File) => {
    update({ parseError: null });
    try {
      const preview = await previewFile(file);
      const detection = detectLgo(preview.headers);
      update({ [slot]: { file, preview, detection } } as Partial<WizardState>);
    } catch {
      update({
        parseError: 'Impossible de lire le fichier. Vérifiez le format.',
      });
    }
  }, []);

  const handleClear = useCallback((slot: FileSlot) => {
    update({ [slot]: null } as Partial<WizardState>);
  }, []);

  const hasMissing =
    (state.products != null &&
      missingColumns('products', state.products.detection).length > 0) ||
    (state.sales != null &&
      missingColumns('sales', state.sales.detection).length > 0);

  const handleConfirm = useCallback(async () => {
    if (!state.products && !state.sales) return;
    update({ step: 3, importId: null, uploadError: null });

    try {
      const { import: imp } = await uploadImport({
        products: state.products?.file,
        sales: state.sales?.file,
      });
      if (imp) {
        update({ importId: imp.import_id });
        if (onSuccess) {
          const check = setInterval(async () => {
            const { fetchImport } = await import('@/lib/api');
            const latest = await fetchImport(imp.import_id).catch(() => null);
            if (latest?.status === 'TERMINÉ') {
              clearInterval(check);
              onSuccess();
            } else if (latest?.status === 'ÉCHOUÉ') {
              clearInterval(check);
            }
          }, 2000);
        }
      } else {
        update({ uploadError: 'Réponse inattendue du serveur.' });
      }
    } catch (err) {
      update({
        uploadError: err instanceof Error ? err.message : 'Erreur réseau',
      });
    }
  }, [state.products, state.sales, onSuccess]);

  const handleReset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const fileNames = [state.products?.file.name, state.sales?.file.name].filter(
    (n): n is string => Boolean(n)
  );

  return (
    <div>
      <StepIndicator current={state.step} />

      {state.step === 1 && (
        <Step1
          products={state.products}
          sales={state.sales}
          defaultFileType={defaultFileType}
          parseError={state.parseError}
          canContinue={Boolean(state.products && state.sales)}
          onFile={handleFile}
          onClear={handleClear}
          onContinue={() => update({ step: 2 })}
        />
      )}

      {state.step === 2 && (state.products || state.sales) && (
        <Step2
          products={state.products}
          sales={state.sales}
          hasMissing={hasMissing}
          onBack={() => update({ step: 1 })}
          onConfirm={handleConfirm}
        />
      )}

      {state.step === 3 && (
        <Step3
          importId={state.importId}
          uploadError={state.uploadError}
          fileNames={fileNames}
          onReset={handleReset}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
