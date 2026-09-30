import { Search, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react'
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
          <span className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mr-1 flex items-center gap-1.5">
            <span>Cabang:</span>
            {hasMultipleBranches && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400"
                title={`Peringatan: Terdeteksi ${branches.length} cabang (${branches.join(', ')})`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                Multi ({branches.length})
              </span>
            )}
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

      {/* Warning Alert Banner saat terdeteksi lebih dari 1 cabang */}
      {hasMultipleBranches && (
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11.5px]">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">
              <strong>Peringatan Multi-Cabang:</strong> Terdeteksi <strong>{branches.length} cabang</strong> berbeda (
              <strong className="text-amber-600 dark:text-amber-400">{branches.join(', ')}</strong>) pada data marking ini. Pastikan audit pemisahan fisik muatan kargo antar cabang.
            </span>
          </div>
          {selectedBranch !== 'ALL' ? (
            <span className="text-[10.5px] text-[var(--color-secondary)] shrink-0">
              Filter aktif: <strong className="text-[var(--color-primary)]">{selectedBranch}</strong>
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              Tampilan Gabungan Semua Cabang
            </span>
          )}
        </div>
      )}

      {/* Warning Alert Banner saat terdeteksi Qty Komplain > 0 dan berbeda dengan Qty Gudang */}
      {countQtyKomplainMismatch > 0 && (
        <div className="flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11.5px]">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">
              <strong>Peringatan Selisih Qty Komplain:</strong> Terdeteksi <strong>{countQtyKomplainMismatch} baris data</strong> dengan Qty Komplain &gt; 0 dan berbeda dengan Qty Gudang.
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            Audit Qty K Diperlukan
          </span>
        </div>
      )}
    </div>
  )
}
