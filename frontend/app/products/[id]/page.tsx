'use client';

import { ArrowLeft, CheckCircle2, Loader2, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ValidateActionDialog } from '@/components/actions/validate-action-dialog';
import { RiskBadge } from '@/components/dashboard/risk-badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  fetchPendingActions,
  ignoreAction,
  snoozeAction,
  validateAction,
} from '@/lib/api';
import { fetchLatestAnalysis } from '@/lib/api';
import { DormantAction, Product } from '@/lib/types';

const riskColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  safe: '#22c55e',
};

const riskBgColors: Record<string, string> = {
  critical: 'bg-risk-critical/10',
  high: 'bg-risk-high/10',
  safe: 'bg-risk-low/10',
};

// ─── Graphique : jours de couverture ─────────────────────────────────────────

function DaysOfCoverGauge({ product }: { product: Product }) {
  const days = Math.min(product.daysOfCover, 730);
  const displayDays =
    product.daysOfCover >= 9999 ? '∞' : `${Math.round(product.daysOfCover)} j`;
  const barColor = riskColors[product.riskLevel];

  const data = [{ name: product.name, value: days }];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Jours de couverture
        </CardTitle>
        <p className={`text-3xl font-bold`} style={{ color: barColor }}>
          {displayDays}
        </p>
        <p className="text-xs text-muted-foreground">
          {product.daysOfCover < 60
            ? 'Stock sain — aucune action requise'
            : product.daysOfCover < 180
              ? 'Stock dormant — mise en vente B2C recommandée'
              : 'Stock critique — don associatif recommandé'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              type="number"
              domain={[0, Math.max(days * 1.2, 200)]}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(v) => `${v} j`}
            />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              formatter={(v: number) => [`${Math.round(v)} jours`, 'Couverture']}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              x={60}
              stroke="#22c55e"
              strokeDasharray="4 2"
              label={{
                value: '60 j',
                fontSize: 10,
                fill: '#22c55e',
                position: 'top',
              }}
            />
            <ReferenceLine
              x={180}
              stroke="#f97316"
              strokeDasharray="4 2"
              label={{
                value: '180 j',
                fontSize: 10,
                fill: '#f97316',
                position: 'top',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={36}>
              <Cell fill={barColor} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Graphique : stock vs vélocité ───────────────────────────────────────────

function StockVsVelocityChart({ product }: { product: Product }) {
  const monthly = product.salesVelocity30d;
  const data = [
    { name: 'Stock actuel', value: product.stock, fill: riskColors[product.riskLevel] },
    { name: 'Ventes / 30 j', value: monthly, fill: '#6366f1' },
  ];

  const ratio = monthly > 0 ? (product.stock / monthly).toFixed(1) : '∞';

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Stock vs Vélocité mensuelle
        </CardTitle>
        <p className="text-3xl font-bold">{product.stock}</p>
        <p className="text-xs text-muted-foreground">
          {monthly > 0
            ? `${monthly} unité${monthly > 1 ? 's' : ''}/mois · ratio ${ratio}×`
            : 'Aucune vente enregistrée ces 30 derniers jours'}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number, name: string) => [v, name]}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [action, setAction] = useState<DormantAction | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchLatestAnalysis(), fetchPendingActions()]).then(
      ([{ products }, actions]) => {
        const found = products.find((p) => p.id === id) ?? null;
        setProduct(found);
        if (found) {
          const pendingAction =
            actions.find((a) => a.productId === id) ?? null;
          setAction(pendingAction);
        }
      }
    ).catch(() => setProduct(null));
  }, [id]);

  const handleValidate = async (actionId: string, type: DormantAction['type']) => {
    setLoading(true);
    try {
      await validateAction(actionId, type);
      setDialogOpen(false);
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async (actionId: string) => {
    setLoading(true);
    try {
      await snoozeAction(actionId);
      setDialogOpen(false);
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async () => {
    if (!action) return;
    setLoading(true);
    try {
      await ignoreAction(action.id);
      setAction(null);
    } finally {
      setLoading(false);
    }
  };

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
      <DashboardLayout title="Produit non trouvé">
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Produit non trouvé</h2>
          <p className="text-muted-foreground mb-6">
            Le produit que vous recherchez n&apos;existe pas ou a été supprimé.
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
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  return (
    <DashboardLayout title={product.name} description={`SKU: ${product.sku}`}>
      <div className="space-y-6">
        {/* Navigation + action */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>

          {action && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <Button
                onClick={() => setDialogOpen(true)}
                disabled={loading}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider l&apos;action
              </Button>
              <Button
                variant="outline"
                onClick={handleIgnore}
                disabled={loading}
              >
                Ignorer
              </Button>
            </>
          )}
        </div>

        {/* Header produit */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${riskBgColors[product.riskLevel]}`}
                >
                  <Package
                    className="h-6 w-6"
                    style={{ color: riskColors[product.riskLevel] }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold">{product.name}</h1>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{product.category}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Capital immobilisé</p>
                  <p className="text-lg font-bold text-risk-critical">
                    {formatCurrency(product.capitalLocked)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Valeur récupérable</p>
                  <p className="text-lg font-bold text-emerald-500">
                    {formatCurrency(product.recoveryValue)}
                  </p>
                </div>
                <RiskBadge level={product.riskLevel} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graphiques */}
        <div className="grid gap-6 md:grid-cols-2">
          <DaysOfCoverGauge product={product} />
          <StockVsVelocityChart product={product} />
        </div>

        {/* Informations supplémentaires */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Informations supplémentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Identifiant interne</p>
                <p className="font-mono text-xs mt-0.5 break-all">{product.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Catégorie</p>
                <p className="text-sm font-medium mt-0.5">{product.category || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Action suggérée</p>
                <p className="text-sm font-medium mt-0.5">{product.action || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dernière mise à jour</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDate(product.lastUpdated)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ValidateActionDialog
        action={action}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleValidate}
        onSnooze={handleSnooze}
        loading={loading}
      />
    </DashboardLayout>
  );
}
