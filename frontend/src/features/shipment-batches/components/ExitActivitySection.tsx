import { LogOut } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { StatCardGroup } from './StatCard'

export function ExitActivitySection({
  kpis,
  isLoadingKpi,
  isLoadingExitHistory,
  exitHistoryMonthTotal,
  exitHistoryMonthAir = 0,
  exitHistoryMonthSea = 0,
  onOpenExitList,
  onOpenExitHistory,
}: {
  kpis: any
  isLoadingKpi: boolean
  isLoadingExitHistory: boolean
  exitHistoryMonthTotal: number
  exitHistoryMonthAir?: number
  exitHistoryMonthSea?: number
  onOpenExitList: (config: { title: string; description: string; data: any[]; iconColorClass: string; iconBgClass: string }) => void
  onOpenExitHistory: () => void
}) {
  const { t } = useTranslation()

  const hasYesterdayList = Boolean(kpis?.exitYesterdayList && kpis.exitYesterdayList.length > 0)
  const hasTodayList = Boolean(kpis?.exitTodayList && kpis.exitTodayList.length > 0)
  const hasTomorrowList = Boolean(kpis?.expectedExitTomorrowList && kpis.expectedExitTomorrowList.length > 0)

  return (
    <StatCardGroup
      icon={LogOut}
      iconColorClass="text-blue-600"
      titleColorClass="text-blue-600"
      title={t('marking.section.exitActivity')}
      itemsBreakpoint="xl"
      items={[
        {
          label: t('marking.exit.yesterday'),
          value: kpis?.exitYesterdayCount || 0,
          airValue: kpis?.exitYesterdayAir || 0,
          seaValue: kpis?.exitYesterdaySea || 0,
          isLoading: isLoadingKpi,
          onClick: hasYesterdayList ? () => onOpenExitList({
            title: t('marking.exit.yesterday'),
            description: t('marking.exit.yesterdayDesc'),
            data: kpis.exitYesterdayList,
            iconColorClass: 'text-blue-500',
            iconBgClass: 'bg-blue-50/10'
          }) : undefined,
          actionLabel: hasYesterdayList ? t('marking.seeDetail') : undefined,
        },
        {
          label: t('marking.exit.today'),
          value: kpis?.exitTodayCount || 0,
          valueColorClass: 'text-emerald-600',
          airValue: kpis?.exitTodayAir || 0,
          seaValue: kpis?.exitTodaySea || 0,
          isLoading: isLoadingKpi,
          onClick: hasTodayList ? () => onOpenExitList({
            title: t('marking.exit.today'),
            description: t('marking.exit.todayDesc'),
            data: kpis.exitTodayList,
            iconColorClass: 'text-emerald-500',
            iconBgClass: 'bg-emerald-50/10'
          }) : undefined,
          actionLabel: hasTodayList ? t('marking.seeDetail') : undefined,
        },
        {
          label: t('marking.exit.tomorrow'),
          value: kpis?.expectedExitTomorrowCount || 0,
          valueColorClass: 'text-amber-600',
          airValue: kpis?.expectedExitTomorrowAir || 0,
          seaValue: kpis?.expectedExitTomorrowSea || 0,
          isLoading: isLoadingKpi,
          onClick: hasTomorrowList ? () => {
            const list = kpis.expectedExitTomorrowList.map((item: any) => ({
              fdMarkingCode: item.fdMarkingCode,
              fdConsignee: item.fdConsignee || null,
              fdExitDate: null,
              fdGudang: item.fdGudang || null,
              fdListType: item.fdListType || null,
              fdKet: item.fdKet || null
            }))
            onOpenExitList({
              title: t('marking.exit.tomorrow'),
              description: t('marking.exit.tomorrowDesc'),
              data: list,
              iconColorClass: 'text-amber-500',
              iconBgClass: 'bg-amber-50/10'
            })
          } : undefined,
          actionLabel: hasTomorrowList ? t('marking.seeDetail') : undefined,
        },
        {
          label: t('marking.exit.history'),
          value: exitHistoryMonthTotal,
          airValue: exitHistoryMonthAir,
          seaValue: exitHistoryMonthSea,
          isLoading: isLoadingExitHistory,
          onClick: onOpenExitHistory,
          actionLabel: t('marking.exit.calendarTitle'),
        },
      ]}
    />
  )
}
