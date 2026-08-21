import { X, LayoutGrid, Plane, Ship, Loader2, User, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

export type BillingModeFilter = 'all' | 1 | 2
export type BillingStatusFilter = 'all' | 'collected' | 'issued' | 'draft'

interface BillingFilterBarProps {
  modeFilter: BillingModeFilter
  statusFilter: BillingStatusFilter
  customerFilter?: string
  markingFilter?: string
  isFetching?: boolean
  onModeChange: (v: BillingModeFilter) => void
  onStatusChange: (v: BillingStatusFilter) => void
  onCustomerChange?: (v: string) => void
  onMarkingChange?: (v: string) => void
  onClearAll: () => void
}

export function BillingFilterBar({
  modeFilter,
  statusFilter,
  customerFilter = '',
  markingFilter = '',
  isFetching = false,
  onModeChange,
  onStatusChange,
  onCustomerChange,
  onMarkingChange,
  onClearAll,
}: BillingFilterBarProps) {
  const { t } = useTranslation()

  const hasCustomer = Boolean(customerFilter.trim())
  const hasMarking = Boolean(markingFilter.trim())
  const hasActiveFilters = modeFilter !== 'all' || statusFilter !== 'all' || hasCustomer || hasMarking

  const modeButtons = [
    { value: 'all' as const, icon: LayoutGrid, label: 'Semua Moda' },
    { value: 1 as const, icon: Plane, label: 'Udara' },
    { value: 2 as const, icon: Ship, label: 'Laut' },
  ]

  const statusButtons: { value: BillingStatusFilter; label: string }[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'collected', label: 'Collected (Lunas)' },
    { value: 'issued', label: 'Issued (Terbit)' },
    { value: 'draft', label: 'Draft' },
  ]

  return (
    <div className="shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      {/* Primary filter row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5">
        {/* Left: Mode Segmented Buttons + Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Moda Segmented Toggle */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {modeButtons.map(({ value, icon: Icon, label }) => {
              const isActive = modeFilter === value
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => onModeChange(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 select-none border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  {isActive && isFetching ? (
                    <Loader2 size={12} className="animate-spin text-[var(--color-tertiary)]" />
                  ) : (
                    <Icon size={13} className={isActive ? 'text-[var(--color-tertiary)]' : 'text-[var(--color-secondary)]'} />
                  )}
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Status Pills */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] overflow-x-auto">
            {statusButtons.map(({ value, label }) => {
              const isActive = statusFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusChange(value)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap cursor-pointer border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Active Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasCustomer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/20">
                  <User size={11} />
                  Cust: {customerFilter}
                  {onCustomerChange && (
                    <button
                      type="button"
                      onClick={() => onCustomerChange('')}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              )}

              {hasMarking && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <Tag size={11} />
                  Mrk: {markingFilter}
                  {onMarkingChange && (
                    <button
                      type="button"
                      onClick={() => onMarkingChange('')}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Reset All Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-lg transition-colors border border-[var(--color-border)] cursor-pointer"
          >
            <X size={12} />
            <span>{t('common.clear') || 'Reset Filter'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
