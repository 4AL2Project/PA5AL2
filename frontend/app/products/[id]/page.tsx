'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Calendar,
  ChevronRight,
  Clock,
  Euro,
  Loader2,
  Package,
  Tag,
  TrendingDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';

import { RiskBadge } from '@/components/dashboard/risk-badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { fetchLatestAnalysis } from '@/lib/api';
import { Product } from '@/lib/types';

const riskColors: Record<string, string> = {
  critical: 'text-risk-critical',
  high: 'text-risk-high',
  safe: 'text-risk-low',
};

const riskBgColors: Record<string, string> = {
  critical: 'bg-risk-critical/10',
  high: 'bg-risk-high/10',
  safe: 'bg-risk-low/10',
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    fetchLatestAnalysis()
      .then(({ products }) => {
        setProduct(products.find((p) => p.id === id) ?? null);
      })
      .catch(() => setProduct(null));
  }, [id]);

  if (product === undefined) {
    return (
      <DashboardLayout title="Chargement...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (product === null) {
    return (
      <DashboardLayout title="Produit non trouve">
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Produit non trouve</h2>
          <p className="text-muted-foreground mb-6">
            Le produit que vous recherchez n&apos;existe pas ou a ete supprime.
          </p>
          <Button onClick={() => router.push('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux produits
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const daysLeft = Math.ceil(
    (new Date(product.expirationDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <DashboardLayout title={product.name} description={`SKU: ${product.sku}`}>
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        {/* Header */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-xl ${riskBgColors[product.riskLevel]}`}
                >
                  <Package
                    className={`h-7 w-7 ${riskColors[product.riskLevel]}`}
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{product.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-muted-foreground font-mono">
                      {product.sku}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-sm text-muted-foreground">
                      {product.category}
                    </span>
                  </div>
                </div>
              </div>
              <RiskBadge level={product.riskLevel} />
            </div>
          </CardContent>
        </Card>

        {/* Métriques */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Score de risque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${riskColors[product.riskLevel]}`}
                  >
                    {product.riskScore}
                  </span>
                  <span className="text-muted-foreground">/ 100</span>
                </div>
                <Progress value={product.riskScore} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {product.riskScore >= 70
                    ? 'Stock critique — don associatif recommande'
                    : product.riskScore >= 30
                      ? 'Ecoulement insuffisant — mise en vente B2C'
                      : 'Ventes suffisantes — aucune action requise'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date d&apos;expiration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${daysLeft <= 7 ? 'text-risk-critical' : daysLeft <= 14 ? 'text-risk-high' : 'text-foreground'}`}
                  >
                    {daysLeft}
                  </span>
                  <span className="text-muted-foreground">jours restants</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Expire le {formatDate(product.expirationDate)}
                </p>
                {daysLeft <= 7 && (
                  <div className="flex items-center gap-2 text-sm text-risk-critical">
                    <AlertTriangle className="h-4 w-4" />
                    Expiration imminente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                Stock disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{product.stock}</span>
                <span className="text-muted-foreground">unites</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action & Valeur */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                Action recommandee
              </CardTitle>
              <CardDescription>
                Basee sur l&apos;analyse du risque et la date d&apos;expiration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`rounded-lg p-4 ${riskBgColors[product.riskLevel]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag
                      className={`h-5 w-5 ${riskColors[product.riskLevel]}`}
                    />
                    <span className="font-semibold">{product.action}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Euro className="h-4 w-4 text-muted-foreground" />
                Valeur de recuperation
              </CardTitle>
              <CardDescription>
                Estimation basee sur l&apos;action recommandee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-500">
                  {formatCurrency(product.recoveryValue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Métadonnées */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Informations supplementaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Derniere mise a jour
                </p>
                <p className="font-medium">{formatDate(product.lastUpdated)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categorie</p>
                <p className="font-medium">{product.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Identifiant</p>
                <p className="font-medium font-mono text-xs">{product.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
