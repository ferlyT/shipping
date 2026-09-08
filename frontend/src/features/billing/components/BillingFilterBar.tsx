import { X, LayoutGrid, Plane, Ship, Loader2, User, Tag, RotateCcw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'

export type BillingModeFilter = 'all' | 1 | 2
export type BillingStatusFilter = 'all' | 'lunas' | 'partial' | 'issued' | 'unpaid' | 'overdue' | 'draft' | 'collected'

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
    { value: 'all' as const, icon: LayoutGrid, label: 'Semua Moda', shortLabel: 'Semua' },
    { value: 1 as const, icon: Plane, label: 'Udara', shortLabel: 'Udara' },
    { value: 2 as const, icon: Ship, label: 'Laut', shortLabel: 'Laut' },
  ]

  const statusButtons: { value: BillingStatusFilter; label: string; icon?: typeof CheckCircle2; color?: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'lunas', label: 'Lunas', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
    { value: 'partial', label: 'Sebagian', icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    { value: 'issued', label: 'Baru Terbit', icon: Clock, color: 'text-blue-600 dark:text-blue-400' },
    { value: 'unpaid', label: 'Belum Lunas', icon: Clock, color: 'text-sky-600 dark:text-sky-400' },
    { value: 'overdue', label: 'Jatuh Tempo', icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400' },
    { value: 'draft', label: 'Draft' },
  ]

  return (
    <div className="shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      {/* ── MOBILE LAYOUT (< sm) ─────────────────────────────────── */}
      <div className="flex sm:hidden flex-col gap-2 px-3.5 py-2.5">
        {/* Row 1: Full-width Moda Segmented Control */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] gap-1">
          {modeButtons.map(({ value, icon: Icon, shortLabel }) => {
            const isActive = modeFilter === value
            return (
              <button
                key={String(value)}
                type="button"
                onClick={() => onModeChange(value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 select-none border',
                  isActive
                    ? 'bg-[var(--color-surface)] border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold'
                    : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                {isActive && isFetching ? (
                  <Loader2 size={12} className="animate-spin text-[var(--color-tertiary)] shrink-0" />
                ) : (
                  <Icon size={13} className={isActive ? 'text-[var(--color-tertiary)] shrink-0' : 'text-[var(--color-secondary)] shrink-0'} />
                )}
                <span className="truncate">{shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Row 2: Status Scrollable Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3.5 px-3.5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {statusButtons.map(({ value, label, icon: Icon, color }) => {
            const isActive = statusFilter === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => onStatusChange(value)}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer shrink-0 border',
                  isActive
                    ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold'
                    : 'bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                {Icon && <Icon size={11} className={isActive ? 'text-[var(--color-tertiary)]' : color} />}
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Row 3: Active Filters & Clear Button (if any filter active) */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/60">
            <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              {hasCustomer && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-500/10 text-violet-500 border border-violet-500/20 shrink-0">
                  <User size={10} />
                  <span className="max-w-[110px] truncate">{customerFilter}</span>
                  {onCustomerChange && (
                    <button
                      type="button"
                      onClick={() => onCustomerChange('')}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              )}

              {hasMarking && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  <Tag size={10} />
                  <span className="max-w-[110px] truncate">{markingFilter}</span>
                  {onMarkingChange && (
                    <button
                      type="button"
                      onClick={() => onMarkingChange('')}
                      className="hover:opacity-70 ml-0.5 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-tertiary)] hover:underline shrink-0 cursor-pointer ml-auto"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* ── DESKTOP LAYOUT (>= sm) ───────────────────────────────── */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-2.5 px-5 py-2.5">
        {/* Left: Mode Segmented Buttons + Status Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
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
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
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
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {statusButtons.map(({ value, label, icon: Icon, color }) => {
              const isActive = statusFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusChange(value)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 whitespace-nowrap cursor-pointer border',
                    isActive
                      ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  )}
                >
                  {Icon && <Icon size={11} className={isActive ? 'text-[var(--color-tertiary)]' : color} />}
                  <span>{label}</span>
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
            <RotateCcw size={11} />
            <span>{t('common.clear') || 'Reset Filter'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
