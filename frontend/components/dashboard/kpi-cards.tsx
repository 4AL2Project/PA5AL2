import { AlertTriangle, Euro, Package, Zap } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardData } from '@/lib/api';
import { cn } from '@/lib/utils';

interface KpiCardsProps {
  dashboard: DashboardData;
  financialMasked?: boolean;
}

const MASKED = '—';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  iconClassName?: string;
  warning?: boolean;
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  warning,
}: KpiCardProps) {
  return (
    <Card className="border-border/50">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {description && (
              <p
                className={cn(
                  'text-xs',
                  warning ? 'text-amber-500' : 'text-muted-foreground'
                )}
              >
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              'rounded-md p-2',
              iconClassName ?? 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCards({ dashboard, financialMasked = false }: KpiCardsProps) {
  const capitalValue = financialMasked
    ? MASKED
    : formatCurrency(dashboard.totalCapitalLocked);

  const capitalDescription =
    !financialMasked && dashboard.missingCostPriceCount > 0
      ? `⚠ Partiel — ${dashboard.missingCostPriceCount} produit${dashboard.missingCostPriceCount > 1 ? 's' : ''} sans coût d'achat`
      : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Capital immobilisé"
        value={capitalValue}
        description={capitalDescription}
        icon={Euro}
        iconClassName="bg-amber-500/10 text-amber-500"
        warning={!financialMasked && dashboard.missingCostPriceCount > 0}
      />
      <KpiCard
        title="Produits dormants"
        value={dashboard.dormantCount}
        description="Niveau high + critical"
        icon={Package}
        iconClassName="bg-orange-500/10 text-orange-500"
      />
      <KpiCard
        title="Critique"
        value={dashboard.criticalCount}
        description="Velocity nulle ou ≥ 180 j"
        icon={AlertTriangle}
        iconClassName="bg-destructive/10 text-destructive"
      />
      <Card className="border-border/50">
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Actions en attente</p>
              <p className="text-2xl font-semibold tracking-tight">
                {dashboard.pendingActions}
              </p>
              {dashboard.pendingActions > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  asChild
                >
                  <Link href="/actions">Traiter →</Link>
                </Button>
              )}
            </div>
            <div className="rounded-md p-2 bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
