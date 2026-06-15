'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisStats } from '@/lib/types';

const LEVELS = [
  { key: 'criticalProducts', label: 'Don associatif', color: 'var(--color-risk-critical)' },
  { key: 'highProducts', label: 'Vente B2C', color: 'var(--color-risk-high)' },
  { key: 'safeProducts', label: 'Sûr', color: 'var(--color-risk-low)' },
] as const;

interface DormancyDonutChartProps {
  stats: AnalysisStats;
}

export function DormancyDonutChart({ stats }: DormancyDonutChartProps) {
  const data = LEVELS.map((l) => ({
    name: l.label,
    value: stats[l.key],
    color: l.color,
  })).filter((d) => d.value > 0);

  const total = stats.totalProducts;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Répartition du stock</CardTitle>
        <p className="text-xs text-muted-foreground">{total} produits analysés</p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  `${value} produit${value !== 1 ? 's' : ''}`,
                  name,
                ]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Total au centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-[10px] text-muted-foreground">produits</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
