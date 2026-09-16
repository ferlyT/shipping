import { formatDecimal, formatNumber, formatCurrency } from '@/lib/utils'
import type { CustMarkingAggregates } from './types'

export interface CustMarkingSummaryBannerProps {
  aggregates: CustMarkingAggregates
  rasioValue: number
}

export function CustMarkingSummaryBanner({ aggregates, rasioValue }: CustMarkingSummaryBannerProps) {
  const {
    totalResi,
    totalQtyGdg,
    totalQtySJ,
    totalWeight,
    totalM3Active,
    totalM3Gdg,
    totalM3K,
    totalOw,
    countKomplain,
    totalValue2,
    totalFc,
  } = aggregates

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 sm:p-4 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
      {/* 1. Total Resi */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Total Resi
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
          {formatNumber(totalResi)}
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)]">item muatan</span>
      </div>

      {/* 2. Total Koli */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Total Koli
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
          {formatNumber(totalQtyGdg > 0 ? totalQtyGdg : totalQtySJ)}
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)]">
          Gdg: {formatNumber(totalQtyGdg)} | SJ: {formatNumber(totalQtySJ)}
        </span>
      </div>

      {/* 3. Total Berat */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Total Berat
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
          {formatNumber(totalWeight)} <span className="text-xs font-normal">kg</span>
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)]">
          {totalOw > 0 ? (
            <span className="text-rose-500 font-semibold">Overweight: +{formatNumber(totalOw)} kg</span>
          ) : (
            'Muatan Proporsional'
          )}
        </span>
      </div>

      {/* 4. Total Volume M³ */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Total Volume M³
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
          {formatDecimal(totalM3Active, 4)} <span className="text-xs font-normal">m³</span>
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
          Gdg: {formatDecimal(totalM3Gdg, 3)} {totalM3K > 0 && `| K: ${formatDecimal(totalM3K, 3)}`}
        </span>
      </div>

      {/* 5. Rasio & Overweight */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Rasio Acuan
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5">
          {rasioValue > 0 ? formatNumber(rasioValue) : '—'}{' '}
          <span className="text-xs font-normal text-[var(--color-secondary)]">kg/m³</span>
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)]">
          {countKomplain > 0 ? (
            <span className="text-amber-500 font-medium">{countKomplain} Komplain</span>
          ) : (
            'Standar Tarif'
          )}
        </span>
      </div>

      {/* 6. Tagihan & Tax Return */}
      <div className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/20">
        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] block">
          Total Tagihan
        </span>
        <div className="text-[17px] font-bold tabular-nums text-[var(--color-primary)] mt-0.5 truncate">
          {formatCurrency(totalValue2)}
        </div>
        <span className="text-[10.5px] text-[var(--color-secondary)] truncate block">
          {totalFc > 0 ? `Tax: ${formatCurrency(totalFc)}` : 'Non Tax Return'}
        </span>
      </div>
    </div>
  )
}
