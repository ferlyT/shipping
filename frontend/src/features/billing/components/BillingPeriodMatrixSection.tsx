import { Layers, Calendar, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { BillingComparisons, PeriodBillingMetrics } from '../types/billing.types'

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
  isLoading?: boolean
}

export function BillingPeriodMatrixTable({
  comparisons,
  currentMonth,
  prevMonth,
  lastYearSameMonth,
  isLoading,
}: BillingPeriodMatrixTableProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 font-[var(--font-body)]">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-neutral)] text-[var(--color-primary)]">
          <Layers className="h-4 w-4 text-[var(--color-tertiary)]" />
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
            {t('billing.comparisonMatrixTitle')}
          </h4>
          <p className="text-[11px] text-[var(--color-secondary)]">
            {t('billing.comparisonMatrixSubtitle')}
          </p>
        </div>
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
            <MatrixRow
              label="Total Faktur"
              current={comparisons?.totalInvoices?.current ?? currentMonth?.totalInvoices ?? 0}
              momPercent={comparisons?.totalInvoices?.momPercent}
              yoyPercent={comparisons?.totalInvoices?.yoyPercent}
              momDiff={comparisons?.totalInvoices?.momDiff}
              yoyDiff={comparisons?.totalInvoices?.yoyDiff}
              unit="Bill"
              isLoading={isLoading}
            />
            <MatrixRow
              label="Total Tagihan"
              current={comparisons?.totalTagihan?.current ?? currentMonth?.totalTagihan ?? 0}
              momPercent={comparisons?.totalTagihan?.momPercent}
              yoyPercent={comparisons?.totalTagihan?.yoyPercent}
              momDiff={comparisons?.totalTagihan?.momDiff}
              yoyDiff={comparisons?.totalTagihan?.yoyDiff}
              isCurrency
              isLoading={isLoading}
            />
            <MatrixRow
              label="Faktur Udara"
              current={comparisons?.invoicesUdara?.current ?? currentMonth?.invoicesUdara ?? 0}
              momPercent={comparisons?.invoicesUdara?.momPercent}
              yoyPercent={comparisons?.invoicesUdara?.yoyPercent}
              momDiff={comparisons?.invoicesUdara?.momDiff}
              yoyDiff={comparisons?.invoicesUdara?.yoyDiff}
              unit="Bill"
              isLoading={isLoading}
            />
            <MatrixRow
              label="Tagihan Udara"
              current={comparisons?.tagihanUdara?.current ?? currentMonth?.tagihanUdara ?? 0}
              momPercent={comparisons?.tagihanUdara?.momPercent}
              yoyPercent={comparisons?.tagihanUdara?.yoyPercent}
              momDiff={comparisons?.tagihanUdara?.momDiff}
              yoyDiff={comparisons?.tagihanUdara?.yoyDiff}
              isCurrency
              isLoading={isLoading}
            />
            <MatrixRow
              label="Faktur Laut"
              current={comparisons?.invoicesLaut?.current ?? currentMonth?.invoicesLaut ?? 0}
              momPercent={comparisons?.invoicesLaut?.momPercent}
              yoyPercent={comparisons?.invoicesLaut?.yoyPercent}
              momDiff={comparisons?.invoicesLaut?.momDiff}
              yoyDiff={comparisons?.invoicesLaut?.yoyDiff}
              unit="Bill"
              isLoading={isLoading}
            />
            <MatrixRow
              label="Tagihan Laut"
              current={comparisons?.tagihanLaut?.current ?? currentMonth?.tagihanLaut ?? 0}
              momPercent={comparisons?.tagihanLaut?.momPercent}
              yoyPercent={comparisons?.tagihanLaut?.yoyPercent}
              momDiff={comparisons?.tagihanLaut?.momDiff}
              yoyDiff={comparisons?.tagihanLaut?.yoyDiff}
              isCurrency
              isLoading={isLoading}
            />
            <MatrixRow
              label="Rata-rata / Bill"
              current={comparisons?.avgInvoiceValue?.current ?? currentMonth?.avgInvoiceValue ?? 0}
              momPercent={comparisons?.avgInvoiceValue?.momPercent}
              yoyPercent={comparisons?.avgInvoiceValue?.yoyPercent}
              momDiff={comparisons?.avgInvoiceValue?.momDiff}
              yoyDiff={comparisons?.avgInvoiceValue?.yoyDiff}
              isCurrency
              isLoading={isLoading}
            />
            <MatrixRow
              label="Customer Ditagih"
              current={comparisons?.uniqueCustomers?.current ?? currentMonth?.uniqueCustomers ?? 0}
              momPercent={comparisons?.uniqueCustomers?.momPercent}
              yoyPercent={comparisons?.uniqueCustomers?.yoyPercent}
              momDiff={comparisons?.uniqueCustomers?.momDiff}
              yoyDiff={comparisons?.uniqueCustomers?.yoyDiff}
              unit="Cust"
              isLoading={isLoading}
            />
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
      <td className="py-2 pr-2 font-medium text-[var(--color-primary)] truncate max-w-[110px]" title={label}>
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
