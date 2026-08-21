import { useState, useRef, useEffect } from 'react'
import {
  X, Search, ChevronDown, Layers, HelpCircle, Sparkles, FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type BillingSearchScope = 'ALL' | 'invNo' | 'customer' | 'marking' | 'author'

export const BILLING_SEARCH_SCOPES: { value: BillingSearchScope; label: string; placeholder: string }[] = [
  { value: 'ALL', label: 'Semua Field', placeholder: 'Cari no invoice, customer, marking, dibuat oleh...' },
  { value: 'invNo', label: 'No. Invoice', placeholder: 'Cari no. invoice (contoh: 2401-0001)...' },
  { value: 'customer', label: 'Customer', placeholder: 'Cari customer (contoh: PT Maju, CV Sinar)...' },
  { value: 'marking', label: 'Marking', placeholder: 'Cari marking (contoh: MRK-1, MRK-2)...' },
  { value: 'author', label: 'Dibuat Oleh', placeholder: 'Cari nama staf pembuat invoice...' },
]

interface BillingToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchField: BillingSearchScope
  onSearchFieldChange: (field: BillingSearchScope) => void
  limit: number
  onLimitChange: (v: number) => void
  onPageReset: () => void
  displayCount: number
  total: number
}

export function BillingToolbar({
  search,
  onSearchChange,
  searchField,
  onSearchFieldChange,
  limit,
  onLimitChange,
  onPageReset,
  displayCount,
  total,
}: BillingToolbarProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const currentScope = BILLING_SEARCH_SCOPES.find((s) => s.value === searchField) || BILLING_SEARCH_SCOPES[0]

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

  const tokens = search
    .split(/[,\n;\r\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const isMultiSearch = tokens.length > 1

  const applyExample = (text: string, scope?: BillingSearchScope) => {
    onSearchChange(text)
    if (scope) onSearchFieldChange(scope)
    setShowTooltip(false)
  }

  return (
    <div className="bg-[var(--color-surface)] px-4 sm:px-5 py-2.5 sm:py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Scoped search bar + Guide button */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-[560px]">
          <div className="relative flex-1 flex items-center rounded-xl border border-[var(--color-border)] focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 transition-all bg-[var(--color-surface)] shadow-2xs overflow-hidden">
            {/* Scope selector */}
            <div className="relative shrink-0 border-r border-[var(--color-border)] bg-[var(--color-neutral)] hover:opacity-90 transition-colors">
              <select
                value={searchField}
                onChange={(e) => onSearchFieldChange(e.target.value as BillingSearchScope)}
                className="appearance-none bg-transparent pl-3 pr-7 py-2 text-xs font-semibold text-[var(--color-primary)] cursor-pointer outline-none"
              >
                {BILLING_SEARCH_SCOPES.map((sc) => (
                  <option key={sc.value} value={sc.value} className="bg-[var(--color-surface)] text-[var(--color-primary)]">
                    {sc.label}
                  </option>
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
                className="w-full pl-9 pr-14 py-2 text-sm text-[var(--color-primary)] outline-none bg-transparent placeholder:text-[var(--color-secondary)]"
              />

              {/* Multi-item badge count */}
              {isMultiSearch && (
                <span
                  className="absolute right-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-transparent text-[var(--color-tertiary)] border border-[var(--color-tertiary)]/30 text-[10px] font-bold"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] p-0.5 rounded-md hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
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
                  ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
                  : 'bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] border-[var(--color-border)]'
              )}
              title="Petunjuk & Contoh Pencarian"
              aria-label="Petunjuk pencarian"
            >
              <HelpCircle size={15} />
            </button>

            {/* Tooltip / Popover Panel */}
            {showTooltip && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[min(380px,calc(100vw-2rem))] z-40 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl shadow-black/20 p-4 text-xs animate-in fade-in-50 zoom-in-95 duration-150">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--color-border)] mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-primary)] text-sm">
                    <Sparkles size={14} className="text-[var(--color-tertiary)]" />
                    <span>Panduan Pencarian Billing</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTooltip(false)}
                    className="text-[var(--color-secondary)] hover:text-[var(--color-primary)] p-1 rounded-md hover:bg-[var(--color-neutral)]"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-3 text-[var(--color-secondary)]">
                  <div className="p-2.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-primary)] mb-1">
                      <FileText size={12} className="text-[var(--color-tertiary)]" />
                      <span>Cari Nomor Invoice / Customer</span>
                    </div>
                    <p className="text-xs leading-snug mb-1.5">
                      Ketik nomor invoice, nama customer, atau kode marking.
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyExample('2401-0001', 'invNo')}
                        className="px-2 py-0.5 rounded bg-transparent border border-[var(--color-border)] text-[11px] font-mono text-[var(--color-primary)] hover:border-[var(--color-tertiary)] cursor-pointer"
                      >
                        2401-0001
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[var(--color-neutral)] rounded-xl border border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-primary)] mb-1">
                      <Layers size={12} className="text-amber-500" />
                      <span>Multi-Pencarian (Koma / Baris Baru)</span>
                    </div>
                    <p className="text-xs leading-snug">
                      Pisahkan dengan tanda koma (,) untuk mencari banyak invoice sekaligus.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Counter + Rows-per-page */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-[var(--color-secondary)] font-medium">
          <div className="flex items-center gap-1">
            <span>Menampilkan</span>
            <span className="font-bold text-[var(--color-primary)] tabular-nums">{displayCount}</span>
            <span>dari</span>
            <span className="font-bold text-[var(--color-primary)] tabular-nums">{total.toLocaleString('id-ID')}</span>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)]" />

          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline">Baris:</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value))
                onPageReset()
              }}
              className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-primary)] font-semibold cursor-pointer outline-none"
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
  )
}
