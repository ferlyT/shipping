import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Pagination } from '@/components/ui/Pagination'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { markingApi, type MarkingManifest, type ExitHistoryDay } from '@/api/endpoints/marking'
import { EtaSummaryModal } from '@/components/ui/EtaSummaryModal'
import { MissedTargetModal } from '@/components/ui/MissedTargetModal'
import { PredictedExitModal, type PrediksiExitItem } from '@/components/ui/PredictedExitModal'
import { ExitListModal, type ExitListItem } from '@/components/ui/ExitListModal'
import { ExitHistoryModal } from '@/components/ui/ExitHistoryModal'
import { X, Box, MapPin, Calendar, CheckCircle2, Activity, Truck, Ship, LogOut, Clock, AlertTriangle, Info, ChevronDown, ChevronRight, Eye, ListFilter, ClipboardList, Search, Rows3, LayoutGrid, PackageX, Book, Shirt, Settings, Cpu, Coffee, Pill as PillIcon, Car, Package, Plane, List, RotateCcw } from 'lucide-react'
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
  fdKet?: string
  fdSysDate?: string
  fdCreated?: string
  fdUpdate?: string
  fdUpdateBy?: string
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

const STATUS_META: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  1: { label: 'Proses', bg: 'bg-[#FFF4E6]', text: 'text-[#E8590C]', dot: 'bg-[#E8590C]' },
  2: { label: 'Selesai', bg: 'bg-[#EBFBEE]', text: 'text-[#2B8A3E]', dot: 'bg-[#2B8A3E]' },
  3: { label: 'Batal', bg: 'bg-[#FFF0F0]', text: 'text-[#C92A2A]', dot: 'bg-[#C92A2A]' },
  4: { label: 'Re-export', bg: 'bg-[#EDF2FF]', text: 'text-[#3B5BDB]', dot: 'bg-[#3B5BDB]' },
}

function StatusBadge({ status, exitDate }: { status?: number | null; exitDate?: string | null }) {
  // Paksa jadi "Selesai" kalau fdExitDate sudah terisi, apapun nilai fdStatus mentahnya.
  const effectiveStatus = exitDate ? 2 : status
  const meta = effectiveStatus != null ? STATUS_META[effectiveStatus] : undefined
  const label = meta?.label ?? 'Tidak diketahui'
  const bg = meta?.bg ?? 'bg-[#F1F3F5]'
  const text = meta?.text ?? 'text-[#495057]'
  const dot = meta?.dot ?? 'bg-[#495057]'

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] md:text-xs font-semibold whitespace-nowrap',
      bg, text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)}></span>
      {label}
    </span>
  )
}

