import { useState } from 'react'
import {
  FileText,
  Boxes,
  Weight,
  CheckCircle2,
  Truck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatNumber, cn } from '@/lib/utils'
import type { KpiData, MetricComparison } from '../types/delivery-orders.types'

interface DeliveryMomYoySectionProps {
  kpis: KpiData | undefined
  isLoading: boolean
  selectedYear: number
  selectedMonth: number
  onMonthChange: (year: number, month: number) => void
  onResetCurrentMonth: () => void
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function DeliveryMomYoySection({
  kpis,
  isLoading,
  selectedYear,
  selectedMonth,
  onMonthChange,
  onResetCurrentMonth,
}: DeliveryMomYoySectionProps) {
  const [chartMetric, setChartMetric] = useState<'sj' | 'packages' | 'weight'>('sj')

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

  const current = kpis?.currentMonth
  const prev = kpis?.prevMonth
  const lastYear = kpis?.lastYearSameMonth
  const comps = kpis?.comparisons
  const trends = kpis?.monthlyTrends || []

  // Delivery completion rate
  const totalSJ = current?.totalSJ ?? kpis?.totalSJ ?? 0
  const deliveredSJ = current?.deliveredSJ ?? 0
  const completionRate = totalSJ > 0 ? ((deliveredSJ / totalSJ) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4 font-[var(--font-body)]">
      {/* ── 1. Period Navigator Toolbar ── */}
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
                  <span>Bulan Berjalan</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  Audit Periode Lampau
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--color-secondary)]">
              Evaluasi kinerja Surat Jalan vs {prev?.monthName || 'Bulan Lalu'} (MoM) dan {lastYear?.monthName || 'Tahun Lalu'} (YoY)
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
              <span>Bulan Berjalan ({MONTH_NAMES[actualCurrentMonth - 1]})</span>
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

      {/* ── 2. Comparison KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Total Surat Jalan */}
        <ComparisonCard
          title="Total Surat Jalan"
          value={totalSJ}
          unit="SJ"
          icon={FileText}
          accentColor="blue"
          subline={
            current
              ? `${formatNumber(current.seaSJ)} Laut · ${formatNumber(current.airSJ)} Udara`
              : 'Surat jalan diterbitkan'
          }
          comp={comps?.totalSJ}
          isLoading={isLoading}
        />

        {/* KPI 2: Total Koli Terkirim */}
        <ComparisonCard
          title="Total Koli Terkirim"
          value={current?.totalPackages ?? kpis?.totalPackages ?? 0}
          unit="Koli"
          icon={Boxes}
          accentColor="emerald"
          subline="Koli kargo terdistribusi"
          comp={comps?.totalPackages}
          isLoading={isLoading}
        />

        {/* KPI 3: Total Bobot Kargo */}
        <ComparisonCard
          title="Total Bobot Kargo"
          value={current?.totalWeight ?? kpis?.totalWeight ?? 0}
          unit="kg"
          icon={Weight}
          accentColor="purple"
          subline="Tonase kargo terverifikasi"
          comp={comps?.totalWeight}
          isLoading={isLoading}
        />

        {/* KPI 4: Selesai Terkirim */}
        <ComparisonCard
          title="Selesai Terkirim"
          value={deliveredSJ}
          unit="SJ"
          icon={CheckCircle2}
          accentColor="teal"
          subline={`${completionRate}% rasio penyelesaian`}
          comp={comps?.deliveredSJ}
          isLoading={isLoading}
        />

        {/* KPI 5: Dalam Pengantaran */}
        <ComparisonCard
          title="Dalam Pengantaran"
          value={current?.onDeliverySJ ?? kpis?.onDelivery ?? 0}
          unit="SJ"
          icon={Truck}
          accentColor="sky"
          subline="Armada aktif bertugas di jalan"
          comp={comps?.onDeliverySJ}
          isLoading={isLoading}
        />
      </div>

