import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, RotateCcw, Download, X, Loader2, ArrowDownUp, Box, Container } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { markingApi } from '../services/marking.service'
import { cn } from '@/lib/utils'

interface MarkingSizeToolbarProps {
  markingCode: string
  onMarkingCodeChange: (code: string) => void
  sortById: 1 | 2
  onSortChange: (sort: 1 | 2) => void
  tableSearch: string
  onTableSearchChange: (val: string) => void
  onRefresh: () => void
  onExportExcel: () => void
  isExporting?: boolean
  isFetching?: boolean
}

export function MarkingSizeToolbar({
  markingCode,
  onMarkingCodeChange,
  sortById,
  onSortChange,
  tableSearch,
  onTableSearchChange,
  onRefresh,
  onExportExcel,
  isExporting = false,
  isFetching = false,
}: MarkingSizeToolbarProps) {
  const { t } = useTranslation()

  // State untuk input autocomplete marking code
  const [codeInput, setCodeInput] = useState(markingCode)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debouncedQuery = useDebounce(codeInput, 250)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sinkronkan codeInput saat prop markingCode berubah dari luar
  useEffect(() => {
    setCodeInput(markingCode)
  }, [markingCode])

  // Fetch suggestions
  const { data: suggestionsData, isFetching: isLoadingSuggestions } = useQuery({
    queryKey: ['markingSuggestions', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) return []
      const res = await markingApi.searchSuggestions(debouncedQuery.trim())
      return res.data?.data || []
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  })

  const suggestions: Array<{ type: string; title: string; subtitle: string; value: string }> =
    suggestionsData || []

  // Buka dropdown jika ada suggestion
  useEffect(() => {
    if (suggestions.length > 0 && codeInput.trim().length >= 2) {
      setDropdownOpen(true)
    }
  }, [suggestions, codeInput])

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && suggestions[activeIdx]) {
        selectSuggestion(suggestions[activeIdx].value)
      } else if (codeInput.trim()) {
        onMarkingCodeChange(codeInput.trim())
        setDropdownOpen(false)
      }
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
    }
  }

  const selectSuggestion = (val: string) => {
    setCodeInput(val)
    onMarkingCodeChange(val)
    setDropdownOpen(false)
  }

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (codeInput.trim()) {
      onMarkingCodeChange(codeInput.trim())
      setDropdownOpen(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xs">
      {/* Kolom Kiri: Input Autocomplete Marking Code + Tombol Go */}
      <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-lg" ref={containerRef}>
        <form onSubmit={handleSubmitCode} className="relative flex-1">
          <div className="relative">
            <Container className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-secondary)] pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t('marking.sizeAudit.inputMarkingPlaceholder')}
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.toUpperCase())
                setDropdownOpen(true)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setDropdownOpen(true)
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl text-[12px] font-mono font-semibold text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] placeholder:font-normal focus:outline-none focus:border-[var(--color-tertiary)] transition-colors"
              autoComplete="off"
            />

            {codeInput && (
              <button
                type="button"
                onClick={() => {
                  setCodeInput('')
                  inputRef.current?.focus()
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {isLoadingSuggestions && (
              <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-secondary)]" />
              </div>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {dropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-[var(--color-border)]">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 flex items-center justify-between text-[12px] transition-colors cursor-pointer',
                    idx === activeIdx
                      ? 'bg-[var(--color-neutral)] font-semibold text-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-neutral)]/60 text-[var(--color-primary)]'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] shrink-0">
                      {item.type === 'container' ? <Container size={12} /> : <Box size={12} />}
                    </span>
                    <div>
                      <div className="font-mono font-bold leading-tight">{item.title}</div>
                      <div className="text-[11px] text-[var(--color-secondary)]">{item.subtitle}</div>
                    </div>
                  </div>
                  <span className="text-[10.5px] uppercase font-semibold text-[var(--color-secondary)] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={() => {
            if (codeInput.trim()) onMarkingCodeChange(codeInput.trim())
          }}
          className="px-3.5 py-1.5 rounded-xl border border-[var(--color-tertiary)] bg-[var(--color-tertiary)] text-white hover:opacity-90 transition-opacity text-[12px] font-semibold cursor-pointer shrink-0 shadow-xs"
        >
          {t('marking.sizeAudit.go')}
        </button>
      </div>

      {/* Kolom Tengah: Sort by (ListCode vs Cust Name) */}
      <div className="flex items-center gap-1.5 bg-[var(--color-neutral)] p-1 rounded-xl border border-[var(--color-border)]">
        <span className="text-[11px] font-semibold text-[var(--color-secondary)] px-2 uppercase tracking-wider flex items-center gap-1">
          <ArrowDownUp size={12} />
          {t('marking.sizeAudit.sortBy')}
        </span>
        <button
          type="button"
          onClick={() => onSortChange(1)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all cursor-pointer',
            sortById === 1
              ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-xs font-semibold'
              : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          )}
        >
          {t('marking.sizeAudit.sortListCode')}
        </button>
        <button
          type="button"
          onClick={() => onSortChange(2)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all cursor-pointer',
            sortById === 2
              ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-xs font-semibold'
              : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          )}
        >
          {t('marking.sizeAudit.sortCustName')}
        </button>
      </div>

      {/* Kolom Kanan: Filter Teks Instan Tabel + Aksi (Excel & Refresh) */}
      <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
        {/* Instant Table Filter */}
        <div className="relative min-w-[160px] sm:min-w-[190px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder={t('marking.sizeAudit.searchInTable')}
            value={tableSearch}
            onChange={(e) => onTableSearchChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl text-[12px] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-tertiary)] transition-colors"
          />
          {tableSearch && (
            <button
              type="button"
              onClick={() => onTableSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Tombol Ekspor Excel */}
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-[12px] font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title={t('marking.sizeAudit.exportExcelTooltip')}
        >
          {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          <span className="hidden sm:inline">{t('marking.sizeAudit.btnExportExcel')}</span>
        </button>

        {/* Tombol Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isFetching}
          className="p-1.5 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          title={t('marking.sizeAudit.btnRefresh')}
        >
          <RotateCcw size={15} className={cn(isFetching && 'animate-spin')} />
        </button>
      </div>
    </div>
  )
}
