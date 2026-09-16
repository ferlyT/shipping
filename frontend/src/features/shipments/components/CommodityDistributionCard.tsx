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
import { Plane, Ship, Boxes, BarChart3, MapPin } from 'lucide-react'
import { cn, formatNumber, formatDecimal } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import type { ShipmentCommoditiesData, ShipmentCommodityMetric } from '../types/shipments.types'

interface CommodityDistributionCardProps {
  commodities?: ShipmentCommoditiesData
  year?: number
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

// Master nama cabang (Single Source of Truth: tbCabang di database)
const BRANCH_NAMES_FALLBACK: Record<string, string> = {
  SG: 'Singapore',
  GZ: 'Guangzhou',
  HK: 'Hong Kong',
  YW: 'Yiwu',
  SH: 'Shanghai',
  SZ: 'Shenzhen',
  EX: 'Export',
  IM: 'Import Lain-lain',
  LG: 'Legal',
  LM: 'Legal Mandiri',
  BT: 'Batam',
  TH: 'Thailand',
  KR: 'South Korea',
  TW: 'Taiwan',
  MY: 'Malaysia',
  DG: 'Dongguan',
  CP: 'Cost of Part',
  IN: 'Indonesia',
  XM: 'Xiamen',
}

interface SingleModeCommodityPanelProps {
  title: string
  icon: typeof Plane
  iconColor: string
  iconBg: string
  badgeText: string
  data: ShipmentCommodityMetric[]
  palette: string[]
  metric: MetricKey
  selectedBranch?: string
  branchNameMap?: Record<string, string>
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
  selectedBranch = 'all',
  branchNameMap = BRANCH_NAMES_FALLBACK,
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

  // Filter & recalculate if a specific branch is selected
  const processedData = useMemo(() => {
    if (!selectedBranch || selectedBranch === 'all') {
      return data
    }
    return data
      .map((item) => {
        const branchMetric = item.branches?.find((b) => b.branchCode === selectedBranch)
        if (!branchMetric || branchMetric.shipments === 0) return null
        return {
          name: item.name,
          shipments: branchMetric.shipments,
          packages: branchMetric.packages,
          weight: branchMetric.weight,
          volume: branchMetric.volume,
          percentage: branchMetric.percentage,
          branches: item.branches,
          totalCommodityShipments: item.shipments,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => (b[metric] || 0) - (a[metric] || 0))
  }, [data, selectedBranch, metric])

  const totalMetricValue = useMemo(() => {
    return processedData.reduce((acc, curr) => acc + (curr[metric] || 0), 0)
  }, [processedData, metric])

  const chartData = useMemo(() => {
    return processedData.slice(0, 8).map((item) => ({
      name: item.name,
      value: item[metric] || 0,
      shipments: item.shipments,
      packages: item.packages,
      weight: item.weight,
      volume: item.volume,
      branches: item.branches,
      percentage: totalMetricValue > 0
        ? Number((((item[metric] || 0) / totalMetricValue) * 100).toFixed(1))
        : 0,
      branchShareOfCommodity: (item as any).totalCommodityShipments
        ? Number(((item.shipments / (item as any).totalCommodityShipments) * 100).toFixed(1))
        : undefined,
    }))
  }, [processedData, metric, totalMetricValue])

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

  if (!processedData || processedData.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xs flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', iconBg, iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-semibold text-[var(--color-primary)]">{title}</h4>
        <p className="text-xs text-[var(--color-secondary)] mt-1">
          {selectedBranch !== 'all'
            ? `${t('shipments.noCommodityData')} (${selectedBranch})`
            : t('shipments.noCommodityData')}
        </p>
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--color-primary)] tracking-tight truncate">
                  {title}
                </h3>
                {selectedBranch !== 'all' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    {selectedBranch}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--color-secondary)] truncate">
                {processedData.length} {t('shipments.topCommodities')} • Total {metricLabel}:{' '}
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
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                        <div className="font-bold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-1.5 flex items-center justify-between">
                          <span className="truncate pr-2">{row.name}</span>
                          <span className="text-[11px] font-semibold text-sky-500 tabular-nums shrink-0">
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

