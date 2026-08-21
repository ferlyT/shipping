import { useState, useRef, useEffect } from 'react'
import {
  X, Search, Rows3, LayoutGrid, List, Loader2, ChevronDown,
  Layers, HelpCircle, Sparkles, Tag, User, Receipt, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchFieldType } from '../services/shipments.service'

type ViewMode = 'table' | 'grid' | 'compact'

export const SEARCH_SCOPES: { value: SearchFieldType; label: string; placeholder: string }[] = [
  { value: 'ALL', label: 'Semua Field', placeholder: 'Cari customer, marking, resi, tracking, list code...' },
  { value: 'customer_marking', label: 'Customer & Marking', placeholder: 'Cari kombinasi customer & marking (contoh: PT Maju MRK-01)...' },
  { value: 'customer', label: 'Customer', placeholder: 'Cari customer (contoh: PT Maju, CV Sinar)...' },
  { value: 'marking', label: 'Marking', placeholder: 'Cari marking (contoh: MRK-1, MRK-2)...' },
  { value: 'resi', label: 'No. Resi', placeholder: 'Cari resi (contoh: TR-001, TR-002)...' },
  { value: 'tracking', label: 'Tracking', placeholder: 'Cari tracking lokal (contoh: TK01, TK02)...' },
  { value: 'listCode', label: 'No. List', placeholder: 'Cari no. list (contoh: L01, L02, L03)...' },
]

interface ShipmentToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchField: SearchFieldType
  onSearchFieldChange: (field: SearchFieldType) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  limit: number
  onLimitChange: (v: number) => void
  onPageReset: () => void
  displayCount: number
  total: number
  isFetching: boolean
  isLoading: boolean
}

