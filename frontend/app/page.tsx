import {
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

import { CapitalByLevelChart } from '@/components/dashboard/capital-by-level-chart';
import { DormancyDonutChart } from '@/components/dashboard/dormancy-donut-chart';
import { RiskChart } from '@/components/dashboard/risk-chart';
import { RiskTable } from '@/components/dashboard/risk-table';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { UploadModal } from '@/components/upload/upload-modal';
import { adaptToRiskDistribution, fetchLatestAnalysis } from '@/lib/api';

export default async function DashboardPage() {
  const { products, stats } = await fetchLatestAnalysis();

  const criticalProducts = products.filter((p) => p.riskLevel === 'critical');
  const topRiskProducts = products
    .filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high')
    .slice(0, 5);
  const riskDistribution = adaptToRiskDistribution(stats);

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
        {/* Metrics charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <DormancyDonutChart stats={stats} />
          <div className="lg:col-span-2">
            <CapitalByLevelChart products={products} stats={stats} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Priority table */}
          <div className="lg:col-span-2 space-y-3">
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
              <RiskTable products={topRiskProducts} compact />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-6 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-green-500" />
                Aucun produit prioritaire — votre stock est sain.
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <RiskChart data={riskDistribution} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
