import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

import { useDashboard } from '../hooks/useDashboard'

import { OverviewSection } from '../components/OverviewSection'
import { AttentionSection } from '../components/AttentionSection'
import { ExitActivitySection } from '../components/ExitActivitySection'
import { VisualisasiSection } from '../components/VisualisasiSection'

import { CariManifestModal } from '../components/CariManifestModal'
import { EtaSummaryModal } from '../components/EtaSummaryModal'
import { MissedTargetModal } from '../components/MissedTargetModal'
import { PredictedExitModal } from '../components/PredictedExitModal'
import { ExitListModal } from '../components/ExitListModal'
import { ExitHistoryModal } from '../components/ExitHistoryModal'
import { BatchManifestModal } from '../components/BatchManifestModal'

export default function ShipmentBatchesDashboardPage() {
  const { t } = useTranslation()
  const dashboard = useDashboard()
  
  const { state, actions, data, flags } = dashboard

  if (flags.isLoadingKpi && !data.kpis) {
    return <LoadingSpinner message={t('common.loadingBatch')} />
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      <PageHeader
        title={t('marking.title')}
        subtitle={t('marking.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.SHIPMENT_BATCHES },
          { label: t('nav.batchMarking') },
          { label: t('nav.dashboard') },
        ]}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-hidden">
        
        {/* Overview, Needs Attention, Exit Activity — 1 baris di layar besar (lg+)
            Lebar proporsional 3:2:4 mengikuti jumlah kolom data di tiap card,
            dan tinggi disamakan (items-stretch + h-full) */}
        <div className="grid grid-cols-1 lg:grid-cols-9 gap-4 items-stretch">
          <div className="lg:col-span-3 h-full">
            <OverviewSection
              kpis={data.kpis}
              isLoadingKpi={flags.isLoadingKpi}
              isOpen={state.isRingkasanOpen}
              onToggle={() => actions.setIsRingkasanOpen(v => !v)}
            />
          </div>

          <div className="lg:col-span-2 h-full">
            <AttentionSection
              kpis={data.kpis}
              isLoadingKpi={flags.isLoadingKpi}
              onOpenEtaSummary={() => actions.setIsEtaSummaryModalOpen(true)}
              onOpenMissedTarget={() => actions.setIsMissedTargetModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-4 h-full">
            <ExitActivitySection
              kpis={data.kpis}
              isLoadingKpi={flags.isLoadingKpi}
              isLoadingExitHistory={flags.isLoadingExitHistory}
              exitHistoryMonthTotal={data.exitHistoryMonthTotal}
              exitHistoryMonthAir={data.exitHistoryMonthAir}
              exitHistoryMonthSea={data.exitHistoryMonthSea}
              onOpenExitList={(config) => {
                actions.setExitListModalConfig(config)
                actions.setIsExitListModalOpen(true)
              }}
              onOpenExitHistory={() => actions.setIsExitHistoryModalOpen(true)}
            />
          </div>
        </div>

        <VisualisasiSection
          exitHistoryMap={data.exitHistoryMap}
          isLoadingExitHistory={flags.isLoadingExitHistory}
          exitHistoryMonthTotal={data.exitHistoryMonthTotal}
          exitHistoryMonthAir={data.exitHistoryMonthAir}
          exitHistoryMonthSea={data.exitHistoryMonthSea}
          kpis={data.kpis}
          isLoadingKpi={flags.isLoadingKpi}
          onOpenPrediksi={() => actions.setIsPrediksiExitModalOpen(true)}
        />

        {/* Modals */}
        <CariManifestModal
          isOpen={state.isCodeModalOpen}
          onClose={() => actions.setIsCodeModalOpen(false)}
          onSelect={(code) => actions.setSelectedManifestRow({ fdMarkingCode: code } as any)}
        />

        <EtaSummaryModal
          isOpen={state.isEtaSummaryModalOpen}
          onClose={() => actions.setIsEtaSummaryModalOpen(false)}
          data={data.kpis?.etaNotExitSummary || []}
        />

        <MissedTargetModal
          isOpen={state.isMissedTargetModalOpen}
          onClose={() => actions.setIsMissedTargetModalOpen(false)}
          data={data.kpis?.missedTargetSummary || []}
        />

        <PredictedExitModal
          isOpen={state.isPrediksiExitModalOpen}
          onClose={() => actions.setIsPrediksiExitModalOpen(false)}
          data={data.kpis?.prediksiExitList || []}
        />

        <ExitListModal
          isOpen={state.isExitListModalOpen}
          onClose={() => actions.setIsExitListModalOpen(false)}
          data={state.exitListModalConfig.data}
          title={state.exitListModalConfig.title}
          description={state.exitListModalConfig.description}
          iconColorClass={state.exitListModalConfig.iconColorClass}
          iconBgClass={state.exitListModalConfig.iconBgClass}
        />

        <ExitHistoryModal
          isOpen={state.isExitHistoryModalOpen}
          onClose={() => actions.setIsExitHistoryModalOpen(false)}
          month={state.exitCalendarMonth}
          onMonthChange={actions.setExitCalendarMonth}
          historyMap={data.exitHistoryMap}
          isLoading={flags.isLoadingExitHistory}
          onSelectDay={(dayKey, items) => {
            actions.setExitListModalConfig({
              title: `Exit ${dayKey}`, // It will be formatted inside if needed, but previously we used formatDate.
              description: t('marking.exit.todayDesc'), // using generic or simple description
              data: items,
              iconColorClass: 'text-indigo-500',
              iconBgClass: 'bg-indigo-50/10'
            })
            actions.setIsExitListModalOpen(true)
          }}
        />

        <BatchManifestModal
          selectedManifestRow={state.selectedManifestRow}
          manifestBatchDetail={data.manifestBatchDetail}
          onClose={() => actions.setSelectedManifestRow(null)}
        />
      </div>
    </div>
  )
}
