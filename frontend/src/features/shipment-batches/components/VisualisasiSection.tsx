import { Plane, Ship } from 'lucide-react'
import { ExitBarChart } from './ExitBarChart'
import { PrediksiDonutChart } from './PrediksiDonutChart'
import { useTranslation } from '@/hooks/useTranslation'
import type { ExitHistoryDay } from '../services/marking.service'

export function VisualisasiSection({
  exitHistoryMap,
  isLoadingExitHistory,
  exitHistoryMonthAir = 0,
  exitHistoryMonthSea = 0,
  kpis,
  isLoadingKpi,
  onOpenPrediksi,
}: {
  exitHistoryMap: Record<string, ExitHistoryDay>
  isLoadingExitHistory: boolean
  exitHistoryMonthTotal: number
  exitHistoryMonthAir?: number
  exitHistoryMonthSea?: number
  kpis: any
  isLoadingKpi: boolean
  onOpenPrediksi: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      {/* Chart 1: Tren Exit Harian */}
      <div className="lg:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-[var(--color-primary)] text-sm sm:text-base tracking-tight">
              {t('marking.section.dailyTrend')}
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              {t('marking.section.dailyTrendSub')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-1 rounded-full border border-sky-500/20 font-semibold">
              <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{exitHistoryMonthAir}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 font-semibold">
              <Ship className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{exitHistoryMonthSea}</span>
            </span>
          </div>
        </div>
        <ExitBarChart
          historyMap={exitHistoryMap}
          isLoading={isLoadingExitHistory}
        />
      </div>

      {/* Chart 2: Prediksi Exit */}
      <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 border-b border-[var(--color-border)] flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-[var(--color-primary)] text-sm sm:text-base tracking-tight">
              {t('marking.section.predictionDist')}
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              {t('marking.section.predictionDistSub')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-1 rounded-full border border-sky-500/20 font-semibold">
              <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>{kpis?.activeBatchesAir || 0}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 font-semibold">
              <Ship className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{kpis?.activeBatchesSea || 0}</span>
            </span>
          </div>
        </div>
        <PrediksiDonutChart
          terlambat={kpis?.prediksiTerlambatCount || 0}
          segera={kpis?.prediksiSegeraCount || 0}
          dekat={kpis?.prediksiDekatCount || 0}
          prediksiExitList={kpis?.prediksiExitList || []}
          isLoading={isLoadingKpi}
          onClickTerlambat={onOpenPrediksi}
        />
      </div>
    </div>
  )
}
