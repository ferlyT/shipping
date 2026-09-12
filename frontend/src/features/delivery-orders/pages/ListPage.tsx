import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  RefreshCw, 
  Layers, 
  Table as TableIcon,
  Search,
  ListFilter,
  LayoutDashboard
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { usePagination } from '@/hooks/usePagination'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { DeliveryOrderToolbar, type DeliveryViewMode } from '../components/DeliveryOrderToolbar'
import { DeliveryOrderTable } from '../components/DeliveryOrderTable'
import { StatusBlock } from '../components/StatusBlock'
import { cn } from '@/lib/utils'
import type { 
  DeliveryOrder,
  ListType, 
  GroupMode, 
  GroupedDataRow, 
  GroupMeta 
} from '../types/delivery-orders.types'

export type PageDisplayMode = 'grouped' | 'flat'

export default function ListPage() {
  const { t } = useTranslation()

  // ── Mode Tampilan: Grouping DO (Status Blocks) vs Flat Table ─────────────
  const [displayMode, setDisplayMode] = useState<PageDisplayMode>('grouped')

  // ── State untuk Grouping DO ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ListType>('sea')
  const [groupedSearch, setGroupedSearch] = useState('')
  const debouncedGroupedSearch = useDebounce(groupedSearch, 400)
  const [groupMode, setGroupMode] = useState<GroupMode>('branch')
  const isGroupedMode = groupMode !== 'none'
  const listTypeValue = activeTab === 'air' ? '1' : '2'

  const openPg = usePagination(20)
  const closedPg = usePagination(20)

  const handleGroupedLimitChange = (value: number) => {
    openPg.setLimit(value)
    closedPg.setLimit(value)
  }

  // ── State untuk Flat List ────────────────────────────────────────────────
  const [flatSearch, setFlatSearch] = useState('')
  const debouncedFlatSearch = useDebounce(flatSearch, 350)
  const [viewMode, setViewMode] = useState<DeliveryViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  )
  const flatPg = usePagination(20)

  // Reset to page 1 on flat search change
  useEffect(() => {
    flatPg.reset()
  }, [debouncedFlatSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    openPg.reset()
    closedPg.reset()
  }, [debouncedGroupedSearch, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Query untuk Flat List ────────────────────────────────────────────────
  const {
    data: flatResponseData,
    isLoading: isFlatLoading,
    isFetching: isFlatFetching,
    refetch: refetchFlat,
  } = useQuery({
    queryKey: ['delivery-orders-list', flatPg.page, flatPg.limit, debouncedFlatSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.list({
        page: flatPg.page,
        limit: flatPg.limit,
        search: debouncedFlatSearch || undefined,
      })
      return res.data
    },
    enabled: displayMode === 'flat',
  })

  const flatItems: DeliveryOrder[] = flatResponseData?.data || []
  const flatTotal = flatResponseData?.meta?.total || 0
  const flatTotalPages = Math.ceil(flatTotal / flatPg.limit) || 1

  // ── Query untuk Grouping DO (Status Blocks) ──────────────────────────────
  const { data: openRes, isLoading: isOpenLoading, refetch: refetchOpen } = useQuery({
    queryKey: ['delivery-grouped', 'belum', openPg.page, openPg.limit, debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: openPg.page,
        limit: openPg.limit,
        listType: listTypeValue,
        sent: '0',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[]; meta: { total: number } }
    },
    enabled: displayMode === 'grouped' && !isGroupedMode,
  })

  const { data: closedRes, isLoading: isClosedLoading, refetch: refetchClosed } = useQuery({
    queryKey: ['delivery-grouped', 'sudah', closedPg.page, closedPg.limit, debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: closedPg.page,
        limit: closedPg.limit,
        listType: listTypeValue,
        sent: '1',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[]; meta: { total: number } }
    },
    enabled: displayMode === 'grouped' && !isGroupedMode,
  })

  // Marking-code groups
  const { data: openMarkingGroupsRes, isLoading: isOpenMarkingGroupsLoading, refetch: refetchOpenMarking } = useQuery({
    queryKey: ['delivery-marking-groups', 'belum', debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '0',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getMarkingGroups(params)
      return res.data as { data: { markingCode: string; total: number }[] }
    },
    enabled: displayMode === 'grouped' && groupMode === 'marking',
  })

  const { data: closedMarkingGroupsRes, isLoading: isClosedMarkingGroupsLoading, refetch: refetchClosedMarking } = useQuery({
    queryKey: ['delivery-marking-groups', 'sudah', debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '1',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getMarkingGroups(params)
      return res.data as { data: { markingCode: string; total: number }[] }
    },
    enabled: displayMode === 'grouped' && groupMode === 'marking',
  })

  // Branch groups
  const { data: openBranchGroupsRes, isLoading: isOpenBranchGroupsLoading, refetch: refetchOpenBranch } = useQuery({
    queryKey: ['delivery-branch-groups', 'belum', debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '0',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getBranchGroups(params)
      return res.data as { data: { branchCode: string; branchName: string | null; total: number }[] }
    },
    enabled: displayMode === 'grouped' && groupMode === 'branch',
  })

  const { data: closedBranchGroupsRes, isLoading: isClosedBranchGroupsLoading, refetch: refetchClosedBranch } = useQuery({
    queryKey: ['delivery-branch-groups', 'sudah', debouncedGroupedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '1',
        ...(debouncedGroupedSearch && { search: debouncedGroupedSearch }),
      }
      const res = await deliveryOrdersApi.getBranchGroups(params)
      return res.data as { data: { branchCode: string; branchName: string | null; total: number }[] }
    },
    enabled: displayMode === 'grouped' && groupMode === 'branch',
  })

  const openRows = openRes?.data || []
  const openTotal = openRes?.meta?.total || 0
  const closedRows = closedRes?.data || []
  const closedTotal = closedRes?.meta?.total || 0

  const openMarkingGroups = openMarkingGroupsRes?.data
  const closedMarkingGroups = closedMarkingGroupsRes?.data
  const openBranchGroups = openBranchGroupsRes?.data
  const closedBranchGroups = closedBranchGroupsRes?.data

  const isGroupsLoading = groupMode === 'marking'
    ? { open: isOpenMarkingGroupsLoading, closed: isClosedMarkingGroupsLoading }
    : { open: isOpenBranchGroupsLoading, closed: isClosedBranchGroupsLoading }

  const openGroups: GroupMeta[] = useMemo(() => {
    if (groupMode === 'marking') {
      return (openMarkingGroups || []).map((g) => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return (openBranchGroups || []).map((g) => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
    }
    return []
  }, [groupMode, openMarkingGroups, openBranchGroups])

  const closedGroups: GroupMeta[] = useMemo(() => {
    if (groupMode === 'marking') {
      return (closedMarkingGroups || []).map((g) => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return (closedBranchGroups || []).map((g) => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
    }
    return []
  }, [groupMode, closedMarkingGroups, closedBranchGroups])

  const openGroupsTotal = useMemo(() => openGroups.reduce((sum, g) => sum + g.total, 0), [openGroups])
  const closedGroupsTotal = useMemo(() => closedGroups.reduce((sum, g) => sum + g.total, 0), [closedGroups])

  const handleRefreshAll = () => {
    if (displayMode === 'flat') {
      refetchFlat()
    } else {
      refetchOpen()
      refetchClosed()
      refetchOpenMarking()
      refetchClosedMarking()
      refetchOpenBranch()
      refetchClosedBranch()
    }
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-4 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title={t('do.listTitle') || 'Daftar Surat Jalan'}
        subtitle={t('do.listSubtitle') || 'Daftar riwayat dan pengelompokan surat jalan pengiriman barang.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrderList') || 'Daftar Surat Jalan' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* View Switcher: Grouping DO vs Flat List */}
            <div className="inline-flex items-center p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => setDisplayMode('grouped')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border",
                  displayMode === 'grouped'
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Layers size={13} />
                <span>Grouping DO</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('flat')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border",
                  displayMode === 'flat'
                    ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                    : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <TableIcon size={13} />
                <span>Tabel Flat</span>
              </button>
            </div>

            <Link to={ROUTES.DELIVERY_ORDERS}>
              <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer">
                <LayoutDashboard size={14} className="text-[var(--color-tertiary)]" />
                <span>Dashboard</span>
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isFlatFetching}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFlatFetching ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* ── Tampilan 1: Grouping DO (Status Blocks by Sea/Air & Branch/Marking) ── */}
      {displayMode === 'grouped' && (
        <div className="flex flex-col gap-4 sm:gap-6 animate-fadeIn">
          {/* Toolbar Grouping DO */}
          <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 sm:gap-6 bg-[var(--color-surface)] p-3.5 sm:p-5 rounded-xl border border-[var(--color-border)] shadow-xs">
            <div className="grid grid-cols-2 w-full sm:w-auto sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)]">
              {(['sea', 'air'] as ListType[]).map((tab) => {
                const active = activeTab === tab
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 sm:px-5 py-1.5 text-xs font-bold rounded-lg sm:rounded-full transition-all duration-200 cursor-pointer border text-center",
                      active
                        ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold"
                        : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                    )}
                  >
                    {tab === 'sea' ? 'BY SEA' : 'BY AIR'}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 w-full xl:w-auto">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-[var(--color-secondary)]" />
                </div>
                <input
                  type="text"
                  value={groupedSearch}
                  onChange={(e) => setGroupedSearch(e.target.value)}
                  placeholder={t('do.searchPlaceholder')}
                  className="block w-full h-9 sm:h-10 pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-xl leading-5 bg-[var(--color-surface)] placeholder-[var(--color-secondary)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-xs font-medium transition-all duration-200"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)]">
                  <ListFilter className="h-3.5 w-3.5" /> {t('do.groupBy')}
                </span>
                <div className="grid grid-cols-3 sm:flex flex-1 sm:flex-initial rounded-xl bg-[var(--color-neutral)] p-1 border border-[var(--color-border)] gap-1 w-full sm:w-auto">
                  {([
                    { key: 'none', label: t('do.groupNone') },
                    { key: 'marking', label: t('do.groupMarking') },
                    { key: 'branch', label: t('do.groupBranch') },
                  ] as { key: GroupMode; label: string }[]).map((opt) => {
                    const active = groupMode === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setGroupMode(opt.key)}
                        className={cn(
                          "px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer border text-center",
                          active
                            ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-2xs font-bold'
                            : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Status Blocks (Open & Closed) */}
          <div className="flex flex-col gap-6">
            <StatusBlock
              status="open"
              defaultOpen={true}
              badgeTotal={isGroupedMode ? openGroupsTotal : openTotal}
              groupMode={groupMode}
              listTypeValue={listTypeValue}
              sentValue="0"
              search={debouncedGroupedSearch}
              isLoading={isOpenLoading}
              rows={openRows}
              page={openPg.page}
              limit={openPg.limit}
              total={openTotal}
              onPageChange={openPg.goToPage}
              onLimitChange={handleGroupedLimitChange}
              isGroupsLoading={isGroupsLoading.open}
              groups={openGroups}
            />
            <StatusBlock
              status="closed"
              defaultOpen={false}
              badgeTotal={isGroupedMode ? closedGroupsTotal : closedTotal}
              groupMode={groupMode}
              listTypeValue={listTypeValue}
              sentValue="1"
              search={debouncedGroupedSearch}
              isLoading={isClosedLoading}
              rows={closedRows}
              page={closedPg.page}
              limit={closedPg.limit}
              total={closedTotal}
              onPageChange={closedPg.goToPage}
              onLimitChange={handleGroupedLimitChange}
              isGroupsLoading={isGroupsLoading.closed}
              groups={closedGroups}
            />
          </div>
        </div>
      )}

      {/* ── Tampilan 2: Tabel Flat DO ────────────────────────────────────────── */}
      {displayMode === 'flat' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden animate-fadeIn">
          {/* Toolbar */}
          <DeliveryOrderToolbar
            search={flatSearch}
            onSearchChange={setFlatSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            displayCount={flatItems.length}
            total={flatTotal}
            limit={flatPg.limit}
            onLimitChange={flatPg.setLimit}
            onPageReset={() => flatPg.goToPage(1)}
            isFetching={isFlatFetching}
            isLoading={isFlatLoading}
          />

          {/* Data Table / Cards */}
          <DeliveryOrderTable
            data={flatItems}
            isLoading={isFlatLoading}
            viewMode={viewMode}
            onResetFilter={() => setFlatSearch('')}
            hasSearch={Boolean(flatSearch)}
          />

          {/* Pagination Footer */}
          {flatTotal > 0 && (
            <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface)]">
              <Pagination
                page={flatPg.page}
                totalPages={flatTotalPages}
                onPageChange={flatPg.goToPage}
                total={flatTotal}
                limit={flatPg.limit}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
