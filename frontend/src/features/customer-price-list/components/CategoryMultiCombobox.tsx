import { useState, useEffect, useRef, type KeyboardEvent } from 'react'
import { Search, ChevronDown, Info, Loader2 } from 'lucide-react'

interface CategoryMultiComboboxProps {
  label?: string
  value: string[]
  onChange: (v: string[]) => void
  options: string[]
  searchPlaceholder?: string
  loading?: boolean
  modeLabel?: string
}

export function CategoryMultiCombobox({
  label = 'KATEGORI BARANG',
  value,
  onChange,
  options,
  searchPlaceholder = 'Cari kategori...',
  loading = false,
  modeLabel,
}: CategoryMultiComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [open])

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  )

  useEffect(() => {
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((c) => c !== v))
    } else {
      onChange([...value, v])
    }
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) toggle(filtered[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  const displayValue =
    value.length === 0
      ? 'Pilih kategori...'
      : value.length === 1
      ? value[0]
      : `${value.length} kategori dipilih`

  const allSelected = options.length > 0 && value.length === options.length

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <label className="text-[0.72rem] tracking-[0.06em] font-semibold text-[var(--color-secondary)] uppercase">
          {label}
        </label>
        {modeLabel && !loading && (
          <span
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]/70 shrink-0 cursor-help"
            title={`mengikuti ${modeLabel}`}
            aria-label={`mengikuti ${modeLabel}`}
          >
            <Info size={9} />
          </span>
        )}
      </div>
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={options.length === 0 || loading}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="form-input py-2 pl-3 pr-9 text-sm w-full flex items-center justify-between gap-2 text-left disabled:opacity-60 border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] h-9 cursor-pointer"
        >
          <span
            className={`truncate ${
              value.length === 0 ? 'text-[var(--color-secondary)]' : 'font-medium text-[var(--color-primary)]'
            }`}
          >
            {loading ? 'Memuat kategori...' : displayValue}
          </span>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-[var(--color-tertiary)] animate-spin shrink-0" />
          ) : (
            <ChevronDown
              size={14}
              className={`text-[var(--color-secondary)] shrink-0 transition-transform duration-150 ${
                open ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>

        {open && options.length > 0 && (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute z-30 mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg flex flex-col overflow-hidden max-h-64"
          >
            <div className="relative border-b border-[var(--color-border)] p-1.5 shrink-0 bg-white">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent outline-none placeholder:text-[var(--color-secondary)]/60 text-[var(--color-primary)]"
              />
            </div>

            {value.length > 0 && (
              <div className="flex flex-wrap gap-1 px-2.5 py-2 border-b border-[var(--color-border)] max-h-20 overflow-y-auto shrink-0 bg-slate-50">
                {value.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] text-[0.72rem] font-medium"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => toggle(v)}
                      aria-label={`Hapus ${v}`}
                      className="hover:bg-[var(--color-tertiary)]/20 rounded-full p-0.5 cursor-pointer"
                    >
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                        <path
                          d="M3 3L9 9M9 3L3 9"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)] text-xs text-[var(--color-secondary)] shrink-0 bg-slate-50">
              <span>{filtered.length} opsi</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onChange(allSelected ? [] : [...options])}
                  className="font-medium text-[var(--color-tertiary)] hover:underline cursor-pointer"
                >
                  {allSelected ? 'Batal Semua' : 'Pilih Semua'}
                </button>
                {value.length > 0 && !allSelected && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="font-medium text-[var(--color-secondary)] hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-40 p-1 flex flex-col gap-0.5">
              {filtered.length === 0 ? (
                <div className="p-3 text-xs text-[var(--color-secondary)] text-center">
                  Kategori tidak ditemukan
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const selected = value.includes(item)
                  const isFocused = idx === activeIndex
                  return (
                    <button
                      key={item}
                      ref={(el) => {
                        optionRefs.current[idx] = el
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => toggle(item)}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--color-tertiary)]/10 font-semibold text-[var(--color-tertiary)]'
                          : isFocused
                          ? 'bg-[var(--color-neutral)] text-[var(--color-primary)]'
                          : 'hover:bg-[var(--color-neutral)] text-[var(--color-primary)]'
                      }`}
                    >
                      <span className="truncate">{item}</span>
                      {selected && <span className="text-[var(--color-tertiary)] shrink-0 font-bold">✓</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
