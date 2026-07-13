import { Badge } from '@/components/ui/badge';

const STYLES: Record<string, { label: string; className: string }> = {
  EN_COURS: {
    label: 'En cours',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COMPLETEE: {
    label: 'Complété',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  ECHOUEE: {
    label: 'Échoué',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  ANNULEE: {
    label: 'Annulé',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function DonationStatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <Badge variant="outline" className={style.className}>
      {style.label}
    </Badge>
  );
}
