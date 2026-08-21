import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { markingApi } from '../services/marking.service'
import { StatusBlock } from '../components/MarkingGroupSection'
import { CariManifestModal } from '../components/CariManifestModal'
import { BatchDetailModal } from '../components/BatchDetailModal'
import { BatchManifestModal } from '../components/BatchManifestModal'
import { BatchFilterBar, type BatchListTypeFilter } from '../components/BatchFilterBar'
import { BatchToolbar, type BatchSearchScope } from '../components/BatchToolbar'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Marking, MarkingGroupMode } from '../types/marking.types'

export default function ShipmentBatchesListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [searchScope, setSearchScope] = useState<BatchSearchScope>('ALL')
  const debouncedSearch = useDebounce(search, 350)
  const [viewMode, setViewMode] = useState<'table' | 'shortlist'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'shortlist' : 'table'
  )

  const [listTypeFilter, setListTypeFilter] = useState<BatchListTypeFilter>('ALL')
  const [groupMode, setGroupMode] = useState<MarkingGroupMode>('year')

  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)

  // Fetch KPI data for totals
  const { data: kpiData, isLoading: isLoadingKpi, isFetching: isFetchingKpi } = useQuery({
    queryKey: ['markingKpi', listTypeFilter, debouncedSearch],
    queryFn: async () => {
      const res = await markingApi.getKPIs({ listType: listTypeFilter, search: debouncedSearch })
      return res.data as {
        data: {
          totalBatches: number
          activeBatches: number
        }
      }
    },
    placeholderData: keepPreviousData,
  })

  const kpis = kpiData?.data

  // Fetch manifest details if manifest modal is opened
  const { data: manifestDetailData } = useQuery({
    queryKey: ['markingDetail', selectedManifestRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedManifestRow?.fdMarkingCode) return null
      const res = await markingApi.detail(selectedManifestRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedManifestRow?.fdMarkingCode,
  })
  const manifestBatchDetail = manifestDetailData?.data || (selectedManifestRow as Marking)

  const clearAllFilters = () => {
    setListTypeFilter('ALL')
    setGroupMode('year')
    setSearch('')
    setSearchScope('ALL')
  }

  if (isLoadingKpi && !kpiData) return <LoadingSpinner message={t('common.loadingBatch')} />

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* Page Header */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4">
        <PageHeader
          title={t('marking.listTitle')}
          subtitle={t('marking.listSubtitle')}
          breadcrumbs={[
            { label: t('module.logistics'), path: ROUTES.SHIPMENT_BATCHES },
            { label: t('nav.batchMarking'), path: ROUTES.SHIPMENT_BATCHES },
            { label: t('nav.batchList') },
          ]}
          className="!pb-0 !border-b-0 !mb-0"
        />
      </div>

      {/* Unified Container */}
      <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 min-h-0">
        <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden min-h-0">
          {/* Filter Bar (Transport Modes, Grouping Options, Quick Chips, Search Manifest) */}
          <BatchFilterBar
            listTypeFilter={listTypeFilter}
            onListTypeChange={setListTypeFilter}
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            onOpenManifestSearch={() => setIsCodeModalOpen(true)}
            isFetching={isFetchingKpi}
            totalBatches={kpis?.totalBatches}
            activeBatches={kpis?.activeBatches}
            onClearAll={clearAllFilters}
          />

          {/* Toolbar (Scoped Search Input + View Mode Switch + Summary Badge) */}
          <div className="border-t border-[var(--color-border)]">
            <BatchToolbar
              search={search}
              onSearchChange={setSearch}
              searchScope={searchScope}
              onSearchScopeChange={setSearchScope}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalBatches={kpis?.totalBatches}
              activeBatches={kpis?.activeBatches}
              isFetching={isFetchingKpi}
            />
          </div>

          {/* Progress bar */}
          <div className="relative h-px bg-[var(--color-border)] shrink-0">
            {isFetchingKpi && (
              <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--color-primary)]/10 overflow-hidden z-10">
                <div className="h-full w-1/3 bg-[var(--color-primary)] rounded-full animate-[loaderSlide_1.1s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
          <style>{`
            @keyframes loaderSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>

          {/* Grouped Table Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[var(--color-neutral)] min-h-0 space-y-4">
            <StatusBlock
              viewMode={viewMode}
              status="open"
              isClosed="false"
              search={debouncedSearch}
              groupMode={groupMode}
              defaultOpen={true}
              withPagination={true}
              onView={setSelectedRow}
              onViewManifest={setSelectedManifestRow}
              listTypeFilter={listTypeFilter}
              totalCountOverride={kpis?.activeBatches}
            />
            <StatusBlock
              viewMode={viewMode}
              status="closed"
              isClosed="true"
              search={debouncedSearch}
              groupMode={groupMode}
              defaultOpen={false}
              withPagination={true}
              onView={setSelectedRow}
              onViewManifest={setSelectedManifestRow}
              listTypeFilter={listTypeFilter}
              totalCountOverride={
                kpis ? Math.max(0, (kpis.totalBatches || 0) - (kpis.activeBatches || 0)) : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Search Manifest Modal */}
      <CariManifestModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onSelect={(code) => setSelectedManifestRow({ fdMarkingCode: code } as any)}
      />

      {/* Batch Detail Modal */}
      <BatchDetailModal
        selectedRow={selectedRow}
        listTypeFilter={listTypeFilter}
        onClose={() => setSelectedRow(null)}
      />

      {/* Batch Manifest Modal */}
      <BatchManifestModal
        selectedManifestRow={selectedManifestRow}
        manifestBatchDetail={manifestBatchDetail}
        onClose={() => setSelectedManifestRow(null)}
      />
    </div>
  )
}
