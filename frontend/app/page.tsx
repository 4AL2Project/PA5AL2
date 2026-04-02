import { DashboardLayout } from '@/components/dashboard-layout'
import { StatsCard } from '@/components/dashboard/stats-card'
import { RiskTable } from '@/components/dashboard/risk-table'
import { RiskChart } from '@/components/dashboard/risk-chart'
import { UploadModal } from '@/components/upload/upload-modal'
import { fetchLatestAnalysis, adaptToRiskDistribution } from '@/lib/api'
import {
  AlertTriangle,
  Package,
  TrendingUp,
  Euro,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const { products, stats } = await fetchLatestAnalysis()

  const criticalProducts = products.filter((p) => p.riskLevel === 'critical')
  const topRiskProducts = products
    .filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high')
    .slice(0, 5)
  const riskDistribution = adaptToRiskDistribution(stats)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

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
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Produits Totaux"
            value={stats.totalProducts.toLocaleString('fr-FR')}
            description="Dans l'inventaire"
            icon={Package}
            iconClassName="bg-primary/10 text-primary"
          />
          <StatsCard
            title="Don associatif"
            value={stats.criticalProducts}
            description="Action immediate requise"
            icon={AlertTriangle}
            iconClassName="bg-risk-critical/10 text-risk-critical"
          />
          <StatsCard
            title="Vente B2C"
            value={stats.highProducts}
            description="A mettre en ligne"
            icon={TrendingUp}
            iconClassName="bg-risk-high/10 text-risk-high"
          />
          <StatsCard
            title="Valeur Recuperable"
            value={formatCurrency(stats.totalRecoveryValue)}
            description="Potentiel de recuperation"
            icon={Euro}
            iconClassName="bg-risk-low/10 text-risk-low"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Critical Products Table */}
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
            <RiskTable products={topRiskProducts} compact />
          </div>

          <div className="lg:col-span-1">
            <RiskChart data={riskDistribution} />
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
