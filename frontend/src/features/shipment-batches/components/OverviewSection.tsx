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
          label: t('marking.kpi.totalBatch'),
          value: kpis?.totalBatches || 0,
          airValue: kpis?.totalBatchesAir || 0,
          seaValue: kpis?.totalBatchesSea || 0,
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
