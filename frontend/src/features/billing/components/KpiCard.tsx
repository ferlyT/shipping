import { isValidElement, type ComponentType, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { Trend } from '../types/billing.types'

interface KpiCardProps {
  label: string
  value: string | number
  subValue?: ReactNode
  icon?: ComponentType<{ className?: string }> | ReactNode
  accent?: string
  accentColor?: string
  size?: string
  isLoading?: boolean
  trend?: Trend | null
  onClick?: () => void
}

export function KpiCard({
  label,
  value,
  subValue,
  icon: Icon,
  accent = 'text-[var(--color-secondary)]',
  accentColor = '#3B82F6',
  size = 'text-2xl sm:text-3xl',
  isLoading,
  trend,
  onClick,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <Card variant="bordered" className="animate-pulse p-4 h-full min-h-[124px]">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </Card>
    )
  }

  const renderIcon = () => {
    if (!Icon) return null
    if (isValidElement(Icon)) return Icon
    const Component = Icon as ComponentType<{ className?: string }>
    return <Component className={`w-5 h-5 ${accent}`} />
  }

  const isUp = trend?.direction === 'up'
  const trendLabelText = 'vs bulan lalu'

  return (
    <Card
      variant="accent"
      accentColor={accentColor}
      className={`h-full min-h-[124px] transition-all duration-200 hover:shadow-md hover:-translate-y-1 group ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <Card.Body className="p-4 flex flex-col justify-between h-full gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] truncate">{label}</span>
          <div className="p-2 rounded-xl bg-[var(--color-neutral)] flex-shrink-0">{renderIcon()}</div>
        </div>

        <div className="space-y-1 my-auto">
          <h3 className={`${size} font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums tracking-tight`}>
            {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          </h3>

          {subValue && (
            <div
              className="text-xs font-semibold text-[var(--color-secondary)] truncate flex items-center gap-1 flex-wrap"
              title={typeof subValue === 'string' ? subValue : undefined}
            >
              {subValue}
            </div>
          )}

          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{trend.value}% {trendLabelText}</span>
            </div>
          )}

          {!subValue && !trend && (
            <div className="text-xs font-semibold opacity-0 select-none" aria-hidden="true">&nbsp;</div>
          )}
        </div>
      </Card.Body>
    </Card>
  )
}