export function ShipmentToolbar({
  search,
  onSearchChange,
  searchField,
  onSearchFieldChange,
  viewMode,
  onViewModeChange,
  limit,
  onLimitChange,
  onPageReset,
  displayCount,
  total,
  isFetching,
  isLoading,
}: ShipmentToolbarProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const currentScope = SEARCH_SCOPES.find((s) => s.value === searchField) || SEARCH_SCOPES[0]

  // Close tooltip on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showTooltip])

  // Detect multi-tokens in search input
  const tokens = search
    .split(/[,\n;\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const isMultiSearch = tokens.length > 1

  const applyExample = (text: string, scope?: SearchFieldType) => {
    onSearchChange(text)
    if (scope) onSearchFieldChange(scope)
    setShowTooltip(false)
  }

  return (
    <div className="bg-[var(--color-surface)] px-4 sm:px-5 py-2.5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Scoped multi-value search bar + Info Tooltip */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[560px]">
          <div className="relative flex-1 flex items-center rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-surface)] shadow-2xs overflow-hidden">
            {/* Scope selector */}
            <div className="relative shrink-0 border-r border-[var(--color-border)] bg-[var(--color-neutral)] hover:opacity-90 transition-colors">
              <select
                value={searchField}
                onChange={(e) => onSearchFieldChange(e.target.value as SearchFieldType)}
                className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-semibold text-[var(--color-text)] cursor-pointer outline-none"
              >
                {SEARCH_SCOPES.map((sc) => (
                  <option key={sc.value} value={sc.value}>{sc.label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
            </div>

            {/* Search Input */}
            <div className="relative flex-1 flex items-center min-w-0">
              <Search size={14} className="absolute left-3 text-[var(--color-secondary)] pointer-events-none" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={currentScope.placeholder}
                className="w-full pl-9 pr-14 py-2 text-sm text-[var(--color-text)] outline-none bg-transparent placeholder:text-[var(--color-secondary)]"
              />

              {/* Multi-item badge count */}
              {isMultiSearch && (
                <span
                  className="absolute right-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 text-[10px] font-bold"
                  title={`${tokens.length} keyword pencarian terdeteksi`}
                >
                  <Layers size={10} />
                  {tokens.length}
                </span>
              )}

              {search && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-text)] p-0.5 rounded-md hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
                  title="Hapus pencarian"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Interactive Search Guide Tooltip Trigger */}
          <div className="relative shrink-0" ref={tooltipRef}>
            <button
              type="button"
              onClick={() => setShowTooltip((prev) => !prev)}
              className={cn(
                'inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-all cursor-pointer select-none',
                showTooltip
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 border-[var(--color-border)]'
              )}
              title="Petunjuk & Contoh Pencarian"
              aria-label="Petunjuk pencarian"
            >
              <HelpCircle size={15} />
            </button>

            {/* Tooltip / Popover Panel */}
            {showTooltip && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(380px,calc(100vw-2rem))] z-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl shadow-black/10 p-4 text-xs animate-in fade-in-50 zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)] text-sm">
                    <Sparkles size={14} className="text-[var(--color-primary)]" />
                    <span>Panduan Pencarian Cerdas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTooltip(false)}
                    className="text-[var(--color-secondary)] hover:text-[var(--color-text)] p-1 rounded-md hover:bg-[var(--color-neutral)]"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Guide Items */}
                <div className="space-y-3 text-[var(--color-secondary)]">
                  {/* 1. Customer + Marking */}
                  <div className="p-2.5 bg-[var(--color-primary)]/5 rounded-xl border border-[var(--color-primary)]/15">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)] mb-1">
                      <User size={12} className="text-[var(--color-primary)]" />
                      <span>Kombinasi Customer & Marking</span>
                    </div>
                    <p className="text-xs text-[var(--color-secondary)] leading-snug mb-1.5">
                      Ketik nama customer dan marking dipisahkan spasi untuk mencari data yang cocok pada keduanya.
                    </p>
                    <button
                      type="button"
                      onClick={() => applyExample('PT Maju MRK-01', 'customer_marking')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-md font-mono text-[11px] font-semibold text-[var(--color-primary)] transition-colors cursor-pointer"
                    >
                      <span>Contoh:</span> <span className="underline">PT Maju MRK-01</span>
                    </button>
                  </div>

                  {/* 2. Multi-Item / Bulk Search */}
                  <div className="p-2.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)] mb-1">
                      <Receipt size={12} className="text-[var(--color-secondary)]" />
                      <span>Multi Nomor Resi / No. List</span>
                    </div>
                    <p className="text-xs text-[var(--color-secondary)] leading-snug mb-1.5">
                      Cari banyak nomor sekaligus dengan pemisah koma (<code className="bg-[var(--color-border)]/40 px-1 rounded">,</code>) atau baris baru (*paste multi-line*).
                    </p>
                    <button
                      type="button"
                      onClick={() => applyExample('TR-2026-001, TR-2026-002, TR-2026-003', 'resi')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md font-mono text-[11px] font-semibold text-[var(--color-text)] transition-colors cursor-pointer truncate max-w-full"
                    >
                      <span>Contoh:</span> <span className="underline truncate">TR-2026-001, TR-2026-002</span>
                    </button>
                  </div>

                  {/* 3. Multi Marking */}
                  <div className="p-2.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-text)] mb-1">
                      <Tag size={12} className="text-amber-500" />
                      <span>Multi Marking Code</span>
                    </div>
                    <p className="text-xs text-[var(--color-secondary)] leading-snug mb-1.5">
                      Ketik beberapa kode marking sekaligus untuk menampilkan seluruh resi terkait.
                    </p>
                    <button
                      type="button"
                      onClick={() => applyExample('MRK-A, MRK-B', 'marking')}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md font-mono text-[11px] font-semibold text-[var(--color-text)] transition-colors cursor-pointer"
                    >
                      <span>Contoh:</span> <span className="underline">MRK-A, MRK-B</span>
                    </button>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex items-center gap-1.5 text-[10px] text-[var(--color-secondary)]">
                  <Info size={11} className="shrink-0" />
                  <span>Gunakan dropdown di kiri untuk mengunci lingkup pencarian tertentu.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: data count info + view toggle + page size */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-[var(--color-secondary)] shrink-0">
          {/* Counter info */}
          <div className="flex items-center gap-1.5 font-medium">
            {isFetching && !isLoading && <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />}
            <span className="tabular-nums text-[var(--color-secondary)]">
              Menampilkan <strong className="text-[var(--color-text)] font-semibold">{displayCount.toLocaleString('id-ID')}</strong> dari <strong className="text-[var(--color-text)] font-semibold">{total.toLocaleString('id-ID')}</strong> resi
            </span>
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
            className="text-xs font-semibold text-[var(--color-text)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 outline-none bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] cursor-pointer shadow-2xs transition-colors"
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
