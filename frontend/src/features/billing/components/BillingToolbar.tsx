import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import apiClient from '@/api/client'
import { useDebounce } from '@/hooks/useDebounce'
import { SearchSuggestionsDropdown } from '@/components/ui/SearchSuggestionsDropdown'
import { useTranslation } from '@/hooks/useTranslation'

interface BillingToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  onSelectSuggestion?: (item: any) => void
  limit: number
  onLimitChange: (v: number) => void
  onPageReset: () => void
  displayCount: number
  total: number
  isFetching?: boolean
  isLoading?: boolean
}

export function BillingToolbar({
  search,
  onSearchChange,
  onSelectSuggestion,
  limit,
  onLimitChange,
  onPageReset,
  displayCount,
  total,
  isFetching = false,
  isLoading = false,
}: BillingToolbarProps) {
  const { t } = useTranslation()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, 300)

  const { data: suggestions = [], isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['billing-toolbar-suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.trim().length < 2) return []
      const res = await apiClient.get('/billing/suggestions', { params: { q: debouncedSearch.trim() } })
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

  return (
    <div className="bg-[var(--color-surface)] px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-[var(--color-border)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
        {/* Left: Search Bar with Autocomplete Suggestions */}
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
                placeholder={t('billing.searchPlaceholder') || 'Cari no invoice, customer, marking, kode...'}
                className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm text-[var(--color-primary)] outline-none bg-transparent placeholder:text-[var(--color-secondary)] font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('')
                    onSelectSuggestion?.(null)
                    setShowSuggestions(false)
                    onPageReset()
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] p-0.5 rounded-md hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
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
              title="Saran Faktur (No. Invoice / Customer / Marking)"
              onSelect={(item) => {
                onSearchChange(item.value)
                onSelectSuggestion?.(item)
                setShowSuggestions(false)
                onPageReset()
              }}
              onClose={() => setShowSuggestions(false)}
            />
          </div>
        </div>

        {/* Right: Counter + Rows-per-page */}
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0 text-[11px] sm:text-xs text-[var(--color-secondary)] font-medium">
          <div className="flex items-center gap-1.5">
            {isFetching && !isLoading && <Loader2 size={13} className="animate-spin text-[var(--color-tertiary)]" />}
            <span className="tabular-nums text-[var(--color-secondary)]">
              Menampilkan <strong className="text-[var(--color-primary)] font-semibold">{displayCount.toLocaleString('en-US')}</strong> dari <strong className="text-[var(--color-primary)] font-semibold">{total.toLocaleString('en-US')}</strong> faktur
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-3.5 w-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
              <span className="hidden xs:inline text-[var(--color-secondary)]">Baris:</span>
              <select
                value={limit}
                onChange={(e) => {
                  onLimitChange(Number(e.target.value))
                  onPageReset()
                }}
                className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-[11px] sm:text-xs text-[var(--color-primary)] font-semibold cursor-pointer outline-none"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-[var(--color-surface)] text-[var(--color-primary)]">
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
