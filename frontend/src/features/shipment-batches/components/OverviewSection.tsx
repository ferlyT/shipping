import { LayoutGrid } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatCardGroup } from './StatCard'

export function OverviewSection({
  kpis,
  isLoadingKpi,
  isOpen,
  onToggle,
}: {
  kpis: any
  isLoadingKpi: boolean
  isOpen: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const currentYear = kpis?.currentYear || new Date().getFullYear()
  const lastYear = currentYear - 1

  return (
    <StatCardGroup
      icon={LayoutGrid}
      iconColorClass="text-indigo-600"
      titleColorClass="text-indigo-600"
      title={t('marking.section.overview')}
      collapsible
      isOpen={isOpen}
      onToggle={onToggle}
      itemsBreakpoint="xl"
      items={[
        {
          label: `${t('marking.kpi.totalBatch') || 'Total Batch'} (${currentYear})`,
          value: kpis?.thisYearBatches !== undefined ? kpis.thisYearBatches : (kpis?.totalBatches || 0),
          subValue: kpis?.lastYearBatchesYtd !== undefined
            ? `${lastYear} YTD: ${Number(kpis.lastYearBatchesYtd).toLocaleString('en-US')} · All: ${Number(kpis.totalBatches || 0).toLocaleString('en-US')}`
            : undefined,
          yoy: kpis?.yoyGrowthPercent !== undefined ? {
            percent: kpis.yoyGrowthPercent,
            lastYearValue: kpis.lastYearBatchesYtd,
            label: `YoY vs ${lastYear} YTD (${Number(kpis.lastYearBatchesYtd || 0).toLocaleString('en-US')})`
          } : undefined,
          airValue: kpis?.thisYearBatchesAir !== undefined ? kpis.thisYearBatchesAir : (kpis?.totalBatchesAir || 0),
          seaValue: kpis?.thisYearBatchesSea !== undefined ? kpis.thisYearBatchesSea : (kpis?.totalBatchesSea || 0),
          isLoading: isLoadingKpi,
        },
        {
          label: t('marking.kpi.activeBatch'),
          value: kpis?.activeBatches || 0,
          valueColorClass: 'text-emerald-600',
          airValue: kpis?.activeBatchesAir || 0,
          seaValue: kpis?.activeBatchesSea || 0,
          isLoading: isLoadingKpi,
        },
        {
          label: t('marking.kpi.avgTransit'),
          value: kpis?.avgTransitTime || 0,
          unit: t('marking.kpi.days'),
          valueColorClass: 'text-purple-600',
          airValue: kpis?.avgTransitTimeAir ? `${kpis.avgTransitTimeAir}d` : 0,
          seaValue: kpis?.avgTransitTimeSea ? `${kpis.avgTransitTimeSea}d` : 0,
          isLoading: isLoadingKpi,
        },
      ]}
    />
  )
}
