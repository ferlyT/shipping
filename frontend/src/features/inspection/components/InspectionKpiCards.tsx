import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  BarChart2,
  Minus,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useTranslation } from '@/hooks/useTranslation'
import type { InspectionStatsData, InspectionReport } from '../types/inspection.types'

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  trend,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  accent: string
  sub?: string
  trend?: { value: number; label: string }
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 min-h-[110px]">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div
            className="text-[0.7rem] text-[var(--color-secondary)] font-semibold uppercase tracking-wider truncate"
            title={label}
          >
            {label}
          </div>
          <div className="text-[1.4rem] font-bold font-[var(--font-heading)] text-[var(--color-primary)] leading-none tracking-tight">
            {value}
          </div>
        </div>
        <div className={`p-2 rounded-lg ${accent} shrink-0`}>
          <Icon size={18} />
        </div>
      </div>

      {(sub || trend !== undefined) && (
        <div className="mt-3 pt-2 border-t border-[var(--color-border)]/40 flex items-center justify-between gap-2 flex-wrap">
          {sub && (
            <div className="text-[0.68rem] text-[var(--color-secondary)]/80 truncate" title={sub}>
              {sub}
            </div>
          )}
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                trend.value > 0
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : trend.value < 0
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-border)]'
              }`}
            >
              {trend.value > 0 ? (
                <TrendingUp size={10} />
              ) : trend.value < 0 ? (
                <TrendingDown size={10} />
              ) : (
                <Minus size={10} />
              )}
              {trend.value > 0 ? '+' : ''}
              {trend.value}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Monthly Trend Chart (Recharts) ───────────────────────────────────────────
function MonthlyTrendChart({
  data,
  emptyText,
  formLabel,
}: {
  data?: { month: string; count: number }[]
  emptyText: string
  formLabel: string
}) {
  if (!data || data.length === 0) {
    return <div className="text-center text-[var(--color-secondary)] text-xs py-8">{emptyText}</div>
  }

  const formattedData = data.map((d) => {
    const [year, month] = d.month.split('-')
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1)
    return {
      name: date.toLocaleDateString('id-ID', { month: 'short' }),
      count: d.count,
    }
  })

  return (
    <div className="w-full h-[180px] min-h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBapCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-secondary)' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--color-secondary)' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-primary)',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            itemStyle={{ fontWeight: 'bold' }}
            formatter={(value: any) => [value, formLabel]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorBapCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Status Breakdown ─────────────────────────────────────────────────────────
function StatusBreakdown({
  byStatus,
  emptyText,
  totalForms,
  formLabel,
}: {
  byStatus: Record<string, number>
  emptyText: string
  totalForms: number
  formLabel: string
}) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || totalForms

  const statusConfig: Record<string, { color: string; bg: string; text: string; label: string }> = {
    Draft: { color: 'bg-amber-400', bg: 'bg-amber-400/10', text: 'text-amber-500', label: 'Draft' },
    Done: { color: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Done' },
  }

  const normalizedByStatus: Record<string, number> = {
    Draft: byStatus['Draft'] || 0,
    Done: byStatus['Done'] || 0,
    ...byStatus,
  }

  if (total === 0) {
    return <div className="text-center text-[var(--color-secondary)] text-xs py-8">{emptyText}</div>
  }

  return (
    <div className="space-y-3">
      {Object.entries(normalizedByStatus).map(([status, count]) => {
        const cfg = statusConfig[status] || {
          color: 'bg-[var(--color-secondary)]',
          bg: 'bg-[var(--color-secondary)]/10',
          text: 'text-[var(--color-secondary)]',
          label: status,
        }
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={status} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                <span className="font-semibold text-[var(--color-primary)]">{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-secondary)] font-mono">{count}</span>
                <span className={`text-[0.7rem] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                  {pct}%
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-[var(--color-secondary)]/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.color} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
      <div className="mt-auto pt-3 border-t border-[var(--color-border)]/40 flex items-center justify-between text-xs text-[var(--color-secondary)]">
        <span className="font-medium">Total</span>
        <span className="font-bold font-[var(--font-heading)] text-[var(--color-primary)]">
          {total} {formLabel}
        </span>
      </div>
    </div>
  )
}

