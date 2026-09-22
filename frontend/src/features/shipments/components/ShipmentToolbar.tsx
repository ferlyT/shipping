import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Search, Rows3, LayoutGrid, List, Layers } from 'lucide-react'
import apiClient from '@/api/client'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { SearchSuggestionsDropdown } from '@/components/ui/SearchSuggestionsDropdown'
import { cn } from '@/lib/utils'
import type { SearchFieldType } from '../services/shipments.service'

type ViewMode = 'table' | 'grid' | 'compact'

interface ShipmentToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchField?: SearchFieldType
  onSearchFieldChange?: (field: SearchFieldType) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  limit: number
  onLimitChange: (v: number) => void
  onPageReset: () => void
  displayCount: number
  total: number
  isFetching?: boolean
  isLoading: boolean
}

export function ShipmentToolbar({
  search,
  onSearchChange,
  onSearchFieldChange,
  viewMode,
  onViewModeChange,
  limit,
  onLimitChange,
  onPageReset,
  displayCount,
  total,
  isLoading,
}: ShipmentToolbarProps) {
  const { t } = useTranslation()

  // Suggestion State & Query
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['shipment-toolbar-suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return []
      const res = await apiClient.get('/shipments/suggestions', { params: { q: debouncedSearch.trim() } })
      return res.data?.data || []
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30000,
  })

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Detect multi-tokens in search input
  const tokens = search
    .split(/[,\n;\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const isMultiSearch = tokens.length > 1

  return (
    <div className="bg-[var(--color-surface)] px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--color-border)] rounded-t-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* Left: Universal Search bar with autocomplete */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[480px]">
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="relative flex items-center rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-surface)] shadow-2xs overflow-hidden">
              <Search size={14} className="absolute left-3 text-[var(--color-secondary)] pointer-events-none shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  onSearchChange(e.target.value)
                  if (e.target.value.trim().length >= 2) setShowSuggestions(true)
                  else setShowSuggestions(false)
                }}
                onFocus={() => {
                  if (search.trim().length >= 2) setShowSuggestions(true)
                }}
                placeholder={t('shipments.searchPlaceholder')}
                className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm text-[var(--color-text)] outline-none bg-transparent placeholder:text-[var(--color-secondary)] font-medium"
              />

              {/* Multi-item badge count */}
              {isMultiSearch && (
                <span
                  className="absolute right-7 sm:right-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold"
                  title={`${tokens.length} keyword pencarian terdeteksi`}
                >
                  <Layers size={10} />
                  {tokens.length}
                </span>
              )}

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('')
                    if (onSearchFieldChange) onSearchFieldChange('ALL')
                    setShowSuggestions(false)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-text)] p-0.5 rounded-md hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
                  title="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            <SearchSuggestionsDropdown
              visible={showSuggestions && search.trim().length >= 2}
              suggestions={suggestions}
              isLoading={isFetchingSuggestions}
              title="Saran Pencarian (Resi / Customer / Marking)"
              onSelect={(item) => {
                if (onSearchFieldChange) {
                  if (item.type === 'customer') {
                    onSearchFieldChange('customer')
                  } else if (item.type === 'marking') {
                    onSearchFieldChange('marking')
                  } else if (item.type === 'resi') {
                    onSearchFieldChange('resi')
                  } else {
                    onSearchFieldChange('ALL')
                  }
                }
                onSearchChange(item.value)
                setShowSuggestions(false)
              }}
              onClose={() => setShowSuggestions(false)}
            />
          </div>
        </div>

        {/* Right side: data count info + view toggle + page size */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 text-xs text-[var(--color-secondary)] shrink-0">
          {/* Counter info */}
          <div className="flex items-center gap-1.5 font-medium">
            {isLoading ? (
              <div className="h-4 w-24 rounded skeleton-shimmer" />
            ) : (
              <span className="tabular-nums text-[var(--color-secondary)] text-[11px] sm:text-xs">
                <strong className="text-[var(--color-text)] font-semibold">{displayCount.toLocaleString('en-US')}</strong> / <strong className="text-[var(--color-text)] font-semibold">{total.toLocaleString('en-US')}</strong> resi
              </span>
            )}
          </div>

          <div className="w-px h-4 bg-[var(--color-border)] hidden sm:block" />

          {/* View toggle (Compact, Table, Grid) */}
          <div className="flex items-center gap-0.5 bg-[var(--color-neutral)] rounded-lg p-0.5 border border-[var(--color-border)]">
            {([
              { mode: 'compact' as ViewMode, Icon: List, title: 'Tampilan Ringkas' },
              { mode: 'table' as ViewMode, Icon: Rows3, title: 'Tampilan Tabel' },
              { mode: 'grid' as ViewMode, Icon: LayoutGrid, title: 'Tampilan Kartu/Grid' },
            ]).map(({ mode, Icon, title }) => (
              <button
                key={mode}
                type="button"
                title={title}
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'p-1.5 rounded-md transition-all cursor-pointer',
                  viewMode === mode
                    ? 'bg-[var(--color-surface)] shadow-xs text-[var(--color-text)] font-semibold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-text)]'
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          {/* Rows limit */}
          <select
            value={limit}
            onChange={(e) => { onLimitChange(Number(e.target.value)); onPageReset() }}
            className="text-xs font-semibold text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2 sm:px-2.5 py-1.5 outline-none bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] cursor-pointer shadow-2xs transition-colors"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} baris</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