      {/* ── 3. Visual Trend Chart & 3-Period Matrix Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Side: 12-Month Trend Chart */}
        <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-neutral)] text-[var(--color-primary)]">
                <BarChart3 className="h-4 w-4 text-[var(--color-tertiary)]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                  Tren Volume Distribusi 12 Bulan
                </h4>
                <p className="text-[11px] text-[var(--color-secondary)]">
                  Pergerakan bulanan hingga periode aktif ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </p>
              </div>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/40 p-0.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric('sj')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  chartMetric === 'sj'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Surat Jalan
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('packages')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  chartMetric === 'packages'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Koli
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('weight')}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                  chartMetric === 'weight'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Tonase (kg)
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="pt-4 h-64 sm:h-72 w-full">
            {isLoading ? (
              <div className="w-full h-full rounded-xl skeleton-shimmer" />
            ) : trends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-secondary)]">
                Belum ada riwayat tren pengiriman
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="deliveryChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-tertiary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-tertiary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--color-secondary)', fontSize: 10.5 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-secondary)', fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={chartMetric === 'sj' ? 'totalSJ' : chartMetric === 'packages' ? 'packages' : 'weight'}
                    stroke="var(--color-tertiary)"
                    strokeWidth={2}
                    fill="url(#deliveryChartGrad)"
                  />
                  <Bar
                    dataKey={chartMetric === 'sj' ? 'totalSJ' : chartMetric === 'packages' ? 'packages' : 'weight'}
                    fill="var(--color-tertiary)"
                    opacity={0.75}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Side: 3-Period Comparison Table */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-neutral)] text-[var(--color-primary)]">
              <Layers className="h-4 w-4 text-[var(--color-tertiary)]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide">
                Matriks Komparasi 3 Periode
              </h4>
              <p className="text-[11px] text-[var(--color-secondary)]">
                Bulan Berjalan vs Bulan Lalu (MoM) & Tahun Lalu (YoY)
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
                  label="Surat Jalan"
                  current={comps?.totalSJ?.current ?? 0}
                  momPercent={comps?.totalSJ?.momPercent}
                  yoyPercent={comps?.totalSJ?.yoyPercent}
                />
                <MatrixRow
                  label="Total Koli"
                  current={comps?.totalPackages?.current ?? 0}
                  momPercent={comps?.totalPackages?.momPercent}
                  yoyPercent={comps?.totalPackages?.yoyPercent}
                />
                <MatrixRow
                  label="Tonase (kg)"
                  current={comps?.totalWeight?.current ?? 0}
                  momPercent={comps?.totalWeight?.momPercent}
                  yoyPercent={comps?.totalWeight?.yoyPercent}
                  isWeight
                />
                <MatrixRow
                  label="Terkirim"
                  current={comps?.deliveredSJ?.current ?? 0}
                  momPercent={comps?.deliveredSJ?.momPercent}
                  yoyPercent={comps?.deliveredSJ?.yoyPercent}
                />
                <MatrixRow
                  label="On Delivery"
                  current={comps?.onDeliverySJ?.current ?? 0}
                  momPercent={comps?.onDeliverySJ?.momPercent}
                  yoyPercent={comps?.onDeliverySJ?.yoyPercent}
                />
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
            <span>MoM: vs {prev?.monthName || 'Bulan Lalu'}</span>
            <span>YoY: vs {lastYear?.monthName || 'Tahun Lalu'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-komponen: Card Metrik dengan Komparasi MoM & YoY
 * ───────────────────────────────────────────────────────────────────────────── */
interface ComparisonCardProps {
  title: string
  value: number
  unit: string
  icon: any
  accentColor: 'blue' | 'emerald' | 'purple' | 'teal' | 'sky'
  subline: string
  comp: MetricComparison | undefined
  isLoading: boolean
}

function ComparisonCard({
  title,
  value,
  unit,
  icon: Icon,
  accentColor,
  subline,
  comp,
  isLoading,
}: ComparisonCardProps) {
  const colorMap = {
    blue: 'border-blue-500/30 text-blue-500 hover:border-blue-500/60',
    emerald: 'border-emerald-500/30 text-emerald-500 hover:border-emerald-500/60',
    purple: 'border-purple-500/30 text-purple-500 hover:border-purple-500/60',
    teal: 'border-teal-500/30 text-teal-500 hover:border-teal-500/60',
    sky: 'border-sky-500/30 text-sky-500 hover:border-sky-500/60',
  }

  return (
    <div className={cn(
      "flex flex-col justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-4 shadow-xs relative overflow-hidden transition-all group",
      colorMap[accentColor]
    )}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-transparent border", colorMap[accentColor])}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
            {unit}
          </span>
        </div>

        <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider truncate">
          {title}
        </p>

        {isLoading ? (
          <div className="mt-1.5 h-7 w-20 rounded skeleton-shimmer" />
        ) : (
          <div className="mt-1 flex items-baseline gap-1.5">
            <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--color-primary)] font-mono leading-none">
              {formatNumber(value)}
            </h3>
            <span className="text-xs font-semibold text-[var(--color-secondary)]">
              {unit}
            </span>
          </div>
        )}

        <p className="text-[10.5px] text-[var(--color-secondary)] mt-1 truncate">
          {subline}
        </p>
      </div>

      {/* Badges MoM & YoY Row */}
      <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center gap-1.5 flex-wrap">
        {comp ? (
          <>
            <GrowthPill label="MoM" percent={comp.momPercent} diff={comp.momDiff} prevValue={comp.prev} unit={unit} />
            <GrowthPill label="YoY" percent={comp.yoyPercent} diff={comp.yoyDiff} prevValue={comp.lastYear} unit={unit} />
          </>
        ) : (
          <span className="text-[10px] text-[var(--color-secondary)]">—</span>
        )}
      </div>
    </div>
  )
}

