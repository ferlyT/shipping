import {
  X,
  Search,
  Rows3,
  List,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type BatchSearchScope = 'ALL' | 'code' | 'region' | 'desc'

export const BATCH_SEARCH_SCOPES: { value: BatchSearchScope; label: string; placeholder: string }[] = [
  { value: 'ALL', label: 'Semua Field', placeholder: 'Cari kode marking, nomor batch, wilayah, keterangan...' },
  { value: 'code', label: 'Kode Marking', placeholder: 'Cari berdasarkan kode marking (misal: MRK, JKT-01)...' },
  { value: 'region', label: 'Wilayah', placeholder: 'Cari berdasarkan wilayah/tujuan (misal: Jakarta, Surabaya)...' },
  { value: 'desc', label: 'Keterangan', placeholder: 'Cari berdasarkan keterangan...' },
]

interface BatchToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchScope: BatchSearchScope
  onSearchScopeChange: (scope: BatchSearchScope) => void
  viewMode: 'table' | 'shortlist'
  onViewModeChange: (v: 'table' | 'shortlist') => void
  totalBatches?: number
  activeBatches?: number
  isFetching?: boolean
}

export function BatchToolbar({
  search,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  viewMode,
  onViewModeChange,
  totalBatches = 0,
  activeBatches = 0,
}: BatchToolbarProps) {
  const currentScope = BATCH_SEARCH_SCOPES.find((s) => s.value === searchScope) || BATCH_SEARCH_SCOPES[0]

  return (
    <div className="bg-[var(--color-surface)] px-4 sm:px-5 py-2.5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Scoped Search Bar */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[560px]">
          <div className="relative flex-1 flex items-center rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-surface)] shadow-2xs overflow-hidden">
            {/* Scope selector */}
            <div className="relative shrink-0 border-r border-[var(--color-border)] bg-[var(--color-neutral)] hover:bg-[var(--color-border)]/50 transition-colors">
              <select
                value={searchScope}
                onChange={(e) => onSearchScopeChange(e.target.value as BatchSearchScope)}
                className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-semibold text-[var(--color-secondary)] cursor-pointer outline-none"
              >
                {BATCH_SEARCH_SCOPES.map((sc) => (
                  <option key={sc.value} value={sc.value} className="bg-[var(--color-surface)] text-[var(--color-primary)]">
                    {sc.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none"
              />
            </div>

            {/* Input search */}
            <div className="relative flex-1 flex items-center">
              <Search size={14} className="absolute left-3 text-[var(--color-secondary)] pointer-events-none shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={currentScope.placeholder}
                className="w-full pl-8 pr-8 py-2 text-xs text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] outline-none bg-transparent font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer p-0.5 rounded-full hover:bg-[var(--color-neutral)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Batch Counts & View Mode Switch */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {/* Summary KPI Badges */}
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-secondary)]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeBatches} Aktif
            </span>
            <span className="text-[var(--color-secondary)] opacity-50">/</span>
            <span className="text-[11px] text-[var(--color-secondary)] font-semibold">
              {totalBatches} Total Batch
            </span>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center bg-[var(--color-neutral)] p-1 rounded-xl border border-[var(--color-border)] gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              title="Tampilan Tabel"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                viewMode === 'table'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]'
              )}
            >
              <Rows3 size={15} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('shortlist')}
              title="Tampilan Ringkas"
              className={cn(
                'p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
                viewMode === 'shortlist'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)]'
              )}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
