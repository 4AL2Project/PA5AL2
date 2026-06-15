'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisStats, Product } from '@/lib/types';

interface CapitalByLevelChartProps {
  products: Product[];
  stats: AnalysisStats;
}

const LEVEL_CONFIG = {
  critical: { label: 'Don associatif', color: 'var(--color-risk-critical)' },
  high: { label: 'Vente B2C', color: 'var(--color-risk-high)' },
  safe: { label: 'Sûr', color: 'var(--color-risk-low)' },
} as const;

const fmt = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    notation: v >= 1_000_000 ? 'compact' : 'standard',
  }).format(v);

export function CapitalByLevelChart({
  products,
  stats,
}: CapitalByLevelChartProps) {
  const byLevel = products.reduce<Record<string, number>>(
    (acc, p) => {
      acc[p.riskLevel] = (acc[p.riskLevel] ?? 0) + p.capitalLocked;
      return acc;
    },
    { critical: 0, high: 0, safe: 0 }
  );

  const data = (['critical', 'high', 'safe'] as const).map((level) => ({
    name: LEVEL_CONFIG[level].label,
    capital: byLevel[level],
    color: LEVEL_CONFIG[level].color,
  }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Capital immobilisé
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Total : {fmt(stats.totalCapitalLocked)} · Récupérable :{' '}
          {fmt(stats.totalRecoveryValue)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 32 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                tickFormatter={fmt}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                width={88}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: number) => [fmt(value), 'Capital']}
              />
              <Bar dataKey="capital" radius={[0, 4, 4, 0]}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