// ─── Top Customers ────────────────────────────────────────────────────────────
function TopCustomersList({
  customers,
  emptyText,
}: {
  customers?: { name: string | null; count: number }[]
  emptyText: string
}) {
  if (!customers || customers.length === 0) {
    return <div className="text-center text-[var(--color-secondary)] text-xs py-8">{emptyText}</div>
  }
  const max = Math.max(...customers.map((c) => c.count), 1)

  return (
    <div className="space-y-2.5">
      {customers.map((c, i) => (
        <div key={i} className="flex items-center gap-2.5 group">
          <span className="text-xs font-mono font-bold text-[var(--color-secondary)]/60 w-4 shrink-0 text-center">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[var(--color-primary)] truncate" title={c.name || '—'}>
                {c.name || '—'}
              </span>
              <span className="text-xs font-mono text-[var(--color-secondary)] shrink-0 ml-2">
                {c.count}×
              </span>
            </div>
            <div className="h-1 bg-[var(--color-secondary)]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-tertiary)]/75 rounded-full transition-all duration-700"
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main KPI & Analytics Section ─────────────────────────────────────────────
interface Props {
  stats?: InspectionStatsData
  reports?: InspectionReport[]
  isLoading?: boolean
}

export function InspectionKpiCards({ stats, reports, isLoading }: Props) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-3 min-h-[110px]"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 rounded skeleton-shimmer" />
                <div className="h-6 w-6 rounded-lg skeleton-shimmer" />
              </div>
              <div className="h-7 w-24 rounded skeleton-shimmer" />
              <div className="pt-2 border-t border-[var(--color-border)]/30 flex justify-between">
                <div className="h-2.5 w-16 rounded skeleton-shimmer" />
                <div className="h-2.5 w-10 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 h-56 space-y-3"
            >
              <div className="h-3 w-28 rounded skeleton-shimmer" />
              <div className="h-5 w-36 rounded skeleton-shimmer" />
              <div className="h-32 w-full rounded skeleton-shimmer mt-2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Derive stats if not provided directly
  const fallbackStats: InspectionStatsData = {
    totalForms: reports?.length || 0,
    totalThisMonth: reports?.length || 0,
    totalLastMonth: 0,
    growthPercent: 0,
    byStatus: {
      Draft: reports?.filter((r) => r.fdStatus === '1').length || 0,
      Done: reports?.filter((r) => r.fdStatus === '2').length || 0,
    },
    topCustomers: [],
    monthlyTrend: [],
  }

  const activeStats = stats || fallbackStats
  const draftCount = activeStats.byStatus['Draft'] || 0
  const doneCount = activeStats.byStatus['Done'] || 0
  const emptyText = t('bap.noData') || 'Belum ada data'
  const formLabel = t('bap.kpiTotal') || 'Form'

  return (
    <div className="space-y-4">
      {/* 4 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={t('bap.kpiTotal') || 'Total Form'}
          value={(activeStats.totalForms || 0).toLocaleString('id-ID')}
          icon={FileText}
          accent="bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)]"
          sub="Total dokumen pemeriksaan"
        />
        <StatCard
          label={t('bap.kpiThisMonth') || 'Bulan Ini'}
          value={(activeStats.totalThisMonth || 0).toLocaleString('id-ID')}
          icon={BarChart2}
          accent="bg-blue-500/10 text-blue-500"
          sub={`vs ${activeStats.totalLastMonth || 0} bulan lalu`}
          trend={{ value: activeStats.growthPercent || 0, label: 'vs last month' }}
        />
        <StatCard
          label={t('bap.kpiDraft') || 'Draft'}
          value={(draftCount || 0).toLocaleString('id-ID')}
          icon={Clock}
          accent="bg-amber-400/10 text-amber-500"
          sub={t('bap.kpiDraftSub') || 'Belum selesai'}
        />
        <StatCard
          label={t('bap.kpiDone') || 'Done'}
          value={(doneCount || 0).toLocaleString('id-ID')}
          icon={CheckCircle2}
          accent="bg-emerald-500/10 text-emerald-500"
          sub={t('bap.kpiDoneSub') || 'Sudah selesai'}
        />
      </div>

      {/* 3 Charts / Breakdown Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Monthly Trend Chart */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-[0.7rem] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
              {t('bap.chartMonthlyTitle') || 'Tren 6 Bulan'}
            </div>
            <div className="text-[1.05rem] font-bold font-[var(--font-heading)] text-[var(--color-primary)] mt-0.5">
              {t('bap.chartMonthlySubtitle') || 'Form per Bulan'}
            </div>
          </div>
          <div className="mt-3 flex-1 flex items-center">
            <MonthlyTrendChart data={activeStats.monthlyTrend} emptyText={emptyText} formLabel={formLabel} />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between shadow-xs">
          <div>
            <div className="text-[0.7rem] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
              {t('bap.statusDistributionTitle') || 'Distribusi Status'}
            </div>
            <div className="text-[1.05rem] font-bold font-[var(--font-heading)] text-[var(--color-primary)] mt-0.5">
              {t('bap.statusDistributionSubtitle') || 'Breakdown'}
            </div>
          </div>
          <div className="mt-3 flex-1 flex flex-col justify-between">
            <StatusBreakdown
              byStatus={activeStats.byStatus}
              emptyText={emptyText}
              totalForms={activeStats.totalForms}
              formLabel={formLabel}
            />
          </div>
        </div>

        {/* Top Customers */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)]">
              <Users size={16} />
            </div>
            <div>
              <div className="text-[0.7rem] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                {t('bap.topCustomersTitle') || 'Customer Teratas'}
              </div>
              <div className="text-[1.05rem] font-bold font-[var(--font-heading)] text-[var(--color-primary)] mt-0.5">
                {t('bap.topCustomersSubtitle') || 'Top 5'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex-1">
            <TopCustomersList customers={activeStats.topCustomers} emptyText={emptyText} />
          </div>
        </div>
      </div>
    </div>
  )
}
