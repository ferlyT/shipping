import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import {
  Package,
  Weight,
  Box,
  Receipt,
  Users,
  Plane,
  Ship,
  ListChecks,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn, formatNumber, formatDecimal } from '@/lib/utils'
import { useShipmentKpis } from '../hooks/useShipmentKpis'
import { CommodityDistributionSection } from '../components/CommodityDistributionCard'
import type { ShipmentTrendMetric } from '../types/shipments.types'

type TransportMode = 'all' | 'air' | 'sea'

function calculateTrend(current: number, previous: number): ShipmentTrendMetric {
  const diff = current - previous
  if (previous === 0) {
    return {
      diff,
      percentage: current > 0 ? 100 : 0,
      percentageText: current > 0 ? '+100%' : '0%',
      type: current > 0 ? 'up' : 'neutral',
    }
  }
  const pct = (diff / previous) * 100
  return {
    diff,
    percentage: Number(pct.toFixed(1)),
    percentageText: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
    type: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
  }
}

function TrendBadge({ trend, vsLabel }: { trend?: ShipmentTrendMetric; vsLabel: string }) {
  if (!trend) return null

  const isUp = trend.type === 'up'
  const isDown = trend.type === 'down'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold tracking-tight transition-colors',
        isUp && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        isDown && 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        !isUp && !isDown && 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]'
      )}
      title={`${trend.diff >= 0 ? '+' : ''}${formatNumber(trend.diff)} (${trend.percentageText}) ${vsLabel}`}
    >
      {isUp && <TrendingUp className="w-2.5 h-2.5 shrink-0" />}
      {isDown && <TrendingDown className="w-2.5 h-2.5 shrink-0" />}
      {!isUp && !isDown && <Minus className="w-2.5 h-2.5 shrink-0" />}
      <span>{trend.percentageText}</span>
    </span>
  )
}

interface KpiCardData {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
  label: string
  unit?: string
  total: number
  air: number
  sea: number
  thisMonthTotal: number
  lastMonthTotal: number
  thisMonthAir: number
  lastMonthAir: number
  thisMonthSea: number
  lastMonthSea: number
  trend: ShipmentTrendMetric
  isDecimal?: boolean
  decimalPlaces?: number
}

