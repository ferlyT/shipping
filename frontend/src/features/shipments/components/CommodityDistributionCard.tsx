import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { Plane, Ship, Boxes, BarChart3 } from 'lucide-react'
import { cn, formatNumber, formatDecimal } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { ShipmentCommoditiesData, ShipmentCommodityMetric } from '../types/shipments.types'

interface CommodityDistributionCardProps {
  commodities?: ShipmentCommoditiesData
  mode: 'all' | 'air' | 'sea'
  isLoading?: boolean
}

type MetricKey = 'shipments' | 'packages' | 'weight' | 'volume'

const SEA_COLORS = [
  '#4f46e5', // indigo-600
  '#6366f1', // indigo-500
  '#818cf8', // indigo-400
  '#3b82f6', // blue-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#64748b', // slate-500
  '#94a3b8', // slate-400
]

const AIR_COLORS = [
  '#0284c7', // sky-600
  '#0ea5e9', // sky-500
  '#38bdf8', // sky-400
  '#06b6d4', // cyan-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#64748b', // slate-500
  '#94a3b8', // slate-400
]

interface SingleModeCommodityPanelProps {
  title: string
  icon: typeof Plane
  iconColor: string
  iconBg: string
  badgeText: string
  data: ShipmentCommodityMetric[]
  palette: string[]
  metric: MetricKey
  isLoading?: boolean
}

