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
  Truck,
} from 'lucide-react'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { Pagination } from '@/components/ui/Pagination'

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
      <div className="flex items-center justify-center gap-2 bg-slate-50/70 py-6 text-sm text-slate-400">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
        Memuat surat jalan...
      </div>
    )
  }
  if (!data?.data?.length) {
    return (
      <div className="bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400">
        Belum ada surat jalan untuk list code ini.
      </div>
    )
  }

  return (
    <div className="bg-slate-50/70 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Daftar Surat Jalan
        <span className="rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-slate-500">
          {data.data.length}
        </span>
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {data.data.map((sj: any) => (
          <div 
            key={sj.fdSJNo}
            onClick={() => navigate(ROUTES.DELIVERY_DETAIL(sj.fdSJNo))}
            className="group cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-1.5">
              <p className="truncate text-xs font-semibold text-slate-900">{sj.fdSJNo}</p>
              <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600">
                {sj.fdJmlPackSJ} qty
              </span>
            </div>
            <p className="mt-1 truncate text-[11px] text-slate-500" title={sj.fdCustNameSJ || sj.fdCustCode || ''}>
              {sj.fdCustNameSJ || sj.fdCustCode || 'Tanpa Customer'}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5 text-[10px] text-slate-400">
              <span className="truncate" title={sj.fdSupir || undefined}>{sj.fdSupir || '—'}</span>
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sudah
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Belum
    </span>
  )
}

function BatchRow({ row, expanded, onToggle }: { row: GroupedDataRow, expanded: boolean, onToggle: () => void }) {
  return (
    <Fragment>
      <tr 
        className="group cursor-pointer border-b border-slate-100 transition hover:bg-slate-50/80 last:border-0"
        onClick={onToggle}
      >
        <td className="py-3.5 pl-4 pr-3">
          <div className="flex items-center gap-2.5">
            <ChevronRight className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform group-hover:text-slate-400 ${expanded ? 'rotate-90' : ''}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-slate-900">{row.listCode}</p>
                {row.branchCode && (
                  <span className="flex-shrink-0 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600" title={row.branchName || row.branchCode}>
                    {row.branchCode}
                  </span>
                )}
              </div>
              <span className="mt-1 inline-block max-w-[150px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500" title={row.markingCode}>
                {row.markingCode}
              </span>
            </div>
          </div>
        </td>
        <td className="py-3.5 px-3">
          <p className="max-w-[150px] truncate text-sm text-slate-700" title={row.customerName || '-'}>{row.customerName || '-'}</p>
          <p className="mt-0.5 max-w-[150px] truncate text-xs text-slate-400" title={row.resiNo || '-'}>
            {row.resiNo || '-'}
          </p>
        </td>
        <td className="max-w-[150px] truncate py-3.5 px-3 text-sm text-slate-500" title={row.comodity || '-'}>
          {row.comodity || <span className="text-slate-300">—</span>}
        </td>
        <td className="py-3.5 px-3">
          <p className="text-sm font-medium tabular-nums text-slate-800">{Number(row.totalQty || 0).toLocaleString('id-ID')} pkgs</p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-400">
            {Number(row.totalTerkirim || 0).toLocaleString('id-ID')} terkirim
          </p>
        </td>
        <td className="py-3.5 px-3 text-sm tabular-nums">
          {Number(row.sisa || 0) > 0 ? (
            <span className="font-semibold text-red-500">{Number(row.sisa || 0).toLocaleString('id-ID')} sisa</span>
          ) : (
            <span className="font-semibold text-emerald-500">0 sisa</span>
          )}
        </td>
        <td className="py-3.5 px-3">
          <StatusPill isSent={row.isSent} />
        </td>
        <td className="py-3.5 pr-4 pl-3 text-right">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {expanded ? 'Tutup' : 'Detail'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100">
          <td colSpan={7} className="p-0">
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse bg-white">
        <thead>
          <tr className="border-b border-slate-100 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
            <th className="py-2.5 pl-4 pr-3">List / Marking Code</th>
            <th className="py-2.5 px-3">Customer / Resi</th>
            <th className="py-2.5 px-3">Comodity</th>
            <th className="py-2.5 px-3">Total Qty</th>
            <th className="py-2.5 px-3">Sisa</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 pr-4 pl-3 text-right">Aksi</th>
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
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        Rows per page
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
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
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50/50 px-4 py-2.5 text-left transition hover:bg-slate-100/60"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {groupTotal}
          </span>
        </span>
      </button>
      {open && (
        isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
            Memuat data...
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada data pada grup ini.</p>
        ) : (
          <>
            <BatchTable rows={rows} />
            <TableFooter
              page={pg.page}
              limit={pg.limit}
              total={total}
              onPageChange={pg.goToPage}
              onLimitChange={pg.setLimit}
            />
          </>
        )
      )}
    </div>
  )
}

const statusMeta = {
  open: {
    label: "Belum terkirim",
    hint: "Surat jalan belum terkirim semua — masih ada sisa.",
    icon: Clock,
    accent: "text-amber-600",
    chip: "bg-amber-100",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-700",
  },
  closed: {
    label: "Sudah terkirim",
    hint: "Semua surat jalan untuk list code ini telah terkirim.",
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50/70"
      >
        <span className="flex items-center gap-3">
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${meta.chip}`}>
            <Icon className={`h-4.5 w-4.5 ${meta.accent}`} />
          </span>
          <span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badgeBg} ${meta.badgeText}`}>
                {badgeTotal} list code
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-slate-400">{meta.hint}</span>
          </span>
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-100">
          {isGroupedMode ? (
            isGroupsLoading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                Memuat grup...
              </div>
            ) : groups.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada data pada status ini.</p>
            ) : (
              groups.map((g) => (
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
              ))
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
              Memuat data...
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">Tidak ada data pada status ini.</p>
          ) : (
            <>
              <BatchTable rows={rows} />
              <TableFooter
                page={page}
                limit={limit}
                total={total}
                onPageChange={onPageChange}
                onLimitChange={onLimitChange}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

const kpiTokens = [
  { key: 'totalSJ', label: 'Total SJ', icon: FileText, accent: 'text-blue-600', chip: 'bg-blue-50' },
  { key: 'totalPackages', label: 'Total Packages', icon: Package, accent: 'text-emerald-600', chip: 'bg-emerald-50' },
  { key: 'totalWeight', label: 'Total Berat', icon: Weight, accent: 'text-purple-600', chip: 'bg-purple-50' },
  { key: 'sjBulanIni', label: 'SJ Bulan Ini', icon: CalendarClock, accent: 'text-rose-600', chip: 'bg-rose-50' },
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
  
  const openMarkingGroups = openMarkingGroupsRes?.data || []
  const closedMarkingGroups = closedMarkingGroupsRes?.data || []
  const openBranchGroups = openBranchGroupsRes?.data || []
  const closedBranchGroups = closedBranchGroupsRes?.data || []
  
  const isGroupsLoading = groupMode === 'marking'
    ? { open: isOpenMarkingGroupsLoading, closed: isClosedMarkingGroupsLoading }
    : { open: isOpenBranchGroupsLoading, closed: isClosedBranchGroupsLoading }
  
  const openGroups: GroupMeta[] = useMemo(() => {
    if (groupMode === 'marking') {
      return openMarkingGroups.map(g => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return openBranchGroups.map(g => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
    }
    return []
  }, [groupMode, openMarkingGroups, openBranchGroups])
  
  const closedGroups: GroupMeta[] = useMemo(() => {
    if (groupMode === 'marking') {
      return closedMarkingGroups.map(g => ({ code: g.markingCode, label: g.markingCode, total: g.total }))
    }
    if (groupMode === 'branch') {
      return closedBranchGroups.map(g => ({ code: g.branchCode, label: g.branchName ? `${g.branchCode} — ${g.branchName}` : g.branchCode, total: g.total }))
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
    <div className="flex h-full flex-col overflow-y-auto bg-[#F4F1EA] px-4 py-6 sm:px-6 sm:py-8">
      <div className="w-full">

        {/* Page heading */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <Truck className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Delivery Orders</h1>
            <p className="text-xs text-slate-400">Pantau status pengiriman surat jalan per list code</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mb-6 grid grid-cols-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {kpiTokens.map(({ key, label, icon: Icon, accent, chip }) => (
            <div key={key} className="p-5">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${chip}`}>
                <Icon className={`h-4.5 w-4.5 ${accent}`} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              {isLoadingKpi ? (
                <div className="mt-2 h-7 w-16 animate-pulse rounded bg-slate-100" />
              ) : (
                <h3 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tabular-nums text-slate-900">
                  {Number(kpis?.[key] || 0).toLocaleString('id-ID')}
                </h3>
              )}
            </div>
          ))}
        </div>

        {/* Toolbar: freight mode, search, group by */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {(['sea', 'air'] as ListType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                  activeTab === tab
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === 'sea' ? 'Sea Freight' : 'Air Freight'}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari list code, marking, customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-xs font-medium text-slate-500 sm:flex">
              <ListFilter className="h-3.5 w-3.5" /> Group
            </span>
            <div className="flex rounded-xl bg-slate-100 p-1">
              {([
                { key: 'none', label: 'Tidak ada' },
                { key: 'marking', label: 'Marking Code' },
                { key: 'branch', label: 'Cabang' },
              ] as { key: GroupMode; label: string }[]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setGroupMode(opt.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    groupMode === opt.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Blocks - flat mode has one pagination per status; grouped
            mode has one independent pagination per marking-code/branch group */}
        <div className="mt-4 space-y-4">
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
