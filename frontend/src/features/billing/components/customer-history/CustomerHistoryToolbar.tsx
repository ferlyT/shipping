import { Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DiffFilterStatus, HistoryViewMode, ModaFilter, PaymentFilter } from './types'

export interface CustomerHistoryToolbarProps {
  viewMode: HistoryViewMode
  onViewModeChange: (mode: HistoryViewMode) => void
  search: string
  onSearchChange: (val: string) => void
  selectedYear: string
  onYearChange: (y: string) => void
  selectedBranch: string
  onBranchChange: (b: string) => void
  availableBranches: Array<{ code: string; name: string }>
  selectedTypeComodity: string
  onTypeComodityChange: (tc: string) => void
  availableComodities: string[]
  selectedModa: ModaFilter
  onModaChange: (m: ModaFilter) => void
  selectedStatus: PaymentFilter
  onStatusChange: (s: PaymentFilter) => void
  selectedDiffStatus: DiffFilterStatus
  onDiffStatusChange: (d: DiffFilterStatus) => void
  onReset: () => void
  totalCount: number
}

export function CustomerHistoryToolbar({
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  selectedYear,
  onYearChange,
  selectedBranch,
  onBranchChange,
  availableBranches,
  selectedTypeComodity,
  onTypeComodityChange,
  availableComodities,
  selectedModa,
  onModaChange,
  selectedStatus,
  onStatusChange,
  selectedDiffStatus,
  onDiffStatusChange,
  onReset,
  totalCount,
}: CustomerHistoryToolbarProps) {
  const currentYear = new Date().getFullYear()
  const years = ['all', String(currentYear), String(currentYear - 1), String(currentYear - 2), String(currentYear - 3)]

  return (
    <div className="p-3.5 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] space-y-2.5 shrink-0">
      {/* Top Bar: View Mode Switcher + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* View Mode Toggle */}
        <div className="inline-flex items-center p-0.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onViewModeChange('detail')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'detail'
                ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            Rincian Item (Item Trace)
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('invoice')}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              viewMode === 'invoice'
                ? 'bg-transparent border border-[var(--color-tertiary)] text-[var(--color-tertiary)] font-semibold shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            }`}
          >
            Invoice Induk
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nomor invoice, marking, item, listcode..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-hidden focus:border-[var(--color-tertiary)] transition-colors"
          />
        </div>
      </div>

      {/* Filter Row: Year, Branch, Commodity, Moda, Status */}
      <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
        {/* Year Select */}
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer"
        >
          <option value="all">Semua Tahun</option>
          {years.filter((y) => y !== 'all').map((y) => (
            <option key={y} value={y}>
              Tahun {y}
            </option>
          ))}
        </select>

        {/* Branch Select */}
        <select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer"
        >
          <option value="all">Semua Cabang</option>
          {availableBranches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} {b.name ? `(${b.name})` : ''}
            </option>
          ))}
        </select>

        {/* Commodity Select */}
        <select
          value={selectedTypeComodity}
          onChange={(e) => onTypeComodityChange(e.target.value)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer max-w-xs truncate"
        >
          <option value="all">Semua Tipe Komoditas</option>
          {availableComodities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Moda Select */}
        <select
          value={selectedModa}
          onChange={(e) => onModaChange(e.target.value as ModaFilter)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer"
        >
          <option value="all">Semua Moda</option>
          <option value="air">✈️ Udara</option>
          <option value="sea">🚢 Laut</option>
        </select>

        {/* Diff Status */}
        <select
          value={selectedDiffStatus}
          onChange={(e) => onDiffStatusChange(e.target.value as DiffFilterStatus)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer"
        >
          <option value="all">Semua Status Audit</option>
          <option value="diff">Ada Penyesuaian / Revisi</option>
          <option value="same">Tanpa Penyesuaian</option>
        </select>

        {/* Status Pembayaran */}
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value as PaymentFilter)}
          className="px-2.5 py-1 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-hidden cursor-pointer"
        >
          <option value="all">Semua Status Bayar</option>
          <option value="lunas">Lunas</option>
          <option value="partial">Sebagian (Partial)</option>
          <option value="issued">Terbit (Issued)</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="overdue">Jatuh Tempo (Overdue)</option>
          <option value="draft">Draft</option>
        </select>

        {/* Reset Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)] gap-1 px-2 py-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </Button>

        <span className="text-[11px] text-[var(--color-secondary)] ml-auto tabular-nums">
          Ditemukan <strong className="text-[var(--color-primary)]">{totalCount}</strong> entri
        </span>
      </div>
    </div>
  )
}
