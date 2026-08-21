import { useState } from 'react'
import { X, ChevronDown, ChevronUp, LayoutGrid, Plane, Ship, Loader2, SlidersHorizontal, MapPin, CheckCircle2, User, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_STYLES, STATUS_ORDER } from '../utils/status'
import { BranchPicker } from './BranchPicker'
import { Pill } from './Pill'

export type ListTypeFilter = 'ALL' | '1' | '2' | ('1' | '2')[]
export type StatusFilter = number | 'ALL' | number[]
export type BranchFilter = string | 'ALL' | string[]

interface ShipmentFilterBarProps {
  listTypeFilter: ListTypeFilter
  statusFilter: StatusFilter
  branchFilter: BranchFilter
  customerFilter?: string
  markingFilter?: string
  branches: string[]
  branchesLoading: boolean
  isFetching?: boolean
  onListTypeChange: (v: ListTypeFilter) => void
  onStatusChange: (v: StatusFilter) => void
  onBranchChange: (v: BranchFilter) => void
  onCustomerChange?: (v: string) => void
  onMarkingChange?: (v: string) => void
  onClearAll: () => void
}

export function ShipmentFilterBar({
  listTypeFilter,
  statusFilter,
  branchFilter,
  customerFilter = '',
  markingFilter = '',
  branches,
  branchesLoading,
  isFetching = false,
  onListTypeChange,
  onStatusChange,
  onBranchChange,
  onCustomerChange,
  onMarkingChange,
  onClearAll,
}: ShipmentFilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const activeStatusArray: number[] = Array.isArray(statusFilter)
    ? statusFilter
    : statusFilter !== 'ALL' && typeof statusFilter === 'number'
    ? [statusFilter]
    : []

  const activeBranchArray: string[] = Array.isArray(branchFilter)
    ? branchFilter
    : branchFilter !== 'ALL' && typeof branchFilter === 'string' && branchFilter.trim()
    ? [branchFilter]
    : []

  const hasCustomer = Boolean(customerFilter.trim())
  const hasMarking = Boolean(markingFilter.trim())

  const hasActiveFilters =
    (listTypeFilter !== 'ALL' && (Array.isArray(listTypeFilter) ? listTypeFilter.length > 0 : true)) ||
    activeStatusArray.length > 0 ||
    activeBranchArray.length > 0 ||
    hasCustomer ||
    hasMarking

  const activeCount =
    (listTypeFilter !== 'ALL' ? (Array.isArray(listTypeFilter) ? listTypeFilter.length : 1) : 0) +
    activeStatusArray.length +
    activeBranchArray.length +
    (hasCustomer ? 1 : 0) +
    (hasMarking ? 1 : 0)

  const typeButtons = [
    { value: 'ALL' as const, icon: LayoutGrid, label: 'Semua Moda' },
    { value: '1' as const, icon: Plane, label: 'Udara' },
    { value: '2' as const, icon: Ship, label: 'Laut' },
  ]

  const toggleStatus = (step: number) => {
    if (activeStatusArray.includes(step)) {
      const next = activeStatusArray.filter((s) => s !== step)
      onStatusChange(next.length === 0 ? 'ALL' : next)
    } else {
      onStatusChange([...activeStatusArray, step])
    }
  }

  const removeSingleStatus = (step: number) => {
    const next = activeStatusArray.filter((s) => s !== step)
    onStatusChange(next.length === 0 ? 'ALL' : next)
  }

  const removeSingleBranch = (b: string) => {
    const next = activeBranchArray.filter((x) => x !== b)
    onBranchChange(next.length === 0 ? 'ALL' : next)
  }

  return (
    <div className="shrink-0 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      {/* Primary filter row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5">
        {/* Left: Mode Segmented Buttons + Active Filter Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {typeButtons.map(({ value, icon: Icon, label }) => {
              const isActive = listTypeFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onListTypeChange(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 select-none',
                    isActive
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs'
                      : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
                  )}
                >
                  {isActive && isFetching ? <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" /> : <Icon size={13} className={isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-secondary)]'} />}
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Active Chips */}
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

              {activeStatusArray.map((step) => (
                <span
                  key={step}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                  {STATUS_STYLES[step]?.label}
                  <button
                    type="button"
                    onClick={() => removeSingleStatus(step)}
                    className="hover:opacity-70 ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}

              {activeBranchArray.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                >
                  <MapPin size={11} />
                  {b.replace('Cabang ', '')}
                  <button
                    type="button"
                    onClick={() => removeSingleBranch(b)}
                    className="hover:opacity-70 ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Toggle Advanced Filters + Reset */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
            >
              <X size={12} /> Reset Filter
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none',
              expanded
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-neutral)]'
            )}
          >
            <SlidersHorizontal size={13} className={expanded ? 'text-[var(--color-on-primary)]' : 'text-[var(--color-secondary)]'} />
            <span>Filter Detail</span>
            {activeCount > 0 && (
              <span className={cn(
                'w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold',
                expanded ? 'bg-[var(--color-on-primary)]/20 text-[var(--color-on-primary)]' : 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
              )}>
                {activeCount}
              </span>
            )}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable filter detail section */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out border-t border-[var(--color-border)] bg-[var(--color-neutral)]',
          expanded ? 'max-h-[440px] opacity-100 py-3 px-4 sm:px-5' : 'max-h-0 opacity-0 py-0 px-4 sm:px-5'
        )}
      >
        <div className="flex flex-col gap-3">
          {/* Customer & Marking Specific Inputs */}
          {(onCustomerChange || onMarkingChange) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2 border-b border-[var(--color-border)]">
              {onCustomerChange && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] w-16 shrink-0 flex items-center gap-1">
                    <User size={12} className="text-[var(--color-secondary)]" />
                    Customer
                  </span>
                  <div className="relative flex-1">
                    <input
                      value={customerFilter}
                      onChange={(e) => onCustomerChange(e.target.value)}
                      placeholder="Filter nama customer..."
                      className="w-full pl-3 pr-7 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] placeholder:text-[var(--color-secondary)] outline-none focus:border-[var(--color-primary)] font-medium"
                    />
                    {customerFilter && (
                      <button
                        type="button"
                        onClick={() => onCustomerChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-text)]"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {onMarkingChange && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] w-16 shrink-0 flex items-center gap-1">
                    <Tag size={12} className="text-[var(--color-secondary)]" />
                    Marking
                  </span>
                  <div className="relative flex-1">
                    <input
                      value={markingFilter}
                      onChange={(e) => onMarkingChange(e.target.value)}
                      placeholder="Filter kode/nomor marking..."
                      className="w-full pl-3 pr-7 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text)] placeholder:text-[var(--color-secondary)] outline-none focus:border-[var(--color-primary)] font-medium"
                    />
                    {markingFilter && (
                      <button
                        type="button"
                        onClick={() => onMarkingChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-text)]"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <div className="w-16 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[var(--color-secondary)]" />
                Status
              </span>
              <span className="text-[10px] text-[var(--color-secondary)] block sm:hidden">Pilih multi status</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill
                active={activeStatusArray.length === 0}
                onClick={() => onStatusChange('ALL')}
                isLoading={isFetching}
                className={cn(
                  'text-xs py-1 px-3',
                  activeStatusArray.length === 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)]' : ''
                )}
              >
                Semua Status
              </Pill>
              {STATUS_ORDER.map((step) => {
                const style = STATUS_STYLES[step]
                const isSelected = activeStatusArray.includes(step)
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => toggleStatus(step)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none',
                      isSelected
                        ? cn(style.bg, style.text, 'border-current shadow-xs ring-1 ring-current/20')
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neutral)]'
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
                    {style.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Branch row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 pt-2 border-t border-[var(--color-border)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] w-16 shrink-0 flex items-center gap-1">
              <MapPin size={12} className="text-[var(--color-secondary)]" />
              Cabang
            </span>
            <BranchPicker
              selected={branchFilter}
              onChange={onBranchChange}
              branches={branches}
              isLoading={branchesLoading}
              isFetching={isFetching}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
