import { Search, FileSpreadsheet, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ColumnPreset } from './types'

export interface CustMarkingHeaderToolbarProps {
  search: string
  onSearchChange: (val: string) => void
  columnPreset: ColumnPreset
  onColumnPresetChange: (preset: ColumnPreset) => void
  branches: string[]
  selectedBranch: string
  onBranchSelect: (b: string) => void
  onlyKomplain: boolean
  onToggleKomplain: () => void
  onExportExcel: () => void
  isExporting: boolean
  totalAll: number
  hasSelisihCount?: number
}

export function CustMarkingHeaderToolbar({
  search,
  onSearchChange,
  columnPreset,
  onColumnPresetChange,
  branches,
  selectedBranch,
  onBranchSelect,
  onlyKomplain,
  onToggleKomplain,
  onExportExcel,
  isExporting,
  totalAll,
  hasSelisihCount = 0,
}: CustMarkingHeaderToolbarProps) {
  return (
    <div className="space-y-2.5 p-3.5 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari invoice, listcode, resi, komoditas..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-hidden focus:border-[var(--color-tertiary)] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Preset Buttons */}
          <div className="inline-flex items-center p-0.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onColumnPresetChange('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'all'
                  ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Semua Kolom
            </button>
            <button
              type="button"
              onClick={() => onColumnPresetChange('physical')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'physical'
                  ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Fisik & M³
            </button>
            <button
              type="button"
              onClick={() => onColumnPresetChange('complaint')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'complaint'
                  ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Komplain
            </button>
            <button
              type="button"
              onClick={() => onColumnPresetChange('finance')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'finance'
                  ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Finansial
            </button>
          </div>

          {/* Export Excel Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportExcel}
            disabled={isExporting}
            className="text-xs font-semibold px-2.5 py-1 gap-1.5"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filter Row: Branches & Komplain toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mr-1">
            Cabang:
          </span>
          <button
            type="button"
            onClick={() => onBranchSelect('ALL')}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
              selectedBranch === 'ALL'
                ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold'
                : 'border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            Semua ({totalAll})
          </button>
          {branches.map((bc) => (
            <button
              key={bc}
              type="button"
              onClick={() => onBranchSelect(bc)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                selectedBranch === bc
                  ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold'
                  : 'border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {bc}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyKomplain}
              onChange={onToggleKomplain}
              className="rounded border-[var(--color-border)] text-[var(--color-tertiary)] focus:ring-0"
            />
            <span>Hanya Selisih / Komplain</span>
            {hasSelisihCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-transparent border border-rose-500/40 text-rose-500">
                {hasSelisihCount}
              </span>
            )}
          </label>
        </div>
      </div>
    </div>
  )
}
