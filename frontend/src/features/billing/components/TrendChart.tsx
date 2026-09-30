import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency, formatCompactRupiah, formatNumber } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { BillingTrendPoint } from '../types/billing.types'
import { CustomXAxisTick } from './ChartTick'

export type MetricMode = 'count' | 'value'
export type TrendModeFilter = 'all' | 'udara' | 'laut'

interface TrendChartProps {
  data: BillingTrendPoint[]
  isLoading: boolean
  emptyMessage: string
  isMobile: boolean
  metric: MetricMode
  modeFilter?: TrendModeFilter
  showYoY?: boolean
  isMonthly?: boolean
}

export function TrendChart({
  data,
  isLoading,
  emptyMessage,
  isMobile,
  metric,
  modeFilter = 'all',
  showYoY = true,
  isMonthly = false,
}: TrendChartProps) {
  const { t } = useTranslation()

  const totals = useMemo(() => {
    let billUdara = 0
    let tagihanUdara = 0
    let billLaut = 0
    let tagihanLaut = 0
    let totalBill = 0
    let totalTagihan = 0

    let prevBillUdara = 0
    let prevTagihanUdara = 0
    let prevBillLaut = 0
    let prevTagihanLaut = 0
    let prevTotalBill = 0
    let prevTotalTagihan = 0
    let hasYoYData = false

    for (const row of data) {
      const uCount = row.billUdara ?? 0
      const uVal = row.tagihanUdara ?? 0
      const lCount = row.billLaut ?? 0
      const lVal = row.tagihanLaut ?? 0

      billUdara += uCount
      tagihanUdara += uVal
      billLaut += lCount
      tagihanLaut += lVal
      totalBill += row.totalBill ?? (uCount + lCount)
      totalTagihan += row.totalTagihan ?? (uVal + lVal)

      if (row.prevTotalBill !== undefined || row.prevTotalTagihan !== undefined) {
        hasYoYData = true
        prevBillUdara += row.prevBillUdara ?? 0
        prevTagihanUdara += row.prevTagihanUdara ?? 0
        prevBillLaut += row.prevBillLaut ?? 0
        prevTagihanLaut += row.prevTagihanLaut ?? 0
        prevTotalBill += row.prevTotalBill ?? 0
        prevTotalTagihan += row.prevTotalTagihan ?? 0
      }
    }

    const uPct = totalBill > 0 ? Math.round((billUdara / totalBill) * 100) : 0
    const lPct = totalBill > 0 ? 100 - uPct : 0

    const uValPct = totalTagihan > 0 ? Math.round((tagihanUdara / totalTagihan) * 100) : 0
    const lValPct = totalTagihan > 0 ? 100 - uValPct : 0

    const activeCurrent =
      metric === 'count'
        ? modeFilter === 'all'
          ? totalBill
          : modeFilter === 'udara'
          ? billUdara
          : billLaut
        : modeFilter === 'all'
        ? totalTagihan
        : modeFilter === 'udara'
        ? tagihanUdara
        : tagihanLaut

    const activePrev =
      metric === 'count'
        ? modeFilter === 'all'
          ? prevTotalBill
          : modeFilter === 'udara'
          ? prevBillUdara
          : prevBillLaut
        : modeFilter === 'all'
        ? prevTotalTagihan
        : modeFilter === 'udara'
        ? prevTagihanUdara
        : prevTagihanLaut

    const currUdara = metric === 'count' ? billUdara : tagihanUdara
    const prevUdara = metric === 'count' ? prevBillUdara : prevTagihanUdara
    const yoyUdaraGrowthPct =
      prevUdara > 0
        ? Number((((currUdara - prevUdara) / prevUdara) * 100).toFixed(1))
        : (currUdara > 0 ? 100 : 0)
    const yoyUdaraDiff = currUdara - prevUdara

    const currLaut = metric === 'count' ? billLaut : tagihanLaut
    const prevLaut = metric === 'count' ? prevBillLaut : prevTagihanLaut
    const yoyLautGrowthPct =
      prevLaut > 0
        ? Number((((currLaut - prevLaut) / prevLaut) * 100).toFixed(1))
        : (currLaut > 0 ? 100 : 0)
    const yoyLautDiff = currLaut - prevLaut

    const yoyGrowthPct =
      activePrev > 0
        ? Number((((activeCurrent - activePrev) / activePrev) * 100).toFixed(1))
        : (activeCurrent > 0 ? 100 : 0)

    const yoyDiff = activeCurrent - activePrev

    return {
      billUdara,
      tagihanUdara,
      billLaut,
      tagihanLaut,
      totalBill,
      totalTagihan,
      uPct,
      lPct,
      uValPct,
      lValPct,
      hasYoYData,
      prevBillUdara,
      prevTagihanUdara,
      prevBillLaut,
      prevTagihanLaut,
      prevTotalBill,
      prevTotalTagihan,
      activeCurrent,
      activePrev,
      yoyGrowthPct,
      yoyDiff,
      currUdara,
      prevUdara,
      yoyUdaraGrowthPct,
      yoyUdaraDiff,
      currLaut,
      prevLaut,
      yoyLautGrowthPct,
      yoyLautDiff,
    }
  }, [data, metric, modeFilter])

  if (isLoading) {
    return <div className="h-[280px] sm:h-[340px] w-full skeleton-shimmer rounded-xl" />
  }

  if (data.length === 0) {
    return (
      <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-sm text-[var(--color-secondary)] text-center px-4 font-[var(--font-body)]">
        {emptyMessage}
      </div>
    )
  }

  const isCount = metric === 'count'

  return (
    <div className="w-full space-y-3.5">
      {/* Mini Summary Banner: Per-Moda Split & YoY Overview */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-[var(--font-label)]">
        {(modeFilter === 'all' || modeFilter === 'udara') && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            <span className="font-semibold">✈️ {t('common.air')}:</span>
            <span className="font-bold tabular-nums">
              {isCount ? `${formatNumber(totals.billUdara)} Bill` : formatCompactRupiah(totals.tagihanUdara)}
            </span>
            {modeFilter === 'all' && (
              <span className="text-[10px] text-sky-600/80 dark:text-sky-400/80">
                ({isCount ? `${totals.uPct}%` : `${totals.uValPct}%`})
              </span>
            )}
            {totals.hasYoYData && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border ml-0.5 tabular-nums",
                  totals.yoyUdaraGrowthPct > 0
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : totals.yoyUdaraGrowthPct < 0
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-slate-500/15 border-slate-500/30 text-slate-500"
                )}
                title={`YoY Udara (12 Bln vs Tahun Lalu): ${totals.yoyUdaraGrowthPct > 0 ? '+' : ''}${totals.yoyUdaraGrowthPct}% (${totals.yoyUdaraDiff > 0 ? '+' : ''}${isCount ? formatNumber(totals.yoyUdaraDiff) + ' Bill' : formatCompactRupiah(totals.yoyUdaraDiff)})`}
              >
                YoY {totals.yoyUdaraGrowthPct > 0 ? `▲ +${totals.yoyUdaraGrowthPct}%` : totals.yoyUdaraGrowthPct < 0 ? `▼ ${totals.yoyUdaraGrowthPct}%` : `→ 0%`}
              </span>
            )}
          </div>
        )}

        {(modeFilter === 'all' || modeFilter === 'laut') && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold">🚢 {t('common.sea')}:</span>
            <span className="font-bold tabular-nums">
              {isCount ? `${formatNumber(totals.billLaut)} Bill` : formatCompactRupiah(totals.tagihanLaut)}
            </span>
            {modeFilter === 'all' && (
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                ({isCount ? `${totals.lPct}%` : `${totals.lValPct}%`})
              </span>
            )}
            {totals.hasYoYData && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border ml-0.5 tabular-nums",
                  totals.yoyLautGrowthPct > 0
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : totals.yoyLautGrowthPct < 0
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-slate-500/15 border-slate-500/30 text-slate-500"
                )}
                title={`YoY Laut (12 Bln vs Tahun Lalu): ${totals.yoyLautGrowthPct > 0 ? '+' : ''}${totals.yoyLautGrowthPct}% (${totals.yoyLautDiff > 0 ? '+' : ''}${isCount ? formatNumber(totals.yoyLautDiff) + ' Bill' : formatCompactRupiah(totals.yoyLautDiff)})`}
              >
                YoY {totals.yoyLautGrowthPct > 0 ? `▲ +${totals.yoyLautGrowthPct}%` : totals.yoyLautGrowthPct < 0 ? `▼ ${totals.yoyLautGrowthPct}%` : `→ 0%`}
              </span>
            )}
          </div>
        )}

        {modeFilter === 'all' && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] ml-auto">
            <span className="text-[var(--color-secondary)] font-medium">{t('billing.trend.total')}:</span>
            <span className="font-bold tabular-nums">
              {isCount ? `${formatNumber(totals.totalBill)} Bill` : formatCurrency(totals.totalTagihan)}
            </span>
            {totals.hasYoYData && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border ml-0.5 tabular-nums",
                  totals.yoyGrowthPct > 0
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : totals.yoyGrowthPct < 0
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    : "bg-slate-500/15 border-slate-500/30 text-slate-500"
                )}
                title={`Total YoY (12 Bln vs Tahun Lalu): ${totals.yoyGrowthPct > 0 ? '+' : ''}${totals.yoyGrowthPct}% (${totals.yoyDiff > 0 ? '+' : ''}${isCount ? formatNumber(totals.yoyDiff) + ' Bill' : formatCompactRupiah(totals.yoyDiff)})`}
              >
                YoY {totals.yoyGrowthPct > 0 ? `▲ +${totals.yoyGrowthPct}%` : totals.yoyGrowthPct < 0 ? `▼ ${totals.yoyGrowthPct}%` : `→ 0%`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-[260px] sm:h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: isMobile ? 8 : 20, left: 0, bottom: 5 }}>
            <defs>
              {/* Udara Sky Blue Area Gradient */}
              <linearGradient id="trendAreaUdaraFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.01} />
              </linearGradient>

              {/* Laut Emerald Area Gradient */}
              <linearGradient id="trendAreaLautFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" opacity={0.7} />
            <XAxis
              dataKey={(row: any) => row.date || row.label}
              axisLine={false}
              tickLine={false}
              tick={<CustomXAxisTick />}
              interval={isMonthly ? (isMobile ? 'preserveStartEnd' : 0) : 'preserveStartEnd'}
              dy={5}
              height={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: isMobile ? 10 : 11, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
              width={metric === 'value' ? (isMobile ? 55 : 75) : (isMobile ? 36 : 46)}
              tickMargin={6}
              tickFormatter={(val) => (metric === 'count' ? formatNumber(val) : formatCompactRupiah(val))}
              allowDecimals={metric === 'value'}
            />

            {/* Custom Multi-Theme Tooltip */}
            <Tooltip
              cursor={{ stroke: 'var(--color-border)', strokeWidth: 1.5, strokeDasharray: '4 4' }}
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const row = payload[0]?.payload as BillingTrendPoint & { date?: string }
                if (!row) return null

                const uCount = row.billUdara ?? 0
                const lCount = row.billLaut ?? 0
                const totCount = row.totalBill ?? (uCount + lCount)

                const uVal = row.tagihanUdara ?? 0
                const lVal = row.tagihanLaut ?? 0
                const totVal = row.totalTagihan ?? (uVal + lVal)

                const prevUCount = row.prevBillUdara ?? 0
                const prevLCount = row.prevBillLaut ?? 0
                const prevTotCount = row.prevTotalBill ?? (prevUCount + prevLCount)

                const prevUVal = row.prevTagihanUdara ?? 0
                const prevLVal = row.prevTagihanLaut ?? 0
                const prevTotVal = row.prevTotalTagihan ?? (prevUVal + prevLVal)

                const hasYoY = row.prevTotalBill !== undefined || row.prevTotalTagihan !== undefined

                const displayTitle = row.label || row.date || label
                const prevTitle = row.prevYearLabel || 'Tahun Lalu'

                // YoY deltas for this specific month
                const monthBillYoYPct = row.totalBillYoYPct ?? (prevTotCount > 0 ? Number((((totCount - prevTotCount) / prevTotCount) * 100).toFixed(1)) : 0)
                const monthTagihanYoYPct = row.totalTagihanYoYPct ?? (prevTotVal > 0 ? Number((((totVal - prevTotVal) / prevTotVal) * 100).toFixed(1)) : 0)
                const activeYoYPct = isCount ? monthBillYoYPct : monthTagihanYoYPct
                const activeDiff = isCount ? (totCount - prevTotCount) : (totVal - prevTotVal)

                const uYoYPct = row.billUdaraYoYPct ?? (prevUCount > 0 ? Number((((uCount - prevUCount) / prevUCount) * 100).toFixed(1)) : 0)
                const uValYoYPct = row.tagihanUdaraYoYPct ?? (prevUVal > 0 ? Number((((uVal - prevUVal) / prevUVal) * 100).toFixed(1)) : 0)
                const activeUYoYPct = isCount ? uYoYPct : uValYoYPct
                const activeUDiff = isCount ? (uCount - prevUCount) : (uVal - prevUVal)

                const lYoYPct = row.billLautYoYPct ?? (prevLCount > 0 ? Number((((lCount - prevLCount) / prevLCount) * 100).toFixed(1)) : 0)
                const lValYoYPct = row.tagihanLautYoYPct ?? (prevLVal > 0 ? Number((((lVal - prevLVal) / prevLVal) * 100).toFixed(1)) : 0)
                const activeLYoYPct = isCount ? lYoYPct : lValYoYPct
                const activeLDiff = isCount ? (lCount - prevLCount) : (lVal - prevLVal)

                return (
                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-xl text-xs font-[var(--font-body)] min-w-[240px] space-y-2 backdrop-blur-md">
                    <div className="font-bold text-[var(--color-primary)] font-[var(--font-display)] border-b border-[var(--color-border)] pb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>{displayTitle}</span>
                        {hasYoY && (
                          <span className="text-[10px] text-[var(--color-secondary)] font-normal">
                            vs {prevTitle}
                          </span>
                        )}
                      </div>
                      {hasYoY ? (
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded border tabular-nums",
                          activeYoYPct > 0
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : activeYoYPct < 0
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                            : "bg-slate-500/10 border-slate-500/30 text-slate-500"
                        )}>
                          {activeYoYPct > 0 ? `▲ +${activeYoYPct}%` : activeYoYPct < 0 ? `▼ ${activeYoYPct}%` : `→ 0%`} YoY
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase">
                          {isCount ? t('billing.metric.count') : t('billing.metric.value')}
                        </span>
                      )}
                    </div>

                    {modeFilter === 'all' ? (
                      <div className="space-y-1.5 pt-0.5">
                        {/* Udara row */}
                        <div className="flex items-center justify-between gap-3 text-sky-600 dark:text-sky-400">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-sky-500 inline-block shrink-0" />
                            <span>✈️ {t('common.air')}</span>
                          </span>
                          <div className="text-right">
                            <span className="font-semibold tabular-nums text-[var(--color-primary)]">
                              {isCount ? `${formatNumber(uCount)} Bill` : formatCurrency(uVal)}
                            </span>
                            {hasYoY && (
                              <div className="text-[10px] text-[var(--color-secondary)] flex items-center justify-end gap-1">
                                <span>YoY: {isCount ? `${formatNumber(prevUCount)}` : formatCompactRupiah(prevUVal)}</span>
                                <span className={cn(
                                  "font-bold tabular-nums",
                                  activeUYoYPct > 0 ? "text-emerald-600 dark:text-emerald-400" : activeUYoYPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                                )}>
                                  ({activeUYoYPct > 0 ? '+' : ''}{activeUYoYPct}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Laut row */}
                        <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                            <span>🚢 {t('common.sea')}</span>
                          </span>
                          <div className="text-right">
                            <span className="font-semibold tabular-nums text-[var(--color-primary)]">
                              {isCount ? `${formatNumber(lCount)} Bill` : formatCurrency(lVal)}
                            </span>
                            {hasYoY && (
                              <div className="text-[10px] text-[var(--color-secondary)] flex items-center justify-end gap-1">
                                <span>YoY: {isCount ? `${formatNumber(prevLCount)}` : formatCompactRupiah(prevLVal)}</span>
                                <span className={cn(
                                  "font-bold tabular-nums",
                                  activeLYoYPct > 0 ? "text-emerald-600 dark:text-emerald-400" : activeLYoYPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                                )}>
                                  ({activeLYoYPct > 0 ? '+' : ''}{activeLYoYPct}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Total row */}
                        <div className="border-t border-[var(--color-border)] pt-1.5 flex items-center justify-between font-bold text-[var(--color-primary)]">
                          <span className="text-[11px] text-[var(--color-secondary)]">{t('billing.trend.total')}</span>
                          <div className="text-right">
                            <span className="tabular-nums">
                              {isCount ? `${formatNumber(totCount)} Bill` : formatCurrency(totVal)}
                            </span>
                            {hasYoY && (
                              <div className="text-[10px] text-[var(--color-secondary)] font-normal flex items-center justify-end gap-1">
                                <span>YoY: {isCount ? `${formatNumber(prevTotCount)} Bill` : formatCurrency(prevTotVal)}</span>
                                <span className={cn(
                                  "font-semibold tabular-nums",
                                  activeYoYPct > 0 ? "text-emerald-600 dark:text-emerald-400" : activeYoYPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                                )}>
                                  ({activeYoYPct > 0 ? '+' : ''}{activeYoYPct}%)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Selisih YoY Card */}
                        {hasYoY && (
                          <div className="bg-[var(--color-neutral)] rounded-lg p-2 mt-1 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between font-semibold text-[var(--color-primary)]">
                              <span className="text-[var(--color-secondary)]">Selisih YoY:</span>
                              <span className={cn(
                                "font-bold tabular-nums",
                                activeDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : activeDiff < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                              )}>
                                {activeDiff > 0 ? '+' : ''}{isCount ? `${formatNumber(activeDiff)} Bill` : formatCurrency(activeDiff)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-[var(--color-border)]/60">
                              <div className="text-sky-600 dark:text-sky-400 flex items-center justify-between">
                                <span>✈️ Udara:</span>
                                <span className="font-bold tabular-nums">
                                  {activeUDiff > 0 ? '+' : ''}{isCount ? `${formatNumber(activeUDiff)} Bill` : formatCompactRupiah(activeUDiff)}
                                </span>
                              </div>
                              <div className="text-emerald-600 dark:text-emerald-400 flex items-center justify-between pl-2 border-l border-[var(--color-border)]/40">
                                <span>🚢 Laut:</span>
                                <span className="font-bold tabular-nums">
                                  {activeLDiff > 0 ? '+' : ''}{isCount ? `${formatNumber(activeLDiff)} Bill` : formatCompactRupiah(activeLDiff)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : modeFilter === 'udara' ? (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between gap-3 text-sky-600 dark:text-sky-400">
                          <span className="inline-flex items-center gap-1 font-medium">✈️ {t('common.air')}</span>
                          <span className="font-bold tabular-nums text-[var(--color-primary)]">
                            {isCount ? `${formatNumber(uCount)} Bill` : formatCurrency(uVal)}
                          </span>
                        </div>
                        {hasYoY && (
                          <div className="text-[11px] text-[var(--color-secondary)] flex justify-between">
                            <span>Tahun Lalu ({prevTitle}):</span>
                            <span className="font-semibold tabular-nums text-[var(--color-primary)]">
                              {isCount ? `${formatNumber(prevUCount)} Bill` : formatCurrency(prevUVal)}
                            </span>
                          </div>
                        )}
                        {hasYoY && (
                          <div className="bg-[var(--color-neutral)] rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--color-secondary)]">Pertumbuhan YoY:</span>
                            <span className={cn(
                              "font-bold tabular-nums",
                              (row.billUdaraYoYPct ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : (row.billUdaraYoYPct ?? 0) < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                            )}>
                              {(row.billUdaraYoYPct ?? 0) > 0 ? '+' : ''}{isCount ? row.billUdaraYoYPct : row.tagihanUdaraYoYPct}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                          <span className="inline-flex items-center gap-1 font-medium">🚢 {t('common.sea')}</span>
                          <span className="font-bold tabular-nums text-[var(--color-primary)]">
                            {isCount ? `${formatNumber(lCount)} Bill` : formatCurrency(lVal)}
                          </span>
                        </div>
                        {hasYoY && (
                          <div className="text-[11px] text-[var(--color-secondary)] flex justify-between">
                            <span>Tahun Lalu ({prevTitle}):</span>
                            <span className="font-semibold tabular-nums text-[var(--color-primary)]">
                              {isCount ? `${formatNumber(prevLCount)} Bill` : formatCurrency(prevLVal)}
                            </span>
                          </div>
                        )}
                        {hasYoY && (
                          <div className="bg-[var(--color-neutral)] rounded-lg px-2 py-1 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--color-secondary)]">Pertumbuhan YoY:</span>
                            <span className={cn(
                              "font-bold tabular-nums",
                              (row.billLautYoYPct ?? 0) > 0 ? "text-emerald-600 dark:text-emerald-400" : (row.billLautYoYPct ?? 0) < 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
                            )}>
                              {(row.billLautYoYPct ?? 0) > 0 ? '+' : ''}{isCount ? row.billLautYoYPct : row.tagihanLautYoYPct}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }}
            />

            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: 'var(--font-label)', letterSpacing: '0.02em' }}
            />

            {/* COUNT MODE (JUMLAH BILL) */}
            {isCount ? (
              modeFilter === 'all' ? (
                <>
                  <Area
                    name={`🚢 ${t('billing.trend.seaBill')}`}
                    type="monotone"
                    dataKey="billLaut"
                    stroke="none"
                    fill="url(#trendAreaLautFill)"
                    legendType="none"
                  />
                  <Line
                    name={`🚢 ${t('billing.trend.seaBill')}`}
                    type="monotone"
                    dataKey="billLaut"
                    stroke="#10b981"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  <Area
                    name={`✈️ ${t('billing.trend.airBill')}`}
                    type="monotone"
                    dataKey="billUdara"
                    stroke="none"
                    fill="url(#trendAreaUdaraFill)"
                    legendType="none"
                  />
                  <Line
                    name={`✈️ ${t('billing.trend.airBill')}`}
                    type="monotone"
                    dataKey="billUdara"
                    stroke="#0284c7"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#0284c7', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <>
                      <Line
                        name="🚢 Bill Laut YoY (Tahun Lalu)"
                        type="monotone"
                        dataKey="prevBillLaut"
                        stroke="#34d399"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={data.length <= 14 ? { r: 3, fill: '#34d399', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                        connectNulls
                        activeDot={{ r: 5, fill: '#34d399', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      />
                      <Line
                        name="✈️ Bill Udara YoY (Tahun Lalu)"
                        type="monotone"
                        dataKey="prevBillUdara"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={data.length <= 14 ? { r: 3, fill: '#38bdf8', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                        connectNulls
                        activeDot={{ r: 5, fill: '#38bdf8', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      />
                    </>
                  )}
                </>
              ) : modeFilter === 'udara' ? (
                <>
                  <Area
                    name={`✈️ ${t('billing.trend.airBill')}`}
                    type="monotone"
                    dataKey="billUdara"
                    stroke="none"
                    fill="url(#trendAreaUdaraFill)"
                    legendType="none"
                  />
                  <Line
                    name={`✈️ ${t('billing.trend.airBill')}`}
                    type="monotone"
                    dataKey="billUdara"
                    stroke="#0284c7"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#0284c7', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <Line
                      name="✈️ Bill Udara YoY (Tahun Lalu)"
                      type="monotone"
                      dataKey="prevBillUdara"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={data.length <= 14 ? { r: 3, fill: '#38bdf8', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                      connectNulls
                      activeDot={{ r: 5, fill: '#38bdf8', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                  )}
                </>
              ) : (
                <>
                  <Area
                    name={`🚢 ${t('billing.trend.seaBill')}`}
                    type="monotone"
                    dataKey="billLaut"
                    stroke="none"
                    fill="url(#trendAreaLautFill)"
                    legendType="none"
                  />
                  <Line
                    name={`🚢 ${t('billing.trend.seaBill')}`}
                    type="monotone"
                    dataKey="billLaut"
                    stroke="#10b981"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <Line
                      name="🚢 Bill Laut YoY (Tahun Lalu)"
                      type="monotone"
                      dataKey="prevBillLaut"
                      stroke="#34d399"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={data.length <= 14 ? { r: 3, fill: '#34d399', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                      connectNulls
                      activeDot={{ r: 5, fill: '#34d399', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                  )}
                </>
              )
            ) : (
              /* VALUE MODE (NOMINAL TAGIHAN) */
              modeFilter === 'all' ? (
                <>
                  <Area
                    name={`🚢 ${t('billing.trend.seaAmount')}`}
                    type="monotone"
                    dataKey="tagihanLaut"
                    stroke="none"
                    fill="url(#trendAreaLautFill)"
                    legendType="none"
                  />
                  <Line
                    name={`🚢 ${t('billing.trend.seaAmount')}`}
                    type="monotone"
                    dataKey="tagihanLaut"
                    stroke="#10b981"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  <Area
                    name={`✈️ ${t('billing.trend.airAmount')}`}
                    type="monotone"
                    dataKey="tagihanUdara"
                    stroke="none"
                    fill="url(#trendAreaUdaraFill)"
                    legendType="none"
                  />
                  <Line
                    name={`✈️ ${t('billing.trend.airAmount')}`}
                    type="monotone"
                    dataKey="tagihanUdara"
                    stroke="#0284c7"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#0284c7', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <>
                      <Line
                        name="🚢 Tagihan Laut YoY (Tahun Lalu)"
                        type="monotone"
                        dataKey="prevTagihanLaut"
                        stroke="#34d399"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={data.length <= 14 ? { r: 3, fill: '#34d399', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                        connectNulls
                        activeDot={{ r: 5, fill: '#34d399', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      />
                      <Line
                        name="✈️ Tagihan Udara YoY (Tahun Lalu)"
                        type="monotone"
                        dataKey="prevTagihanUdara"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={data.length <= 14 ? { r: 3, fill: '#38bdf8', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                        connectNulls
                        activeDot={{ r: 5, fill: '#38bdf8', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                      />
                    </>
                  )}
                </>
              ) : modeFilter === 'udara' ? (
                <>
                  <Area
                    name={`✈️ ${t('billing.trend.airAmount')}`}
                    type="monotone"
                    dataKey="tagihanUdara"
                    stroke="none"
                    fill="url(#trendAreaUdaraFill)"
                    legendType="none"
                  />
                  <Line
                    name={`✈️ ${t('billing.trend.airAmount')}`}
                    type="monotone"
                    dataKey="tagihanUdara"
                    stroke="#0284c7"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#0284c7', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <Line
                      name="✈️ Tagihan Udara YoY (Tahun Lalu)"
                      type="monotone"
                      dataKey="prevTagihanUdara"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={data.length <= 14 ? { r: 3, fill: '#38bdf8', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                      connectNulls
                      activeDot={{ r: 5, fill: '#38bdf8', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                  )}
                </>
              ) : (
                <>
                  <Area
                    name={`🚢 ${t('billing.trend.seaAmount')}`}
                    type="monotone"
                    dataKey="tagihanLaut"
                    stroke="none"
                    fill="url(#trendAreaLautFill)"
                    legendType="none"
                  />
                  <Line
                    name={`🚢 ${t('billing.trend.seaAmount')}`}
                    type="monotone"
                    dataKey="tagihanLaut"
                    stroke="#10b981"
                    strokeWidth={isMobile ? 2 : 2.5}
                    dot={data.length <= 14 ? { r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                    connectNulls
                    activeDot={{ r: 5, fill: '#10b981', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                  />
                  {showYoY && totals.hasYoYData && (
                    <Line
                      name="🚢 Tagihan Laut YoY (Tahun Lalu)"
                      type="monotone"
                      dataKey="prevTagihanLaut"
                      stroke="#34d399"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={data.length <= 14 ? { r: 3, fill: '#34d399', strokeWidth: 1.5, stroke: 'var(--color-surface)' } : false}
                      connectNulls
                      activeDot={{ r: 5, fill: '#34d399', stroke: 'var(--color-surface)', strokeWidth: 2 }}
                    />
                  )}
                </>
              )
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