function GrowthPill({
  label,
  percent,
  diff,
  prevValue,
  unit,
}: {
  label: 'MoM' | 'YoY'
  percent: number
  diff: number
  prevValue: number
  unit?: string
}) {
  const isUp = percent > 0
  const isZero = percent === 0

  const colorClass = isZero
    ? "text-[var(--color-secondary)] border-[var(--color-border)]"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10"

  const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border tabular-nums transition-colors",
        colorClass
      )}
      title={`${label === 'MoM' ? 'Bulan Lalu' : 'Tahun Lalu'}: ${formatNumber(prevValue)}${unit ? ' ' + unit : ''} (${diff >= 0 ? '+' : ''}${formatNumber(diff)})`}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span>{isUp ? '+' : ''}{percent.toFixed(1)}% {label}</span>
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Sub-komponen: Baris Matriks Komparasi 3 Periode
 * ───────────────────────────────────────────────────────────────────────────── */
function MatrixRow({
  label,
  current,
  momPercent,
  yoyPercent,
  isWeight,
}: {
  label: string
  current: number
  momPercent: number | undefined
  yoyPercent: number | undefined
  isWeight?: boolean
}) {
  const renderBadge = (pct: number | undefined) => {
    if (pct === undefined) return <span className="text-[var(--color-secondary)]">—</span>
    const isUp = pct > 0
    const isDown = pct < 0
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-bold tabular-nums text-[10.5px]",
          isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-secondary)]"
        )}
      >
        {isUp ? '+' : ''}{pct.toFixed(1)}%
      </span>
    )
  }

  return (
    <tr className="hover:bg-[var(--color-neutral)]/30 transition-colors">
      <td className="py-2 pr-2 font-medium text-[var(--color-primary)] truncate max-w-[100px]">
        {label}
      </td>
      <td className="py-2 px-1 text-right font-mono font-bold text-[var(--color-primary)] tabular-nums">
        {formatNumber(isWeight ? Math.round(current) : current)}
      </td>
      <td className="py-2 px-1 text-right tabular-nums">
        {renderBadge(momPercent)}
      </td>
      <td className="py-2 pl-1 text-right tabular-nums">
        {renderBadge(yoyPercent)}
      </td>
    </tr>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Custom Recharts Tooltip
 * ───────────────────────────────────────────────────────────────────────────── */
function CustomTrendTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 shadow-md space-y-1.5 text-xs font-[var(--font-body)]">
      <div className="font-bold text-[var(--color-primary)] font-mono border-b border-[var(--color-border)] pb-1">
        Periode: {d.name} ({d.monthKey})
      </div>
      <div className="space-y-1 text-[11px] tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--color-secondary)]">Surat Jalan:</span>
          <strong className="text-[var(--color-primary)] font-mono">{formatNumber(d.totalSJ)} SJ</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--color-secondary)]">Total Koli:</span>
          <strong className="text-[var(--color-primary)] font-mono">{formatNumber(d.packages)} Koli</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--color-secondary)]">Total Tonase:</span>
          <strong className="text-[var(--color-primary)] font-mono">{formatNumber(Math.round(d.weight))} kg</strong>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--color-border)] pt-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Terkirim:</span>
          <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNumber(d.delivered)}</strong>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-sky-600 dark:text-sky-400 font-medium">Dalam Kirim:</span>
          <strong className="text-sky-600 dark:text-sky-400 font-mono">{formatNumber(d.onDelivery)}</strong>
        </div>
      </div>
    </div>
  )
}
