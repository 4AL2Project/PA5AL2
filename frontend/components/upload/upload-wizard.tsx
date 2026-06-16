'use client';

import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { useImportPolling } from '@/hooks/use-import-polling';
import { uploadFile } from '@/lib/api';
import { ParsedPreview, previewFile } from '@/lib/file-preview';
import { DetectionResult, detectLgo } from '@/lib/lgo-detector';
import { cn } from '@/lib/utils';

type WizardStep = 1 | 2 | 3;
type DragState = 'idle' | 'dragging';

interface UploadWizardProps {
  defaultFileType?: 'products' | 'sales';
  /** Appelé après un import réussi (terminal) */
  onSuccess?: () => void;
}

interface WizardState {
  step: WizardStep;
  fileType: 'products' | 'sales';
  file: File | null;
  preview: ParsedPreview | null;
  detection: DetectionResult | null;
  parseError: string | null;
  /** import_id retourné par le serveur après POST /upload */
  importId: string | null;
  /** Erreur réseau lors du POST initial */
  uploadError: string | null;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  fileType: 'products',
  file: null,
  preview: null,
  detection: null,
  parseError: null,
  importId: null,
  uploadError: null,
};

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

// ─── LGO badge ────────────────────────────────────────────────────────────────

function LgoBadge({ lgoName }: { lgoName: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <CheckCircle className="h-3 w-3" />
      Format {lgoName} détecté
    </span>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  fileType: 'products' | 'sales';
  parseError: string | null;
  onFileTypeChange: (t: 'products' | 'sales') => void;
  onFile: (f: File) => void;
}

function Step1({ fileType, parseError, onFileTypeChange, onFile }: Step1Props) {
  const [drag, setDrag] = useState<DragState>('idle');

  const validate = useCallback(
    (file: File) => {
      const ok =
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx');
      if (ok) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="space-y-4">
      {/* File type selector */}
      <div className="flex gap-2">
        {(['products', 'sales'] as const).map((t) => (
          <button
            key={t}
            onClick={() => onFileTypeChange(t)}
            className={cn(
              'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              fileType === t
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {t === 'products' ? 'Fichier produits' : 'Fichier ventes'}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag('dragging');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDrag('idle');
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDrag('idle');
          const file = e.dataTransfer.files[0];
          if (file) validate(file);
        }}
        className={cn(
          'relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
          drag === 'idle' &&
            'border-border hover:border-primary/50 hover:bg-muted/30',
          drag === 'dragging' && 'border-primary bg-primary/5'
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
          aria-label="Sélectionner un fichier"
        />
        <div
          className={cn(
            'mb-4 rounded-full p-4 transition-colors',
            drag === 'dragging' ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          <Upload
            className={cn(
              'h-8 w-8 transition-colors',
              drag === 'dragging' ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </div>
        <p
          className={cn(
            'mb-1 text-base font-medium',
            drag === 'dragging' && 'text-primary'
          )}
        >
          {drag === 'dragging'
            ? 'Déposez le fichier ici'
            : 'Glissez votre fichier ici'}
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-muted-foreground">
          Formats acceptés : CSV, XLSX — Max. 50 MB
        </p>
      </div>

      {parseError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {parseError}
        </div>
      )}

      {/* Format hint */}
      <p className="text-xs text-muted-foreground">
        {fileType === 'products'
          ? 'Colonnes requises : external_sku, name, expiry_date, stock_quantity, unit_price'
          : 'Colonnes requises : external_sku, sale_date, quantity_sold'}
      </p>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  file: File;
  preview: ParsedPreview;
  detection: DetectionResult;
  fileType: 'products' | 'sales';
  onBack: () => void;
  onConfirm: () => void;
}

function Step2({
  file,
  preview,
  detection,
  fileType,
  onBack,
  onConfirm,
}: Step2Props) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const requiredFields =
    fileType === 'products'
      ? ['external_sku', 'name', 'stock_quantity', 'unit_price']
      : ['external_sku', 'sale_date', 'quantity_sold'];

  const mappedValues = Object.values(detection.mappedHeaders);
  const missingRequired = requiredFields.filter(
    (f) => !mappedValues.includes(f)
  );

  return (
    <div className="space-y-4">
      {/* File info */}
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
        <div className="rounded-md bg-muted p-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(file.size)} · {preview.totalRows} lignes détectées
          </p>
        </div>
        {detection.lgo && <LgoBadge lgoName={detection.lgo.name} />}
      </div>

      {/* Missing columns warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Colonnes manquantes : <strong>{missingRequired.join(', ')}</strong>
          </span>
        </div>
      )}

      {/* Preview table */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Aperçu des données ({Math.min(preview.rows.length, 5)} premières
          lignes)
        </p>
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {preview.headers.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                  >
                    <div className="space-y-0.5">
                      <span>{h}</span>
                      {detection.mappedHeaders[h] && (
                        <span className="block text-primary/70 font-normal">
                          → {detection.mappedHeaders[h]}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-border/40 hover:bg-muted/20"
                >
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
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Retour
        </Button>
        <Button
          onClick={onConfirm}
          disabled={missingRequired.length > 0}
          className="flex-1"
        >
          Importer
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface Step3Props {
  importId: string | null;
  uploadError: string | null;
  file: File;
  onReset: () => void;
  onSuccess?: () => void;
}

function Step3({
  importId,
  uploadError,
  file,
  onReset,
  onSuccess,
}: Step3Props) {
  const record = useImportPolling(importId);

  // Network-level error (POST failed before getting an import_id)
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

  // Waiting for first poll result
  if (!record) {
    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Fichier envoyé, traitement en cours…
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
              {file.name}
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
            <p className="text-sm text-muted-foreground mt-1">{file.name}</p>
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
              Importer un autre fichier
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
              <p className="text-sm text-muted-foreground mt-1">{file.name}</p>
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
            Corrigez le fichier puis relancez l&apos;import.
          </p>
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Relancer avec un nouveau fichier
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
  const [state, setState] = useState<WizardState>({
    ...INITIAL_STATE,
    fileType: defaultFileType,
  });

  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const handleFile = useCallback(async (file: File) => {
    update({ parseError: null });
    try {
      const preview = await previewFile(file);
      const detection = detectLgo(preview.headers);
      update({ file, preview, detection, step: 2, parseError: null });
    } catch {
      update({
        parseError: 'Impossible de lire le fichier. Vérifiez le format.',
      });
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!state.file) return;
    update({ step: 3, importId: null, uploadError: null });

    try {
      const data = await uploadFile(state.file, state.fileType);
      const imp = data.imports?.[0] ?? null;
      if (imp) {
        update({ importId: imp.import_id });
        // Notify parent when import reaches TERMINÉ
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
  }, [state.file, state.fileType, onSuccess]);

  const handleReset = useCallback(() => {
    setState({ ...INITIAL_STATE, fileType: state.fileType });
  }, [state.fileType]);

  return (
    <div>
      <StepIndicator current={state.step} />

      {state.step === 1 && (
        <Step1
          fileType={state.fileType}
          parseError={state.parseError}
          onFileTypeChange={(t) => update({ fileType: t })}
          onFile={handleFile}
        />
      )}

      {state.step === 2 && state.file && state.preview && state.detection && (
        <Step2
          file={state.file}
          preview={state.preview}
          detection={state.detection}
          fileType={state.fileType}
          onBack={() =>
            update({ step: 1, file: null, preview: null, detection: null })
          }
          onConfirm={handleConfirm}
        />
      )}

      {state.step === 3 && state.file && (
        <Step3
          importId={state.importId}
          uploadError={state.uploadError}
          file={state.file}
          onReset={handleReset}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}
