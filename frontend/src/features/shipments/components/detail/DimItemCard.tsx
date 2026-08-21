import { Box } from 'lucide-react'

export interface DimRow {
  fdListCode: string
  fdListDCode: string
  fdDescr?: string | null
  fdPjg?: number | null
  fdLbr?: number | null
  fdTng?: number | null
  fdQty?: number | null
}

export function calcTotalVolume(dims: DimRow[]) {
  return dims.reduce((sum, d) =>
    sum + (Number(d.fdPjg || 0) * Number(d.fdLbr || 0) * Number(d.fdTng || 0) * Number(d.fdQty || 0)) / 1_000_000, 0
  )
}

interface DimItemCardProps {
  dim: DimRow
  index: number
}

export function DimItemCard({ dim, index }: DimItemCardProps) {
  const volume = (Number(dim.fdPjg || 0) * Number(dim.fdLbr || 0) * Number(dim.fdTng || 0) * Number(dim.fdQty || 0)) / 1_000_000

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 shadow-sm hover:border-[var(--color-primary)]/30 transition-all">
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-neutral)] text-[var(--color-secondary)] text-[10px] font-bold">
            {index + 1}
          </span>
          <span className="text-xs font-medium text-[var(--color-secondary)] truncate">
            {dim.fdDescr || `Koli #${index + 1}`}
          </span>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold tabular-nums">
          <Box size={11} className="text-[var(--color-primary)]" />
          <span>{volume.toLocaleString('id-ID', { maximumFractionDigits: 4 })} m³</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Panjang', val: dim.fdPjg, unit: 'cm' },
          { label: 'Lebar', val: dim.fdLbr, unit: 'cm' },
          { label: 'Tinggi', val: dim.fdTng, unit: 'cm' },
          { label: 'Jumlah', val: dim.fdQty, unit: 'pcs' },
        ].map(({ label, val, unit }) => (
          <div key={label} className="bg-[var(--color-neutral)] rounded-xl p-2 sm:p-2.5 text-center flex flex-col justify-center">
            <span className="text-[10px] font-medium text-[var(--color-secondary)] uppercase tracking-tight">{label}</span>
            <div className="text-[13px] sm:text-sm font-bold text-[var(--color-text)] tabular-nums mt-0.5">
              {val != null ? val.toLocaleString('id-ID') : '—'}
              <span className="text-[10px] text-[var(--color-secondary)] font-normal ml-0.5">{unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
