import { cn } from '@/lib/utils'
import { RiskLevel } from '@/lib/types'

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  critical: {
    label: 'Critique',
    className: 'bg-risk-critical/20 text-risk-critical border-risk-critical/30',
  },
  high: {
    label: 'Eleve',
    className: 'bg-risk-high/20 text-risk-high border-risk-high/30',
  },
  medium: {
    label: 'Moyen',
    className: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
  },
  low: {
    label: 'Faible',
    className: 'bg-risk-low/20 text-risk-low border-risk-low/30',
  },
  moderate: {
    label: 'Modere',
    className: 'bg-risk-medium/20 text-risk-medium border-risk-medium/30',
  },
  safe: {
    label: 'Sur',
    className: 'bg-risk-low/20 text-risk-low border-risk-low/30',
  },
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level]
  
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
