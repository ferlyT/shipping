import { useState, useEffect, useRef } from 'react'
import { Search, Check, ChevronDown, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pill } from './Pill'

interface BranchPickerProps {
  selected: string[] | string
  onChange: (b: string[] | string) => void
  branches: string[]
  isLoading: boolean
  isFetching?: boolean
}

export function BranchPicker({
  selected,
  onChange,
  branches,
  isLoading,
  isFetching = false,
}: BranchPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedArray = Array.isArray(selected)
    ? selected
    : selected === 'ALL' || !selected
    ? []
    : [selected]

  const isAll = selected === 'ALL' || selectedArray.length === 0
  const filtered = branches.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
  const PINNED_BRANCHES = branches.slice(0, 3)

  const toggleBranch = (b: string) => {
    if (isAll) {
      onChange([b])
    } else {
      if (selectedArray.includes(b)) {
        const next = selectedArray.filter((x) => x !== b)
        onChange(next.length === 0 ? 'ALL' : next)
      } else {
        onChange([...selectedArray, b])
      }
    }
  }

  const selectAll = () => {
    onChange('ALL')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill
          active={isAll}
          onClick={selectAll}
          isLoading={isFetching}
          className={cn('text-xs py-1 px-3', isAll && 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)]')}
        >
          Semua Cabang
        </Pill>

        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-secondary)]" />}

        {!isLoading &&
          PINNED_BRANCHES.map((b) => {
            const isSelected = selectedArray.includes(b)
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBranch(b)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none',
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ring-1 ring-emerald-500/20'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neutral)]'
                )}
              >
                <MapPin size={11} className={isSelected ? 'text-emerald-500' : 'text-[var(--color-secondary)]'} />
                <span>{b.replace('Cabang ', '')}</span>
              </button>
            )
          })}

        {!isLoading && branches.length > 3 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all shrink-0 cursor-pointer select-none',
              !isAll && selectedArray.some((b) => !PINNED_BRANCHES.includes(b))
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 ring-1 ring-emerald-500/20'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-neutral)]'
            )}
          >
            <span>Pilih Cabang Lainya</span>
            {!isAll && selectedArray.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {selectedArray.length}
              </span>
            )}
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-2 w-[min(18rem,calc(100vw-2.5rem))] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="p-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
              <Search size={13} className="text-[var(--color-secondary)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari cabang (multi-select)..."
                className="bg-transparent outline-none text-xs w-full text-[var(--color-text)] placeholder:text-[var(--color-secondary)] font-medium"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-[var(--color-border)]">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--color-secondary)] text-center">Cabang tidak ditemukan</div>
            )}
            {filtered.map((b) => {
              const isChecked = selectedArray.includes(b)
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBranch(b)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-[var(--color-text)] hover:bg-[var(--color-neutral)] text-left cursor-pointer transition-colors"
                >
                  <span className={cn('font-medium', isChecked && 'text-emerald-500 font-bold')}>{b}</span>
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                      isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-[var(--color-border)]'
                    )}
                  >
                    {isChecked && <Check size={11} strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
