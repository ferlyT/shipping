// ManifestList — Komponen manifest batch dengan server-side autocomplete
// DILARANG: mendefinisikan ulang ManifestList di halaman manapun

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Rows3, LayoutGrid, List, X, Loader2 } from 'lucide-react'
import { markingApi, type MarkingManifest } from '../services/marking.service'
import { useDebounce } from '@/hooks/useDebounce'
import { getCommodityIcon } from '../types/marking.types'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// AutocompleteInput — SearchBar dengan dropdown suggestions
// ─────────────────────────────────────────────────────────────────────────────

interface AutocompleteInputProps {
  value: string
  onChange: (val: string) => void
  suggestions: string[]
  isLoadingSuggestions: boolean
  placeholder?: string
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  isLoadingSuggestions,
  placeholder = 'Cari resi, customer, barang...',
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Buka dropdown saat ada suggestions
  useEffect(() => {
    setOpen(suggestions.length > 0 && value.length >= 2)
    setActiveIdx(-1)
  }, [suggestions, value])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      onChange(suggestions[activeIdx])
      setOpen(false)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Highlight kata yang cocok dengan query
  const highlight = (text: string, query: string) => {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-100 text-yellow-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[var(--color-secondary)] pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0 && value.length >= 2) setOpen(true) }}
        className="w-full pl-9 pr-8 py-[9px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-xs sm:text-sm text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:border-[var(--color-tertiary)] transition-colors shadow-sm"
        autoComplete="off"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus() }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Loading indicator */}
      {isLoadingSuggestions && value.length >= 2 && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-secondary)]" />
        </div>
      )}

      {/* Dropdown suggestions */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto divide-y divide-[var(--color-border)]">
            {suggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onChange(s); setOpen(false) }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors',
                    idx === activeIdx && 'bg-[var(--color-neutral)] font-semibold'
                  )}
                >
                  {highlight(s, value)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ManifestList — Komponen utama
// ─────────────────────────────────────────────────────────────────────────────

interface ManifestListProps {
  markingCode: string
  onClose: () => void
}

export function ManifestList({ markingCode, onClose }: ManifestListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'shortlist'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'shortlist' : 'table'
    }
    return 'table'
  })

  const debouncedSearch = useDebounce(searchTerm, 350)

  // Fetch manifest data (full list)
  const { data, isLoading } = useQuery({
    queryKey: ['manifest', markingCode],
    queryFn: async () => {
      const res = await markingApi.getManifest(markingCode)
      return res.data as { data: MarkingManifest[] }
    },
    enabled: !!markingCode,
  })

  // Fetch suggestions (server-side autocomplete)
  const { data: suggestionsData, isFetching: isLoadingSuggestions } = useQuery({
    queryKey: ['manifestSuggestions', markingCode, debouncedSearch],
    queryFn: async () => {
      const res = await markingApi.searchManifest(markingCode, debouncedSearch)
      return res.data as { data: string[] }
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 30_000,
  })

  const suggestions = suggestionsData?.data || []
  const manifest = data?.data || []

  // Filter client-side berdasarkan searchTerm (setelah suggestions dipilih)
  const filteredManifest = manifest.filter((m) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      m.fdListCode?.toLowerCase().includes(term) ||
      m.fdCustName?.toLowerCase().includes(term) ||
      m.fdComodity?.toLowerCase().includes(term) ||
      m.fdMarkingNo?.toLowerCase().includes(term)
    )
  })

  const totalPkgs = filteredManifest.reduce((acc, m) => acc + Number(m.fdJmlPack || 0), 0)
  const totalWeight = filteredManifest.reduce((acc, m) => acc + Number(m.fdJmlBerat || 0), 0)
  const totalVol = filteredManifest.reduce((acc, m) => acc + Number(m.fdM3 || 0), 0)

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center bg-[var(--color-surface)] gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm animate-pulse">
          Memuat data manifest...
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--color-surface)]">
      {/* Toolbar */}
      <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-3">
        <AutocompleteInput
          value={searchTerm}
          onChange={setSearchTerm}
          suggestions={suggestions}
          isLoadingSuggestions={isLoadingSuggestions}
          placeholder="Cari resi, customer, barang..."
        />

        <div className="flex items-center gap-1 bg-[var(--color-neutral)] rounded-[var(--radius-md)] p-0.5 border border-[var(--color-border)] shrink-0">
          {([
            { mode: 'table', Icon: Rows3 },
            { mode: 'grid',  Icon: LayoutGrid },
            { mode: 'shortlist', Icon: List },
          ] as const).map(({ mode, Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'p-1.5 rounded-[var(--radius-sm)] transition-all',
                viewMode === mode
                  ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--color-neutral)]">
        {filteredManifest.length === 0 ? (
          <div className="py-16 flex justify-center text-sm text-[var(--color-secondary)]">
            {searchTerm ? 'Tidak ada manifest yang cocok dengan pencarian.' : 'Tidak ada manifest di batch ini.'}
          </div>
        ) : viewMode === 'shortlist' ? (
          <div className="flex flex-col divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {filteredManifest.map((m) => {
              const info = getCommodityIcon((m as any).fdComodityName || m.fdComodity)
              const Icon = info.Icon
              return (
                <div key={m.fdListCode} className="flex flex-col gap-2 p-3 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)]', info.bg, info.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold font-[var(--font-display)] text-[var(--color-primary)] text-[13px] sm:text-[14px] leading-none line-clamp-1">
                          {m.fdCustName || 'Unknown Customer'}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] mt-0.5 line-clamp-1">
                          {m.fdTerima || m.fdListCode}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-semibold text-[10px] sm:text-[11px] text-[var(--color-tertiary)] bg-[var(--color-neutral)] px-2 py-0.5 rounded">
                        {m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}
                      </div>
                      <div className="text-[10px] text-[var(--color-secondary)]">
                        {m.fdJmlBerat || 0} kg
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-[40px] text-xs">
                    <span className="text-[var(--color-primary)] font-medium bg-[var(--color-neutral)] px-1.5 py-0.5 rounded line-clamp-1 break-all">
                      {m.fdMarkingNo || '-'}
                    </span>
                    <span className="text-[var(--color-secondary)] line-clamp-1">
                      {m.fdComodity || '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : viewMode === 'table' ? (
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div className="min-w-[800px] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
              <table className="w-full border-collapse bg-[var(--color-surface)]">
                <thead>
                  <tr>
                    {['Customer', 'Marking / Receiver', 'Commodity', 'Description', 'Summary'].map((h, i) => (
                      <th key={h} className={cn(
                        'bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] py-3 px-4 border-b border-[var(--color-border)] font-medium',
                        i === 4 ? 'text-right' : 'text-left'
                      )}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredManifest.map((m) => {
                    const info = getCommodityIcon((m as any).fdComodityName || m.fdComodity)
                    const Icon = info.Icon
                    return (
                      <tr key={m.fdListCode} className="hover:bg-[var(--color-neutral)]/50 border-b border-[var(--color-border)] last:border-0">
                        <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] align-top">
                          <span className="font-semibold text-[var(--color-primary)]">{m.fdCustName || '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] align-top">
                          <div className="flex flex-col gap-0.5">
                            {m.fdMarkingNo ? (
                              <span className="text-[13px] sm:text-[14px] font-semibold text-[var(--color-primary)] uppercase leading-tight">{m.fdMarkingNo}</span>
                            ) : (
                              <span className="font-medium text-[var(--color-secondary)] leading-tight">-</span>
                            )}
                            {m.fdTerima && <span className="font-semibold text-[var(--color-primary)] mt-1 leading-snug">{m.fdTerima}</span>}
                            {m.fdListCode && <span className="text-[13px] sm:text-[14px] text-[var(--color-tertiary)] font-medium leading-snug">{m.fdListCode}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] align-top">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-semibold text-[var(--color-primary)] leading-[1.4]">{m.fdComodity || '-'}</span>
                            <div title={info.tooltip} className={cn('flex items-center w-fit p-1.5 rounded-md cursor-help transition-colors', info.bg, info.color)}>
                              <Icon size={14} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs sm:text-sm align-top">
                          <span className="text-[var(--color-secondary)] whitespace-normal break-words line-clamp-3 block">{m.fdDesc || ''}</span>
                        </td>
                        <td className="py-3 px-4 text-xs sm:text-sm align-top">
                          <div className="flex flex-col gap-1 text-xs sm:text-sm leading-tight text-[var(--color-secondary)] whitespace-nowrap items-end mt-1">
                            <div className="flex justify-end gap-1.5"><span className="font-medium">Pkg:</span><span className="text-[var(--color-tertiary)] font-semibold">{m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}</span></div>
                            <div className="flex justify-end gap-1.5"><span className="font-medium">Wgt:</span><span className="text-[var(--color-primary)] font-semibold">{m.fdJmlBerat || 0} kg</span></div>
                            <div className="flex justify-end gap-1.5"><span className="font-medium">Vol:</span><span className="text-[var(--color-primary)] font-semibold">{m.fdM3 || 0} m³</span></div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Grid view
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredManifest.map((m) => {
              const info = getCommodityIcon((m as any).fdComodityName || m.fdComodity)
              const Icon = info.Icon
              return (
                <div key={m.fdListCode} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[8px] overflow-hidden hover:shadow-md transition-all flex flex-col">
                  <div className="px-5 py-4 flex items-center justify-between bg-[var(--color-neutral)] border-b border-[var(--color-border)]">
                    <div>
                      <div className="font-[var(--font-label)] text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-[3px]">List No.</div>
                      <div className="font-[var(--font-display)] font-semibold text-lg tracking-[-0.01em] text-[var(--color-primary)]">{m.fdListCode}</div>
                    </div>
                  </div>
                  <div className="px-5 py-4 flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="font-[var(--font-label)] text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Customer</div>
                        <div className="font-semibold text-xs sm:text-sm text-[var(--color-primary)]">{m.fdCustName || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-[var(--font-label)] text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Resi</div>
                        <div className="font-semibold text-xs sm:text-sm text-[var(--color-primary)]">{m.fdTerima || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-[var(--font-label)] text-[10px] sm:text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Commodity</div>
                      <div className="flex flex-col gap-1.5 mb-1.5">
                        <div className="font-semibold text-xs sm:text-sm text-[var(--color-primary)]">{m.fdComodity || '-'}</div>
                        <div title={info.tooltip} className={cn('flex items-center w-fit p-1.5 rounded-md cursor-help transition-colors', info.bg, info.color)}>
                          <Icon size={14} />
                        </div>
                      </div>
                      <div className="text-xs text-[var(--color-secondary)] mt-0.5">{m.fdDesc}</div>
                    </div>
                  </div>
                  <div className="mt-auto px-5 py-3.5 bg-[var(--color-neutral)] border-t border-[var(--color-border)] flex justify-between items-center text-xs sm:text-sm">
                    <div className="flex flex-col">
                      <span className="text-[var(--color-secondary)] font-medium">Packages</span>
                      <span className="font-semibold text-[var(--color-tertiary)]">{m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col text-center">
                      <span className="text-[var(--color-secondary)] font-medium">Weight</span>
                      <span className="font-semibold text-[var(--color-primary)]">{m.fdJmlBerat || 0} kg</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[var(--color-secondary)] font-medium">Volume</span>
                      <span className="font-semibold text-[var(--color-primary)]">{m.fdM3 || 0} m³</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — stats */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-4 py-3 sm:px-6 bg-[var(--color-neutral)] border-t border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-secondary)] gap-3 sm:gap-2">
        <div className="text-center sm:text-left">
          Total Manifest: <b className="text-[var(--color-primary)]">{filteredManifest.length}</b>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-6">
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Jumlah Pack</span>
            <b className="text-[var(--color-tertiary)] whitespace-nowrap">{totalPkgs.toLocaleString()}</b>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Berat</span>
            <b className="text-[var(--color-primary)] whitespace-nowrap">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} KG</b>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Volume</span>
            <b className="text-[var(--color-primary)] whitespace-nowrap">{totalVol.toLocaleString(undefined, { maximumFractionDigits: 4 })} M3</b>
          </div>
        </div>
      </div>

      {/* Footer — close button */}
      <div className="flex justify-end px-4 py-3 sm:px-6 sm:py-4 bg-[var(--color-surface)]">
        <button
          onClick={onClose}
          className="border border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] rounded-[var(--radius-md)] px-6 py-2.5 font-[var(--font-body)] font-semibold text-[0.88rem] sm:text-[0.92rem] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}
