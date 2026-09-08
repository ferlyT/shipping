import { Search, X, Rows3, LayoutGrid, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DeliveryViewMode = 'table' | 'cards'

interface DeliveryOrderToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  viewMode: DeliveryViewMode
  onViewModeChange: (m: DeliveryViewMode) => void
  displayCount: number
  total: number
  limit: number
  onLimitChange: (limit: number) => void
  onPageReset: () => void
  isFetching?: boolean
  isLoading?: boolean
}

export function DeliveryOrderToolbar({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  displayCount,
  total,
  limit,
  onLimitChange,
  onPageReset,
  isFetching,
  isLoading,
}: DeliveryOrderToolbarProps) {
  return (
    <div className="bg-[var(--color-surface)] px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--color-border)] rounded-t-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* Left: Search Bar */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[480px]">
          <div className="relative flex-1 flex items-center rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-surface)] shadow-2xs overflow-hidden">
            <Search size={14} className="absolute left-3 text-[var(--color-secondary)] pointer-events-none shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nomor SJ, customer, deskripsi, supir, plat nomor..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm text-[var(--color-text)] outline-none bg-transparent placeholder:text-[var(--color-secondary)] font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 text-[var(--color-secondary)] hover:text-[var(--color-text)] p-0.5 rounded-md hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Right side: data count info + view toggle + page size */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs text-[var(--color-secondary)] shrink-0">
          {/* Counter info */}
          <div className="flex items-center gap-1.5 font-medium">
            {isFetching && !isLoading && <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />}
            <span className="tabular-nums text-[var(--color-secondary)] text-[11px] sm:text-xs">
              <strong className="text-[var(--color-text)] font-semibold">{displayCount.toLocaleString('en-US')}</strong> / <strong className="text-[var(--color-text)] font-semibold">{total.toLocaleString('en-US')}</strong> SJ
            </span>
          </div>

          <div className="w-px h-4 bg-[var(--color-border)] hidden sm:block" />

          {/* View toggle (Table vs Cards) */}
          <div className="flex items-center gap-0.5 bg-[var(--color-neutral)] rounded-lg p-0.5 border border-[var(--color-border)]">
            <button
              type="button"
              title="Tampilan Tabel"
              onClick={() => onViewModeChange('table')}
              className={cn(
                'p-1.5 rounded-md transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-[var(--color-surface)] shadow-2xs text-[var(--color-text)] font-semibold'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              <Rows3 size={14} />
            </button>
            <button
              type="button"
              title="Tampilan Kartu"
              onClick={() => onViewModeChange('cards')}
              className={cn(
                'p-1.5 rounded-md transition-all cursor-pointer',
                viewMode === 'cards'
                  ? 'bg-[var(--color-surface)] shadow-2xs text-[var(--color-text)] font-semibold'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* Rows limit */}
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value))
              onPageReset()
            }}
            className="text-xs font-semibold text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2 sm:px-2.5 py-1.5 outline-none bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] cursor-pointer shadow-2xs transition-colors"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} baris
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