function BatchRow({ row, onView, onViewManifest }: { row: Marking; onView: (row: Marking) => void, onViewManifest: (row: Marking) => void }) {
  return (
    <tr className="bg-white hover:bg-[#EFF6FF] transition-colors duration-200 border-b border-[#E4E1DA] last:border-0">
      <td className="py-3 pl-4 pr-3">
        <p className="text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">{row.fdMarkingCode}</p>
        <StatusBadge status={row.fdStatus} exitDate={row.fdExitDate} />
      </td>
      <td className="py-3 px-3">
        <p className="text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-primary)] font-medium">{row.fdConsignee || '-'}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-[11.5px] md:text-xs text-[var(--color-secondary)]">
          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[150px]">{row.fdWilayah || 'Tidak diketahui'}</span>
        </p>
      </td>
      <td className="py-3 px-3 text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)]">
        {row.fdListType === 1 ? (
          <span className="font-medium text-[var(--color-primary)]">AWB: {row.fdAWB || '—'}</span>
        ) : (
          <span className="font-medium text-[var(--color-primary)]">BL: {row.fdBLNo || '—'}</span>
        )}
        {row.fdListType !== 1 && (row.fdListType === 2 || (row.fdContNo && row.fdContNo.trim() !== '')) && (
          <p className="text-[11px] sm:text-[11.5px] md:text-xs mt-0.5">Cont: {row.fdContNo || '—'}{row.fdContSize && row.fdContSize.trim() !== '' ? ` (${row.fdContSize.trim()})` : ''}</p>
        )}
        {row.fdKet && row.fdKet.trim() !== '' && (
          <p className="text-[11px] sm:text-[11.5px] md:text-xs mt-0.5 text-[var(--color-tertiary)] truncate max-w-[150px]" title={row.fdKet}>Ket: {row.fdKet}</p>
        )}
      </td>
      <td className="py-3 px-3">
        <p className="text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-primary)] font-medium">{row.fdJmlPack != null ? Number(row.fdJmlPack).toLocaleString('en-US') : 0} PKGS</p>
        <p className="text-xs sm:text-[13px] md:text-[14px] text-[var(--color-secondary)]">
          {row.fdJmlBerat != null ? Number(row.fdJmlBerat).toLocaleString('en-US') : 0} KG
        </p>
      </td>
      <td className="py-3 px-3 text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)] whitespace-nowrap">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 mt-0.5 text-[var(--color-secondary)]/70 shrink-0" />
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--color-primary)] w-8">LOAD</span>
              <span className="text-[11px] sm:text-[11.5px] md:text-xs font-medium">{formatDate(row.fdLoadDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--color-primary)] w-8">ETD</span>
              <span className="text-[11px] sm:text-[11.5px] md:text-xs font-medium">{formatDate(row.fdETD)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--color-primary)] w-8">ETA</span>
              <span className="text-[11px] sm:text-[11.5px] md:text-xs font-medium">{formatDate(row.fdETA)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-[var(--color-primary)] w-8">EXIT</span>
              <span className={cn(
                "text-[11px] sm:text-[11.5px] md:text-xs font-medium",
                !row.fdExitDate && "text-[var(--color-muted)]"
              )}>
                {formatDate(row.fdExitDate)}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onViewManifest(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1DA] px-3 py-1.5 text-xs sm:text-[13px] md:text-[14px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[#F7F5F2] bg-[var(--color-surface)]"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Manifest
          </button>
          <button
            onClick={() => onView(row)}
            className="inline-flex items-center justify-center p-2 text-[var(--color-secondary)] hover:bg-[#F7F5F2] rounded-lg transition-all duration-200"
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function BatchListRow({ row, onView }: { row: Marking; onView: (row: Marking) => void }) {
  const isAir = row.fdListType === 1;

  return (
    <button
      type="button"
      onClick={() => onView(row)}
      className="flex w-full flex-col gap-2.5 p-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-slate-100">
            {isAir ? <Plane className="h-3.5 w-3.5" /> : <Ship className="h-3.5 w-3.5" />}
          </div>
          <div>
            <div className="font-bold font-[var(--font-display)] text-[var(--color-primary)] text-[13px] sm:text-[14px] md:text-[15px] leading-none">
              {row.fdMarkingCode}
            </div>
            <div className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] mt-0.5 line-clamp-1">
              {row.fdConsignee || 'Consignee tidak diketahui'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <StatusBadge status={row.fdStatus} exitDate={row.fdExitDate} />
            </div>
            <div className="text-[9px] sm:text-[9.5px] md:text-[10px] font-medium text-[var(--color-secondary)]">
              {row.fdJmlPack || 0} PKGS
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
        </div>
      </div>
    </button>
  )
}

function GroupSection({ viewMode, 
  groupMeta,
  isClosed,
  search,
  listTypeFilter,
  groupMode,
  defaultExpanded = false,
  onView,
  onViewManifest
}: {
  viewMode?: 'table' | 'shortlist'
  groupMeta: GroupMeta
  isClosed: string
  search: string
  listTypeFilter: 'ALL' | '1' | '2'
  groupMode: GroupMode
  defaultExpanded?: boolean
  onView: (r: Marking) => void
  onViewManifest: (r: Marking) => void
}) {
  const [open, setOpen] = useState(defaultExpanded || !!search);
  const prevSearch = useRef(search);

  // Auto-expand saat pencarian mulai aktif, supaya hasil tidak tersembunyi di grup yang tertutup
  useEffect(() => {
    if (search && !prevSearch.current) {
      setOpen(true);
    }
    prevSearch.current = search;
  }, [search]);

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
    <div className="border-b border-[#E4E1DA] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-[#F7F5F2]/95 px-4 sm:px-6 py-2.5 text-left transition-colors hover:bg-[#F7F5F2] border-y border-[#E4E1DA]"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-[var(--color-secondary)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--color-secondary)]" />
          )}
          <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] md:text-xs tracking-[0.08em] uppercase text-[var(--color-secondary)]">
            {displayTitle}
          </span>
          <span className="text-[11px] sm:text-[11.5px] md:text-xs font-semibold text-[var(--color-secondary)]">
            {groupMeta.count}
          </span>
        </span>
        <span className="flex flex-col items-end sm:flex-row sm:items-center sm:gap-1 text-[11.5px] sm:text-xs md:text-[12.5px] font-medium text-[var(--color-secondary)] mt-1 sm:mt-0 text-right">
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
            <>
              {/* Desktop Table View */}
              <div className={cn("overflow-x-auto", viewMode === 'shortlist' ? "hidden" : "hidden sm:block")}>
                <table className="w-full min-w-[1000px] border-collapse bg-white">
                  <thead>
                    <tr className="text-left font-[var(--font-label)] text-[11px] sm:text-[11.5px] md:text-xs tracking-[0.08em] uppercase text-[var(--color-secondary)] border-b border-[#E4E1DA] bg-slate-50/50">
                      <th className="py-3 pl-4 pr-3">Kode Marking</th>
                      <th className="py-3 px-3">Consignee</th>
                      <th className="py-3 px-3">Dokumen</th>
                      <th className="py-3 px-3">Volume / Berat</th>
                      <th className="py-3 px-3">LOAD / ETD / ETA / EXIT</th>
                      <th className="py-3 pr-4 pl-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)] font-medium">
                          Tidak ada data yang ditemukan.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <BatchRow key={row.fdMarkingCode} row={row} onView={onView} onViewManifest={onViewManifest} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Grid View */}
              <div className={cn("flex flex-col divide-y divide-[#E4E1DA] border-y border-[#E4E1DA]", viewMode === 'shortlist' ? "block" : "sm:hidden")}>
                {rows.length === 0 ? (
                  <div className="py-8 text-center text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)] font-medium bg-white">
                    Tidak ada data yang ditemukan.
                  </div>
                ) : (
                  rows.map((row) => (
                    <BatchListRow key={row.fdMarkingCode} row={row} onView={onView} />
                  ))
                )}
              </div>

              {totalPages > 0 && (
                <div className="border-t border-[#E4E1DA] px-3 sm:px-6 py-3 sm:py-4 flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4 bg-white">
                  <Pagination
                    page={page}
                    limit={limit}
                    total={total}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                  />
                  <div className="flex items-center gap-1.5 text-[12.5px] sm:text-[13px] md:text-[13.5px] text-[var(--color-secondary)] shrink-0">
                    <span>Baris:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value))
                        goToPage(1)
                      }}
                      className="text-[12.5px] sm:text-[13px] md:text-[13.5px] text-[var(--color-primary)] border border-[#E4E1DA] rounded-[var(--radius-sm)] px-2 py-1 outline-none bg-white cursor-pointer font-[var(--font-body)]"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const StatusBlock = ({
  viewMode,
  status,
  isClosed,
  search,
  groupMode,
  defaultOpen,
  onView,
  onViewManifest,
  listTypeFilter,
  totalCountOverride
}: {
  viewMode?: 'table' | 'shortlist'
  status: 'open' | 'closed'
  isClosed: 'true' | 'false'
  search: string
  groupMode: GroupMode
  defaultOpen: boolean
  onView: (m: Marking) => void
  onViewManifest: (m: Marking) => void
  listTypeFilter: 'ALL' | '1' | '2'
  totalCountOverride?: number
}) => {
  const [expanded, setExpanded] = useState(defaultOpen || !!search);
  const prevSearch = useRef(search);

  // Auto-expand saat pencarian mulai aktif, supaya hasil pada status ini tidak tersembunyi
  useEffect(() => {
    if (search && !prevSearch.current) {
      setExpanded(true);
    }
    prevSearch.current = search;
  }, [search]);

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
  // Sebelum groups di-lazy-load (section belum pernah dibuka), pakai angka dari KPI
  // yang sudah ke-fetch di awal, supaya badge count gak nampilin 0 saat page pertama kali load.
  const totalCount = totalCountOverride !== undefined && !groupsData
    ? totalCountOverride
    : groups.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className={`overflow-hidden rounded-[var(--radius-lg)] border border-[#E4E1DA] bg-white shadow-sm`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 text-left ${meta.bg} transition-colors hover:opacity-90`}
      >
        <span className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${meta.accent}`} />
          <span>
            <span className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className={`text-sm sm:text-[14.5px] md:text-[15px] font-bold leading-tight ${meta.accent}`}>{meta.label}</span>
              <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] sm:text-[11.5px] md:text-xs font-bold ${meta.badgeBg} ${meta.badgeText} whitespace-nowrap`}>
                {totalCount} batch
              </span>
            </span>
            <span className="mt-0.5 block text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">{meta.hint}</span>
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
            <div className="flex flex-col justify-center items-center p-8 bg-[var(--color-surface)] gap-4">
              <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--color-secondary)] text-sm sm:text-[14.5px] md:text-[15px] animate-pulse">Memuat data batch...</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="px-5 py-6 text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)] font-medium text-center bg-[var(--color-surface)]">
              Tidak ada batch pada status ini.
            </p>
          ) : (
            groups.map((group, idx) => (
              <GroupSection viewMode={viewMode}
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
const getCommodityIcon = (name: string | null | undefined) => {
  if (!name || typeof name !== 'string' || name.toUpperCase() === 'NOT SET') return { Icon: PackageX, color: 'text-slate-400', bg: 'bg-slate-100/80', tooltip: 'Not set' }
  const upperName = name.toUpperCase()

  if (upperName.includes('BOOK')) return { Icon: Book, color: 'text-blue-600', bg: 'bg-blue-50', tooltip: name }
  if (upperName.includes('CLOTH') || upperName.includes('GARMENT') || upperName.includes('FABRIC') || upperName.includes('SHIRT')) return { Icon: Shirt, color: 'text-pink-600', bg: 'bg-pink-50', tooltip: name }
  if (upperName.includes('TRANSFORMER') || upperName.includes('MACHINE') || upperName.includes('ENGINE') || upperName.includes('TURBOCHARGER') || upperName.includes('SPAREPART') || upperName.includes('LAUNCHER')) return { Icon: Settings, color: 'text-orange-600', bg: 'bg-orange-50', tooltip: name }
  if (upperName.includes('ELECTRONIC') || upperName.includes('CIRCUIT') || upperName.includes('KEYBOARD') || upperName.includes('COMPUTER') || upperName.includes('LCD') || upperName.includes('SIM CARD')) return { Icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50', tooltip: name }
  if (upperName.includes('FOOD') || upperName.includes('DRINK') || upperName.includes('COFFEE')) return { Icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50', tooltip: name }
  if (upperName.includes('MEDICAL') || upperName.includes('PILL') || upperName.includes('DRUG') || upperName.includes('PHARMACY')) return { Icon: PillIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', tooltip: name }
  if (upperName.includes('VEHICLE') || upperName.includes('CAR') || upperName.includes('AUTO') || upperName.includes('MOTOR')) return { Icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50', tooltip: name }

  return { Icon: Package, color: 'text-slate-700', bg: 'bg-slate-100', tooltip: name }
}

function ManifestList({ markingCode, onClose }: { markingCode: string; onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'shortlist'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'shortlist' : 'table'
    }
    return 'table'
  })

  const { data, isLoading } = useQuery({
    queryKey: ['manifest', markingCode],
    queryFn: async () => {
      const res = await markingApi.getManifest(markingCode)
      return res.data as { data: MarkingManifest[] }
    },
    enabled: !!markingCode
  })

  const manifest = data?.data || []
  
  const filteredManifest = manifest.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.fdListCode?.toLowerCase().includes(term) ||
           m.fdCustName?.toLowerCase().includes(term) ||
           m.fdComodity?.toLowerCase().includes(term);
  });

  const totalPkgs = filteredManifest.reduce((acc, m) => acc + Number(m.fdJmlPack || 0), 0)
  const totalWeight = filteredManifest.reduce((acc, m) => acc + Number(m.fdJmlBerat || 0), 0)
  const totalVol = filteredManifest.reduce((acc, m) => acc + Number(m.fdM3 || 0), 0)

  if (isLoading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center bg-[var(--color-surface)] gap-4">
        <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--color-secondary)] text-sm sm:text-[14.5px] md:text-[15px] animate-pulse">Memuat data manifest...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[var(--color-surface)]">
      <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-[#E4E1DA] bg-[var(--color-surface)] flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-[var(--color-secondary)]" />
          <input
            type="text"
            placeholder="Search resi, customer, barang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-[9px] bg-white border border-[#E4E1DA] rounded-[var(--radius-md)] text-xs sm:text-sm md:text-[0.82rem] text-[var(--color-primary)] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[var(--color-tertiary)] transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#F7F5F2] rounded-[var(--radius-md)] p-0.5 border border-[#E4E1DA] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
          >
            <Rows3 size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('shortlist')}
            className={cn('p-1.5 rounded-[var(--radius-sm)] transition-all', viewMode === 'shortlist' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-[#F8FAFC]">
        {filteredManifest.length === 0 ? (
          <div className="py-16 flex justify-center text-sm sm:text-[14.5px] md:text-[15px] text-[var(--color-secondary)]">
            {searchTerm ? 'Tidak ada manifest yang cocok dengan pencarian.' : 'Tidak ada manifest di batch ini.'}
          </div>
        ) : viewMode === 'shortlist' ? (
          <div className="flex flex-col divide-y divide-[#E4E1DA] border-y border-[#E4E1DA]">
            {filteredManifest.map((m) => {
              const comodityInfo = getCommodityIcon((m as any).fdComodityName || m.fdComodity);
              const Icon = comodityInfo.Icon;
              return (
                <div key={m.fdListCode} className="flex flex-col gap-2 p-3 bg-white hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-100", comodityInfo.bg, comodityInfo.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold font-[var(--font-display)] text-[var(--color-primary)] text-[13px] sm:text-[14px] md:text-[15px] leading-none line-clamp-1">
                          {m.fdCustName || 'Unknown Customer'}
                        </div>
                        <div className="text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] mt-0.5 line-clamp-1">
                          {m.fdTerima || m.fdListCode}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="font-semibold text-[10px] sm:text-[11px] md:text-xs text-[var(--color-tertiary)] bg-[#F7F5F2] px-2 py-0.5 rounded">
                        {m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}
                      </div>
                      <div className="text-[9.5px] sm:text-[10.5px] md:text-[11px] text-[var(--color-secondary)]">
                        {m.fdJmlBerat || 0} kg
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-[40px] text-[10.5px] sm:text-[11.5px] md:text-xs">
                    <span className="text-[var(--color-primary)] font-medium bg-slate-100 px-1.5 py-0.5 rounded line-clamp-1 break-all">
                      {m.fdMarkingNo || '-'}
                    </span>
                    <span className="text-[var(--color-secondary)] line-clamp-1">
                      {m.fdComodity || '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : viewMode === 'table' ? (
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div className="min-w-[800px] border border-[#E4E1DA] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr>
                    <th className="bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] text-left py-3 px-4 border-b border-[#E4E1DA] font-medium w-[15%]">Customer</th>
                    <th className="bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] text-left py-3 px-4 border-b border-[#E4E1DA] font-medium w-[25%]">Marking / Receiver</th>
                    <th className="bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] text-left py-3 px-4 border-b border-[#E4E1DA] font-medium w-[20%]">Commodity</th>
                    <th className="bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] text-left py-3 px-4 border-b border-[#E4E1DA] font-medium w-[25%]">Description</th>
                    <th className="bg-[var(--color-neutral)] font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] text-right py-3 px-4 border-b border-[#E4E1DA] font-medium w-[15%]">Summary</th>
                  </tr>
            </thead>
            <tbody>
              {filteredManifest.map((m) => (
                <tr key={m.fdListCode} className="hover:bg-[#FBFAF8] group border-b border-[#EFEDE7] last:border-0">
                  <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] align-top">
                    <span className="font-semibold text-[var(--color-primary)]">{m.fdCustName || '—'}</span>
                  </td>
                  <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] align-top">
                    <div className="flex flex-col gap-0.5">
                      {m.fdMarkingNo ? (
                        <span className="text-[13px] sm:text-[14px] md:text-[15px] font-semibold text-[var(--color-primary)] uppercase leading-tight">{m.fdMarkingNo}</span>
                      ) : (
                        <span className="font-medium text-slate-400 leading-tight">-</span>
                      )}
                      {m.fdTerima && <span className="font-semibold text-[var(--color-primary)] mt-1 leading-snug">{m.fdTerima}</span>}
                      {m.fdListCode && <span className="text-[13px] sm:text-[14px] md:text-[15px] text-[var(--color-tertiary)] font-medium leading-snug">{m.fdListCode}</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] align-top">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-semibold text-[var(--color-primary)] leading-[1.4]">{m.fdComodity || '-'}</span>
                      {(() => {
                        const comodityInfo = getCommodityIcon((m as any).fdComodityName || m.fdComodity);
                        const Icon = comodityInfo.Icon;
                        return (
                          <div title={comodityInfo.tooltip} className={cn("flex items-center w-fit p-1.5 rounded-md cursor-help transition-colors", comodityInfo.bg, comodityInfo.color)}>
                            <Icon size={14} />
                          </div>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] align-top">
                    <span className="text-[var(--color-secondary)] truncate whitespace-normal break-words line-clamp-3 block">{m.fdDesc || ''}</span>
                  </td>
                  <td className="py-3 px-4 text-[0.85rem] sm:text-[0.9rem] md:text-[0.95rem] align-top">
                    <div className="flex flex-col gap-1 text-[12.5px] sm:text-[13px] md:text-[13.5px] leading-tight text-[var(--color-secondary)] whitespace-nowrap items-end mt-1">
                      <div className="flex justify-end gap-1.5"><span className="font-medium">Pkg:</span><span className="text-[var(--color-tertiary)] font-semibold">{m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}</span></div>
                      <div className="flex justify-end gap-1.5"><span className="font-medium">Wgt:</span><span className="text-[var(--color-primary)] font-semibold">{m.fdJmlBerat || 0} kg</span></div>
                      <div className="flex justify-end gap-1.5"><span className="font-medium">Vol:</span><span className="text-[var(--color-primary)] font-semibold">{m.fdM3 || 0} m³</span></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredManifest.map((m) => (
              <div key={m.fdListCode} className="bg-[var(--color-surface)] border border-[#E4E1DA] rounded-[8px] overflow-hidden hover:shadow-md transition-all flex flex-col">
                <div className="px-[20px] py-[16px] flex items-center justify-between bg-[var(--color-neutral)] border-b border-[#E4E1DA]">
                  <div>
                    <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-[3px]">List No.</div>
                    <div className="font-[var(--font-display)] font-semibold text-[1.1rem] sm:text-[1.15rem] md:text-[1.2rem] tracking-[-0.01em] text-[var(--color-primary)]">{m.fdListCode}</div>
                  </div>
                </div>
                <div className="px-[20px] py-[16px] flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Customer</div>
                      <div className="font-semibold text-[13px] sm:text-[14px] md:text-[15px] text-[var(--color-primary)]">{m.fdCustName || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Resi</div>
                      <div className="font-semibold text-[13px] sm:text-[14px] md:text-[15px] text-[var(--color-primary)]">{m.fdTerima || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">List Code</div>
                    <div className="font-semibold text-[13px] sm:text-[14px] md:text-[15px] text-[var(--color-primary)]">{m.fdListCode || '-'}</div>
                  </div>
                  <div>
                    <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] md:text-[0.75rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-1">Commodity</div>
                    <div className="flex flex-col gap-1.5 mb-1.5">
                      <div className="font-semibold text-[13px] sm:text-[14px] md:text-[15px] text-[var(--color-primary)]">{m.fdComodity || '-'}</div>
                      {(() => {
                        const comodityInfo = getCommodityIcon((m as any).fdComodityName || m.fdComodity);
                        const Icon = comodityInfo.Icon;
                        return (
                          <div title={comodityInfo.tooltip} className={cn("flex items-center w-fit p-1.5 rounded-md cursor-help transition-colors", comodityInfo.bg, comodityInfo.color)}>
                            <Icon size={14} />
                          </div>
                        )
                      })()}
                    </div>
                    <div className="text-[12px] sm:text-[12.5px] md:text-[13px] text-[var(--color-secondary)] mt-0.5">{m.fdDesc}</div>
                  </div>
                </div>
                <div className="mt-auto px-[20px] py-[14px] bg-[#F7F5F2] border-t border-[#E4E1DA] flex justify-between items-center text-[12.5px] sm:text-[13px] md:text-[13.5px]">
                  <div className="flex flex-col">
                    <span className="text-[var(--color-secondary)] font-medium">Packages</span>
                    <span className="font-semibold text-[var(--color-tertiary)]">{m.fdJmlPack || 0} {m.fdSatuan?.trim().toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col text-center">
                    <span className="text-[var(--color-secondary)] font-medium">Weight</span>
                    <span className="font-semibold text-[var(--color-primary)]">{m.fdJmlBerat || 0} kg</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[var(--color-secondary)] font-medium">Volume</span>
                    <span className="font-semibold text-[var(--color-primary)]">{m.fdM3 || 0} m³</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center px-4 py-3 sm:px-6 sm:py-3 bg-[var(--color-neutral)] border-t border-[#E4E1DA] text-xs sm:text-sm md:text-[0.82rem] text-[var(--color-secondary)] gap-3 sm:gap-2">
        <div className="text-center sm:text-left">Total Manifest: <b className="text-[var(--color-primary)]">{filteredManifest.length}</b></div>
        <div className="grid grid-cols-3 gap-3 sm:flex sm:gap-[24px] sm:w-auto">
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Jumlah Pack</span>
            <b className="text-[var(--color-tertiary)] whitespace-nowrap">{totalPkgs.toLocaleString()}</b>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Berat</span>
            <b className="text-[var(--color-primary)] whitespace-nowrap">{totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 })} KG</b>
          </div>
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-[var(--color-secondary)]">Volume</span>
            <b className="text-[var(--color-primary)] whitespace-nowrap">{totalVol.toLocaleString(undefined, { maximumFractionDigits: 4 })} M3</b>
          </div>
        </div>
      </div>

      <div className="flex justify-end px-4 py-3 sm:px-6 sm:py-4 bg-[var(--color-surface)]">
        <button
          onClick={onClose}
          className="border border-[var(--color-primary)] bg-[var(--color-surface)] text-[var(--color-primary)] rounded-[var(--radius-md)] px-[26px] py-[11px] font-[var(--font-body)] font-semibold text-[0.88rem] sm:text-[0.92rem] md:text-[0.96rem] hover:bg-[var(--color-primary)] hover:text-[var(--color-on-primary)] transition-colors cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  )
}

export default function ShipmentBatchesListPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [viewMode, setViewMode] = useState<'table' | 'shortlist'>('table')

  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | '1' | '2'>('ALL') // Default to ALL
  const [groupMode, setGroupMode] = useState<GroupMode>("year");

  const [selectedRow, setSelectedRow] = useState<Marking | null>(null)
  const [modalTab, setModalTab] = useState<'detail' | 'timeline'>('detail')
  const [selectedManifestRow, setSelectedManifestRow] = useState<Marking | null>(null)

  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false) // default tersembunyi di mobile, selalu tampil di desktop (lihat class sm:flex)

  const [isEtaSummaryModalOpen, setIsEtaSummaryModalOpen] = useState(false)
  const [isMissedTargetModalOpen, setIsMissedTargetModalOpen] = useState(false)
  const [isPrediksiExitModalOpen, setIsPrediksiExitModalOpen] = useState(false)
  const [isExitHistoryModalOpen, setIsExitHistoryModalOpen] = useState(false)
  
  const [isExitListModalOpen, setIsExitListModalOpen] = useState(false)
  const [exitListModalConfig, setExitListModalConfig] = useState<{title: string, description: string, data: ExitListItem[], iconColorClass: string, iconBgClass: string}>({title: '', description: '', data: [], iconColorClass: '', iconBgClass: ''})

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

  const { data: manifestDetailData } = useQuery({
    queryKey: ['markingDetail', selectedManifestRow?.fdMarkingCode],
    queryFn: async () => {
      if (!selectedManifestRow?.fdMarkingCode) return null
      const res = await markingApi.detail(selectedManifestRow.fdMarkingCode)
      return res.data as { data: Marking }
    },
    enabled: !!selectedManifestRow
  })
  const manifestBatchDetail = manifestDetailData?.data || (selectedManifestRow as Marking)

  const { data: kpiData } = useQuery({
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
          missedTargetSummary: { name: string, count: number, codes: { code: string, transit: number, target: number }[] }[],
          prediksiTerlambatCount: number,
          prediksiSegeraCount: number,
          prediksiDekatCount: number,
          prediksiExitList: PrediksiExitItem[],
          exitTodayCount: number,
          exitYesterdayCount: number,
          expectedExitTomorrowCount: number,
          exitTodayList: ExitListItem[],
          exitYesterdayList: ExitListItem[],
          expectedExitTomorrowList: PrediksiExitItem[]
        } 
      }
    }
  })

  const kpis = kpiData?.data

  const [exitCalendarMonth, setExitCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const { data: exitHistoryData, isLoading: isLoadingExitHistory } = useQuery({
    queryKey: ['markingExitHistory', exitCalendarMonth.getFullYear(), exitCalendarMonth.getMonth(), listTypeFilter, debouncedSearch],
    queryFn: async () => {
      const monthKey = `${exitCalendarMonth.getFullYear()}-${String(exitCalendarMonth.getMonth() + 1).padStart(2, '0')}`
      const res = await markingApi.getExitHistory({ month: monthKey, listType: listTypeFilter, search: debouncedSearch })
      return res.data as { data: Record<string, ExitHistoryDay> }
    }
  })

  const exitHistoryMap = exitHistoryData?.data || {}

  return (
    <div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      {/* Header Container */}
      <div className="flex flex-shrink-0 flex-col">
        <h1 className="font-[var(--font-display)] font-medium text-[26px] sm:text-[32px] lg:text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Shipment Batches</h1>
        <p className="text-[13.5px] sm:text-[15.2px] text-[var(--color-secondary)] m-0 mb-4 sm:mb-8">
          Kelola marking dan batch pengiriman Anda.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-0 min-w-0 overflow-hidden">
        {/* Floating Search & Manifest Bar */}
        <div className="sticky top-0 z-20 flex items-center gap-2.5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[#E4E1DA] shadow-sm p-3 sm:p-4 mb-4 flex-shrink-0">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 sm:left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari marking code, BL/AWB..."
              className="w-full pl-9 sm:pl-[42px] pr-[14px] py-2.5 sm:py-[10px] rounded-[var(--radius-md)] border border-[#E4E1DA] text-[14px] sm:text-[14.5px] md:text-[15px] text-[var(--color-primary)] font-[var(--font-body)] outline-none focus:border-[var(--color-secondary)] transition-colors bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setInputCode('');
              setIsCodeModalOpen(true);
            }}
            className="px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)] hover:text-[var(--color-tertiary)] text-[var(--color-primary)] text-[13px] sm:text-[13.6px] font-semibold rounded-[var(--radius-md)] border border-[#E4E1DA] transition-colors whitespace-nowrap shrink-0"
          >
            Cari Manifest
          </button>
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
              Filter &amp; Grup
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
            {/* Left: Sea/Air Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setListTypeFilter('ALL') }}
                className={cn(
                  "px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0",
                  listTypeFilter === 'ALL'
                    ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                )}
              >
                <LayoutGrid size={15} /> Semua
              </button>
              <button
                onClick={() => { setListTypeFilter('1') }}
                className={cn(
                  "px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0",
                  listTypeFilter === '1'
                    ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                )}
              >
                <Plane size={15} /> Udara
              </button>
              <button
                onClick={() => { setListTypeFilter('2') }}
                className={cn(
                  "px-[14px] sm:px-[18px] py-[9px] sm:py-[10px] rounded-[var(--radius-md)] border text-[13px] sm:text-[13.6px] font-medium cursor-pointer flex items-center gap-2 transition-colors shrink-0",
                  listTypeFilter === '2'
                    ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface)] border-[#E4E1DA] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                )}
              >
                <Ship size={15} /> Laut
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

          <div className="mt-4 pt-4 border-t border-[#E4E1DA] flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <span className="font-[var(--font-label)] text-[11px] sm:text-[11.5px] md:text-xs tracking-[0.08em] uppercase text-[var(--color-secondary)] w-[70px] shrink-0 flex items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5" /> Grup
            </span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto">
              {([
                { key: "none", label: "Tanpa Grup" },
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
                    "px-[14px] py-2 rounded-[16px] border text-[13px] sm:text-[14px] md:text-[15px] transition-colors duration-150 shrink-0",
                    groupMode === opt.key
                      ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>

      {/* Grouped Table Container */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="space-y-4">
          <StatusBlock viewMode={viewMode}
            status="open"
            isClosed="false"
            search={debouncedSearch}
            groupMode={groupMode}
            defaultOpen={true}
            onView={setSelectedRow}
            onViewManifest={setSelectedManifestRow}
            listTypeFilter={listTypeFilter}
            totalCountOverride={kpis?.activeBatches}
          />
          <StatusBlock viewMode={viewMode}
            status="closed"
            isClosed="true"
            search={debouncedSearch}
            groupMode={groupMode}
            defaultOpen={false}
            onView={setSelectedRow}
            onViewManifest={setSelectedManifestRow}
            listTypeFilter={listTypeFilter}
            totalCountOverride={
              kpis ? Math.max(0, (kpis.totalBatches || 0) - (kpis.activeBatches || 0)) : undefined
            }
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
              <h2 className="text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">Cari Manifest</h2>
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="p-1 hover:bg-[var(--color-neutral)] rounded-md transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <label htmlFor="markingCodeInput" className="block text-sm sm:text-[14.5px] md:text-[15px] font-medium text-[var(--color-primary)] mb-2">
                Marking Code
              </label>
              <input
                id="markingCodeInput"
                type="text"
                autoFocus
                className="w-full px-4 py-2 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-primary)] text-[var(--color-primary)] placeholder-[var(--color-secondary)]/50 uppercase"
                placeholder="Masukkan marking code..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputCode.trim()) {
                    setSelectedManifestRow({ fdMarkingCode: inputCode.trim() } as any);
                    setIsCodeModalOpen(false);
                  }
                }}
              />
            </div>
            <div className="px-6 py-4 bg-[var(--color-neutral)] border-t border-[var(--color-border)] rounded-b-[var(--radius-xl)] flex justify-end gap-2">
              <button
                onClick={() => setIsCodeModalOpen(false)}
                className="px-4 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] text-sm sm:text-[14.5px] md:text-[15px] font-bold rounded-[var(--radius-md)] border border-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!inputCode.trim()}
                onClick={() => {
                  if (inputCode.trim()) {
                    setSelectedManifestRow({ fdMarkingCode: inputCode.trim() } as any);
                    setIsCodeModalOpen(false);
                  }
                }}
                className="px-4 py-2 bg-[var(--color-primary)] hover:opacity-90 text-white text-sm sm:text-[14.5px] md:text-[15px] font-bold rounded-[var(--radius-md)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Predicted Exit Modal */}
      <PredictedExitModal
        isOpen={isPrediksiExitModalOpen}
        onClose={() => setIsPrediksiExitModalOpen(false)}
        data={kpis?.prediksiExitList || []}
      />

      {/* Exit List Modal */}
      <ExitListModal
        isOpen={isExitListModalOpen}
        onClose={() => setIsExitListModalOpen(false)}
        data={exitListModalConfig.data}
        title={exitListModalConfig.title}
        description={exitListModalConfig.description}
        iconColorClass={exitListModalConfig.iconColorClass}
        iconBgClass={exitListModalConfig.iconBgClass}
      />

      {/* Exit History Modal — calendar view, day click drills into Exit List Modal */}
      <ExitHistoryModal
        isOpen={isExitHistoryModalOpen}
        onClose={() => setIsExitHistoryModalOpen(false)}
        month={exitCalendarMonth}
        onMonthChange={setExitCalendarMonth}
        historyMap={exitHistoryMap}
        isLoading={isLoadingExitHistory}
        onSelectDay={(dayKey, items) => {
          setExitListModalConfig({
            title: `Exit ${formatDate(dayKey)}`,
            description: `Batch yang keluar gudang pada ${formatDate(dayKey)}`,
            data: items,
            iconColorClass: 'text-indigo-500',
            iconBgClass: 'bg-indigo-50/10'
          })
          setIsExitListModalOpen(true)
        }}
      />

      {/* Detail Modal — mobile-first bottom sheet, dialog on desktop */}
      {selectedRow && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
            <div
              className="w-full sm:max-w-2xl bg-white shadow-2xl rounded-t-[28px] sm:rounded-2xl flex flex-col overflow-hidden pointer-events-auto h-[94vh] sm:h-auto sm:max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header Panel */}
            <div className="flex-shrink-0 px-5 sm:px-8 pt-5 sm:pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] border border-slate-100">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold font-[var(--font-display)] text-[var(--color-primary)] leading-none">{selectedRow.fdMarkingCode}</h2>
                    <span className="rounded-full bg-[#F7F5F2] border border-slate-100 px-2 py-0.5 text-[11px] sm:text-[11.5px] md:text-xs font-[var(--font-label)] font-medium text-[var(--color-secondary)]">
                      {listTypeFilter === '1' ? 'AIR' : 'SEA'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] md:text-[14px] text-[var(--color-secondary)] mt-1 font-[var(--font-body)]">{listTypeFilter === '1' ? 'Air freight batch' : 'Sea freight batch'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedRow(null);
                  setModalTab('detail');
                }}
                className="p-2 hover:bg-[#F7F5F2] rounded-full transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex px-5 sm:px-8 border-b border-slate-100 bg-white sticky top-[79px] z-10 text-sm sm:text-[14.5px] md:text-[15px] shrink-0">
              <button 
                className={cn("px-4 py-3 font-semibold border-b-2 transition-colors", modalTab === 'detail' ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]")}
                onClick={() => setModalTab('detail')}
              >
                Info Detail
              </button>
              <button 
                className={cn("px-4 py-3 font-semibold border-b-2 transition-colors", modalTab === 'timeline' ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]")}
                onClick={() => setModalTab('timeline')}
              >
                Timeline & Performance
              </button>
            </div>

            {/* Content Panel */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
              {isLoadingDetail ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
                </div>
              ) : selectedMarking ? (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  {modalTab === 'detail' && (
                    <>
                      {/* Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                          <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Consignee</p>
                          <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">{selectedMarking.fdConsignee || '-'}</p>
                        </div>
                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                          <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Region</p>
                          <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold", selectedMarking.fdWilayah ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                            {selectedMarking.fdWilayah || 'Not recorded'}
                          </p>
                        </div>
                        <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                          <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">{listTypeFilter === '1' ? 'AWB No.' : 'BL No.'}</p>
                          <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold break-all", (listTypeFilter === '1' ? selectedMarking.fdAWB : selectedMarking.fdBLNo) ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                            {listTypeFilter === '1' ? (selectedMarking.fdAWB || 'Not recorded') : (selectedMarking.fdBLNo || 'Not recorded')}
                          </p>
                        </div>
                        {listTypeFilter === '2' && (
                          <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Container</p>
                            <p className={cn("mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold", selectedMarking.fdContNo ? "text-[var(--color-primary)]" : "text-[var(--color-muted)]")}>
                              {selectedMarking.fdContNo ? `${selectedMarking.fdContNo} ${selectedMarking.fdContSize ? `(${selectedMarking.fdContSize})` : ''}` : '—'}
                            </p>
                          </div>
                        )}
                        {selectedMarking.fdGudang && selectedMarking.fdGudang.trim() !== '' && (
                          <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Gudang</p>
                            <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">
                              {selectedMarking.fdGudang}
                            </p>
                          </div>
                        )}
                        {selectedMarking.fdKet && selectedMarking.fdKet.trim() !== '' && (
                          <div className="col-span-1 sm:col-span-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Keterangan</p>
                            <p className="mt-1 text-sm sm:text-[14.5px] md:text-[15px] font-semibold text-[var(--color-primary)]">
                              {selectedMarking.fdKet}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Volume & Weight */}
                      <div className={cn("grid grid-cols-1 gap-3", listTypeFilter === '2' ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                          <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Packages</p>
                          <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-tertiary)]">
                            {selectedMarking.fdJmlPack != null ? Number(selectedMarking.fdJmlPack).toLocaleString('en-US') : 0}
                          </p>
                        </div>
                        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                          <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Weight</p>
                          <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-tertiary)]">
                            {selectedMarking.fdJmlBerat != null ? Number(selectedMarking.fdJmlBerat).toLocaleString('en-US') : 0}
                            <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">kg</span>
                          </p>
                        </div>
                        {listTypeFilter === '2' && (
                          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Volume</p>
                            <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-primary)]">
                              {selectedMarking.fdM3 != null ? Number(selectedMarking.fdM3).toLocaleString('en-US') : 0}
                              <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">m³</span>
                            </p>
                          </div>
                        )}
                        {listTypeFilter === '1' && (
                          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center shadow-sm">
                            <p className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Branded</p>
                            <p className="mt-1 text-lg sm:text-[1.15rem] md:text-[1.2rem] font-bold text-[var(--color-primary)]">
                              {selectedMarking.fdBranded || 0}
                              <span className="ml-1 text-xs sm:text-[13px] md:text-[14px] font-medium text-[var(--color-secondary)]">kg</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-[11px] md:text-xs text-[var(--color-secondary)] gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                        {selectedMarking.fdSysDate && (
                          <div>
                            <span className="font-medium">Created:</span> {new Date(selectedMarking.fdSysDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {selectedMarking.fdCreated ? ` by ${selectedMarking.fdCreated.trim()}` : ''}
                          </div>
                        )}
                        {selectedMarking.fdUpdate && (
                          <div>
                            <span className="font-medium">Last Update:</span> {new Date(selectedMarking.fdUpdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {selectedMarking.fdUpdateBy ? ` by ${selectedMarking.fdUpdateBy.trim()}` : ''}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Timeline & Performance Tab */}
                  {modalTab === 'timeline' && (
                    <div className="space-y-6">
                      {/* Timeline section */}
                  {(() => {
                    const formatDate = (val: string | undefined | null) => {
                      if (!val) return null;
                      const d = new Date(val);
                      if (isNaN(d.getTime())) return null;
                      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    }
                    const stages: { key: string; label: string; date: string | null | undefined; status: string; icon: typeof Truck }[] = [
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
                        key: "exit",
                        label: "Exit date",
                        date: selectedMarking.fdExitDate,
                        status: selectedMarking.fdExitDate ? "completed" : "pending",
                        icon: LogOut,
                      },
                    ]

                    if (selectedMarking.fdStatus === 4) {
                      stages.push({
                        key: "reexport",
                        label: "Re-export",
                        date: null,
                        status: "completed",
                        icon: RotateCcw,
                      })
                    }

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
                        <h3 className="mb-4 text-xs sm:text-[13px] md:text-[14px] font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                          <Activity size={14} />
                          Timeline
                        </h3>
                        <div className="relative">
                          <div className="absolute left-0 right-0 top-5 h-px bg-[var(--color-border-strong)] opacity-50 hidden sm:block" />
                          <div className="absolute top-0 bottom-0 left-[19px] w-px bg-[var(--color-border-strong)] opacity-50 sm:hidden" />
                          <div className={cn("relative grid grid-cols-1 gap-6 sm:gap-2", stages.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
                            {stages.map((stage) => {
                              const s = getStatusStyles(stage.status);
                              const Icon = stage.icon;
                              return (
                                <div key={stage.key} className="flex sm:flex-col items-start sm:items-center text-left sm:text-center relative">
                                  <div className={cn("z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] ring-2 border border-[var(--color-border)] shadow-sm", s.ring)}>
                                    <Icon className={cn("h-4 w-4", s.text)} />
                                  </div>
                                  <div className="ml-4 sm:ml-0 mt-0 sm:mt-3 flex flex-col sm:items-center">
                                    <p className="text-[10px] sm:text-[11px] md:text-xs uppercase font-[var(--font-label)] text-[var(--color-secondary)] font-medium">{stage.label}</p>
                                    <p className="text-[11px] sm:text-[11.5px] md:text-xs font-semibold text-[var(--color-primary)] mt-0.5 min-h-[16px]">
                                      {!stage.date ? "—" : (stage.key === "etd_eta" ? stage.date : formatDate(stage.date))}
                                    </p>
                                    <span className={cn("mt-1 sm:mt-1.5 rounded-full px-2 py-0.5 text-[9px] sm:text-[9.5px] md:text-[10px] uppercase font-bold tracking-wider w-fit", s.badgeBg, s.badgeText)}>
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
                          <h3 className="mb-4 text-xs sm:text-[13px] md:text-[14px] font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)] flex items-center gap-2">
                            <Clock size={14} />
                            Performance
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {/* KpiCard 1 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Lead time loading</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {leadTimeLoading === null ? "—" : leadTimeLoading}
                                </span>
                                {leadTimeLoading !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">Load date → ETD</p>
                            </div>

                            {/* KpiCard 2 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Transit time</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {transitTime === null ? "—" : transitTime}
                                </span>
                                {transitTime !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">ETD → ETA</p>
                            </div>

                            {/* KpiCard 3 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Warehouse delay</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)] text-[var(--color-primary)]">
                                  {warehouseDelay === null ? "—" : warehouseDelay}
                                </span>
                                {warehouseDelay !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">ETA → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                              {warehouseDelay !== null && (
                                <p className={cn("mt-2 text-[11px] sm:text-[11.5px] md:text-xs font-bold", isDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
                                  {isDelayed ? `${warehouseDelay}d over ETA` : (exitDate ? "Within ETA" : "On track (ongoing)")}
                                </p>
                              )}
                            </div>

                            {/* KpiCard 4 */}
                            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
                              <p className="text-[10px] sm:text-[11px] md:text-xs font-bold uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">Total shipment cycle</p>
                              <div className="mt-2 flex items-baseline gap-1">
                                <span className={cn("text-2xl sm:text-[1.6rem] md:text-[1.7rem] font-bold font-[var(--font-display)]", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-primary)]")}>
                                  {totalCycle === null ? "—" : totalCycle}
                                </span>
                                {totalCycle !== null && <span className="text-[10px] sm:text-[11px] md:text-xs uppercase font-bold text-[var(--color-secondary)]">days</span>}
                              </div>
                              <p className="mt-1 text-[10px] sm:text-[11px] md:text-xs font-medium text-[var(--color-secondary)]">Load date → {exitDate ? 'Exit date' : 'Today (ongoing)'}</p>
                              {cycleTarget && (
                                <p className={cn("mt-2 text-[11px] sm:text-[11.5px] md:text-xs font-bold", isCycleDelayed ? "text-[var(--color-warning)]" : "text-[var(--color-success)]")}>
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
                              <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">Warehouse entry compliance</p>
                              <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                {enterGudang ? "Enter gudang date is recorded for this batch." : "Enter gudang date is not recorded for this batch."}
                              </p>
                            </div>
                          </div>

                          {/* Issue 2 */}
                          <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isMissingETA ? "border-[var(--color-border-strong)] bg-[var(--color-neutral)]" : (isDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5"))}>
                            {isMissingETA ? <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-secondary)]" /> : (isDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />)}
                            <div className="min-w-0">
                              <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">ETA achievement</p>
                              <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                {isMissingETA ? "ETA is missing." : (isDelayed ? (exitDate ? `Exit date is ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} after ETA.` : `Currently ${warehouseDelay} day${warehouseDelay! > 1 ? "s" : ""} over ETA (ongoing).`) : (exitDate ? "Exit date is on or before ETA." : "Currently on track before ETA (ongoing)."))}
                              </p>
                            </div>
                          </div>

                          {/* Issue 3: Cycle Target */}
                          {cycleTarget && (
                            <div className={cn("flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 shadow-sm", isCycleDelayed ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-success)]/30 bg-[var(--color-success)]/5")}>
                              {isCycleDelayed ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />}
                              <div className="min-w-0">
                                <p className="text-sm sm:text-[14.5px] md:text-[15px] font-bold text-[var(--color-primary)]">Cycle achievement</p>
                                <p className="mt-1 text-[11px] sm:text-[11.5px] md:text-xs font-medium text-[var(--color-secondary)]">
                                  {isCycleDelayed ? `Total shipment cycle is ${totalCycle! - cycleTarget.max} day(s) over target (${cycleTarget.label}).` : `Total shipment cycle is within target (${cycleTarget.label}).`}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-start gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 text-xs sm:text-[13px] md:text-[14px] text-[var(--color-secondary)] font-medium shadow-sm">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
                          <p>All duration calculations are based on calendar days.</p>
                        </div>
                      </>
                    )
                  })()}
                  </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer Action */}
            <div className="shrink-0 flex items-center gap-2.5 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] sm:pb-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedManifestRow(selectedRow); // Buka manifest modal
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-slate-50 text-[var(--color-primary)] border border-slate-200 text-[13.5px] sm:text-[14px] md:text-[15px] font-semibold active:opacity-80 transition-opacity"
              >
                <ClipboardList className="h-4 w-4" />
                Manifest
              </button>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white text-[13.5px] sm:text-[14px] md:text-[15px] font-semibold active:opacity-80 transition-opacity"
              >
                Tutup
              </button>
            </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Manifest Modal */}
      {selectedManifestRow && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
          onClick={() => setSelectedManifestRow(null)}
        >
          <div
            className="relative w-full max-w-[1000px] m-auto bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Panel */}
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E4E1DA] bg-[var(--color-surface)] sticky top-0 z-10">
              <div className="flex items-center gap-[14px]">
                <div className="w-[38px] h-[38px] rounded-[var(--radius-md)] border border-[#E4E1DA] bg-[var(--color-neutral)] flex items-center justify-center text-[1.1rem] sm:text-[1.15rem] md:text-[1.2rem] text-[var(--color-tertiary)]">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-[var(--font-display)] font-semibold text-[1.1rem] sm:text-[1.2rem] md:text-[1.3rem] tracking-[-0.01em] leading-tight text-[var(--color-primary)]">
                    {selectedManifestRow.fdMarkingCode}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mt-[2px] leading-tight">
                      Batch Manifest List
                    </div>
                    {manifestBatchDetail?.fdListType === 2 && manifestBatchDetail?.fdContNo && (
                      <>
                        <span className="text-[var(--color-border)] text-xs sm:text-[13px] md:text-[14px] mt-[2px]">•</span>
                        <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-tertiary)] mt-[2px] leading-tight font-bold bg-[var(--color-tertiary)]/10 px-1.5 py-0.5 rounded-md">
                          CONT: {manifestBatchDetail.fdContNo} {manifestBatchDetail.fdContSize ? `(${manifestBatchDetail.fdContSize.trim()})` : ''}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedManifestRow(null)}
                className="text-[1.2rem] sm:text-[1.25rem] md:text-[1.3rem] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <ManifestList markingCode={selectedManifestRow.fdMarkingCode} onClose={() => setSelectedManifestRow(null)} />
          </div>
        </div>,
        document.body
      )}
    </div>
    </div>
  )
}
