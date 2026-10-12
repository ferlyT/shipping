import {
  Layers,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Plane,
  Ship,
  Info,
} from 'lucide-react'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type {
  BillingComparisons,
  PeriodBillingMetrics,
  BranchBillingComparison,
} from '../types/billing.types'

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

/* ─────────────────────────────────────────────────────────────────────────────
 * Toolbar Navigasi Periode Bulan & Tahun (Toolbar Periode Audit)
 * ───────────────────────────────────────────────────────────────────────────── */
interface BillingPeriodNavigatorProps {
  selectedYear: number
  selectedMonth: number
  onMonthChange: (year: number, month: number) => void
  onResetCurrentMonth: () => void
  prevMonthName?: string
  lastYearMonthName?: string
}

export function BillingPeriodNavigator({
  selectedYear,
  selectedMonth,
  onMonthChange,
  onResetCurrentMonth,
  prevMonthName,
  lastYearMonthName,
}: BillingPeriodNavigatorProps) {
  const { t } = useTranslation()
  const now = new Date()
  const actualCurrentYear = now.getFullYear()
  const actualCurrentMonth = now.getMonth() + 1
  const isCurrentActualMonth = selectedYear === actualCurrentYear && selectedMonth === actualCurrentMonth

  const handlePrevMonth = () => {
    let m = selectedMonth - 1
    let y = selectedYear
    if (m < 1) {
      m = 12
      y -= 1
    }
    onMonthChange(y, m)
  }

  const handleNextMonth = () => {
    let m = selectedMonth + 1
    let y = selectedYear
    if (m > 12) {
      m = 1
      y += 1
    }
    onMonthChange(y, m)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:px-4 sm:py-3 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] shrink-0">
          <Calendar className="h-4 w-4 text-[var(--color-tertiary)]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-[var(--color-primary)] tracking-wide font-mono">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            {isCurrentActualMonth ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('billing.currentMonthBadge')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                {t('billing.pastAuditBadge')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--color-secondary)]">
            {t('billing.evaluatingVs', {
              prev: prevMonthName || 'Bulan Lalu',
              lastYear: lastYearMonthName || 'Tahun Lalu',
            })}
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
        {!isCurrentActualMonth && (
          <button
            type="button"
            onClick={onResetCurrentMonth}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] transition-colors cursor-pointer"
          >
            <span>{t('billing.currentMonthBadge')} ({MONTH_NAMES[actualCurrentMonth - 1]})</span>
          </button>
        )}

        <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="h-4 w-px bg-[var(--color-border)]" />
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Matriks Komparasi 3 Periode (Tabel Komparasi MoM & YoY)
 * ───────────────────────────────────────────────────────────────────────────── */
interface BillingPeriodMatrixTableProps {
  comparisons: BillingComparisons | undefined
  currentMonth: PeriodBillingMetrics | undefined
  prevMonth: PeriodBillingMetrics | undefined
  lastYearSameMonth: PeriodBillingMetrics | undefined
  selectedBranch?: string
  onSelectBranch?: (branchCode: string) => void
  isLoading?: boolean
  variant?: 'finance' | 'operation'
}

