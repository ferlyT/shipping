import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Package, 
  FileText, 
  Weight, 
  CalendarClock,
  Search,
  ListFilter,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBlock } from '../components/StatusBlock'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { 
  ListType, 
  GroupMode, 
  GroupedDataRow, 
  GroupMeta, 
  KpiData 
} from '../types/delivery-orders.types'

const kpiTokens = [
  { key: 'totalSJ' as const, label: 'Total SJ', icon: FileText, accent: 'text-blue-500', chip: 'bg-transparent border border-blue-500/30 text-blue-500' },
  { key: 'totalPackages' as const, label: 'Total Packages', icon: Package, accent: 'text-emerald-500', chip: 'bg-transparent border border-emerald-500/30 text-emerald-500' },
  { key: 'totalWeight' as const, label: 'Total Weight', icon: Weight, accent: 'text-purple-500', chip: 'bg-transparent border border-purple-500/30 text-purple-500' },
  { key: 'sjBulanIni' as const, label: 'Bulan Ini', icon: CalendarClock, accent: 'text-rose-500', chip: 'bg-transparent border border-rose-500/30 text-rose-500' },
]

export default function DeliveryOrdersListPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ListType>('sea')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)
  
  const [groupMode, setGroupMode] = useState<GroupMode>('branch')
  const isGroupedMode = groupMode !== 'none'
  const listTypeValue = activeTab === 'air' ? '1' : '2'
  
  const openPg = usePagination(20)
  const closedPg = usePagination(20)
  
  const handleLimitChange = (value: number) => {
    openPg.setLimit(value)
    closedPg.setLimit(value)
  }
  
  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['deliveryOrdersKpi', debouncedSearch],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getKPIs({ search: debouncedSearch })
      return res.data as { data: KpiData }
    }
  })
  const kpis = kpiData?.data
  
  // Flat pagination (groupMode === 'none')
  const { data: openRes, isLoading: isOpenLoading } = useQuery({
    queryKey: ['delivery-grouped', 'belum', openPg.page, openPg.limit, debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: openPg.page,
        limit: openPg.limit,
        listType: listTypeValue,
        sent: '0',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[], meta: { total: number } }
    },
    enabled: !isGroupedMode,
  })
  
  const { data: closedRes, isLoading: isClosedLoading } = useQuery({
    queryKey: ['delivery-grouped', 'sudah', closedPg.page, closedPg.limit, debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: closedPg.page,
        limit: closedPg.limit,
        listType: listTypeValue,
        sent: '1',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[], meta: { total: number } }
    },
    enabled: !isGroupedMode,
  })
  
  // Marking-code groups
  const { data: openMarkingGroupsRes, isLoading: isOpenMarkingGroupsLoading } = useQuery({
    queryKey: ['delivery-marking-groups', 'belum', debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '0',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getMarkingGroups(params)
      return res.data as { data: { markingCode: string, total: number }[] }
    },
    enabled: groupMode === 'marking',
  })
  
  const { data: closedMarkingGroupsRes, isLoading: isClosedMarkingGroupsLoading } = useQuery({
    queryKey: ['delivery-marking-groups', 'sudah', debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '1',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getMarkingGroups(params)
      return res.data as { data: { markingCode: string, total: number }[] }
    },
    enabled: groupMode === 'marking',
  })
  
  // Branch groups
  const { data: openBranchGroupsRes, isLoading: isOpenBranchGroupsLoading } = useQuery({
    queryKey: ['delivery-branch-groups', 'belum', debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '0',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getBranchGroups(params)
      return res.data as { data: { branchCode: string, branchName: string | null, total: number }[] }
    },
    enabled: groupMode === 'branch',
  })
  
  const { data: closedBranchGroupsRes, isLoading: isClosedBranchGroupsLoading } = useQuery({
    queryKey: ['delivery-branch-groups', 'sudah', debouncedSearch, activeTab],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        listType: listTypeValue,
        sent: '1',
        ...(debouncedSearch && { search: debouncedSearch }),
      }
      const res = await deliveryOrdersApi.getBranchGroups(params)
      return res.data as { data: { branchCode: string, branchName: string | null, total: number }[] }
    },
    enabled: groupMode === 'branch',
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
      return (openMarkingGroups || []).map(g => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return (openBranchGroups || []).map(g => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
    }
    return []
  }, [groupMode, openMarkingGroups, openBranchGroups])
  
  const closedGroups: GroupMeta[] = useMemo(() => {
    if (groupMode === 'marking') {
      return (closedMarkingGroups || []).map(g => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return (closedBranchGroups || []).map(g => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
    }
    return []
  }, [groupMode, closedMarkingGroups, closedBranchGroups])
  
  const openGroupsTotal = useMemo(() => openGroups.reduce((sum, g) => sum + g.total, 0), [openGroups])
  const closedGroupsTotal = useMemo(() => closedGroups.reduce((sum, g) => sum + g.total, 0), [closedGroups])
  
  useEffect(() => {
    openPg.reset()
    closedPg.reset()
  }, [debouncedSearch, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 min-h-screen">
      <PageHeader
        title={t('do.title')}
        subtitle={t('do.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder') },
          { label: t('nav.list') },
        ]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiTokens.map(({ key, label, icon: Icon, accent, chip }) => (
          <div key={key} className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs">
            <div className={`mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${chip}`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${accent}`} />
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--color-secondary)]">{label}</p>
            {isLoadingKpi ? (
              <div className="mt-1 h-7 sm:h-8 w-24 animate-pulse rounded bg-[var(--color-neutral)]" />
            ) : (
              <h3 className="mt-1 text-2xl sm:text-3xl font-bold tabular-nums text-[var(--color-primary)] leading-none font-mono">
                {Number(kpis?.[key] || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sm:gap-6 bg-[var(--color-surface)] p-5 sm:p-6 rounded-xl border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
            {(['sea', 'air'] as ListType[]).map((tab) => {
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-5 py-1.5 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer border",
                    active
                      ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs"
                      : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  {tab === 'sea' ? 'BY SEA' : 'BY AIR'}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[var(--color-secondary)]" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('do.searchPlaceholder')}
                className="block w-full h-10 pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-xl leading-5 bg-[var(--color-surface)] placeholder-[var(--color-secondary)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] text-xs font-medium transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)]">
                <ListFilter className="h-3.5 w-3.5" /> {t('do.groupBy')}
              </span>
              <div className="flex flex-1 sm:flex-initial rounded-xl bg-[var(--color-neutral)] p-1 border border-[var(--color-border)] gap-1">
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
                        "flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer border",
                        active
                          ? 'bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs'
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

        {/* Status Blocks */}
        <div className="flex flex-col gap-6">
          <StatusBlock 
            status="open" 
            defaultOpen={true} 
            badgeTotal={isGroupedMode ? openGroupsTotal : openTotal}
            groupMode={groupMode}
            listTypeValue={listTypeValue}
            sentValue="0"
            search={debouncedSearch}
            isLoading={isOpenLoading}
            rows={openRows}
            page={openPg.page}
            limit={openPg.limit}
            total={openTotal}
            onPageChange={openPg.goToPage}
            onLimitChange={handleLimitChange}
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
            search={debouncedSearch}
            isLoading={isClosedLoading}
            rows={closedRows}
            page={closedPg.page}
            limit={closedPg.limit}
            total={closedTotal}
            onPageChange={closedPg.goToPage}
            onLimitChange={handleLimitChange}
            isGroupsLoading={isGroupsLoading.closed}
            groups={closedGroups}
          />
        </div>
      </div>
    </div>
  )
}
