'use client';

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/lib/types';

interface DaysOfCoverChartProps {
  products: Product[];
}

const RISK_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high: 'var(--color-risk-high)',
  safe: 'var(--color-risk-low)',
};

const THRESHOLDS = [
  { value: 60, label: '60 j', color: 'var(--color-risk-low)' },
  { value: 180, label: '180 j', color: 'var(--color-risk-critical)' },
];

export function DaysOfCoverChart({ products }: DaysOfCoverChartProps) {
  // Top 10 most dormant (highest days of cover, excluding ∞)
  const data = [...products]
    .filter((p) => p.daysOfCover < 9999 && p.riskLevel !== 'safe')
    .sort((a, b) => b.daysOfCover - a.daysOfCover)
    .slice(0, 10)
    .map((p) => ({
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      days: Math.round(p.daysOfCover),
      color: RISK_COLORS[p.riskLevel] ?? 'var(--color-muted-foreground)',
    }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Jours de couverture</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {data.length} produits dormants · seuils 60 j (élevé) et 180 j (critique)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24 }}>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  tickFormatter={(v) => `${v} j`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
                  contentStyle={{
                    backgroundColor: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} jours`, 'Couverture']}
                />
                {THRESHOLDS.map((t) => (
                  <ReferenceLine
                    key={t.value}
                    x={t.value}
                    stroke={t.color}
                    strokeDasharray="4 3"
                    label={{
                      value: t.label,
                      position: 'top',
                      fontSize: 10,
                      fill: t.color,
                    }}
                  />
                ))}
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Aucun produit dormant détecté
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
