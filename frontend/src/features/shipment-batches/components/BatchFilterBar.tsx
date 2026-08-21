import { useState } from 'react'
import {
  X,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Plane,
  Ship,
  SlidersHorizontal,
  ListFilter,
  Calendar,
  MapPin,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { MarkingGroupMode } from '../types/marking.types'

export type BatchListTypeFilter = 'ALL' | '1' | '2'

interface BatchFilterBarProps {
  listTypeFilter: BatchListTypeFilter
  onListTypeChange: (type: BatchListTypeFilter) => void
  groupMode: MarkingGroupMode
  onGroupModeChange: (mode: MarkingGroupMode) => void
  onOpenManifestSearch: () => void
  isFetching?: boolean
  totalBatches?: number
  activeBatches?: number
  onClearAll: () => void
}

const GROUP_OPTIONS: { key: MarkingGroupMode; labelKey: string; defaultLabel: string; icon: typeof Calendar }[] = [
  { key: 'none', labelKey: 'marking.list.noGroup', defaultLabel: 'Tanpa Group', icon: LayoutGrid },
  { key: 'year', labelKey: 'marking.list.yearGroup', defaultLabel: 'Tahun', icon: Calendar },
  { key: 'branch', labelKey: 'marking.list.branchGroup', defaultLabel: 'Cabang', icon: MapPin },
  { key: 'load', labelKey: 'marking.list.loadGroup', defaultLabel: 'Loading', icon: Clock },
  { key: 'etd', labelKey: 'marking.list.etdGroup', defaultLabel: 'ETD', icon: Calendar },
  { key: 'eta', labelKey: 'marking.list.etaGroup', defaultLabel: 'ETA', icon: Calendar },
]

export function BatchFilterBar({
  listTypeFilter,
  onListTypeChange,
  groupMode,
  onGroupModeChange,
  onOpenManifestSearch,
  isFetching = false,
  onClearAll,
}: BatchFilterBarProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const hasActiveFilters = listTypeFilter !== 'ALL' || groupMode !== 'year'
  const activeCount = (listTypeFilter !== 'ALL' ? 1 : 0) + (groupMode !== 'year' ? 1 : 0)

  const typeButtons = [
    { value: 'ALL' as const, icon: LayoutGrid, label: t('marking.list.allType') || 'Semua Moda' },
    { value: '1' as const, icon: Plane, label: t('marking.list.airType') || 'Udara' },
    { value: '2' as const, icon: Ship, label: t('marking.list.seaType') || 'Laut' },
  ]

  return (
    <div className="bg-[var(--color-surface)] px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--color-border)]">
      {/* ── Top Row: Transport Modes, Quick Action Chips & Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Mode Segmented Switch + Group Quick Chips */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented Mode buttons */}
          <div className="inline-flex items-center bg-[var(--color-neutral)] p-1 rounded-xl border border-[var(--color-border)] gap-1 shrink-0">
            {typeButtons.map(({ value, icon: Icon, label }) => {
              const isActive = listTypeFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onListTypeChange(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none',
                    isActive
                      ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                      : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]'
                  )}
                >
                  {isActive && isFetching ? (
                    <Loader2 size={12} className="animate-spin text-current" />
                  ) : (
                    <Icon
                      size={13}
                      className={
                        isActive
                          ? 'text-current'
                          : 'text-[var(--color-secondary)]'
                      }
                    />
                  )}
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Quick Active Chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {listTypeFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {listTypeFilter === '1' ? <Plane size={11} /> : <Ship size={11} />}
                  Moda: {listTypeFilter === '1' ? 'Udara' : 'Laut'}
                  <button
                    type="button"
                    onClick={() => onListTypeChange('ALL')}
                    className="hover:opacity-75 ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {groupMode !== 'year' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <ListFilter size={11} />
                  Group: {GROUP_OPTIONS.find((g) => g.key === groupMode)?.defaultLabel || groupMode}
                  <button
                    type="button"
                    onClick={() => onGroupModeChange('year')}
                    className="hover:opacity-75 ml-0.5 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Search Manifest Button + Toggle Filter Detail + Reset */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Search Manifest Button */}
          <button
            type="button"
            onClick={onOpenManifestSearch}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-neutral)] hover:bg-[var(--color-border)]/50 border border-[var(--color-border)] text-[var(--color-primary)] text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>{t('marking.list.searchManifest') || 'Cari Manifest'}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
            >
              <X size={12} /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all select-none',
              expanded
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
            )}
          >
            <SlidersHorizontal size={13} className={expanded ? 'text-current' : 'text-[var(--color-secondary)]'} />
            <span>Opsi Grouping</span>
            {activeCount > 0 && (
              <span
                className={cn(
                  'w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold',
                  expanded ? 'bg-[var(--color-on-primary)] text-[var(--color-primary)]' : 'bg-[var(--color-primary)] text-[var(--color-on-primary)]'
                )}
              >
                {activeCount}
              </span>
            )}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* ── Expandable Grouping Options Panel ── */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out border-t border-[var(--color-border)] bg-[var(--color-neutral)]/60 -mx-4 sm:-mx-5 mt-3',
          expanded ? 'max-h-[300px] opacity-100 py-3 px-4 sm:px-5' : 'max-h-0 opacity-0 py-0 px-4 sm:px-5'
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] w-24 shrink-0">
            <ListFilter size={12} className="text-[var(--color-secondary)]" />
            <span>Grouping:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {GROUP_OPTIONS.map((opt) => {
              const isSelected = groupMode === opt.key
              const Icon = opt.icon
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onGroupModeChange(opt.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none',
                    isSelected
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neutral)]'
                  )}
                >
                  <Icon size={12} className={isSelected ? 'text-current' : 'text-[var(--color-secondary)]'} />
                  <span>{opt.defaultLabel}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
