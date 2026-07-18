import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';

import { ImportStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const CONFIG: Record<
  ImportStatus,
  { label: string; className: string; icon: React.ElementType; spin?: boolean }
> = {
  EN_ATTENTE: {
    label: 'En attente',
    className: 'bg-muted text-muted-foreground border-border',
    icon: Clock,
  },
  EN_COURS: {
    label: 'En cours',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Loader2,
    spin: true,
  },
  TERMINÉ: {
    label: 'Terminé',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  ÉCHOUÉ: {
    label: 'Échoué',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: XCircle,
  },
};

interface ImportStatusBadgeProps {
  status: ImportStatus;
  className?: string;
}

export function ImportStatusBadge({
  status,
  className,
}: ImportStatusBadgeProps) {
  const { label, className: colorClass, icon: Icon, spin } = CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', spin && 'animate-spin')} />
      {label}
    </span>
  );
}
