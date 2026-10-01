import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

export interface RatioBarItem {
  percentage: number
  color: string
  label?: string
  valueText?: string
}

export interface StatTrend {
  value: number | string
  label?: string
  direction?: 'up' | 'down' | 'neutral'
}

export interface StatCardProps {
  title?: string
  label?: string
  value?: ReactNode
  subValue?: ReactNode
  icon?: ReactNode
  trend?: StatTrend | null
  ratioBar?: RatioBarItem[]
  footer?: ReactNode
  action?: ReactNode
  className?: string
  compact?: boolean
  isLoading?: boolean
  accentColor?: string
  onClick?: () => void
}

export function StatCard({
  title,
  label,
  value,
  subValue,
  icon,
  trend,
  ratioBar,
  footer,
  action,
  className,
  compact = false,
  isLoading = false,
  accentColor,
  onClick,
}: StatCardProps) {
  const displayTitle = title || label || ''
  const isClickable = Boolean(onClick)

  if (isLoading) {
    return (
      <div className={cn('rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3 min-h-[110px]', className)}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3.5 w-20" />
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '3px' } : undefined}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition-all font-[var(--font-body)]',
        compact ? 'p-3' : 'p-3.5 sm:p-4',
        isClickable && 'cursor-pointer hover:border-[var(--color-tertiary)]/50 hover:shadow-sm active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] truncate">
          {displayTitle}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {action}
          {icon && (
            <div className="p-1.5 rounded-lg bg-[var(--color-neutral)] text-[var(--color-secondary)]">
              {icon}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <div className="text-[18px] sm:text-[22px] font-bold font-[var(--font-label)] tabular-nums text-[var(--color-primary)]">
          {value}
        </div>
        {subValue && (
          <div className="text-[11.5px] text-[var(--color-secondary)] tabular-nums">
            {subValue}
          </div>
        )}
      </div>

      {ratioBar && ratioBar.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden flex">
            {ratioBar.map((item, idx) => (
              <div
                key={idx}
                className={cn('h-full transition-all duration-300', item.color)}
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[var(--color-secondary)] tabular-nums">
            {ratioBar.map((item, idx) => (
              <span key={idx} className="flex items-center gap-1">
                <span className={cn('w-1.5 h-1.5 rounded-full inline-block', item.color)} />
                {item.label && <span>{item.label}: </span>}
                <span className="font-semibold text-[var(--color-primary)]">{item.valueText || `${item.percentage.toFixed(1)}%`}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] tabular-nums">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              trend.direction === 'up' && 'text-emerald-500',
              trend.direction === 'down' && 'text-rose-500',
              trend.direction === 'neutral' && 'text-[var(--color-secondary)]'
            )}
          >
            {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend.direction === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-[var(--color-secondary)] truncate">
              {trend.label}
            </span>
          )}
        </div>
      )}

      {footer && <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/60">{footer}</div>}
    </div>
  )
}
