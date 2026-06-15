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
import { Product } from '@/lib/types';

interface SalesVelocityChartProps {
  products: Product[];
}

const RISK_COLORS: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high: 'var(--color-risk-high)',
  safe: 'var(--color-risk-low)',
};

export function SalesVelocityChart({ products }: SalesVelocityChartProps) {
  const data = [...products]
    .filter((p) => p.salesVelocity30d > 0)
    .sort((a, b) => b.salesVelocity30d - a.salesVelocity30d)
    .slice(0, 10)
    .map((p) => ({
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      velocity: Math.round(p.salesVelocity30d * 10) / 10,
      color: RISK_COLORS[p.riskLevel] ?? 'var(--color-muted-foreground)',
    }));

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Ventes (30 j)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top {data.length} produits par vélocité de vente (unités / 30 j)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 0, right: 24 }}
              >
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  tickFormatter={(v) => `${v} u`}
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
                  formatter={(v: number) => [`${v} unités / 30 j`, 'Vélocité']}
                />
                <Bar dataKey="velocity" radius={[0, 4, 4, 0]}>
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Aucune donnée de vente disponible
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
