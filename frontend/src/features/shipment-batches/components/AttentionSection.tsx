import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatCardGroup } from './StatCard'

export function AttentionSection({
  kpis,
  isLoadingKpi,
  onOpenEtaSummary,
  onOpenMissedTarget,
}: {
  kpis: any
  isLoadingKpi: boolean
  onOpenEtaSummary: () => void
  onOpenMissedTarget: () => void
}) {
  const { t } = useTranslation()

  const hasEtaNotExit = Boolean(kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0)
  const hasMissedTarget = Boolean(kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0)

  return (
    <StatCardGroup
      icon={AlertTriangle}
      iconColorClass="text-rose-600"
      titleColorClass="text-rose-600"
      title={t('marking.section.attention')}
      itemsBreakpoint="xl"
      items={[
        {
          label: t('marking.kpi.etaNotExit'),
          value: kpis?.etaNotExitBatches || 0,
          valueColorClass: 'text-amber-600',
          airValue: kpis?.etaNotExitBatchesAir || 0,
          seaValue: kpis?.etaNotExitBatchesSea || 0,
          isLoading: isLoadingKpi,
          onClick: hasEtaNotExit ? onOpenEtaSummary : undefined,
          actionLabel: hasEtaNotExit ? t('marking.seeDetail') : undefined,
        },
        {
          label: t('marking.kpi.missedTarget'),
          value: kpis?.missedTargetBatches || 0,
          valueColorClass: 'text-rose-600',
          airValue: kpis?.missedTargetBatchesAir || 0,
          seaValue: kpis?.missedTargetBatchesSea || 0,
          isLoading: isLoadingKpi,
          onClick: hasMissedTarget ? onOpenMissedTarget : undefined,
          actionLabel: hasMissedTarget ? t('marking.seeDetail') : undefined,
        },
      ]}
    />
  )
}