export function BillingPeriodMatrixTable({
  comparisons,
  currentMonth,
  prevMonth,
  lastYearSameMonth,
  selectedBranch = 'ALL',
  onSelectBranch,
  isLoading,
  variant = 'finance',
}: BillingPeriodMatrixTableProps) {
  const { t } = useTranslation()
  const isOperation = variant === 'operation'

  // Ambil data cabang jika difilter
  const isBranchFiltered = selectedBranch && selectedBranch !== 'ALL'
  const branchItem = isBranchFiltered
    ? comparisons?.byBranch?.find((b) => b.branchCode === selectedBranch)
    : undefined

  const curr = isBranchFiltered ? branchItem?.current : undefined
  const prev = isBranchFiltered ? branchItem?.prev : undefined
  const lastYear = isBranchFiltered ? branchItem?.lastYear : undefined

  // Helper untuk hitung % dan diff jika per-cabang
  const calcBranchMetric = (
    cVal?: number,
    pVal?: number,
    lyVal?: number
  ) => {
    const c = cVal ?? 0
    const p = pVal ?? 0
    const ly = lyVal ?? 0
    const momDiff = Number((c - p).toFixed(2))
    const momPercent = p > 0 ? Number((((c - p) / p) * 100).toFixed(1)) : c > 0 ? 100 : 0
    const yoyDiff = Number((c - ly).toFixed(2))
    const yoyPercent = ly > 0 ? Number((((c - ly) / ly) * 100).toFixed(1)) : c > 0 ? 100 : 0
    return { current: c, momDiff, momPercent, yoyDiff, yoyPercent }
  }

  // Row Data Resolution
  const totalInv = isBranchFiltered
    ? calcBranchMetric(curr?.totalInvoices, prev?.totalInvoices, lastYear?.totalInvoices)
    : {
        current: comparisons?.totalInvoices?.current ?? currentMonth?.totalInvoices ?? 0,
        momPercent: comparisons?.totalInvoices?.momPercent,
        yoyPercent: comparisons?.totalInvoices?.yoyPercent,
        momDiff: comparisons?.totalInvoices?.momDiff,
        yoyDiff: comparisons?.totalInvoices?.yoyDiff,
      }

  const totalTag = isBranchFiltered
    ? calcBranchMetric(curr?.totalTagihan, prev?.totalTagihan, lastYear?.totalTagihan)
    : {
        current: comparisons?.totalTagihan?.current ?? currentMonth?.totalTagihan ?? 0,
        momPercent: comparisons?.totalTagihan?.momPercent,
        yoyPercent: comparisons?.totalTagihan?.yoyPercent,
        momDiff: comparisons?.totalTagihan?.momDiff,
        yoyDiff: comparisons?.totalTagihan?.yoyDiff,
      }

  const invUdara = isBranchFiltered
    ? calcBranchMetric(curr?.invoicesUdara, prev?.invoicesUdara, lastYear?.invoicesUdara)
    : {
        current: comparisons?.invoicesUdara?.current ?? currentMonth?.invoicesUdara ?? 0,
        momPercent: comparisons?.invoicesUdara?.momPercent,
        yoyPercent: comparisons?.invoicesUdara?.yoyPercent,
        momDiff: comparisons?.invoicesUdara?.momDiff,
        yoyDiff: comparisons?.invoicesUdara?.yoyDiff,
      }

  const tagUdara = isBranchFiltered
    ? calcBranchMetric(curr?.tagihanUdara, prev?.tagihanUdara, lastYear?.tagihanUdara)
    : {
        current: comparisons?.tagihanUdara?.current ?? currentMonth?.tagihanUdara ?? 0,
        momPercent: comparisons?.tagihanUdara?.momPercent,
        yoyPercent: comparisons?.tagihanUdara?.yoyPercent,
        momDiff: comparisons?.tagihanUdara?.momDiff,
        yoyDiff: comparisons?.tagihanUdara?.yoyDiff,
      }

  const invLaut = isBranchFiltered
    ? calcBranchMetric(curr?.invoicesLaut, prev?.invoicesLaut, lastYear?.invoicesLaut)
    : {
        current: comparisons?.invoicesLaut?.current ?? currentMonth?.invoicesLaut ?? 0,
        momPercent: comparisons?.invoicesLaut?.momPercent,
        yoyPercent: comparisons?.invoicesLaut?.yoyPercent,
        momDiff: comparisons?.invoicesLaut?.momDiff,
        yoyDiff: comparisons?.invoicesLaut?.yoyDiff,
      }

  const tagLaut = isBranchFiltered
    ? calcBranchMetric(curr?.tagihanLaut, prev?.tagihanLaut, lastYear?.tagihanLaut)
    : {
        current: comparisons?.tagihanLaut?.current ?? currentMonth?.tagihanLaut ?? 0,
        momPercent: comparisons?.tagihanLaut?.momPercent,
        yoyPercent: comparisons?.tagihanLaut?.yoyPercent,
        momDiff: comparisons?.tagihanLaut?.momDiff,
        yoyDiff: comparisons?.tagihanLaut?.yoyDiff,
      }

  const avgInv = isBranchFiltered
    ? calcBranchMetric(curr?.avgInvoiceValue, prev?.avgInvoiceValue, lastYear?.avgInvoiceValue)
    : {
        current: comparisons?.avgInvoiceValue?.current ?? currentMonth?.avgInvoiceValue ?? 0,
        momPercent: comparisons?.avgInvoiceValue?.momPercent,
        yoyPercent: comparisons?.avgInvoiceValue?.yoyPercent,
        momDiff: comparisons?.avgInvoiceValue?.momDiff,
        yoyDiff: comparisons?.avgInvoiceValue?.yoyDiff,
      }

  const uniqCust = isBranchFiltered
    ? calcBranchMetric(curr?.uniqueCustomers, prev?.uniqueCustomers, lastYear?.uniqueCustomers)
    : {
        current: comparisons?.uniqueCustomers?.current ?? currentMonth?.uniqueCustomers ?? 0,
        momPercent: comparisons?.uniqueCustomers?.momPercent,
        yoyPercent: comparisons?.uniqueCustomers?.yoyPercent,
        momDiff: comparisons?.uniqueCustomers?.momDiff,
        yoyDiff: comparisons?.uniqueCustomers?.yoyDiff,
      }

  // Metrik tambahan khusus operasional (Kuantiti & Rasio non-moneter)
  const airShareCurrent = totalInv.current > 0 ? Number(((invUdara.current / totalInv.current) * 100).toFixed(1)) : 0
  const seaShareCurrent = totalInv.current > 0 ? Number(((invLaut.current / totalInv.current) * 100).toFixed(1)) : 0
  const avgInvCustCurrent = uniqCust.current > 0 ? Number((totalInv.current / uniqCust.current).toFixed(1)) : 0

  const prevTotInv = (isBranchFiltered ? prev?.totalInvoices : prevMonth?.totalInvoices) || 0
  const prevAirInv = (isBranchFiltered ? prev?.invoicesUdara : prevMonth?.invoicesUdara) || 0
  const prevSeaInv = (isBranchFiltered ? prev?.invoicesLaut : prevMonth?.invoicesLaut) || 0
  const prevCust = (isBranchFiltered ? prev?.uniqueCustomers : prevMonth?.uniqueCustomers) || 0

  const lyTotInv = (isBranchFiltered ? lastYear?.totalInvoices : lastYearSameMonth?.totalInvoices) || 0
  const lyAirInv = (isBranchFiltered ? lastYear?.invoicesUdara : lastYearSameMonth?.invoicesUdara) || 0
  const lySeaInv = (isBranchFiltered ? lastYear?.invoicesLaut : lastYearSameMonth?.invoicesLaut) || 0
  const lyCust = (isBranchFiltered ? lastYear?.uniqueCustomers : lastYearSameMonth?.uniqueCustomers) || 0

  const prevAirPct = prevTotInv > 0 ? (prevAirInv / prevTotInv) * 100 : 0
  const lyAirPct = lyTotInv > 0 ? (lyAirInv / lyTotInv) * 100 : 0
  const airShareMomDiff = Number((airShareCurrent - prevAirPct).toFixed(1))
  const airShareMomPct = prevAirPct > 0 ? Number((((airShareCurrent - prevAirPct) / prevAirPct) * 100).toFixed(1)) : undefined
  const airShareYoyDiff = Number((airShareCurrent - lyAirPct).toFixed(1))
  const airShareYoyPct = lyAirPct > 0 ? Number((((airShareCurrent - lyAirPct) / lyAirPct) * 100).toFixed(1)) : undefined

  const prevSeaPct = prevTotInv > 0 ? (prevSeaInv / prevTotInv) * 100 : 0
  const lySeaPct = lyTotInv > 0 ? (lySeaInv / lyTotInv) * 100 : 0
  const seaShareMomDiff = Number((seaShareCurrent - prevSeaPct).toFixed(1))
  const seaShareMomPct = prevSeaPct > 0 ? Number((((seaShareCurrent - prevSeaPct) / prevSeaPct) * 100).toFixed(1)) : undefined
  const seaShareYoyDiff = Number((seaShareCurrent - lySeaPct).toFixed(1))
  const seaShareYoyPct = lySeaPct > 0 ? Number((((seaShareCurrent - lySeaPct) / lySeaPct) * 100).toFixed(1)) : undefined

  const prevAvgCust = prevCust > 0 ? prevTotInv / prevCust : 0
  const lyAvgCust = lyCust > 0 ? lyTotInv / lyCust : 0
  const avgCustMomDiff = Number((avgInvCustCurrent - prevAvgCust).toFixed(1))
  const avgCustMomPct = prevAvgCust > 0 ? Number((((avgInvCustCurrent - prevAvgCust) / prevAvgCust) * 100).toFixed(1)) : undefined
  const avgCustYoyDiff = Number((avgInvCustCurrent - lyAvgCust).toFixed(1))
  const avgCustYoyPct = lyAvgCust > 0 ? Number((((avgInvCustCurrent - lyAvgCust) / lyAvgCust) * 100).toFixed(1)) : undefined

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 font-[var(--font-body)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            isOperation ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-[var(--color-neutral)] text-[var(--color-primary)]"
          )}>
            <Layers className={cn("h-4 w-4", isOperation ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-tertiary)]")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                {isOperation ? t('billing.opMatrixTitle') : t('billing.comparisonMatrixTitle')}
              </h4>
              {isBranchFiltered && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-[var(--color-tertiary)]/15 border border-[var(--color-tertiary)]/40 text-[var(--color-tertiary)]">
                  <span>{branchItem?.branchName || selectedBranch}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-secondary)]">
              {isBranchFiltered
                ? `Filter aktif: Cabang ${branchItem?.branchName || selectedBranch} (${isOperation ? `${curr?.totalInvoices || 0} faktur terbit` : `${branchItem?.shareOfTotal || 0}% pangsa omzet`})`
                : isOperation
                  ? t('billing.opMatrixSubtitle')
                  : t('billing.comparisonMatrixSubtitle')}
            </p>
          </div>
        </div>

        {isBranchFiltered && onSelectBranch && (
          <button
            type="button"
            onClick={() => onSelectBranch('ALL')}
            className="text-[11px] font-semibold text-[var(--color-tertiary)] hover:underline self-start sm:self-auto cursor-pointer"
          >
            ✕ Tampilkan Semua Cabang
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)]">
            <tr>
              <th className="py-2 pr-2">Metrik</th>
              <th className="py-2 px-1 text-right">Saat Ini</th>
              <th className="py-2 px-1 text-right">MoM</th>
              <th className="py-2 pl-1 text-right">YoY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isOperation ? (
              <>
                <MatrixRow
                  label="Total Faktur Terbit"
                  current={totalInv.current}
                  momPercent={totalInv.momPercent}
                  yoyPercent={totalInv.yoyPercent}
                  momDiff={totalInv.momDiff}
                  yoyDiff={totalInv.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Faktur Moda Udara"
                  current={invUdara.current}
                  momPercent={invUdara.momPercent}
                  yoyPercent={invUdara.yoyPercent}
                  momDiff={invUdara.momDiff}
                  yoyDiff={invUdara.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Faktur Moda Laut"
                  current={invLaut.current}
                  momPercent={invLaut.momPercent}
                  yoyPercent={invLaut.yoyPercent}
                  momDiff={invLaut.momDiff}
                  yoyDiff={invLaut.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Customer Ditagih"
                  current={uniqCust.current}
                  momPercent={uniqCust.momPercent}
                  yoyPercent={uniqCust.yoyPercent}
                  momDiff={uniqCust.momDiff}
                  yoyDiff={uniqCust.yoyDiff}
                  unit="Cust"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label={t('billing.airVolumeShare')}
                  current={airShareCurrent}
                  momPercent={airShareMomPct}
                  yoyPercent={airShareYoyPct}
                  momDiff={airShareMomDiff}
                  yoyDiff={airShareYoyDiff}
                  unit="%"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label={t('billing.seaVolumeShare')}
                  current={seaShareCurrent}
                  momPercent={seaShareMomPct}
                  yoyPercent={seaShareYoyPct}
                  momDiff={seaShareMomDiff}
                  yoyDiff={seaShareYoyDiff}
                  unit="%"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label={t('billing.avgInvPerCustomer')}
                  current={avgInvCustCurrent}
                  momPercent={avgCustMomPct}
                  yoyPercent={avgCustYoyPct}
                  momDiff={avgCustMomDiff}
                  yoyDiff={avgCustYoyDiff}
                  unit="Bill/Cust"
                  isLoading={isLoading}
                />
              </>
            ) : (
              <>
                <MatrixRow
                  label="Total Faktur"
                  current={totalInv.current}
                  momPercent={totalInv.momPercent}
                  yoyPercent={totalInv.yoyPercent}
                  momDiff={totalInv.momDiff}
                  yoyDiff={totalInv.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Total Tagihan"
                  current={totalTag.current}
                  momPercent={totalTag.momPercent}
                  yoyPercent={totalTag.yoyPercent}
                  momDiff={totalTag.momDiff}
                  yoyDiff={totalTag.yoyDiff}
                  isCurrency
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Faktur Udara"
                  current={invUdara.current}
                  momPercent={invUdara.momPercent}
                  yoyPercent={invUdara.yoyPercent}
                  momDiff={invUdara.momDiff}
                  yoyDiff={invUdara.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Tagihan Udara"
                  current={tagUdara.current}
                  momPercent={tagUdara.momPercent}
                  yoyPercent={tagUdara.yoyPercent}
                  momDiff={tagUdara.momDiff}
                  yoyDiff={tagUdara.yoyDiff}
                  isCurrency
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Faktur Laut"
                  current={invLaut.current}
                  momPercent={invLaut.momPercent}
                  yoyPercent={invLaut.yoyPercent}
                  momDiff={invLaut.momDiff}
                  yoyDiff={invLaut.yoyDiff}
                  unit="Bill"
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Tagihan Laut"
                  current={tagLaut.current}
                  momPercent={tagLaut.momPercent}
                  yoyPercent={tagLaut.yoyPercent}
                  momDiff={tagLaut.momDiff}
                  yoyDiff={tagLaut.yoyDiff}
                  isCurrency
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Rata-rata / Bill"
                  current={avgInv.current}
                  momPercent={avgInv.momPercent}
                  yoyPercent={avgInv.yoyPercent}
                  momDiff={avgInv.momDiff}
                  yoyDiff={avgInv.yoyDiff}
                  isCurrency
                  isLoading={isLoading}
                />
                <MatrixRow
                  label="Customer Ditagih"
                  current={uniqCust.current}
                  momPercent={uniqCust.momPercent}
                  yoyPercent={uniqCust.yoyPercent}
                  momDiff={uniqCust.momDiff}
                  yoyDiff={uniqCust.yoyDiff}
                  unit="Cust"
                  isLoading={isLoading}
                />
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
        <span>MoM: vs {prevMonth?.monthName || 'Bulan Lalu'}</span>
        <span>YoY: vs {lastYearSameMonth?.monthName || 'Tahun Lalu'}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Matriks Komparasi Penagihan Per Cabang (Branch Comparison Table)
 * ───────────────────────────────────────────────────────────────────────────── */
interface BillingBranchComparisonTableProps {
  branchComparisons: BranchBillingComparison[] | undefined
  selectedBranch: string
  onSelectBranch: (branchCode: string) => void
  isLoading?: boolean
}

export function BillingBranchComparisonTable({
  branchComparisons = [],
  selectedBranch,
  onSelectBranch,
  isLoading,
}: BillingBranchComparisonTableProps) {
  const { t } = useTranslation()

  // Branch code color styling helper
  const getBranchBadgeClass = (code: string) => {
    switch (code) {
      case 'SG':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30'
      case 'GZ':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
      case 'HK':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
      case 'YW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      case 'SH':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      case 'SZ':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
    }
  }

  const renderGrowthBadge = (percent: number, diff: number) => {
    const isUp = percent > 0
    const isDown = percent < 0
    const isZero = percent === 0
    const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-bold tabular-nums text-[10.5px]",
          isUp
            ? "text-emerald-600 dark:text-emerald-400"
            : isDown
              ? "text-rose-600 dark:text-rose-400"
              : "text-[var(--color-secondary)]"
        )}
        title={`${isUp ? '+' : ''}${formatCurrency(diff)}`}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span>{isUp ? '+' : ''}{percent.toFixed(1)}%</span>
      </span>
    )
  }

  // Hitung total akumulasi
  const totalOmzet = branchComparisons.reduce((acc, b) => acc + (b.current.totalTagihan || 0), 0)
  const totalBillCount = branchComparisons.reduce((acc, b) => acc + (b.current.totalInvoices || 0), 0)
  const totalUdaraAmount = branchComparisons.reduce((acc, b) => acc + (b.current.tagihanUdara || 0), 0)
  const totalLautAmount = branchComparisons.reduce((acc, b) => acc + (b.current.tagihanLaut || 0), 0)

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs space-y-4 font-[var(--font-body)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-neutral)] text-[var(--color-primary)]">
            <Building2 className="h-4 w-4 text-[var(--color-tertiary)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                {t('billing.branchComparisonTitle')}
              </h3>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400"
                title="Sistem secara otomatis mengagregasi kode transaksi '--' dan 'SG' sebagai cabang Singapore"
              >
                <Info className="w-3 h-3 shrink-0" />
                <span>🇸🇬 Singapore mencakup kode 'SG' &amp; '--'</span>
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
              {t('billing.branchComparisonSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick Filter Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onSelectBranch('ALL')}
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer shadow-2xs",
              selectedBranch === 'ALL'
                ? "bg-[var(--color-primary)] text-[var(--color-surface)] border-[var(--color-primary)]"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
            )}
          >
            Semua
          </button>
          {branchComparisons.slice(0, 5).map((b) => (
            <button
              key={b.branchCode}
              type="button"
              onClick={() => onSelectBranch(selectedBranch === b.branchCode ? 'ALL' : b.branchCode)}
              className={cn(
                "px-2 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer shadow-2xs flex items-center gap-1",
                selectedBranch === b.branchCode
                  ? "bg-[var(--color-tertiary)] text-[var(--color-surface)] border-[var(--color-tertiary)]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <span>{b.branchCode}</span>
              <span className="text-[9.5px] opacity-75 font-mono">{b.shareOfTotal}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Per Cabang */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)]">
            <tr>
              <th className="py-2.5 pr-3">Cabang</th>
              <th className="py-2.5 px-2 text-right">Tagihan Bulan Ini</th>
              <th className="py-2.5 px-2 text-right">MoM</th>
              <th className="py-2.5 px-2 text-right">YoY</th>
              <th className="py-2.5 px-2 text-right">Total Faktur</th>
              <th className="py-2.5 px-2 text-right">Udara / Laut</th>
              <th className="py-2.5 pl-3 text-right">Pangsa Pasar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)] font-mono">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="py-3 px-2">
                    <div className="h-5 w-full rounded skeleton-shimmer" />
                  </td>
                </tr>
              ))
            ) : branchComparisons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-xs text-[var(--color-secondary)]">
                  Belum ada data penagihan cabang untuk periode ini
                </td>
              </tr>
            ) : (
              branchComparisons.map((b) => {
                const isSelected = selectedBranch === b.branchCode
                const isSG = b.branchCode === 'SG'
                const airShare = b.current.totalTagihan > 0
                  ? (b.current.tagihanUdara / b.current.totalTagihan) * 100
                  : 0
                const seaShare = b.current.totalTagihan > 0
                  ? (b.current.tagihanLaut / b.current.totalTagihan) * 100
                  : 0

                return (
                  <tr
                    key={b.branchCode}
                    onClick={() => onSelectBranch(isSelected ? 'ALL' : b.branchCode)}
                    className={cn(
                      "hover:bg-[var(--color-neutral)]/40 transition-colors cursor-pointer group",
                      isSelected && "bg-[var(--color-tertiary)]/10 font-bold"
                    )}
                  >
                    {/* Nama Cabang */}
                    <td className="py-2.5 pr-3 font-[var(--font-body)]">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider font-mono shrink-0",
                            getBranchBadgeClass(b.branchCode)
                          )}
                        >
                          {b.branchCode}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--color-primary)] block whitespace-nowrap text-xs">
                            {b.branchName}
                          </span>
                          {isSG && (
                            <span className="text-[9.5px] text-[var(--color-secondary)] block">
                              inkl. kode '--'
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Total Tagihan */}
                    <td className="py-2.5 px-2 text-right font-bold text-[var(--color-primary)] tabular-nums">
                      {formatCurrency(b.current.totalTagihan)}
                    </td>

                    {/* MoM % */}
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {renderGrowthBadge(b.momTagihanPercent, b.momTagihanDiff)}
                    </td>

                    {/* YoY % */}
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {renderGrowthBadge(b.yoyTagihanPercent, b.yoyTagihanDiff)}
                    </td>

                    {/* Total Faktur */}
                    <td className="py-2.5 px-2 text-right tabular-nums text-[var(--color-primary)]">
                      <span>{formatNumber(b.current.totalInvoices)} Bill</span>
                      <span className="block text-[9.5px] text-[var(--color-secondary)]">
                        {b.momInvoicesDiff >= 0 ? '+' : ''}{b.momInvoicesDiff} MoM
                      </span>
                    </td>

                    {/* Udara vs Laut */}
                    <td className="py-2.5 px-2 text-right text-[11px] tabular-nums">
                      <div className="flex flex-col items-end gap-0.5 font-[var(--font-body)]">
                        <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                          <Plane className="w-2.5 h-2.5" />
                          <span>{airShare.toFixed(0)}%</span>
                          <span className="text-[9.5px] opacity-75 font-mono">({formatNumber(b.current.invoicesUdara)})</span>
                        </span>
                        <span className="text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1">
                          <Ship className="w-2.5 h-2.5" />
                          <span>{seaShare.toFixed(0)}%</span>
                          <span className="text-[9.5px] opacity-75 font-mono">({formatNumber(b.current.invoicesLaut)})</span>
                        </span>
                      </div>
                    </td>

                    {/* Pangsa Pasar */}
                    <td className="py-2.5 pl-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-[var(--color-neutral)] overflow-hidden hidden sm:block">
                          <div
                            className="bg-[var(--color-tertiary)] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, b.shareOfTotal)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[var(--color-primary)] text-xs tabular-nums">
                          {b.shareOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>

          {/* Footer Total */}
          {!isLoading && branchComparisons.length > 0 && (
            <tfoot className="border-t-2 border-[var(--color-border)] font-mono font-bold text-xs bg-[var(--color-neutral)]/20">
              <tr>
                <td className="py-2.5 pr-3 text-[var(--color-primary)] font-[var(--font-body)]">
                  TOTAL KONSOLIDASI
                </td>
                <td className="py-2.5 px-2 text-right text-[var(--color-primary)]">
                  {formatCurrency(totalOmzet)}
                </td>
                <td colSpan={2} className="py-2.5 px-2 text-center text-[11px] text-[var(--color-secondary)] font-[var(--font-body)]">
                  {branchComparisons.length} Cabang Aktif
                </td>
                <td className="py-2.5 px-2 text-right text-[var(--color-primary)]">
                  {formatNumber(totalBillCount)} Bill
                </td>
                <td className="py-2.5 px-2 text-right text-[10.5px] text-[var(--color-secondary)] font-[var(--font-body)]">
                  <span>✈️ {formatCurrency(totalUdaraAmount)}</span>
                  <span className="block">🚢 {formatCurrency(totalLautAmount)}</span>
                </td>
                <td className="py-2.5 pl-3 text-right text-[var(--color-primary)]">
                  100%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-secondary)] flex-wrap gap-2">
        <span>💡 Klik baris cabang untuk memfilter Matriks Komparasi 8 Metrik di atas ke cabang tersebut.</span>
        <span>🇸🇬 Singapore mencakup nomor invoice `--S...`, `--A...`, serta kode `SG` &amp; `--`.</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-komponen: Baris Matriks Komparasi 3 Periode
 * ───────────────────────────────────────────────────────────────────────────── */
interface MatrixRowProps {
  label: string
  current: number
  momPercent: number | undefined
  yoyPercent: number | undefined
  momDiff?: number
  yoyDiff?: number
  isCurrency?: boolean
  unit?: string
  isLoading?: boolean
}

function MatrixRow({
  label,
  current,
  momPercent,
  yoyPercent,
  momDiff,
  yoyDiff,
  isCurrency,
  unit,
  isLoading,
}: MatrixRowProps) {
  const renderBadge = (pct: number | undefined, diff: number | undefined) => {
    if (pct === undefined) return <span className="text-[var(--color-secondary)]">—</span>
    const isUp = pct > 0
    const isDown = pct < 0
    const isZero = pct === 0
    const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight

    const formattedDiff = diff !== undefined
      ? isCurrency
        ? formatCurrency(Math.abs(diff))
        : `${formatNumber(Math.abs(diff))}${unit ? ' ' + unit : ''}`
      : ''

    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-bold tabular-nums text-[10.5px]",
          isUp
            ? "text-emerald-600 dark:text-emerald-400"
            : isDown
              ? "text-rose-600 dark:text-rose-400"
              : "text-[var(--color-secondary)]"
        )}
        title={diff !== undefined ? `${isUp ? '+' : isDown ? '-' : ''}${formattedDiff}` : undefined}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span>{isUp ? '+' : ''}{pct.toFixed(1)}%</span>
      </span>
    )
  }

  return (
    <tr className="hover:bg-[var(--color-neutral)]/30 transition-colors">
      <td className="py-2 pr-2 font-medium text-[var(--color-primary)] whitespace-nowrap" title={label}>
        {label}
      </td>
      <td className="py-2 px-1 text-right font-mono font-bold text-[var(--color-primary)] tabular-nums">
        {isLoading ? (
          <div className="h-4 w-14 ml-auto rounded skeleton-shimmer" />
        ) : isCurrency ? (
          formatCurrency(current)
        ) : (
          `${formatNumber(current)}${unit ? ' ' + unit : ''}`
        )}
      </td>
      <td className="py-2 px-1 text-right tabular-nums">
        {isLoading ? (
          <div className="h-4 w-10 ml-auto rounded skeleton-shimmer" />
        ) : (
          renderBadge(momPercent, momDiff)
        )}
      </td>
      <td className="py-2 pl-1 text-right tabular-nums">
        {isLoading ? (
          <div className="h-4 w-10 ml-auto rounded skeleton-shimmer" />
        ) : (
          renderBadge(yoyPercent, yoyDiff)
        )}
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-komponen: Pill Pertumbuhan MoM / YoY (Untuk KPI Cards)
 * ───────────────────────────────────────────────────────────────────────────── */
interface GrowthPillProps {
  label: 'MoM' | 'YoY'
  percent: number | undefined
  diff?: number
  prevValue?: number
  unit?: string
  isCurrency?: boolean
}

export function GrowthPill({
  label,
  percent,
  diff,
  prevValue,
  unit,
  isCurrency,
}: GrowthPillProps) {
  if (percent === undefined) return null

  const isUp = percent > 0
  const isZero = percent === 0

  const colorClass = isZero
    ? "text-[var(--color-secondary)] border-[var(--color-border)]"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10"

  const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight

  const formattedPrev = prevValue !== undefined
    ? isCurrency
      ? formatCurrency(prevValue)
      : `${formatNumber(prevValue)}${unit ? ' ' + unit : ''}`
    : ''

  const formattedDiff = diff !== undefined
    ? isCurrency
      ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`
      : `${diff >= 0 ? '+' : ''}${formatNumber(diff)}${unit ? ' ' + unit : ''}`
    : ''

  const titleText = prevValue !== undefined
    ? `${label === 'MoM' ? 'Bulan Lalu' : 'Tahun Lalu'}: ${formattedPrev} (${formattedDiff})`
    : undefined

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border tabular-nums transition-colors",
        colorClass
      )}
      title={titleText}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span>{isUp ? '+' : ''}{percent.toFixed(1)}% {label}</span>
    </span>
  )
}
