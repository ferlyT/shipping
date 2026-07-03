import { useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchBar } from '@/components/ui/SearchBar'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { markingApi, type MarkingManifest } from '@/api/endpoints/marking'
import { EtaSummaryModal } from '@/components/ui/EtaSummaryModal'
import { MissedTargetModal } from '@/components/ui/MissedTargetModal'
import { X, Box, MapPin, Calendar, CheckCircle2, Activity, Truck, Ship, Warehouse, LogOut, Clock, AlertTriangle, Info, ChevronDown, ChevronRight, Eye, ListFilter, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Marking {
  fdMarkingCode: string
  fdListType: number
  fdContNo: string
  fdContSize: string
  fdBLNo: string
  fdAWB: string
  fdConsignee: string
  fdWilayah: string
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdLoadDate: string
  fdETA: string
  fdETD: string
  fdExitDate: string
  fdGudang: string
  fdStatus: number
  fdBranded?: number
}

type GroupMode = "none" | "year" | "branch" | "load" | "etd" | "eta";

function formatYearMonthKey(key: string) {
  if (key === "Tidak diketahui") return key;
  const [year, month] = key.split('-');
  if (!year || !month) return key;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getSeaTargetDays(markingCode: string | undefined): { min: number, max: number, label: string } | null {
  if (!markingCode) return null;
  const upper = markingCode.toUpperCase();
  if (upper.includes('SG')) return { min: 14, max: 20, label: '14-20 Days' };
  if (upper.includes('HK')) return { min: 30, max: 30, label: '30 Days' };
  if (upper.includes('GZ')) return { min: 30, max: 30, label: '30 Days' };
  if (upper.includes('SH')) return { min: 30, max: 30, label: '30 Days' };
  if (upper.includes('YW')) return { min: 30, max: 40, label: '30-40 Days' };
  return null;
}

function getAirTargetDays(markingCode: string | undefined): { min: number, max: number, label: string } | null {
  if (!markingCode) return null;
  const upper = markingCode.toUpperCase();
  if (upper.includes('SG')) return { min: 5, max: 5, label: '5 Days' };
  if (upper.includes('HK')) return { min: 7, max: 7, label: '7 Days' };
  if (upper.includes('GZ')) return { min: 7, max: 10, label: '7-10 Days' };
  return null;
}

interface GroupMeta {
  groupValue: string;
  count: number;
  totalPkgs: number;
  totalWeight: number;
}

const statusMeta = {
  open: {
    label: "Belum keluar gudang",
    hint: "Exit date belum tercatat — masih dalam proses.",
    icon: Clock,
    accent: "text-[var(--color-warning)]",
    bg: "bg-[var(--color-warning)]/5",
    border: "border-[var(--color-warning)]/30",
    badgeBg: "bg-[var(--color-warning)]/10",
    badgeText: "text-[var(--color-warning)]",
  },
  closed: {
    label: "Sudah keluar gudang",
    hint: "Exit date sudah tercatat — siklus batch selesai.",
    icon: CheckCircle2,
    accent: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success)]/5",
    border: "border-[var(--color-success)]/30",
    badgeBg: "bg-[var(--color-success)]/10",
    badgeText: "text-[var(--color-success)]",
  },
} as const;

function BatchRow({ row, onView, onViewManifest, listTypeFilter }: { row: Marking; onView: (row: Marking) => void, onViewManifest: (row: Marking) => void, listTypeFilter: string }) {
  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-neutral)]/50 transition-colors">
      <td className="py-3 pl-4 pr-3">
        <p className="text-sm font-semibold text-[var(--color-primary)]">{row.fdMarkingCode}</p>
        {row.fdStatus === 1 ? (
          <span className="mt-1 inline-block rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-success)]">
            Active
          </span>
        ) : (
          <span className="mt-1 inline-block rounded-full bg-[var(--color-secondary)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
            Inactive
          </span>
        )}
      </td>
      <td className="py-3 px-3">
        <p className="text-sm text-[var(--color-primary)] font-medium">{row.fdConsignee || '-'}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-secondary)]">
          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[150px]">{row.fdWilayah || 'Tidak diketahui'}</span>
        </p>
      </td>
      <td className="py-3 px-3 text-sm text-[var(--color-secondary)]">
        {listTypeFilter === '1' ? (
          <span className="font-medium text-[var(--color-primary)]">AWB: {row.fdAWB || '—'}</span>
        ) : (
          <span className="font-medium text-[var(--color-primary)]">BL: {row.fdBLNo || '—'}</span>
        )}
        {listTypeFilter === '2' && row.fdContNo && (
          <p className="text-[11px] mt-0.5">Cont: {row.fdContNo}</p>
        )}
      </td>
      <td className="py-3 px-3">
        <p className="text-sm text-[var(--color-primary)] font-medium">{row.fdJmlPack || 0} PKGS</p>
        <p className="text-xs text-[var(--color-secondary)]">
          {row.fdJmlBerat || 0} KG
        </p>
      </td>
      <td className="py-3 px-3 text-sm text-[var(--color-secondary)] whitespace-nowrap">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-[var(--color-secondary)]/70 shrink-0" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] w-8">LOAD</span>
              <span className="text-[11px] font-medium">{formatDate(row.fdLoadDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] w-8">ETD</span>
              <span className="text-[11px] font-medium">{formatDate(row.fdETD)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--color-primary)] w-8">ETA</span>
              <span className="text-[11px] font-medium">{formatDate(row.fdETA)}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 px-3 text-sm whitespace-nowrap">
        {row.fdExitDate ? (
          <span className="text-[var(--color-secondary)] font-medium">{formatDate(row.fdExitDate)}</span>
        ) : (
          <span className="rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--color-warning)] border border-[var(--color-warning)]/20">
            Belum keluar
          </span>
        )}
      </td>
      <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onViewManifest(row)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Manifest
          </button>
          <button
            onClick={() => onView(row)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-border)] bg-[var(--color-surface)] shadow-sm"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

