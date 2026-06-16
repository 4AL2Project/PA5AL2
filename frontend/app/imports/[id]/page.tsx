'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ImportStatusBadge } from '@/components/upload/import-status-badge';
import { useImportPolling } from '@/hooks/use-import-polling';
import { ImportFileType, ImportStatus } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileTypeLabel(t: ImportFileType) {
  return t === 'products' ? 'Produits' : 'Ventes';
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'red' | 'default';
}) {
  const valueClass =
    accent === 'green'
      ? 'text-emerald-600 dark:text-emerald-400'
      : accent === 'red'
        ? 'text-destructive'
        : '';
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusIcon({ status }: { status: ImportStatus }) {
  if (status === 'TERMINÉ')
    return <CheckCircle2 className="h-10 w-10 text-emerald-500" />;
  if (status === 'ÉCHOUÉ')
    return <XCircle className="h-10 w-10 text-destructive" />;
  return <Loader2 className="h-10 w-10 animate-spin text-primary" />;
}

export default function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const record = useImportPolling(id);

  if (!record) {
    return (
      <DashboardLayout title="Import">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const errors: string[] = Array.isArray(record.errors) ? record.errors : [];
  const isLive = record.status === 'EN_ATTENTE' || record.status === 'EN_COURS';

  const successRate =
    record.rows_total && record.rows_total > 0 && record.rows_ok != null
      ? Math.round((record.rows_ok / record.rows_total) * 100)
      : null;

  return (
    <DashboardLayout
      title={record.file_name}
      description={`${fileTypeLabel(record.file_type)} · ${formatDate(record.uploaded_at)}`}
    >
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          {record.status === 'ÉCHOUÉ' && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Link href="/upload">
                <Button variant="outline" size="sm" className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Relancer un import
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Header card */}
        <Card className="border-border/50">
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-muted p-3 shrink-0">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold break-all">
                    {record.file_name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span>{fileTypeLabel(record.file_type)}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{formatDate(record.uploaded_at)}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span className="font-mono text-[11px]">
                      {record.import_id}
                    </span>
                  </div>
                </div>
              </div>
              <ImportStatusBadge
                status={record.status}
                className="text-sm px-3 py-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status + stats */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card className="border-border/50 flex flex-col items-center justify-center py-6 gap-3 col-span-full sm:col-span-1">
            <StatusIcon status={record.status} />
            <p className="text-sm font-medium">
              {isLive
                ? 'Traitement en cours…'
                : record.status === 'TERMINÉ'
                  ? 'Import réussi'
                  : 'Import échoué'}
            </p>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-5">
              <StatCard
                label="Lignes totales"
                value={record.rows_total ?? '—'}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-5">
              <StatCard
                label="Importées avec succès"
                value={record.rows_ok ?? '—'}
                sub={
                  successRate != null
                    ? `${successRate} % du fichier`
                    : undefined
                }
                accent={
                  record.rows_ok != null && record.rows_ok > 0
                    ? 'green'
                    : undefined
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="pt-5">
              <StatCard
                label="Lignes en erreur"
                value={record.rows_failed ?? '—'}
                accent={
                  record.rows_failed != null && record.rows_failed > 0
                    ? 'red'
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Error list */}
        {errors.length > 0 && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {errors.length} erreur{errors.length !== 1 ? 's' : ''} de
                validation
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Aucune donnée n&apos;a été écrite. Corrigez les lignes
                ci-dessous dans votre fichier source puis relancez
                l&apos;import.
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[480px] rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="divide-y divide-destructive/10">
                  {errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm"
                    >
                      <span className="shrink-0 font-mono text-xs text-muted-foreground w-8 pt-0.5 text-right">
                        #{i + 1}
                      </span>
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span className="text-destructive">{err}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 flex justify-end">
                <Link href="/upload">
                  <Button className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Relancer avec un nouveau fichier
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* In-progress notice */}
        {isLive && (
          <Card className="border-border/50">
            <CardContent className="pt-6 flex items-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">Traitement en cours</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cette page se met à jour automatiquement. Vous pouvez revenir
                  plus tard.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
