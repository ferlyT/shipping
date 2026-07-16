import { useState, useMemo, useEffect, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { deliveryOrdersApi } from '@/api/endpoints/deliveryOrders'
import { ROUTES } from '@/lib/constants'
import { 
  Package, 
  FileText, 
  Weight, 
  CalendarClock,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ListFilter,
  Eye,
} from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Pagination } from '@/components/ui/Pagination'
import { cn } from '@/lib/utils'

type ListType = 'air' | 'sea'
type GroupMode = 'marking' | 'branch' | 'none'
type SentValue = '0' | '1'

interface GroupedDataRow {
  listCode: string
  markingCode: string
  customerName?: string
  resiNo?: string
  comodity?: string
  branchCode?: string
  branchName?: string
  totalQty: number
  totalTerkirim: number
  sisa: number
  isSent: number
}

interface GroupMeta {
  code: string
  label: string
  total: number
}

function DeliveryOrderDetails({ listCode }: { listCode: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-orders', listCode],
    queryFn: async () => {
      const res = await deliveryOrdersApi.list({ listCode, limit: 100 })
      return res.data as { data: any[] }
    }
  })

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-8 bg-slate-50 gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat delivery orders...</p>
      </div>
    )
  }
  if (!data?.data?.length) {
    return (
      <div className="bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
        No delivery orders found for this list code.
      </div>
    )
  }

  return (
    <div className="bg-slate-50 p-6 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-sm font-semibold text-slate-700">Delivery Orders</h4>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
          {data.data.length}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.data.map((sj: any) => (
          <div 
            key={sj.fdSJNo}
            onClick={() => navigate(ROUTES.DELIVERY_DETAIL(sj.fdSJNo))}
            className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/30"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{sj.fdSJNo}</p>
              <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold tabular-nums text-slate-600">
                {sj.fdJmlPackSJ} qty
              </span>
            </div>
            <p className="truncate text-xs text-slate-500 mb-3" title={sj.fdCustNameSJ || sj.fdCustCode || ''}>
              {sj.fdCustNameSJ || sj.fdCustCode || 'No Customer'}
            </p>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="truncate font-medium text-slate-600" title={sj.fdSupir || undefined}>{sj.fdSupir || '—'}</span>
              <span className="flex-shrink-0 tabular-nums">
                {new Date(sj.fdSJDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusPill({ isSent }: { isSent: number }) {
  if (isSent === 1) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">
        Delivered
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
      Pending
    </span>
  )
}

function BatchRow({ row, expanded, onToggle }: { row: GroupedDataRow, expanded: boolean, onToggle: () => void }) {
  return (
    <Fragment>
      <tr 
        className={cn(
          "group cursor-pointer border-b border-slate-100 transition-colors duration-200 hover:bg-[#EFF6FF]",
          expanded && "bg-[#EFF6FF]"
        )}
        onClick={onToggle}
      >
        <td className="py-4 pl-6 pr-4">
          <div className="flex items-center gap-3">
            <ChevronRight className={cn(
              "h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-200",
              expanded && "rotate-90 text-blue-600"
            )} />
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-900 leading-tight">{row.listCode}</p>
                {row.branchCode && (
                  <span className="flex-shrink-0 rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 uppercase" title={row.branchName || row.branchCode}>
                    {row.branchCode}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500" title={row.markingCode}>
                {row.markingCode}
              </span>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col gap-0.5">
            <p className="max-w-[180px] truncate text-sm font-medium text-slate-900 leading-tight" title={row.customerName || '-'}>{row.customerName || '-'}</p>
            <p className="max-w-[180px] truncate text-xs text-slate-500" title={row.resiNo || '-'}>
              {row.resiNo || '-'}
            </p>
          </div>
        </td>
        <td className="py-4 px-4">
          <p className="max-w-[150px] truncate text-sm text-slate-600" title={row.comodity || '-'}>
            {row.comodity || <span className="text-slate-300">—</span>}
          </p>
        </td>
        <td className="py-4 px-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium tabular-nums text-slate-900 leading-tight">{Number(row.totalQty || 0).toLocaleString('id-ID')} pkgs</p>
            <p className="text-xs tabular-nums text-slate-500">
              {Number(row.totalTerkirim || 0).toLocaleString('id-ID')} delivered
            </p>
          </div>
        </td>
        <td className="py-4 px-4 tabular-nums">
          {Number(row.sisa || 0) > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-100">
              {Number(row.sisa || 0).toLocaleString('id-ID')} left
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
              0 left
            </span>
          )}
        </td>
        <td className="py-4 px-4">
          <StatusPill isSent={row.isSent} />
        </td>
        <td className="py-4 pr-6 pl-4 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={cn(
              "inline-flex items-center justify-center p-2 text-slate-400 rounded-lg transition-all duration-200",
              expanded 
                ? "text-blue-600 bg-blue-50" 
                : "hover:text-blue-600 hover:bg-blue-50"
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="p-0 border-b border-slate-100">
            <DeliveryOrderDetails listCode={row.listCode} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function BatchTable({ rows }: { rows: GroupedDataRow[] }) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  return (
    <div className="overflow-x-auto w-full border-t border-slate-100">
      <table className="w-full min-w-[800px] border-collapse bg-white">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="py-3 pl-6 pr-4">List / Marking Code</th>
            <th className="py-3 px-4">Customer / Resi</th>
            <th className="py-3 px-4">Commodity</th>
            <th className="py-3 px-4">Total Qty</th>
            <th className="py-3 px-4">Remaining</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 pr-6 pl-4 text-right">Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BatchRow 
              key={row.listCode} 
              row={row} 
              expanded={expandedRow === row.listCode} 
              onToggle={() => setExpandedRow(expandedRow === row.listCode ? null : row.listCode)} 
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Pagination + "rows per page" footer shared by both the flat list and each
// marking-code group's own paginated table.
function TableFooter({
  limit,
  page,
  total,
  onPageChange,
  onLimitChange,
}: {
  limit: number
  page: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        Rows:
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="bg-transparent font-medium text-slate-900 focus:outline-none cursor-pointer"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
      />
    </div>
  )
}

// A single group (marking code OR branch) when groupMode !== 'none'. Fetches
// and paginates its own list codes independently of every other group and of
// the other status block. Data loads eagerly on mount so switching group
// modes shows data right away, matching the flat list's behaviour.
function DataGroupSection({
  filterField,
  code,
  label,
  groupTotal,
  listTypeValue,
  sentValue,
  search,
}: {
  filterField: 'markingCode' | 'branch'
  code: string
  label: string
  groupTotal: number
  listTypeValue: string
  sentValue: SentValue
  search: string
}) {
  const [open, setOpen] = useState(false)
  const pg = usePagination(10)

  useEffect(() => {
    pg.reset()
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-grouped-sub', filterField, code, listTypeValue, sentValue, search, pg.page, pg.limit],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: pg.page,
        limit: pg.limit,
        listType: listTypeValue,
        sent: sentValue,
        [filterField]: code,
        ...(search && { search }),
      }
      const res = await deliveryOrdersApi.getGrouped(params)
      return res.data as { data: GroupedDataRow[], meta: { total: number } }
    },
    enabled: open,
  })

  const rows = data?.data || []
  const total = data?.meta?.total ?? groupTotal

  return (
    <div className="border-t border-slate-100 first:border-t-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-100/70 px-6 py-4 text-left transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          <span className={cn(
            "text-sm font-medium",
            open ? "text-slate-900" : "text-slate-700"
          )}>{label}</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700">
            {groupTotal}
          </span>
        </div>
      </button>
      {open && (
        isLoading ? (
          <div className="flex flex-col justify-center items-center py-12 bg-white gap-4">
            <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat group data...</p>
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500 bg-white">No data in this group.</p>
        ) : (
          <div className="bg-white">
            <BatchTable rows={rows} />
            <TableFooter
              page={pg.page}
              limit={pg.limit}
              total={total}
              onPageChange={pg.goToPage}
              onLimitChange={pg.setLimit}
            />
          </div>
        )
      )}
    </div>
  )
}

const statusMeta = {
  open: {
    label: "Pending",
    hint: "Shipments with pending deliveries.",
    icon: Clock,
    accent: "text-amber-600",
    chip: "bg-amber-100",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  closed: {
    label: "Delivered",
    hint: "All deliveries completed for these shipments.",
    icon: CheckCircle2,
    accent: "text-emerald-600",
    chip: "bg-emerald-100",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-700",
  },
} as const

function StatusBlock({
  status,
  defaultOpen,
  badgeTotal,
  groupMode,
  listTypeValue,
  sentValue,
  search,
  // flat mode (groupMode === 'none')
  isLoading,
  rows,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  // grouped mode (groupMode === 'marking' | 'branch')
  isGroupsLoading,
  groups,
}: {
  status: "open" | "closed"
  defaultOpen: boolean
  badgeTotal: number
  groupMode: GroupMode
  listTypeValue: string
  sentValue: SentValue
  search: string
  isLoading: boolean
  rows: GroupedDataRow[]
  page: number
  limit: number
  total: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  isGroupsLoading: boolean
  groups: GroupMeta[]
}) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const meta = statusMeta[status]
  const Icon = meta.icon
  const isGroupedMode = groupMode !== 'none'
  const filterField: 'markingCode' | 'branch' = groupMode === 'branch' ? 'branch' : 'markingCode'

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors duration-200 hover:bg-slate-50"
      >
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
            <Icon className={`h-5 w-5 ${meta.accent}`} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-base font-semibold text-slate-900">{meta.label}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.badgeBg} ${meta.badgeText}`}>
                {badgeTotal} lists
              </span>
            </div>
            <span className="block text-sm text-slate-500">{meta.hint}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-100 bg-white">
          {isGroupedMode ? (
            isGroupsLoading ? (
              <div className="flex flex-col justify-center items-center py-16 gap-4">
                <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat groups...</p>
              </div>
            ) : groups.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-slate-500">No data available for this status.</p>
            ) : (
              <div className="flex flex-col">
                {groups.map((g) => (
                  <DataGroupSection
                    key={`${listTypeValue}-${sentValue}-${filterField}-${g.code}`}
                    filterField={filterField}
                    code={g.code}
                    label={g.label}
                    groupTotal={g.total}
                    listTypeValue={listTypeValue}
                    sentValue={sentValue}
                    search={search}
                  />
                ))}
              </div>
            )
          ) : isLoading ? (
            <div className="flex flex-col justify-center items-center py-16 gap-4">
              <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat data...</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-slate-500">No data available for this status.</p>
          ) : (
            <div className="flex flex-col">
              <BatchTable rows={rows} />
              <TableFooter
                page={page}
                limit={limit}
                total={total}
                onPageChange={onPageChange}
                onLimitChange={onLimitChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const kpiTokens = [
  { key: 'totalSJ', label: 'Total SJ', icon: FileText, accent: 'text-blue-600', chip: 'bg-blue-50' },
  { key: 'totalPackages', label: 'Total Packages', icon: Package, accent: 'text-emerald-600', chip: 'bg-emerald-50' },
  { key: 'totalWeight', label: 'Total Weight', icon: Weight, accent: 'text-purple-600', chip: 'bg-purple-50' },
  { key: 'sjBulanIni', label: 'This Month', icon: CalendarClock, accent: 'text-rose-600', chip: 'bg-rose-50' },
] as const

export default function DeliveryOrdersPage() {
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
      return res.data as { data: { totalSJ: number, totalPackages: number, totalWeight: number, sjBulanIni: number } }
    }
  })
  const kpis = kpiData?.data
  
  // Flat pagination (groupMode === 'none') - one page of list codes per status
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
  
  // Marking-code group lists (groupMode === 'marking') - each group then
  // paginates itself independently inside DataGroupSection.
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
  
  // Branch (cabang) group lists (groupMode === 'branch') - each group then
  // paginates itself independently inside DataGroupSection.
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
    <div className="flex flex-col h-full overflow-y-auto bg-[#F8FAFC] px-6 py-6 lg:px-8 lg:py-8 gap-8">
      {/* Page heading */}
      <div className="flex flex-shrink-0 flex-col gap-1">
        <h1 className="font-[var(--font-display)] font-medium text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Delivery Orders</h1>
        <p className="text-sm text-slate-500">
          Monitor shipment delivery status per list code.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiTokens.map(({ key, label, icon: Icon, accent, chip }) => (
          <div key={key} className="flex flex-col bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${chip}`}>
              <Icon className={`h-6 w-6 ${accent}`} />
            </div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            {isLoadingKpi ? (
              <div className="mt-1 h-8 w-24 animate-pulse rounded bg-slate-100" />
            ) : (
              <h3 className="mt-1 text-3xl font-semibold tabular-nums text-slate-900 leading-none">
                {Number(kpis?.[key] || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {(['sea', 'air'] as ListType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                )}
              >
                {tab === 'sea' ? 'SEA' : 'AIR'}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search delivery orders..."
                className="block w-full h-11 pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-500">
                <ListFilter className="h-4 w-4" /> Group By
              </span>
              <div className="flex flex-1 sm:flex-initial rounded-xl bg-slate-100 p-1">
                {([
                  { key: 'none', label: 'None' },
                  { key: 'marking', label: 'Marking' },
                  { key: 'branch', label: 'Branch' },
                ] as { key: GroupMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGroupMode(opt.key)}
                    className={cn(
                      "flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                      groupMode === opt.key
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
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
