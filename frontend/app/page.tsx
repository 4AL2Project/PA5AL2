import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { CapitalByLevelChart } from '@/components/dashboard/capital-by-level-chart';
import { DaysOfCoverChart } from '@/components/dashboard/days-of-cover-chart';
import { DormancyDonutChart } from '@/components/dashboard/dormancy-donut-chart';
import { RiskTable } from '@/components/dashboard/risk-table';
import { SalesVelocityChart } from '@/components/dashboard/sales-velocity-chart';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { UploadModal } from '@/components/upload/upload-modal';
import { fetchLatestAnalysis } from '@/lib/api';

export default async function DashboardPage() {
  const { products, stats } = await fetchLatestAnalysis();

  const criticalProducts = products.filter((p) => p.riskLevel === 'critical');
  const topRiskProducts = products.filter(
    (p) => p.riskLevel === 'critical' || p.riskLevel === 'high'
  );

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <DashboardLayout
      title="Dashboard"
      description={`Derniere analyse : ${formatDate(stats.lastAnalysisDate)}`}
      actions={
        <>
          <UploadModal />
          <Button variant="outline" size="sm" asChild>
            <Link href="/products?filter=critical">
              Produits a donner ({criticalProducts.length})
            </Link>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Ligne 1 : répartition + capital */}
        <div className="grid gap-4 lg:grid-cols-3">
          <DormancyDonutChart stats={stats} />
          <div className="lg:col-span-2">
            <CapitalByLevelChart products={products} stats={stats} />
          </div>
        </div>

        {/* Ligne 2 : ventes + jours de couverture */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SalesVelocityChart products={products} />
          <DaysOfCoverChart products={products} />
        </div>

        {/* Ligne 3 : table pleine largeur */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium">Produits Prioritaires</h2>
              <p className="text-xs text-muted-foreground">
                Produits necessitant une action immediate
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/products">
                Voir tout
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {topRiskProducts.length > 0 ? (
            <RiskTable products={topRiskProducts} />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-green-500" />
              Aucun produit prioritaire — votre stock est sain.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
