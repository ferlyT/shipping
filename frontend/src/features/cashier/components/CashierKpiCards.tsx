import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { CashierStatsResponse } from '../types/cashier.types'

interface CashierKpiCardsProps {
  stats: CashierStatsResponse | null
  isLoading?: boolean
}

export function CashierKpiCards({ stats, isLoading }: CashierKpiCardsProps) {
  const { t } = useTranslation()

  const cards = [
    {
      label: t('cashier.kpiTodayRcv'),
      value: stats ? formatCurrency(stats.todayTotalRcv) : 'Rp 0',
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-500',
    },
    {
      label: t('cashier.kpiTodayAllocated'),
      value: stats ? formatCurrency(stats.todayInvoiceAllocated) : 'Rp 0',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-500',
    },
    {
      label: t('cashier.kpiUnbalanced'),
      value: stats ? formatNumber(stats.unbalancedCount) : '0',
      icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      borderColor: stats && stats.unbalancedCount > 0 ? 'border-amber-500/40' : 'border-[var(--color-border)]',
      textColor: stats && stats.unbalancedCount > 0 ? 'text-amber-500' : 'text-[var(--color-primary)]',
    },
    {
      label: t('cashier.kpiPendingTemp'),
      value: stats ? formatNumber(stats.pendingTempCount) : '0',
      icon: (
        <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      borderColor: 'border-sky-500/20',
      textColor: 'text-sky-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`rounded-[var(--radius-lg)] border ${card.borderColor} bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-xs transition-all hover:border-[var(--color-tertiary)]/40`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
              {card.label}
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
              {card.icon}
            </div>
          </div>
          {isLoading ? (
            <div className="h-6 w-28 rounded skeleton-shimmer mt-1" />
          ) : (
            <div className={`text-[18px] font-bold tabular-nums ${card.textColor}`}>
              {card.value}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
