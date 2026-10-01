import { Search, FileSpreadsheet, Loader2, AlertTriangle, X } from 'lucide-react'
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
  countQtyKomplainMismatch?: number
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
  countQtyKomplainMismatch = 0,
}: CustMarkingHeaderToolbarProps) {
  const hasMultipleBranches = branches.length > 1

  return (
    <div className="p-3 sm:p-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0 space-y-2">
      {/* Baris 1: Pencarian Cepat, Preset Kolom & Export Excel */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search Field */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari invoice, listcode, resi, komoditas..."
            className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-hidden focus:border-[var(--color-tertiary)] transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Preset Kolom & Export Excel */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Segmented Preset Switcher */}
          <div className="inline-flex items-center p-0.5 bg-[var(--color-neutral)]/60 border border-[var(--color-border)] rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onColumnPresetChange('all')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'all'
                  ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-tertiary)] font-bold shadow-2xs'
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
                  ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-tertiary)] font-bold shadow-2xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              Fisik & M³
            </button>
            <button
              type="button"
              onClick={() => onColumnPresetChange('complaint')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                columnPreset === 'complaint'
                  ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-tertiary)] font-bold shadow-2xs'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              }`}
            >
              <span>Komplain</span>
              {countQtyKomplainMismatch > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onColumnPresetChange('finance')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                columnPreset === 'finance'
                  ? 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-tertiary)] font-bold shadow-2xs'
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
            className="text-xs font-semibold px-2.5 py-1 gap-1.5 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
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

      {/* Baris 2: Filter Cabang & Toggle Selisih */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap text-xs pt-0.5">
        {/* Cabang Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10.5px] font-bold text-[var(--color-secondary)] uppercase tracking-wider mr-0.5">
            Cabang:
          </span>
          <button
            type="button"
            onClick={() => onBranchSelect('ALL')}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              selectedBranch === 'ALL'
                ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 font-bold shadow-2xs'
                : 'border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-neutral)]/20'
            }`}
          >
            Semua ({totalAll})
          </button>
          {branches.map((bc) => (
            <button
              key={bc}
              type="button"
              onClick={() => onBranchSelect(bc)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                selectedBranch === bc
                  ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10 font-bold shadow-2xs'
                  : 'border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-neutral)]/20'
              }`}
            >
              {bc}
            </button>
          ))}
        </div>

        {/* Toggle Hanya Selisih / Komplain */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleKomplain}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              onlyKomplain
                ? 'border border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                : 'border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-tertiary)]/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                onlyKomplain ? 'bg-amber-500 animate-pulse' : 'bg-[var(--color-secondary)]/50'
              }`}
            />
            <span>Hanya Selisih / Komplain</span>
            {hasSelisihCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-transparent border border-rose-500/40 text-rose-500">
                {hasSelisihCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Ribbon Compact Alert Bar (Multi-Cabang / Selisih Qty Komplain) */}
      {(hasMultipleBranches || countQtyKomplainMismatch > 0) && (
        <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="truncate flex items-center gap-2">
              {hasMultipleBranches && (
                <span>
                  <strong>Multi-Cabang:</strong> {branches.join(', ')} ({branches.length} cabang dalam satu marking).
                </span>
              )}
              {hasMultipleBranches && countQtyKomplainMismatch > 0 && (
                <span className="opacity-40">|</span>
              )}
              {countQtyKomplainMismatch > 0 && (
                <span>
                  <strong>Selisih Qty Komplain:</strong> {countQtyKomplainMismatch} baris data Qty Komplain berbeda dengan Qty Gudang.
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-[10.5px]">
            {selectedBranch !== 'ALL' ? (
              <span className="text-[var(--color-secondary)]">
                Filter cabang aktif: <strong className="text-[var(--color-primary)] font-mono">{selectedBranch}</strong>
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Gabungan Semua Cabang
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
