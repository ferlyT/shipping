import {
  FileText,
  Boxes,
  Scale,
  Box,
  AlertTriangle,
  Tags,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react'
import { formatDecimal, formatNumber } from '@/lib/utils'
import type { CustMarkingAggregates } from './types'

export interface CustMarkingSummaryBannerProps {
  aggregates: CustMarkingAggregates
  rasioValue: number
  isAirMode?: boolean
  selectedCommodityType?: string
  onSelectCommodityType?: (type: string) => void
}

export function CustMarkingSummaryBanner({
  aggregates,
  rasioValue,
  isAirMode = false,
  selectedCommodityType = 'ALL',
  onSelectCommodityType,
}: CustMarkingSummaryBannerProps) {
  const {
    totalResi,
    totalInvoices,
    countInvoiceUtama,
    countBillGabungan,
    countBillTambahan,
    totalQtyGdg,
    totalQtySJ,
    totalQtyPL,
    totalQtyK,
    totalWeightGdg,
    totalWeightSJ,
    totalWeightK,
    totalKgBill,
    totalWeight,
    totalM3PL,
    totalM3Gdg,
    totalM3K,
    totalM3Bill,
    totalVfcGdg,
    totalVfcK,
    totalVfcBill,
    totalOw,
    totalOwGdg,
    totalOwSJ,
    totalOwK,
    countSelisih,
    countQtyKomplainMismatch = 0,
    commodityTypes = [],
  } = aggregates

  // Resolusi volume Gudang, Bill & Komplain sesuai moda (Laut vs Udara)
  const volGdg = isAirMode ? totalVfcGdg : totalM3Gdg
  const volBill = isAirMode ? totalVfcBill : totalM3Bill
  const volK = isAirMode ? totalVfcK : totalM3K
  const volUnit = isAirMode ? 'vfc' : 'm³'
  const volDecimals = isAirMode ? 2 : 4
  const isUnderbilled = volGdg > volBill && volBill > 0

  // Status Lebih KG (Apakah ada lebih KG dari Gudang, SJ, atau Komplain Hybrid)
  const hasAnyOw = totalOw > 0 || totalOwGdg > 0 || totalOwSJ > 0 || totalOwK > 0
  const maxOverweight = Math.max(totalOw, totalOwGdg, totalOwSJ, totalOwK)

  const cardBaseClass =
    'relative flex flex-col justify-between p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/20 hover:bg-[var(--color-neutral)]/30 hover:border-[var(--color-border)] transition-all duration-150 shadow-2xs'

  return (
    <div className="p-3 sm:p-3.5 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0 space-y-2.5">
      {/* 6 KPI Executive Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        
        {/* 1. Total Invoice (Utama, Gabungan, Tambahan) */}
        <div className={cardBaseClass}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                Invoice
              </span>
            </div>
            <span className="text-[9.5px] font-semibold text-[var(--color-secondary)] font-mono shrink-0">
              {totalInvoices} inv
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-[var(--color-primary)]">
              {formatNumber(countInvoiceUtama)}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-secondary)]">Utama</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            <span>
              Gab: <strong className="text-blue-500 font-bold">{countBillGabungan}</strong>
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              Tmb: <strong className="text-purple-500 font-bold">{countBillTambahan}</strong>
            </span>
          </div>
        </div>

        {/* 2. Total Resi */}
        <div className={cardBaseClass}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileCheck2 className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                Total Resi
              </span>
            </div>
            {countSelisih > 0 ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                {countSelisih} Selisih
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Cocok
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-[var(--color-primary)]">
              {formatNumber(totalResi)}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-secondary)]">Resi</span>
          </div>

          <div className="text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            {countSelisih > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {countSelisih} resi ada selisih
              </span>
            ) : (
              <span>Semua item kargo cocok</span>
            )}
          </div>
        </div>

        {/* 3. Total Koli (Qty) */}
        <div className={cardBaseClass}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Boxes className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                Total Koli
              </span>
            </div>
            {countQtyKomplainMismatch > 0 ? (
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-0.5 shrink-0"
                title={`${countQtyKomplainMismatch} baris data Qty Komplain berbeda dengan Qty Gudang`}
              >
                <AlertTriangle className="w-2.5 h-2.5" /> K ({countQtyKomplainMismatch})
              </span>
            ) : (
              <span className="text-[9.5px] font-medium text-[var(--color-secondary)] shrink-0 font-mono">
                Koli
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-[var(--color-primary)]">
              {formatNumber(totalQtyGdg > 0 ? totalQtyGdg : totalQtySJ)}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-secondary)]">Koli</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            <span>
              Gdg: <strong className="text-[var(--color-primary)]">{formatNumber(totalQtyGdg)}</strong>
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              SJ: <strong className="text-[var(--color-primary)]">{formatNumber(totalQtySJ)}</strong>
            </span>
            {totalQtyPL > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>PL: {formatNumber(totalQtyPL)}</span>
              </>
            )}
            {totalQtyK > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span className={countQtyKomplainMismatch > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}>
                  K: {formatNumber(totalQtyK)}
                  {countQtyKomplainMismatch > 0 && ' ⚠️'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 4. Total Berat */}
        <div className={cardBaseClass}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Scale className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                Total Berat
              </span>
            </div>
            <span className="text-[9.5px] font-medium text-[var(--color-secondary)] shrink-0 font-mono">
              kg
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-[var(--color-primary)]">
              {formatDecimal(totalWeightGdg > 0 ? totalWeightGdg : totalWeight, 2)}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-secondary)]">kg</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            <span>SJ: {formatDecimal(totalWeightSJ, 1)}</span>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              Bill: <strong className="text-[var(--color-primary)]">{formatDecimal(totalKgBill, 1)}</strong>
            </span>
            {totalWeightK > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span className="text-amber-500 font-medium">K: {formatDecimal(totalWeightK, 1)}</span>
              </>
            )}
          </div>
        </div>

        {/* 5. Volume Kargo (M³ / VFC) - GABUNGAN Gudang, Bill, Komplain, PL */}
        <div className={cardBaseClass}>
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Box className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-secondary)] truncate">
                Volume ({volUnit})
              </span>
            </div>
            {isUnderbilled ? (
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0"
                title={`Underbilled: Selisih ${formatDecimal(volGdg - volBill, volDecimals)} ${volUnit}`}
              >
                Underbilled
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Sesuai
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-[var(--color-primary)]">
              {formatDecimal(volBill, volDecimals)}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-secondary)]">Bill {volUnit}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            <span>Gdg: {formatDecimal(volGdg, volDecimals)}</span>
            {volK > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span className="text-amber-500 font-medium">K: {formatDecimal(volK, volDecimals)}</span>
              </>
            )}
            {totalM3PL > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>PL: {formatDecimal(totalM3PL, 4)}</span>
              </>
            )}
          </div>
        </div>

        {/* 6. Status Lebih KG - Overweight Indicator */}
        <div
          className={`${cardBaseClass} ${
            hasAnyOw
              ? 'border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]'
              : ''
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Scale className={`w-3.5 h-3.5 shrink-0 ${hasAnyOw ? 'text-rose-500' : 'text-[var(--color-secondary)]/80'}`} />
              <span
                className={`text-[10px] uppercase font-bold tracking-wider truncate ${
                  hasAnyOw ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--color-secondary)]'
                }`}
              >
                Lebih KG
              </span>
            </div>
            {hasAnyOw ? (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse shrink-0">
                Overweight
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Normal
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-1.5 my-1">
            {hasAnyOw ? (
              <>
                <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-rose-600 dark:text-rose-400">
                  +{formatNumber(maxOverweight)}
                </span>
                <span className="text-[11px] font-medium text-rose-500">kg Lebih</span>
              </>
            ) : (
              <>
                <span className="text-[18px] sm:text-[19px] font-bold font-mono tabular-nums leading-none tracking-tight text-emerald-600 dark:text-emerald-400">
                  0
                </span>
                <span className="text-[11px] font-medium text-[var(--color-secondary)]">kg Normal</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[var(--color-secondary)] font-mono truncate pt-1 border-t border-[var(--color-border)]/50 mt-1">
            <span>
              Gdg:{' '}
              <strong className={totalOwGdg > 0 ? 'text-rose-500' : 'text-[var(--color-primary)]'}>
                {totalOwGdg > 0 ? `+${formatNumber(totalOwGdg)}` : '0'}
              </strong>
            </span>
            <span className="text-[var(--color-border)]">·</span>
            <span>
              SJ:{' '}
              <strong className={totalOwSJ > 0 ? 'text-amber-500' : 'text-[var(--color-primary)]'}>
                {totalOwSJ > 0 ? `+${formatNumber(totalOwSJ)}` : '0'}
              </strong>
            </span>
            {totalOwK > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>
                  K: <strong className="text-rose-500">+{formatNumber(totalOwK)}</strong>
                </span>
              </>
            )}
            {rasioValue > 0 && (
              <>
                <span className="text-[var(--color-border)]">·</span>
                <span>R: {formatNumber(rasioValue)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Group Pill: Tipe Commodity Filter Bar */}
      {commodityTypes && commodityTypes.length > 0 && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-[var(--color-border)]/60 text-xs overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] shrink-0 select-none">
            <Tags className="w-3.5 h-3.5 text-[var(--color-secondary)]/70" />
            <span>Filter Komoditas:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => onSelectCommodityType?.('ALL')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                selectedCommodityType === 'ALL'
                  ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/15 font-bold shadow-2xs'
                  : 'border border-[var(--color-border)] bg-[var(--color-neutral)]/20 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-tertiary)]/40'
              }`}
            >
              <span>Semua</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] font-semibold">
                {totalResi}
              </span>
            </button>
            {commodityTypes.map((c) => {
              const isSelected = selectedCommodityType === c.type
              return (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => onSelectCommodityType?.(c.type)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border border-[var(--color-tertiary)] text-[var(--color-tertiary)] bg-[var(--color-tertiary)]/15 font-bold shadow-2xs'
                      : 'border border-[var(--color-border)] bg-[var(--color-neutral)]/20 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-tertiary)]/40'
                  }`}
                >
                  <span>{c.type}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] font-semibold">
                    {c.count}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                    {formatDecimal(c.m3, volDecimals)} {volUnit}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