function CleanKpiCard({
  item,
  mode,
  isLoading,
  vsLabel,
  t,
}: {
  item: KpiCardData
  mode: TransportMode
  isLoading: boolean
  vsLabel: string
  t: (k: string) => string
}) {
  const { Icon, iconColor, iconBg, label, unit } = {
    Icon: item.icon,
    iconColor: item.iconColor,
    iconBg: item.iconBg,
    label: item.label,
    unit: item.unit,
  }

  // Tentukan angka utama dan tren berdasarkan mode
  const { displayValue, activeTrend, thisMonthVal, lastMonthVal } = useMemo(() => {
    if (mode === 'air') {
      return {
        displayValue: item.air,
        activeTrend: calculateTrend(item.thisMonthAir, item.lastMonthAir),
        thisMonthVal: item.thisMonthAir,
        lastMonthVal: item.lastMonthAir,
      }
    }
    if (mode === 'sea') {
      return {
        displayValue: item.sea,
        activeTrend: calculateTrend(item.thisMonthSea, item.lastMonthSea),
        thisMonthVal: item.thisMonthSea,
        lastMonthVal: item.lastMonthSea,
      }
    }
    return {
      displayValue: item.total,
      activeTrend: item.trend,
      thisMonthVal: item.thisMonthTotal,
      lastMonthVal: item.lastMonthTotal,
    }
  }, [mode, item])

  const formatVal = (num: number) => {
    if (item.isDecimal) {
      return formatDecimal(num, item.decimalPlaces ?? 2)
    }
    return formatNumber(num)
  }

  // Persentase rasio Udara vs Laut
  const totalVolumeBase = item.air + item.sea
  const airPct = totalVolumeBase > 0 ? (item.air / totalVolumeBase) * 100 : 0
  const seaPct = totalVolumeBase > 0 ? 100 - airPct : 0

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top bar: Icon, Label, Trend Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs', iconBg)}>
              <Icon className={cn('w-4 h-4', iconColor)} />
            </div>
            <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider truncate">
              {label}
            </span>
          </div>
          {!isLoading && <TrendBadge trend={activeTrend} vsLabel={vsLabel} />}
        </div>

        {/* Hero Number */}
        <div className="mt-3.5 mb-2">
          {isLoading ? (
            <div className="h-9 w-32 rounded-lg skeleton-shimmer" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {formatVal(displayValue)}
              </span>
              {unit && (
                <span className="text-xs font-semibold text-[var(--color-secondary)]">
                  {unit}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Air vs Sea Section (Hanya tampil di mode 'all' untuk menjaga kelegaan visual) */}
        {mode === 'all' && (
          <div className="mt-3.5 pt-3 border-t border-[var(--color-border)]/60">
            {isLoading ? (
              <div className="h-6 w-full rounded skeleton-shimmer" />
            ) : (
              <>
                {/* Visual Ratio Bar Tipis */}
                <div className="h-1.5 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden flex mb-2.5">
                  <div
                    style={{ width: `${airPct}%` }}
                    className="bg-sky-500 h-full transition-all duration-500 rounded-l-full"
                    title={`Udara: ${formatVal(item.air)} (${airPct.toFixed(0)}%)`}
                  />
                  <div
                    style={{ width: `${seaPct}%` }}
                    className="bg-indigo-500 h-full transition-all duration-500 rounded-r-full"
                    title={`Laut: ${formatVal(item.sea)} (${seaPct.toFixed(0)}%)`}
                  />
                </div>

                {/* Legend & Numbers (Icons only without text) */}
                <div className="flex items-center justify-between text-[11px] tabular-nums text-[var(--color-secondary)]">
                  <div className="flex items-center gap-1 min-w-0" title={`Udara: ${formatVal(item.air)} (${airPct.toFixed(0)}%)`}>
                    <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="font-semibold text-[var(--color-primary)]">{formatVal(item.air)}</span>
                    <span className="text-[10px] opacity-60">({airPct.toFixed(0)}%)</span>
                  </div>

                  <div className="flex items-center gap-1 min-w-0 justify-end" title={`Laut: ${formatVal(item.sea)} (${seaPct.toFixed(0)}%)`}>
                    <Ship className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-[var(--color-primary)]">{formatVal(item.sea)}</span>
                    <span className="text-[10px] opacity-60">({seaPct.toFixed(0)}%)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Mode Udara / Laut Aktif Indicator (Icon only) */}
        {mode !== 'all' && (
          <div className="mt-2 text-[11px] flex items-center gap-1 text-[var(--color-secondary)]">
            {mode === 'air' ? (
              <span className="inline-flex items-center p-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400" title={t('shipments.airFreight')}>
                <Plane className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="inline-flex items-center p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" title={t('shipments.seaFreight')}>
                <Ship className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Month-over-Month Comparison */}
      <div className="mt-4 pt-2.5 border-t border-[var(--color-border)]/50 flex items-center justify-between text-[11px] text-[var(--color-secondary)] tabular-nums">
        {isLoading ? (
          <div className="h-4 w-full rounded skeleton-shimmer" />
        ) : (
          <>
            <span className="truncate">
              <span className="opacity-70 text-[10px] uppercase font-medium">{t('shipments.thisMonth')}:</span>{' '}
              <strong className="font-semibold text-[var(--color-primary)]">
                {formatVal(thisMonthVal)} {unit || ''}
              </strong>
            </span>
            <span className="truncate text-right">
              <span className="opacity-70 text-[10px] uppercase font-medium">{t('shipments.lastMonth')}:</span>{' '}
              <span className="font-medium text-[var(--color-secondary)]">
                {formatVal(lastMonthVal)} {unit || ''}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default function ShipmentsDashboardPage() {
  const { t } = useTranslation()
  const { data: kpiData, isLoading: isLoadingKpi } = useShipmentKpis({})
  const [transportMode, setTransportMode] = useState<TransportMode>('all')

  const kpis = kpiData
  const isLoading = isLoadingKpi && !kpis
  const vsLabel = t('shipments.vsLastMonth')

  // Normalisasi data kartu
  const cards: KpiCardData[] = useMemo(() => {
    const cur = kpis?.thisMonth
    const prev = kpis?.lastMonth
    const comp = kpis?.comparison

    return [
      {
        icon: Receipt,
        iconColor: 'text-blue-500',
        iconBg: 'bg-blue-500/10 dark:bg-blue-500/20',
        label: t('shipments.totalResi'),
        total: kpis?.totalResi || 0,
        air: kpis?.resiByType?.udara || 0,
        sea: kpis?.resiByType?.laut || 0,
        thisMonthTotal: cur?.totalResi || 0,
        lastMonthTotal: prev?.totalResi || 0,
        thisMonthAir: cur?.resiByType?.udara || 0,
        lastMonthAir: prev?.resiByType?.udara || 0,
        thisMonthSea: cur?.resiByType?.laut || 0,
        lastMonthSea: prev?.resiByType?.laut || 0,
        trend: comp?.resi || calculateTrend(cur?.totalResi || 0, prev?.totalResi || 0),
      },
      {
        icon: Package,
        iconColor: 'text-emerald-500',
        iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        label: t('shipments.totalPackages'),
        total: kpis?.totalPackages || 0,
        air: kpis?.packagesByType?.udara || 0,
        sea: kpis?.packagesByType?.laut || 0,
        thisMonthTotal: cur?.totalPackages || 0,
        lastMonthTotal: prev?.totalPackages || 0,
        thisMonthAir: cur?.packagesByType?.udara || 0,
        lastMonthAir: prev?.packagesByType?.udara || 0,
        thisMonthSea: cur?.packagesByType?.laut || 0,
        lastMonthSea: prev?.packagesByType?.laut || 0,
        trend: comp?.packages || calculateTrend(cur?.totalPackages || 0, prev?.totalPackages || 0),
      },
      {
        icon: Weight,
        iconColor: 'text-purple-500',
        iconBg: 'bg-purple-500/10 dark:bg-purple-500/20',
        label: t('shipments.totalWeight'),
        unit: 'kg',
        total: kpis?.totalBerat || 0,
        air: kpis?.beratByType?.udara || 0,
        sea: kpis?.beratByType?.laut || 0,
        thisMonthTotal: cur?.totalBerat || 0,
        lastMonthTotal: prev?.totalBerat || 0,
        thisMonthAir: cur?.beratByType?.udara || 0,
        lastMonthAir: prev?.beratByType?.udara || 0,
        thisMonthSea: cur?.beratByType?.laut || 0,
        lastMonthSea: prev?.beratByType?.laut || 0,
        trend: comp?.berat || calculateTrend(cur?.totalBerat || 0, prev?.totalBerat || 0),
        isDecimal: true,
        decimalPlaces: 1,
      },
      {
        icon: Box,
        iconColor: 'text-rose-500',
        iconBg: 'bg-rose-500/10 dark:bg-rose-500/20',
        label: t('shipments.totalVolume'),
        unit: 'm³',
        total: kpis?.totalVolume || 0,
        air: kpis?.volumeByType?.udara || 0,
        sea: kpis?.volumeByType?.laut || 0,
        thisMonthTotal: cur?.totalVolume || 0,
        lastMonthTotal: prev?.totalVolume || 0,
        thisMonthAir: cur?.volumeByType?.udara || 0,
        lastMonthAir: prev?.volumeByType?.udara || 0,
        thisMonthSea: cur?.volumeByType?.laut || 0,
        lastMonthSea: prev?.volumeByType?.laut || 0,
        trend: comp?.volume || calculateTrend(cur?.totalVolume || 0, prev?.totalVolume || 0),
        isDecimal: true,
        decimalPlaces: 2,
      },
      {
        icon: Users,
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
        label: t('shipments.activeCustomers'),
        total: kpis?.totalCust || 0,
        air: kpis?.custByType?.udara || 0,
        sea: kpis?.custByType?.laut || 0,
        thisMonthTotal: cur?.totalCust || 0,
        lastMonthTotal: prev?.totalCust || 0,
        thisMonthAir: cur?.custByType?.udara || 0,
        lastMonthAir: prev?.custByType?.udara || 0,
        thisMonthSea: cur?.custByType?.laut || 0,
        lastMonthSea: prev?.custByType?.laut || 0,
        trend: comp?.cust || calculateTrend(cur?.totalCust || 0, prev?.totalCust || 0),
      },
    ]
  }, [kpis, t])

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-24 font-[var(--font-body)]">
      {/* Header & Segmented Mode Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={t('shipments.title')}
          subtitle={t('shipments.subtitle')}
          breadcrumbs={[
            { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
            { label: t('nav.shipment') },
            { label: t('nav.dashboard') },
          ]}
        />

        {/* Segmented Mode Filter (All / Air / Sea) */}
        <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTransportMode('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              transportMode === 'all'
                ? 'bg-[var(--color-neutral)] text-[var(--color-primary)] shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
            )}
          >
            {t('shipments.allModes')}
          </button>
          <button
            type="button"
            onClick={() => setTransportMode('air')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              transportMode === 'air'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-sky-600 dark:hover:text-sky-400'
            )}
          >
            <Plane className="w-3.5 h-3.5" />
            {t('shipments.air')}
          </button>
          <button
            type="button"
            onClick={() => setTransportMode('sea')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              transportMode === 'sea'
                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-[var(--color-secondary)] hover:text-indigo-600 dark:hover:text-indigo-400'
            )}
          >
            <Ship className="w-3.5 h-3.5" />
            {t('shipments.sea')}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (5 Cards, Clean & Spacious) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {cards.map((card) => (
          <CleanKpiCard
            key={card.label}
            item={card}
            mode={transportMode}
            isLoading={isLoading}
            vsLabel={vsLabel}
            t={t}
          />
        ))}
      </div>

      {/* Commodity Distribution Chart (Separated Sea & Air) */}
      <CommodityDistributionSection
        commodities={kpis?.commodities}
        mode={transportMode}
        isLoading={isLoading}
      />

      {/* Navigation Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={ROUTES.SHIPMENTS_LIST}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] transition-colors">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('shipments.listTitle')}
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                {t('shipments.listSubtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>

        <Link
          to={ROUTES.SHIPMENT_BATCHES}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('nav.batchMarking')}
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                {t('batchMarking.subtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      </div>
    </div>
  )
}