function GroupSection({
  groupMeta,
  isClosed,
  search,
  listTypeFilter,
  groupMode,
  defaultExpanded,
  onView,
  onViewManifest
}: {
  groupMeta: GroupMeta;
  isClosed: string;
  search: string;
  listTypeFilter: string;
  groupMode: GroupMode;
  defaultExpanded: boolean;
  onView: (row: Marking) => void;
  onViewManifest: (row: Marking) => void;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const { page, limit, setLimit, goToPage } = usePagination(10);

  const { data, isLoading } = useQuery({
    queryKey: ['markings', groupMode, groupMeta.groupValue, isClosed, page, limit, search, listTypeFilter],
    queryFn: async () => {
      const res = await markingApi.list({
        page,
        limit,
        search,
        listType: listTypeFilter,
        isClosed,
        groupMode,
        groupValue: groupMeta.groupValue
      });
      return res.data as { data: Marking[]; meta: { total: number; totalPages: number } };
    },
    enabled: open // LAZY LOADING API
  });

  const rows = data?.data || [];
  const totalPages = data?.meta?.totalPages || 0;
  const total = data?.meta?.total || 0;

  const isDateMode = groupMode === "load" || groupMode === "etd" || groupMode === "eta";
  const displayTitle = groupMeta.groupValue === "Semua batch" || groupMeta.groupValue === "Tidak diketahui"
    ? groupMeta.groupValue
    : (isDateMode ? formatYearMonthKey(groupMeta.groupValue) : groupMeta.groupValue);

  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-[var(--color-neutral)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-border)]/30"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-[var(--color-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--color-secondary)]" />
          )}
          <span className="text-sm font-semibold text-[var(--color-primary)]">
            {displayTitle}
          </span>
          <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-primary)]">
            {groupMeta.count}
          </span>
        </span>
        <span className="flex flex-col items-end sm:flex-row sm:items-center sm:gap-1 text-xs font-medium text-[var(--color-secondary)] mt-1 sm:mt-0 text-right">
          <span className="whitespace-nowrap">{groupMeta.totalPkgs.toLocaleString("en-US")} pkgs</span>
          <span className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">{groupMeta.totalWeight.toLocaleString("en-US", { maximumFractionDigits: 0 })} kg</span>
        </span>
      </button>

      {open && (
        <div className="bg-[var(--color-surface)]">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse bg-[var(--color-surface)]">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                    <th className="py-3 pl-4 pr-3">Marking code</th>
                    <th className="py-3 px-3">Consignee</th>
                    <th className="py-3 px-3">Documents</th>
                    <th className="py-3 px-3">Volume / Weight</th>
                    <th className="py-3 px-3">LOAD / ETD / ETA</th>
                    <th className="py-3 px-3">Exit Date</th>
                    <th className="py-3 pr-4 pl-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-sm text-[var(--color-secondary)] font-medium">
                        Tidak ada data yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <BatchRow key={row.fdMarkingCode} row={row} onView={onView} onViewManifest={onViewManifest} listTypeFilter={listTypeFilter} />
                    ))
                  )}
                </tbody>
              </table>

              {totalPages > 0 && (
                <div className="border-t border-[var(--color-border)] px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Pagination
                    page={page}
                    limit={limit}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-secondary)]">
                    <span>Rows per page:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value))
                        goToPage(1)
                      }}
                      className="px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBlock({
  status,
  isClosed,
  search,
  groupMode,
  defaultOpen,
  onView,
  onViewManifest,
  listTypeFilter
}: {
  status: "open" | "closed";
  isClosed: string;
  search: string;
  groupMode: GroupMode;
  defaultOpen: boolean;
  onView: (row: Marking) => void;
  onViewManifest: (row: Marking) => void;
  listTypeFilter: string;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const meta = statusMeta[status];
  const Icon = meta.icon;

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['markingGroups', groupMode, isClosed, search, listTypeFilter],
    queryFn: async () => {
      const res = await markingApi.getGroups({
        search,
        listType: listTypeFilter,
        isClosed,
        groupMode
      });
      return res.data as { data: GroupMeta[] };
    },
    enabled: expanded // LAZY LOADING API for groups
  });

  const groups = groupsData?.data || [];
  const totalCount = groups.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className={`overflow-hidden rounded-[var(--radius-lg)] border ${meta.border} bg-[var(--color-surface)] shadow-sm`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-left ${meta.bg} transition-colors hover:opacity-90`}
      >
        <span className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${meta.accent}`} />
          <span>
            <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className={`text-sm font-bold leading-tight ${meta.accent}`}>{meta.label}</span>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badgeBg} ${meta.badgeText} whitespace-nowrap`}>
                {totalCount} batch
              </span>
            </span>
            <span className="mt-0.5 block text-xs font-medium text-[var(--color-secondary)]">{meta.hint}</span>
          </span>
        </span>
        {expanded ? (
          <ChevronDown className={`h-4 w-4 ${meta.accent}`} />
        ) : (
          <ChevronRight className={`h-4 w-4 ${meta.accent}`} />
        )}
      </button>

      {expanded && (
        <div>
          {isLoading ? (
            <div className="flex justify-center p-8 bg-[var(--color-surface)]">
              <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="px-5 py-6 text-sm text-[var(--color-secondary)] font-medium text-center bg-[var(--color-surface)]">
              Tidak ada batch pada status ini.
            </p>
          ) : (
            groups.map((group, idx) => (
              <GroupSection
                key={group.groupValue}
                groupMeta={group}
                isClosed={isClosed}
                search={search}
                listTypeFilter={listTypeFilter}
                groupMode={groupMode}
                defaultExpanded={groupMode === "none" || idx === 0}
                onView={onView}
                onViewManifest={onViewManifest}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ManifestList({ markingCode }: { markingCode: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['manifest', markingCode],
    queryFn: async () => {
      const res = await markingApi.getManifest(markingCode)
      return res.data as { data: MarkingManifest[] }
    },
    enabled: !!markingCode
  })

  const manifest = data?.data || []
  const totalPkgs = manifest.reduce((acc, m) => acc + Number(m.fdJmlPack || 0), 0)
  const totalWeight = manifest.reduce((acc, m) => acc + Number(m.fdJmlBerat || 0), 0)
  const totalVol = manifest.reduce((acc, m) => acc + Number(m.fdM3 || 0), 0)

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center border border-[var(--color-border)] rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
        <div className="animate-spin w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto relative">
          <table className="w-full min-w-[800px] border-collapse relative">
            <thead className="sticky top-0 z-10 bg-[var(--color-neutral)] shadow-[0_1px_0_var(--color-border)]">
              <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                <th className="py-3 pl-4 pr-3 whitespace-nowrap">Resi / ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Barang & Keterangan</th>
                <th className="py-3 px-3 text-right">Packages</th>
                <th className="py-3 px-3 text-right">Weight/Vol</th>
              </tr>
            </thead>
            <tbody>
              {manifest.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-[var(--color-secondary)] font-medium">
                    Tidak ada manifest di batch ini.
                  </td>
                </tr>
              ) : (
                manifest.map((m) => (
                  <tr key={m.fdListCode} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-neutral)]/50 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <p className="text-[11px] font-bold text-[var(--color-primary)]">{m.fdTerima || '-'}</p>
                      <p className="text-[10px] font-medium text-[var(--color-secondary)] mt-0.5">{m.fdListCode}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-[11px] font-semibold text-[var(--color-primary)] max-w-[150px] truncate">{m.fdCustName || '-'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-[11px] text-[var(--color-secondary)] font-medium">
                        {m.fdTglAgent ? new Date(m.fdTglAgent).toLocaleDateString('en-GB') : '-'}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-[11px] font-medium text-[var(--color-primary)] max-w-[200px] truncate" title={m.fdComodity || ''}>{m.fdComodity || '-'}</p>
                      {m.fdDesc && <p className="text-[10px] text-[var(--color-secondary)] mt-0.5 max-w-[200px] truncate" title={m.fdDesc}>{m.fdDesc}</p>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p className="text-[12px] font-bold text-[var(--color-primary)]">
                        {m.fdJmlPack || 0} <span className="text-[9px] font-medium text-[var(--color-secondary)]">{m.fdSatuan || 'PKGS'}</span>
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <p className="text-[12px] font-bold text-[var(--color-primary)]">
                        {m.fdJmlBerat || 0} <span className="text-[9px] font-medium text-[var(--color-secondary)]">KG</span>
                      </p>
                      {m.fdM3 ? (
                        <p className="text-[11px] font-bold text-[var(--color-secondary)] mt-0.5">
                          {m.fdM3} <span className="text-[9px] font-medium">M3</span>
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-[var(--color-neutral)] shadow-[0_-1px_0_var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] font-bold text-[var(--color-secondary)] shrink-0">
          <span>Total Manifest: {manifest.length}</span>
          <div className="flex items-center gap-4">
            <span>Packages: <span className="text-[var(--color-primary)]">{totalPkgs.toLocaleString()}</span></span>
            <span>Weight: <span className="text-[var(--color-primary)]">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} KG</span></span>
            <span>Volume: <span className="text-[var(--color-primary)]">{totalVol.toLocaleString(undefined, { maximumFractionDigits: 4 })} M3</span></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ShipmentBatchesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const [listTypeFilter, setListTypeFilter] = useState<'1' | '2'>('2') // Default to SEA (2)
  const [groupMode, setGroupMode] = useState<GroupMode>("year");

  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [inputCode, setInputCode] = useState('')

  const [isEtaSummaryModalOpen, setIsEtaSummaryModalOpen] = useState(false)
  const [isMissedTargetModalOpen, setIsMissedTargetModalOpen] = useState(false)

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['markingDetail', selectedRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await markingApi.detail(selectedRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedRow
  })

  const selectedMarking = detailData?.data || selectedRow

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['markingKpi', listTypeFilter, debouncedSearch],
    queryFn: async () => {
      const res = await markingApi.getKPIs({ listType: listTypeFilter, search: debouncedSearch })
      return res.data as { 
        data: { 
          totalBatches: number, 
          activeBatches: number, 
          avgTransitTime: number, 
          etaNotExitBatches: number, 
          missedTargetBatches: number,
          etaNotExitSummary: { name: string, count: number, codes: { code: string, aging: number }[] }[],
          missedTargetSummary: { name: string, count: number, codes: { code: string, transit: number, target: number }[] }[]
        } 
      }
    }
  })

  const kpis = kpiData?.data

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)]">
      {/* Header Container */}
      <div className="flex-shrink-0 flex flex-col gap-4 p-6 pb-2">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Shipment Batches</h1>
            <p className="text-sm text-[var(--color-secondary)] mt-1">
              Manage your marking and shipment batches
            </p>
          </div>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-2">
          {/* Total Batches */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Box className="w-24 h-24 text-[var(--color-primary)]" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Box className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Batches</span>
            </div>
            <div className="mt-3">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {kpis?.totalBatches.toLocaleString() || 0}
                </h3>
              )}
            </div>
          </div>
          
          {/* Active Batches */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-24 h-24 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Active Batches</span>
            </div>
            <div className="mt-3">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {kpis?.activeBatches.toLocaleString() || 0}
                </h3>
              )}
            </div>
          </div>
          
          {/* Avg Transit Time */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Ship className="w-24 h-24 text-purple-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Ship className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Avg Transit Time</span>
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <>
                  <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                    {kpis?.avgTransitTime || 0}
                  </h3>
                  <span className="text-xs font-bold text-[var(--color-secondary)] uppercase">Days</span>
                </>
              )}
            </div>
          </div>
          
          {/* ETA But Not Exit */}
          <div 
            onClick={() => {
              if (kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0) {
                setIsEtaSummaryModalOpen(true)
              }
            }}
            className={cn(
              "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
              kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0 ? "hover:shadow cursor-pointer hover:border-amber-400" : ""
            )}
          >
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-24 h-24 text-amber-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Sudah ETA (Belum Exit)</span>
            </div>
            <div className="mt-3 flex justify-between items-end">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <>
                  <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                    {kpis?.etaNotExitBatches?.toLocaleString() || 0}
                  </h3>
                  {kpis?.etaNotExitSummary && kpis.etaNotExitSummary.length > 0 && (
                    <span className="text-[10px] text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Missed Targets */}
          <div 
            onClick={() => {
              if (kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0) {
                setIsMissedTargetModalOpen(true)
              }
            }}
            className={cn(
              "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group transition-shadow",
              kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0 ? "hover:shadow cursor-pointer hover:border-rose-400" : ""
            )}
          >
            <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
              <AlertTriangle className="w-24 h-24 text-rose-500" />
            </div>
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">Tidak Capai Target</span>
            </div>
            <div className="mt-3 flex justify-between items-end">
              {isLoadingKpi ? (
                <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
              ) : (
                <>
                  <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                    {kpis?.missedTargetBatches?.toLocaleString() || 0}
                  </h3>
                  {kpis?.missedTargetSummary && kpis.missedTargetSummary.length > 0 && (
                    <span className="text-[10px] text-[var(--color-secondary)] underline decoration-dashed underline-offset-2">Lihat Detil</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center border-b border-[var(--color-border)]">
          {[
            { id: '2', label: 'SEA Freight' },
            { id: '1', label: 'AIR Freight' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setListTypeFilter(tab.id as '1' | '2'); }}
              className={cn(
                "px-6 py-2.5 font-bold text-sm border-b-2 transition-colors",
                listTypeFilter === tab.id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[var(--color-surface)] p-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
          <div className="w-full sm:max-w-md flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                value={search}
                onChange={(val) => { setSearch(val); }}
                placeholder="Search marking code, BL/AWB, consignee..."
              />
            </div>
            <button
              onClick={() => {
                setInputCode('');
                setIsCodeModalOpen(true);
              }}
              className="px-4 py-2 bg-[var(--color-neutral)] hover:bg-[var(--color-border)] text-[var(--color-primary)] text-xs font-bold rounded-[var(--radius-md)] border border-[var(--color-border)] transition-colors whitespace-nowrap shadow-sm"
            >
              Open by Code
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--color-secondary)] whitespace-nowrap overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                <ListFilter className="h-3.5 w-3.5" /> Group by
              </span>
              <div className="flex rounded-md border border-[var(--color-border)] bg-[var(--color-neutral)] p-0.5">
                {([
                  { key: "none", label: "None" },
                  { key: "year", label: "Tahun" },
                  { key: "branch", label: "Cabang" },
                  { key: "load", label: "Loading" },
                  { key: "etd", label: "ETD" },
                  { key: "eta", label: "ETA" },
                ] as { key: GroupMode; label: string }[]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setGroupMode(opt.key)}
                    className={cn(
                      "rounded px-3 py-1.5 text-xs font-bold transition-all",
                      groupMode === opt.key
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]"
                        : "text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-transparent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grouped Table Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4">
          <StatusBlock
            status="open"
            isClosed="false"
            search={debouncedSearch}
            groupMode={groupMode}
            defaultOpen={true}
            onView={setSelectedRow}
            onViewManifest={setSelectedManifestRow}
            listTypeFilter={listTypeFilter}
          />
          <StatusBlock
            status="closed"
            isClosed="true"
            search={debouncedSearch}
            groupMode={groupMode}
            defaultOpen={false}
            onView={setSelectedRow}
            onViewManifest={setSelectedManifestRow}
            listTypeFilter={listTypeFilter}
          />
        </div>
      </div>

      {/* Code Input Modal */}
      {isCodeModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4 sm:p-6"
          onClick={() => setIsCodeModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 border border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="text-lg font-bold font-[var(--font-display)] text-[var(--color-primary)]">Open Marking by Code</h2>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="p-1 hover:bg-[var(--color-neutral)] rounded-md transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <label htmlFor="markingCodeInput" className="block text-sm font-medium text-[var(--color-primary)] mb-2">
                Marking Code
              </label>
              <input
                id="markingCodeInput"
                type="text"
                autoFocus
                className="w-full px-4 py-2 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-primary)] placeholder-[var(--color-secondary)]/50"
                placeholder="Masukkan marking code..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputCode.trim()) {
                    setSelectedRow({ fdMarkingCode: inputCode.trim() } as Marking);
                    setIsCodeModalOpen(false);
                  }
                }}
              />
            </div>
            <div className="px-6 py-4 bg-[var(--color-neutral)] border-t border-[var(--color-border)] rounded-b-[var(--radius-xl)] flex justify-end gap-2">
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] text-sm font-bold rounded-[var(--radius-md)] border border-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!inputCode.trim()}
                onClick={() => {
                  if (inputCode.trim()) {
                    setSelectedRow({ fdMarkingCode: inputCode.trim() } as Marking);
                    setIsCodeModalOpen(false);
                  }
                }}
                className="px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white text-sm font-bold rounded-[var(--radius-md)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Open
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ETA Summary Modal */}
      <EtaSummaryModal 
        isOpen={isEtaSummaryModalOpen} 
        onClose={() => setIsEtaSummaryModalOpen(false)} 
        data={kpis?.etaNotExitSummary || []} 
      />

      {/* Missed Target Modal */}
      <MissedTargetModal
        isOpen={isMissedTargetModalOpen}
        onClose={() => setIsMissedTargetModalOpen(false)}
        data={kpis?.missedTargetSummary || []}
      />

      {/* Detail Modal */}
      {selectedRow && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4 sm:p-6"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="relative w-full max-w-5xl m-auto bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Panel */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sticky top-0 z-10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-[var(--color-border)]">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none">{selectedRow.fdMarkingCode}</h2>
                    <span className="rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] font-[var(--font-label)] font-medium text-[var(--color-secondary)]">
                      {listTypeFilter === '1' ? 'AIR' : 'SEA'}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-secondary)] mt-1 font-[var(--font-body)]">{listTypeFilter === '1' ? 'Air freight batch' : 'Sea freight batch'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-[var(--color-neutral)] rounded-full transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto bg-[var(--color-neutral)]">
              {isLoadingDetail ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : selectedMarking ? (
                <div className="p-6 space-y-6">

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Consignee</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--color-primary)]">{selectedMarking.fdConsignee || '-'}</p>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Region</p>
                      <p className={cn("mt-1 text-sm font-semibold", selectedMarking.fdWilayah ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                        {selectedMarking.fdWilayah || 'Not recorded'}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{listTypeFilter === '1' ? 'AWB No.' : 'BL No.'}</p>
                      <p className={cn("mt-1 text-sm font-semibold break-all", (listTypeFilter === '1' ? selectedMarking.fdAWB : selectedMarking.fdBLNo) ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                        {listTypeFilter === '1' ? (selectedMarking.fdAWB || 'Not recorded') : (selectedMarking.fdBLNo || 'Not recorded')}
                      </p>
                    </div>
                    {listTypeFilter === '2' && (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Container</p>
                        <p className={cn("mt-1 text-sm font-semibold", selectedMarking.fdContNo ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                          {selectedMarking.fdContNo ? `${selectedMarking.fdContNo} ${selectedMarking.fdContSize ? `(${selectedMarking.fdContSize})` : ''}` : '—'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Volume & Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Packages</p>
                      <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                        {selectedMarking.fdJmlPack || 0}
                      </p>
                    </div>
                    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                      <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Weight</p>
                      <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                        {selectedMarking.fdJmlBerat || 0}
                        <span className="ml-1 text-xs font-medium text-[var(--color-secondary)]">kg</span>
                      </p>
                    </div>
                    {listTypeFilter === '2' && (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Volume</p>
                        <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                          {selectedMarking.fdM3 || 0}
                          <span className="ml-1 text-xs font-medium text-[var(--color-secondary)]">m³</span>
                        </p>
                      </div>
                    )}
                    {listTypeFilter === '1' && (
                      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Branded</p>
                        <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                          {selectedMarking.fdBranded || 0}
                          <span className="ml-1 text-xs font-medium text-[var(--color-secondary)]">kg</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Timeline section */}
                  {(() => {
                    const formatDate = (val: string | undefined | null) => {
                      if (!val) return null;
                      const d = new Date(val);
                      if (isNaN(d.getTime())) return null;
                      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    }
                    const stages = [
                      {
                        key: "load",
                        label: "Load date",
                        date: selectedMarking.fdLoadDate,
                        status: selectedMarking.fdLoadDate ? "completed" : "pending",
                        icon: Truck,
                      },
                      {
                        key: "etd_eta",
                        label: "ETD → ETA",
                        date: selectedMarking.fdETD && selectedMarking.fdETA ? `${formatDate(selectedMarking.fdETD)} → ${formatDate(selectedMarking.fdETA)}` : null,
                        status: selectedMarking.fdETD && selectedMarking.fdETA ? "completed" : "pending",
                        icon: Ship,
                      },
                      {
                        key: "gudang",
                        label: "Enter gudang",
                        date: (selectedMarking as any).fdEnterGudang,
                        status: (selectedMarking as any).fdEnterGudang ? "completed" : "missing",
                        icon: Warehouse,
                      },
                      {
                        key: "exit",
                        label: "Exit date",
                        date: selectedMarking.fdExitDate,
                        status: selectedMarking.fdExitDate ? "completed" : "pending",
                        icon: LogOut,
                      },
                    ]

                    const getStatusStyles = (status: string) => {
                      switch (status) {
                        case 'completed': return { ring: "ring-[var(--color-success)]/40", text: "text-[var(--color-success)]", badgeBg: "bg-[var(--color-success)]/10", badgeText: "text-[var(--color-success)]", label: "Completed" };
                        case 'pending': return { ring: "ring-[var(--color-secondary)]/40", text: "text-[var(--color-secondary)]", badgeBg: "bg-[var(--color-secondary)]/10", badgeText: "text-[var(--color-secondary)]", label: "Pending" };
                        case 'missing': return { ring: "ring-[var(--color-danger)]/40", text: "text-[var(--color-danger)]", badgeBg: "bg-[var(--color-danger)]/10", badgeText: "text-[var(--color-danger)]", label: "Missing data" };
                        case 'delayed': return { ring: "ring-[var(--color-warning)]/40", text: "text-[var(--color-warning)]", badgeBg: "bg-[var(--color-warning)]/10", badgeText: "text-[var(--color-warning)]", label: "Delayed" };
                        default: return { ring: "", text: "", badgeBg: "", badgeText: "", label: "" };
                      }
                    }

                    return (
                      <div>
                        <h3 className="mb-4 text-xs font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                          <Activity size={14} />
                          Timeline
                        </h3>
                        <div className="relative">
                          <div className="absolute left-0 right-0 top-5 h-px bg-[var(--color-border-strong)] opacity-50 hidden sm:block" />
                          <div className="absolute top-0 bottom-0 left-[19px] w-px bg-[var(--color-border-strong)] opacity-50 sm:hidden" />
                          <div className="relative grid grid-cols-1 sm:grid-cols-4 gap-6 sm:gap-2">
                            {stages.map((stage) => {
                              const s = getStatusStyles(stage.status);
                              const Icon = stage.icon;
                              return (
                                <div key={stage.key} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center relative">
                                  <div className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] ring-2 border border-[var(--color-border)] shadow-sm", s.ring)}>
                                    <Icon className={cn("h-4 w-4", s.text)} />
                                  </div>
                                  <div className="ml-4 sm:ml-0 mt-0 sm:mt-3 flex flex-col sm:items-center">
                                    <p className="text-[10px] uppercase font-[var(--font-label)] text-[var(--color-secondary)] font-medium">{stage.label}</p>
                                    <p className="text-[11px] font-semibold text-[var(--color-primary)] mt-0.5 min-h-[16px]">
                                      {!stage.date ? "—" : (stage.key === "etd_eta" ? stage.date : formatDate(stage.date))}
                                    </p>
                                    <span className={cn("mt-1 sm:mt-1.5 rounded-full px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider w-fit", s.badgeBg, s.badgeText)}>
                                      {s.label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* KPIs */}
                  {(() => {
                    const parseDate = (val: string | undefined | null) => {
                      if (!val) return null;
                      const d = new Date(val);
                      return isNaN(d.getTime()) ? null : d;
                    }
                    const diffDays = (d1: Date | null, d2: Date | null) => {
                      if (!d1 || !d2) return null;
                      return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
                    }
                    const loadDate = parseDate(selectedMarking.fdLoadDate);
                    const etdDate = parseDate(selectedMarking.fdETD);
                    const etaDate = parseDate(selectedMarking.fdETA);
                    const exitDate = parseDate(selectedMarking.fdExitDate);
                    const enterGudang = (selectedMarking as any).fdEnterGudang ? true : false;

                    const today = new Date();

                    const leadTimeLoading = diffDays(etdDate, loadDate);
                    const transitTime = diffDays(etaDate, etdDate);
                    const warehouseDelay = diffDays(exitDate || today, etaDate);
                    const totalCycle = diffDays(exitDate || today, loadDate);
                    const isDelayed = warehouseDelay !== null && warehouseDelay > 0;
                    const isMissingETA = etaDate === null;

                    const seaTarget = listTypeFilter === '2' ? getSeaTargetDays(selectedMarking.fdMarkingCode) : null;
                    const airTarget = listTypeFilter === '1' ? getAirTargetDays(selectedMarking.fdMarkingCode) : null;
                    const cycleTarget = listTypeFilter === '2' ? seaTarget : airTarget;
                    const isCycleDelayed = cycleTarget !== null && totalCycle !== null ? totalCycle > cycleTarget.max : false;

                    return (
                      <>
                        <div>
                          <h3 className="mb-4 text-xs font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                            <Clock size={14} />
                            Performance
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* KpiCard 1 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Lead time loading</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {leadTimeLoading === null ? "—" : leadTimeLoading}
                                </span>
                                {leadTimeLoading !== null && <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] font-medium text-[var(--color-secondary)]">Load date → ETD</p>
                            </div>

                            {/* KpiCard 2 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Transit time</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {transitTime === null ? "—" : transitTime}
                                </span>
                                {transitTime !== null && <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] font-medium text-[var(--color-secondary)]">ETD → ETA</p>
                            </div>

                            {/* KpiCard 3 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Warehouse delay</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {warehouseDelay === null ? "—" : warehouseDelay}
                                </span>
                                {warehouseDelay !== null && <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] font-medium text-[var(--color-secondary)]">ETA → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                              {warehouseDelay !== null && (
                                <p className={cn("mt-2 text-[11px] font-bold", isDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
                                  {isDelayed ? `${warehouseDelay}d over ETA` : (exitDate ? "Within ETA" : "On track (ongoing)")}
                                </p>
                              )}
                            </div>

                            {/* KpiCard 4 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total shipment cycle</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className={cn("text-2xl font-bold font-[var(--font-display)]", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]")}>
                                  {totalCycle === null ? "—" : totalCycle}
                                </span>
                                {totalCycle !== null && <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] font-medium text-[var(--color-secondary)]">Load date → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                              {cycleTarget && (
                                <p className={cn("mt-2 text-[11px] font-bold", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
                                  Target: ± {cycleTarget.label}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Issues */}
                        <div className="space-y-3">
                          {/* Issue 1 */}
                          <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", enterGudang ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5" : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5")}>
                            {enterGudang ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--color-primary)]">Warehouse entry compliance</p>
                              <p className="mt-1 text-[11px] font-medium text-[var(--color-secondary)]">
                                {enterGudang ? "Enter gudang date is recorded for this batch." : "Enter gudang date is not recorded for this batch."}
                              </p>
                            </div>
                          </div>

                          {/* Issue 2 */}
                          <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isMissingETA ? "border-[var(--color-border-strong)] bg-[var(--color-neutral)]" : (isDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"))}>
                            {isMissingETA ? <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-secondary)]" /> : (isDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />)}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[var(--color-primary)]">ETA achievement</p>
                              <p className="mt-1 text-[11px] font-medium text-[var(--color-secondary)]">
                                {isMissingETA ? "ETA is missing." : (isDelayed ? (exitDate ? `Exit date is ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} after ETA.` : `Currently ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} over ETA (ongoing).`) : (exitDate ? "Exit date is on or before ETA." : "Currently on track before ETA (ongoing)."))}
                              </p>
                            </div>
                          </div>

                          {/* Issue 3: Cycle Target */}
                          {cycleTarget && (
                            <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isCycleDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5")}>
                              {isCycleDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />}
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[var(--color-primary)]">Cycle achievement</p>
                                <p className="mt-1 text-[11px] font-medium text-[var(--color-secondary)]">
                                  {isCycleDelayed ? `Total shipment cycle is ${totalCycle! - cycleTarget.max} day(s) over target (${cycleTarget.label}).` : `Total shipment cycle is within target (${cycleTarget.label}).`}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-secondary)] font-medium shadow-sm">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
                          <p>All duration calculations are based on calendar days.</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : null}
            </div>

            {/* Footer Action */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] rounded-b-[var(--radius-xl)] flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-primary)] rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-neutral)] transition-colors"
                onClick={() => setSelectedRow(null)}
              >
                Close
              </button>
              {/* <button className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-md)] text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
                Edit Marking
              </button> */}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manifest Modal */}
      {selectedManifestRow && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity p-4 sm:p-6"
          onClick={() => setSelectedManifestRow(null)}
        >
          <div
            className="relative w-full max-w-5xl m-auto bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-[var(--color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Panel */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)] rounded-t-[var(--radius-xl)] sticky top-0 z-10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-[var(--color-border)]">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none">{selectedManifestRow.fdMarkingCode}</h2>
                  <p className="text-xs text-[var(--color-secondary)] mt-1 font-[var(--font-body)]">Batch Manifest List</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedManifestRow(null)}
                className="p-2 hover:bg-[var(--color-neutral)] rounded-full transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-neutral)] p-4 sm:p-6">
               <ManifestList markingCode={selectedManifestRow.fdMarkingCode} />
            </div>
            
            {/* Footer Action */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] rounded-b-[var(--radius-xl)] flex justify-end gap-3">
              <button
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-primary)] rounded-[var(--radius-md)] text-sm font-semibold hover:bg-[var(--color-neutral)] transition-colors"
                onClick={() => setSelectedManifestRow(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
