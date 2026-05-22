'use client'

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RiskDistribution } from '@/lib/types'

interface RiskChartProps {
  data: RiskDistribution[]
}

const riskColors: Record<string, string> = {
  critical: 'var(--color-risk-critical)',
  high:     'var(--color-risk-high)',
  safe:     'var(--color-risk-low)',
}

const riskLabels: Record<string, string> = {
  critical: 'Don associatif',
  high:     'Vente B2C',
  safe:     'Sur',
}

export function RiskChart({ data }: RiskChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    name: riskLabels[item.level] ?? item.level,
    fill: riskColors[item.level] ?? 'var(--color-muted-foreground)',
  }))

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          Distribution des Risques
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                width={90}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)', opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-foreground)',
                }}
                formatter={(value: number) => [`${value}%`, 'Pourcentage']}
              />
              <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {chartData.map((item) => (
            <div key={item.level} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-xs text-muted-foreground">
                {item.name}: {item.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
