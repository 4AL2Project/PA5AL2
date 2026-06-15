import { AlertTriangle } from 'lucide-react';

const STALE_THRESHOLD_DAYS = 7;

function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

interface StaleDataAlertProps {
  lastUploadAt: string | null;
}

export function StaleDataAlert({ lastUploadAt }: StaleDataAlertProps) {
  if (!lastUploadAt) return null;

  const days = daysSince(lastUploadAt);
  if (days < STALE_THRESHOLD_DAYS) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Données non mises à jour depuis{' '}
        <strong>{days} jour{days > 1 ? 's' : ''}</strong>. Importez un nouvel
        export LGO pour obtenir des KPIs à jour.
      </span>
    </div>
  );
}