function SingleModeCommodityPanel({
  title,
  icon: Icon,
  iconColor,
  iconBg,
  badgeText,
  data,
  palette,
  metric,
  isLoading,
}: SingleModeCommodityPanelProps) {
  const { t } = useTranslation()

  const metricLabel = useMemo(() => {
    switch (metric) {
      case 'packages':
        return t('shipments.totalPackages')
      case 'weight':
        return `${t('shipments.totalWeight')} (kg)`
      case 'volume':
        return `${t('shipments.totalVolume')} (m³)`
      case 'shipments':
      default:
        return t('shipments.totalResi')
    }
  }, [metric, t])

  const totalMetricValue = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr[metric] || 0), 0)
  }, [data, metric])

  const chartData = useMemo(() => {
    return data.slice(0, 8).map((item) => ({
      name: item.name,
      value: item[metric] || 0,
      shipments: item.shipments,
      packages: item.packages,
      weight: item.weight,
      volume: item.volume,
      percentage: totalMetricValue > 0
        ? Number((((item[metric] || 0) / totalMetricValue) * 100).toFixed(1))
        : 0,
    }))
  }, [data, metric, totalMetricValue])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 rounded skeleton-shimmer" />
          <div className="h-5 w-20 rounded-full skeleton-shimmer" />
        </div>
        <div className="h-64 w-full rounded-xl skeleton-shimmer" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', iconBg, iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-[var(--color-primary)]">{title}</h4>
        <p className="text-xs text-[var(--color-secondary)] mt-1">{t('shipments.noCommodityData')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', iconBg, iconColor)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[var(--color-primary)] tracking-tight truncate">
                {title}
              </h3>
              <p className="text-[11px] text-[var(--color-secondary)] truncate">
                {data.length} {t('shipments.topCommodities')} • Total {metricLabel}:{' '}
                <span className="font-semibold text-[var(--color-primary)] tabular-nums">
                  {metric === 'weight'
                    ? `${formatDecimal(totalMetricValue, 1)} kg`
                    : metric === 'volume'
                    ? `${formatDecimal(totalMetricValue, 2)} m³`
                    : formatNumber(totalMetricValue)}
                </span>
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
            {badgeText}
          </span>
        </div>

        {/* Chart Area */}
        <div className="h-[240px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 24, left: -10, bottom: 0 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--color-secondary)' }}
                tickFormatter={(val) => {
                  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
                  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`
                  return String(val)
                }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={85}
                tick={{
                  fontSize: 10.5,
                  fill: 'var(--color-primary)',
                  fontWeight: 500,
                }}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-neutral)', opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload
                    return (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg text-xs space-y-1.5 min-w-[180px]">
                        <div className="font-bold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-1.5 flex items-center justify-between">
                          <span>{row.name}</span>
                          <span className="text-[11px] font-semibold text-sky-500 tabular-nums">
                            {row.percentage}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-[11px] text-[var(--color-secondary)] pt-0.5">
                          <span>{t('shipments.totalResi')}:</span>
                          <span className="font-semibold text-right text-[var(--color-primary)] tabular-nums">
                            {formatNumber(row.shipments)}
                          </span>
                          <span>{t('shipments.totalPackages')}:</span>
                          <span className="font-semibold text-right text-[var(--color-primary)] tabular-nums">
                            {formatNumber(row.packages)}
                          </span>
                          <span>{t('shipments.totalWeight')}:</span>
                          <span className="font-semibold text-right text-[var(--color-primary)] tabular-nums">
                            {formatDecimal(row.weight, 1)} kg
                          </span>
                          <span>{t('shipments.totalVolume')}:</span>
                          <span className="font-semibold text-right text-[var(--color-primary)] tabular-nums">
                            {formatDecimal(row.volume, 2)} m³
                          </span>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={palette[index % palette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mini Rank Breakdown */}
      <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {chartData.slice(0, 4).map((item, idx) => (
          <div
            key={item.name}
            className="p-2 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/50 flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: palette[idx % palette.length] }}
              />
              <span className="text-[11px] font-medium text-[var(--color-primary)] truncate" title={item.name}>
                {item.name}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-[10.5px] tabular-nums">
              <span className="font-bold text-[var(--color-primary)]">
                {metric === 'weight'
                  ? `${formatDecimal(item.value, 1)} kg`
                  : metric === 'volume'
                  ? `${formatDecimal(item.value, 2)} m³`
                  : formatNumber(item.value)}
              </span>
              <span className="text-[var(--color-secondary)] text-[10px]">
                {item.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommodityDistributionSection({
  commodities,
  mode,
  isLoading,
}: CommodityDistributionCardProps) {
  const { t } = useTranslation()
  const [activeMetric, setActiveMetric] = useState<MetricKey>('shipments')

  const airData = commodities?.air || []
  const seaData = commodities?.sea || []

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header & Metric Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]">
            <Boxes className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('shipments.commodityDistribution')}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <BarChart3 className="w-3 h-3" /> Udara & Laut
              </span>
            </div>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              {t('shipments.commodityDistributionDesc')}
            </p>
          </div>
        </div>

        {/* Metric Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] shadow-xs self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveMetric('shipments')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums',
              activeMetric === 'shipments'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            {t('shipments.totalResi')}
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('packages')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums',
              activeMetric === 'packages'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            {t('shipments.totalPackages')}
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('weight')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums',
              activeMetric === 'weight'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            Kg
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric('volume')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums',
              activeMetric === 'volume'
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            M³
          </button>
        </div>
      </div>

      {/* Grid Panels: Separated Sea & Air */}
      <div
        className={cn(
          'grid gap-4',
          mode === 'all'
            ? 'grid-cols-1 lg:grid-cols-2'
            : 'grid-cols-1'
        )}
      >
        {/* Sea Freight Panel (Shown in 'all' or 'sea') */}
        {(mode === 'all' || mode === 'sea') && (
          <SingleModeCommodityPanel
            title={t('shipments.commoditySeaTitle')}
            icon={Ship}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
            badgeText="Moda Laut"
            data={seaData}
            palette={SEA_COLORS}
            metric={activeMetric}
            isLoading={isLoading}
          />
        )}

        {/* Air Freight Panel (Shown in 'all' or 'air') */}
        {(mode === 'all' || mode === 'air') && (
          <SingleModeCommodityPanel
            title={t('shipments.commodityAirTitle')}
            icon={Plane}
            iconColor="text-sky-500"
            iconBg="bg-sky-500/10 dark:bg-sky-500/20"
            badgeText="Moda Udara"
            data={airData}
            palette={AIR_COLORS}
            metric={activeMetric}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
