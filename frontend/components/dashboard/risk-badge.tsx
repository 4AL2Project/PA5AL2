import { RiskLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  critical: {
    label: 'Don associatif',
    className: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
  },
  high: {
    label: 'Vente B2C',
    className: 'bg-risk-high/20 text-risk-high border-risk-high/30',
  },
  safe: {
    label: 'Sur',
    className: 'bg-risk-low/20 text-risk-low border-risk-low/30',
  },
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level] ?? riskConfig['safe']

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