                        {/* Breakdown if viewing ALL branches */}
                        {(!selectedBranch || selectedBranch === 'all') && row.branches && row.branches.length > 0 && (
                          <div className="pt-2 mt-1 border-t border-[var(--color-border)]">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] mb-1 flex items-center justify-between">
                              <span>{t('shipments.branchDistribution')}</span>
                              <span className="text-[9px] opacity-70">Top {Math.min(row.branches.length, 5)}</span>
                            </div>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto pr-0.5">
                              {row.branches.slice(0, 5).map((b: any) => {
                                const bName = b.branchName || branchNameMap[b.branchCode]
                                return (
                                  <div key={b.branchCode} className="flex items-center justify-between text-[10.5px] tabular-nums">
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {b.branchCode}
                                      {bName ? (
                                        <span className="text-[9.5px] font-normal text-[var(--color-secondary)] ml-1">
                                          ({bName})
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="text-[var(--color-secondary)]">
                                      {formatNumber(b.shipments)} ({b.percentage}%)
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* If viewing a SPECIFIC branch */}
                        {selectedBranch && selectedBranch !== 'all' && row.branchShareOfCommodity !== undefined && (
                          <div className="pt-2 mt-1 border-t border-[var(--color-border)] flex items-center justify-between text-[10.5px]">
                            <span className="text-[var(--color-secondary)]">Porsi dari Total {row.name}:</span>
                            <span className="font-bold text-sky-500 tabular-nums">{row.branchShareOfCommodity}%</span>
                          </div>
                        )}
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
      <div className="mt-4 pt-3 border-t border-[var(--color-border)]/60 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        {chartData.slice(0, 4).map((item, idx) => (
          <div
            key={item.name}
            className="p-2.5 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/50 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: palette[idx % palette.length] }}
                />
                <span className="text-[11px] font-bold text-[var(--color-primary)] truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-[11px] tabular-nums">
                <span className="font-bold text-[var(--color-primary)]">
                  {metric === 'weight'
                    ? `${formatDecimal(item.value, 1)} kg`
                    : metric === 'volume'
                    ? `${formatDecimal(item.value, 2)} m³`
                    : formatNumber(item.value)}
                </span>
                <span className="text-[var(--color-secondary)] text-[10.5px]">
                  {item.percentage}%
                </span>
              </div>
            </div>

            {/* Branch Pills: when all branches selected */}
            {(!selectedBranch || selectedBranch === 'all') && item.branches && item.branches.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-[var(--color-border)]/40 flex items-center gap-1 flex-wrap">
                {item.branches.slice(0, 3).map((b) => (
                  <span
                    key={b.branchCode}
                    className="text-[9.5px] font-semibold px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-secondary)] tabular-nums"
                    title={`${b.branchCode}: ${formatNumber(b.shipments)} resi (${b.percentage}%)`}
                  >
                    {b.branchCode} <span className="font-normal opacity-80">{b.percentage}%</span>
                  </span>
                ))}
              </div>
            )}

            {/* Branch Indicator: when specific branch selected */}
            {selectedBranch && selectedBranch !== 'all' && (
              <div className="mt-2 pt-1.5 border-t border-[var(--color-border)]/40 flex items-center justify-between text-[10px] text-[var(--color-secondary)]">
                <span>Cabang</span>
                <span className="font-bold text-[var(--color-primary)]">{selectedBranch}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommodityDistributionSection({
  commodities,
  year,
  mode,
  isLoading,
}: CommodityDistributionCardProps) {
  const { t } = useTranslation()
  const [activeMetric, setActiveMetric] = useState<MetricKey>('shipments')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')

  const airData = commodities?.air || []
  const seaData = commodities?.sea || []

  // Extract all available branches from API (tbCabang) or data
  const branchNameMap = useMemo(() => {
    const map: Record<string, string> = { ...BRANCH_NAMES_FALLBACK }
    commodities?.availableBranches?.forEach((b) => {
      if (typeof b === 'object' && b && 'code' in b && 'name' in b) {
        map[b.code] = b.name
      }
    })
    return map
  }, [commodities?.availableBranches])

  const availableBranches = useMemo(() => {
    if (commodities?.availableBranches && commodities.availableBranches.length > 0) {
      return commodities.availableBranches.map((b) => (typeof b === 'object' ? b.code : b))
    }
    const set = new Set<string>()
    ;[...airData, ...seaData].forEach((item) => {
      item.branches?.forEach((b) => set.add(b.branchCode))
    })
    return Array.from(set)
  }, [commodities, airData, seaData])

  // Filter branches: SG, GZ, HK, YW, SH, SZ, EX, IM, LG, LM + others
  const displayBranches = useMemo(() => {
    const priority = ['SG', 'GZ', 'HK', 'YW', 'SH', 'SZ', 'EX', 'IM', 'LG', 'LM']
    const main = priority.filter((b) => availableBranches.includes(b))
    const others = availableBranches.filter((b) => !priority.includes(b) && b !== 'Unassigned' && b !== '-')
    return [...main, ...others]
  }, [availableBranches])

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header & Controls */}
      <div className="flex flex-col gap-3.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]">
              <Boxes className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  {t('shipments.commodityDistribution')}
                </h2>
                {year && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] tabular-nums">
                    Tahun {year}
                  </span>
                )}
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
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs border border-[var(--color-border)]'
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
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs border border-[var(--color-border)]'
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
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs border border-[var(--color-border)]'
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
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              M³
            </button>
          </div>
        </div>

        {/* Branch Filter Pills */}
        <div className="pt-2.5 border-t border-[var(--color-border)]/60 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-secondary)] shrink-0 mr-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>{t('shipments.filterByBranch')}:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedBranch('all')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border',
              selectedBranch === 'all'
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-xs'
                : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] hover:text-[var(--color-primary)]'
            )}
          >
            {t('shipments.allBranches')}
          </button>

          {displayBranches.map((code) => {
            const isSelected = selectedBranch === code
            const name = branchNameMap[code]
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedBranch(code)}
                title={name ? `${code} - ${name}` : code}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 border flex items-center gap-1.5',
                  isSelected
                    ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 shadow-xs'
                    : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)] hover:text-[var(--color-primary)]'
                )}
              >
                <span>{code}</span>
                {name && (
                  <span className="hidden md:inline text-[10px] font-normal opacity-75">
                    ({name})
                  </span>
                )}
              </button>
            )
          })}
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
            selectedBranch={selectedBranch}
            branchNameMap={branchNameMap}
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
            selectedBranch={selectedBranch}
            branchNameMap={branchNameMap}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  )
}
