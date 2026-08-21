import { useState, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { shipmentsApi, type SearchFieldType } from '../services/shipments.service'
import { useShipmentsList } from '../hooks/useShipmentsList'
import { useShipmentDetail } from '../hooks/useShipmentDetail'
import { useShipmentMultiDimensions } from '../hooks/useShipmentDimensions'
import { ShipmentFilterBar, type ListTypeFilter, type StatusFilter, type BranchFilter } from '../components/ShipmentFilterBar'
import { ShipmentToolbar } from '../components/ShipmentToolbar'
import { ShipmentTableView } from '../components/ShipmentTableView'
import { ShipmentCompactView } from '../components/ShipmentCompactView'
import { ShipmentGridView } from '../components/ShipmentGridView'
import { ShipmentDetailModal } from '../components/ShipmentDetailModal'
import type { Shipment } from '../types/shipments.types'

type ViewMode = 'table' | 'grid' | 'compact'

export default function ShipmentsListPage() {
  const { t } = useTranslation()

  // ── State (Multi-variable enabled) ───────────────────────────────────────
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState<SearchFieldType>('ALL')
  const [customerFilter, setCustomerFilter] = useState('')
  const [markingFilter, setMarkingFilter] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const debouncedCustomer = useDebounce(customerFilter, 350)
  const debouncedMarking = useDebounce(markingFilter, 350)

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'compact' : 'table'
  )
  const [listTypeFilter, setListTypeFilter] = useState<ListTypeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('ALL')
  const [selectedRow, setSelectedRow] = useState<Shipment | null>(null)
  const [jumpPage, setJumpPage] = useState('')

  const { page, limit, setLimit, goToPage, reset } = usePagination(20)

  // Reset page ke halaman 1 ketika filter atau search berubah
  useEffect(() => {
    reset()
  }, [debouncedSearch, debouncedCustomer, debouncedMarking, searchField, listTypeFilter, statusFilter, branchFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: shipmentsData, isLoading, isFetching } = useShipmentsList({
    page,
    limit,
    search: debouncedSearch || undefined,
    searchField,
    customer: debouncedCustomer || undefined,
    marking: debouncedMarking || undefined,
    listType: listTypeFilter,
    branch: branchFilter,
    status: statusFilter,
  })

  const { data: detailData, isLoading: isLoadingDetail } = useShipmentDetail(selectedRow?.fdListCode)

  const {
    dimsGudang,
    isLoadingGudang,
    dimsPackingList,
    isLoadingPackingList,
    dimsKomplain,
    isLoadingKomplain,
  } = useShipmentMultiDimensions(selectedRow?.fdListCode)

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['shipments', 'branches'],
    queryFn: () => shipmentsApi.getBranches(),
  })

  // ── Derived data ─────────────────────────────────────────────────────────
  const dataList = shipmentsData?.data || []
  const total = shipmentsData?.meta?.total || 0
  const totalPages = Math.ceil(total / limit)
  const selectedShipment = detailData || selectedRow
  const uniqueBranches = branchesData || []

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearAllFilters = () => {
    setListTypeFilter('ALL')
    setStatusFilter('ALL')
    setBranchFilter('ALL')
    setCustomerFilter('')
    setMarkingFilter('')
    setSearchField('ALL')
    setSearch('')
    goToPage(1)
  }

  // ── Loading guard ────────────────────────────────────────────────────────
  if (isLoading && !shipmentsData) return <LoadingSpinner message={t('common.loadingShipment')} />

  return (
    <div className="flex flex-col min-h-full bg-[var(--color-neutral)]">
      {/* Page Header */}
      <div className="px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4">
        <PageHeader
          title={t('shipments.listTitle')}
          subtitle={t('shipments.listSubtitle')}
          breadcrumbs={[
            { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
            { label: t('nav.shipment'), path: ROUTES.SHIPMENTS },
            { label: t('nav.shipmentList') },
          ]}
          className="!pb-0 !border-b-0 !mb-0"
        />
      </div>

      {/* ── Unified Container ── */}
      <div className="flex-1 flex flex-col px-3 sm:px-4 lg:px-6 pb-4 sm:pb-6 min-h-0">
        <div className="flex-1 flex flex-col bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xs overflow-hidden min-h-0">

          {/* Filter bar (Multi-status + Multi-branch + Customer/Marking + Segmented mode) */}
          <ShipmentFilterBar
            listTypeFilter={listTypeFilter}
            statusFilter={statusFilter}
            branchFilter={branchFilter}
            customerFilter={customerFilter}
            markingFilter={markingFilter}
            branches={uniqueBranches}
            branchesLoading={branchesLoading}
            isFetching={isFetching}
            onListTypeChange={(v) => { setListTypeFilter(v); goToPage(1) }}
            onStatusChange={(v) => { setStatusFilter(v); goToPage(1) }}
            onBranchChange={(v) => { setBranchFilter(v); goToPage(1) }}
            onCustomerChange={(v) => { setCustomerFilter(v); goToPage(1) }}
            onMarkingChange={(v) => { setMarkingFilter(v); goToPage(1) }}
            onClearAll={clearAllFilters}
          />

          {/* Toolbar (Multi-variable search input + Scopes + View switch) */}
          <div className="border-t border-[var(--color-border)]">
            <ShipmentToolbar
              search={search}
              onSearchChange={setSearch}
              searchField={searchField}
              onSearchFieldChange={(f) => { setSearchField(f); goToPage(1) }}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              limit={limit}
              onLimitChange={setLimit}
              onPageReset={() => goToPage(1)}
              displayCount={dataList.length}
              total={total}
              isFetching={isFetching}
              isLoading={isLoading}
            />
          </div>

          {/* Progress bar */}
          <div className="relative h-px bg-[var(--color-border)] shrink-0">
            {isFetching && !isLoading && (
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

          {/* Data area — scrollable */}
          <div className="flex-1 overflow-auto min-h-0 bg-[var(--color-neutral)]">
            {viewMode === 'table' && (
              <ShipmentTableView
                data={dataList}
                isLoading={isLoading}
                selectedCode={selectedRow?.fdListCode}
                onRowClick={setSelectedRow}
                search={search}
              />
            )}
            {viewMode === 'compact' && (
              <ShipmentCompactView
                data={dataList}
                isLoading={isLoading}
                selectedCode={selectedRow?.fdListCode}
                onRowClick={setSelectedRow}
              />
            )}
            {viewMode === 'grid' && (
              <div className="p-4 sm:p-5 h-full">
                <ShipmentGridView
                  data={dataList}
                  isLoading={isLoading}
                  selectedCode={selectedRow?.fdListCode}
                  onRowClick={setSelectedRow}
                />
              </div>
            )}
          </div>

          {/* Pagination footer */}
          {totalPages > 0 && (
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
              <Pagination
                page={page}
                limit={limit}
                total={total}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
              {totalPages > 1 && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)] font-medium shrink-0">
                  <span className="hidden sm:inline">Loncat ke</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPage}
                    placeholder={String(page)}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      goToPage(Math.min(Math.max(1, Number(jumpPage) || 1), totalPages))
                      setJumpPage('')
                    }}
                    className="w-14 text-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs text-[var(--color-primary)] font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
                  />
                  <span className="tabular-nums">/ {totalPages.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRow && selectedShipment && typeof document !== 'undefined' && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          isLoadingDetail={isLoadingDetail}
          dimsGudang={dimsGudang}
          isLoadingGudang={isLoadingGudang}
          dimsPackingList={dimsPackingList}
          isLoadingPackingList={isLoadingPackingList}
          dimsKomplain={dimsKomplain}
          isLoadingKomplain={isLoadingKomplain}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  )
}
