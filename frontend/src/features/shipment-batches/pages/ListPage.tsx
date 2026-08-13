import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { markingApi } from '../services/marking.service'
import { StatusBlock } from '../components/MarkingGroupSection'
import { CariManifestModal } from '../components/CariManifestModal'
import { BatchDetailModal } from '../components/BatchDetailModal'
import { BatchManifestModal } from '../components/BatchManifestModal'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Marking, MarkingGroupMode } from '../types/marking.types'
import { X, Ship, ListFilter, Search, ChevronDown, LayoutGrid, Plane, Rows3, List } from 'lucide-react'
import { cn } from '@/lib/utils'

type GroupMode = MarkingGroupMode

export default function ShipmentBatchesListPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [viewMode, setViewMode] = useState<'table' | 'shortlist'>('table')

  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | '1' | '2'>('ALL')
  const [groupMode, setGroupMode] = useState<GroupMode>('year')

  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

  if (isLoadingKpi && !kpiData) return <LoadingSpinner message="Memuat daftar batch..." />

  return (
    <div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      
      <PageHeader
        title={t('marking.listTitle')}
        subtitle={t('marking.listSubtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.SHIPMENT_BATCHES },
          { label: t('nav.batchMarking') },
          { label: t('nav.batchList') },
        ]}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-0 min-w-0 overflow-hidden">
        {/* Floating Search & Manifest Bar */}
        <div className="sticky top-0 z-20 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[#E4E1DA] shadow-sm mb-4 flex-shrink-0 overflow-hidden">
          {isFetchingKpi && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#E4E1DA] overflow-hidden z-10">
              <div className="h-full w-1/3 bg-[var(--color-tertiary)] animate-[loading-bar_1s_ease-in-out_infinite]" />
            </div>
          )}
          <div className="flex items-center gap-2.5 p-3 sm:p-4">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3 sm:left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('marking.list.searchPlaceholder')}
                className="w-full pl-9 sm:pl-[42px] pr-[14px] py-2.5 sm:py-[10px] rounded-[var(--radius-md)] border border-[#E4E1DA] text-[14px] sm:text-[14.5px] md:text-[15px] text-[var(--color-primary)] font-[var(--font-body)] outline-none focus:border-[var(--color-secondary)] transition-colors bg-transparent"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-tertiary)] text-[var(--color-primary)] text-[13px] sm:text-[13.6px] font-semibold rounded-[var(--radius-md)] border border-[#E4E1DA] transition-colors whitespace-nowrap shrink-0"
            >
              {t('marking.list.searchManifest')}
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[#E4E1DA] p-4 sm:p-6 mb-4 flex-shrink-0">
          {/* Mobile-only toggle header */}
          <button
            type="button"
            onClick={() => setIsFilterOpen((v) => !v)}
            className="flex w-full items-center justify-between sm:hidden"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-primary)]">
              {t('marking.list.filterGroup')}
              {(listTypeFilter !== 'ALL' || groupMode !== 'year') && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--color-tertiary)] text-[var(--color-on-primary)] text-[10.5px] font-semibold">
                  {(listTypeFilter !== 'ALL' ? 1 : 0) + (groupMode !== 'year' ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDown size={16} className={cn('text-[var(--color-secondary)] transition-transform', isFilterOpen && 'rotate-180')} />
          </button>

          <div className={cn(isFilterOpen ? 'flex' : 'hidden', 'sm:flex flex-col mt-3 sm:mt-0')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              {/* Left: Freight Type Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setListTypeFilter('ALL')}
                  className={cn(
                    'px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0',
                    listTypeFilter === 'ALL'
                      ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]'
                      : 'bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]'
                  )}
                >
                  <LayoutGrid size={15} /> {t('marking.list.allType')}
                </button>
                <button
                  onClick={() => setListTypeFilter('1')}
                  className={cn(
                    'px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0',
                    listTypeFilter === '1'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-sky-500'
                  )}
                >
                  <Plane size={15} className={listTypeFilter === '1' ? 'text-white' : 'text-sky-500'} /> {t('marking.list.airType')}
                </button>
                <button
                  onClick={() => setListTypeFilter('2')}
                  className={cn(
                    'px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0',
                    listTypeFilter === '2'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-emerald-500'
                  )}
                >
                  <Ship size={15} className={listTypeFilter === '2' ? 'text-white' : 'text-emerald-500'} /> {t('marking.list.seaType')}
                </button>
              </div>

              {/* Right: View Mode Toggle */}
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-1 bg-[#F7F5F2] rounded-[var(--radius-md)] p-0.5 border border-[#E4E1DA] shrink-0">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                    title="Tampilan Tabel"
                  >
                    <Rows3 size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('shortlist')}
                    className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'shortlist' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                    title="Tampilan Ringkas"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Group Selector */}
            <div className="mt-4 pt-4 border-t border-[#E4E1DA] flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] md:text-xs tracking-[0.08em] uppercase text-[var(--color-secondary)] w-[70px] shrink-0 flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5" /> {t('marking.list.groupLabel')}
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto">
                {([
                  { key: 'none', label: t('marking.list.noGroup') },
                  { key: 'year', label: 'Tahun' },
                  { key: 'branch', label: 'Cabang' },
                  { key: 'load', label: 'Loading' },
                  { key: 'etd', label: 'ETD' },
                  { key: 'eta', label: 'ETA' },
                ] as { key: GroupMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGroupMode(opt.key)}
                    className={cn(
                      'px-[14px] py-2 rounded-[16px] border text-[13px] sm:text-[14px] md:text-[15px] transition-colors duration-150 shrink-0',
                      groupMode === opt.key
                        ? 'bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Table Container with Active Pagination */}
        <div className={`flex-1 overflow-y-auto pb-6 transition-opacity duration-200 ${isFetchingKpi ? 'opacity-60' : ''}`}>
          <div className="space-y-4">
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
    </div>
  )
}
