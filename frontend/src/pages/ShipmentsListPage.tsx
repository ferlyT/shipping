import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { shipmentsApi } from '@/api/endpoints'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Table } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { X, Eye, ChevronDown, ChevronRight, Rows3, Search, Loader2, LayoutGrid, Plane, Ship, Check, Package, PackageX, Book, Shirt, Settings, Cpu, Coffee, Pill as PillIcon, Car, List, Copy, Calendar, Truck, CheckCircle2, Circle, Scale, Ruler, MapPin } from 'lucide-react'
import { cn, formatDate, formatNumber } from '@/lib/utils'

interface ShipmentDimension {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
}

interface ShipmentStatus {
  fdLoadDate: string | null
  fdETD: string | null
  fdETA: string | null
  fdExitDate: string | null
  fdTerimaDate: string | null
  fdGudang: string | null
  statusLabel: string
  statusStep: number // 0=menunggu loading .. 4=keluar gudang, 5=dalam pengiriman, 6=terkirim
}

interface Shipment {
  fdListCode: string
  fdCustName: string | null
  fdTerima: string | null
  fdTglAgent: string | null
  fdMarkingCode: string | null
  fdMarkingNo?: string | null
  fdDesc: string | null
  fdComodity: string | null
  fdComodityName?: string | null
  fdBranchCode?: string | null
  fdJmlPack: number | null
  fdSatuan: string | null
  fdJmlBerat: number | null
  fdM3: number | null
  fdLocalTrackingNo?: string | null
  shipmentStatus?: ShipmentStatus
}

// Konfigurasi tampilan badge status kirim berdasarkan statusStep dari tbMarking + tbDelivery
const STATUS_STYLES: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  0: { label: 'Waiting', bg: 'bg-[#F1F3F5]', text: 'text-[#495057]', dot: 'bg-[#495057]' },
  1: { label: 'Loading', bg: 'bg-[#E7F5FF]', text: 'text-[#1971C2]', dot: 'bg-[#1971C2]' },
  2: { label: 'ETD', bg: 'bg-[#F3F0FF]', text: 'text-[#6741D9]', dot: 'bg-[#6741D9]' },
  3: { label: 'ETA', bg: 'bg-[#FFF3BF]', text: 'text-[#E67700]', dot: 'bg-[#E67700]' },
  4: { label: 'Warehouse', bg: 'bg-[#EBFBEE]', text: 'text-[#2B8A3E]', dot: 'bg-[#2B8A3E]' },
  5: { label: 'Delivery', bg: 'bg-[#E3FAFC]', text: 'text-[#0B7285]', dot: 'bg-[#0B7285]' },
  6: { label: 'Delivered', bg: 'bg-[#F3E4E0]', text: 'text-[var(--color-tertiary)]', dot: 'bg-[var(--color-tertiary)]' },
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

// Urutan tampilan grup: dari yang paling awal proses ke paling akhir
const STATUS_ORDER = [0, 1, 2, 3, 4, 5, 6]

// Mengelompokkan data per statusStep, mempertahankan urutan STATUS_ORDER (Waiting -> Delivered)
function groupByStatus(rows: Shipment[]) {
  const buckets = new Map<number, Shipment[]>()
  for (const row of rows) {
    const step = row.shipmentStatus?.statusStep ?? 0
    if (!buckets.has(step)) buckets.set(step, [])
    buckets.get(step)!.push(row)
  }
  return STATUS_ORDER
    .filter((step) => buckets.has(step))
    .map((step) => ({ step, label: STATUS_STYLES[step].label, items: buckets.get(step)! }))
}

function StatusBadge({ status }: { status?: ShipmentStatus }) {
  const step = status?.statusStep ?? 0
  const style = STATUS_STYLES[step] || STATUS_STYLES[0]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap',
      style.bg, style.text
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)}></span>
      {status?.statusLabel || style.label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] w-[70px] shrink-0 mt-1.5">
      {children}
    </span>
  )
}

function Pill({ active, onClick, children, title, className = "" }: { active: boolean, onClick: () => void, children: React.ReactNode, title?: string, className?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "px-[14px] py-2 rounded-[16px] border text-[13px] transition-colors duration-150 shrink-0",
        active
          ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
          : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]",
        className
      )}
    >
      {children}
    </button>
  )
}

function BranchPicker({ selected, onChange, branches, isLoading }: { selected: string, onChange: (b: string) => void, branches: string[], isLoading: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = branches.filter((b) => b.toLowerCase().includes(query.toLowerCase()))
  const isAll = selected === 'ALL'
  const toggle = (b: string) => {
    onChange(b)
    setOpen(false)
  }
  const triggerLabel = isAll ? "Semua Cabang" : selected

  const PINNED_BRANCHES = branches.slice(0, 3)

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill active={isAll} onClick={() => onChange('ALL')}>Semua</Pill>
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        {!isLoading && PINNED_BRANCHES.map((b) => (
          <Pill key={b} active={selected === b} onClick={() => toggle(b)} title={b}>
            {b.replace("Cabang ", "")}
          </Pill>
        ))}
        {!isLoading && branches.length > 3 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex items-center gap-1.5 px-[14px] py-2 rounded-[16px] border text-[13px] transition-colors duration-150 shrink-0",
              !isAll && !PINNED_BRANCHES.includes(selected)
                ? "bg-[var(--color-tertiary)] border-[var(--color-tertiary)] text-[var(--color-on-primary)]"
                : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)]"
            )}
          >
            {triggerLabel}
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-2 w-[min(16rem,calc(100vw-2.5rem))] bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-900/5 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <Search size={14} className="text-slate-400" />
              <input
                autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari cabang..."
                className="bg-transparent outline-none text-[13px] w-full text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-3 text-[13px] text-slate-400">Tidak ditemukan</div>}
            {filtered.map((b) => {
              const active = selected === b
              return (
                <button
                  key={b} type="button" onClick={() => toggle(b)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 text-left"
                >
                  {b}{active && <Check size={14} className="text-blue-600" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShipmentsListPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 1000)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'compact' : 'table'
    }
    return 'table'
  })

  const { page, limit, setLimit, goToPage, reset } = usePagination(20)
  const [jumpPage, setJumpPage] = useState('')

  const [selectedRow, setSelectedRow] = useState<Shipment | null>(null)
  const [infoOpen, setInfoOpen] = useState(true)
  const [dimsOpen, setDimsOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [listTypeFilter, setListTypeFilter] = useState<'ALL' | '1' | '2'>('ALL')
  const [statusFilter, setStatusFilter] = useState<number | 'ALL'>('ALL')
  const [branchFilter, setBranchFilter] = useState<string | 'ALL'>('ALL')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const { data: shipmentsData, isLoading, isFetching } = useQuery({
    queryKey: ['shipments', page, limit, debouncedSearch, listTypeFilter, branchFilter, statusFilter],
    queryFn: async () => {
      const res = await shipmentsApi.getList({
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(listTypeFilter !== 'ALL' && { listType: listTypeFilter }),
        ...(branchFilter !== 'ALL' && { branch: branchFilter }),
        ...(statusFilter !== 'ALL' && { status: statusFilter }),
      })
      return res
    },
    placeholderData: keepPreviousData
  })

  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['shipmentDetail', selectedRow?.fdListCode],
    queryFn: async () => {
      if (!selectedRow) return null
      const res = await shipmentsApi.getById(selectedRow.fdListCode)
      return { data: res }
    },
    enabled: !!selectedRow
  })

  const { data: dimensionsData, isLoading: isLoadingDimensions } = useQuery({
    queryKey: ['shipmentDimensions', selectedRow?.fdListCode],
    queryFn: async () => {
      if (!selectedRow) return []
      const res = await shipmentsApi.getDimensions(selectedRow.fdListCode)
      return res || []
    },
    enabled: !!selectedRow
  })

  const dataList = shipmentsData?.data || []
  const total = shipmentsData?.meta?.total || 0
  const selectedShipment = detailData?.data || selectedRow
  const dimensions = dimensionsData || []

  // Total volume (m3) dihitung dari dimensi yang ada: (P x L x T x Qty) / 1.000.000, satuan cm -> m3
  const totalDimensiM3 = dimensions.reduce((sum, dim) => {
    const p = Number(dim.fdPjg || 0)
    const l = Number(dim.fdLbr || 0)
    const t = Number(dim.fdTng || 0)
    const qty = Number(dim.fdQty || 0)
    return sum + (p * l * t * qty) / 1_000_000
  }, 0)

  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['shipments', 'branches'],
    queryFn: async () => {
      return await shipmentsApi.getBranches()
    }
  })

  const uniqueBranches = branchesData || []

  // Karena filter kini dilakukan via database, dataList adalah hasil yang sudah terfilter.
  const filteredData = dataList

  useEffect(() => {
    reset()
  }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setInfoOpen(true)
    setDimsOpen(false)
    setTimelineOpen(false)
    setCopiedField(null)
  }, [selectedRow?.fdListCode])

  const copyToClipboard = (value: string | null | undefined, field: string) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  const columns = [
    { key: 'fdCustName', header: 'Customer', fixed: true, render: (row: Shipment) => <span className="font-semibold text-[var(--color-primary)]">{row.fdCustName || '—'}</span> },
    {
      key: 'receiverTrackingMarking',
      header: 'Marking / Receiver',
      className: 'min-w-[200px]',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-col gap-0.5">
            {row.fdMarkingCode && (
              <span className="font-semibold text-[var(--color-primary)] uppercase leading-tight">
                {row.fdMarkingCode}
              </span>
            )}
            {row.fdMarkingNo && (
              <span className="text-[13px] font-semibold text-[var(--color-primary)] uppercase leading-tight">
                {row.fdMarkingNo}
              </span>
            )}
            {!row.fdMarkingCode && !row.fdMarkingNo && (
              <span className="font-medium text-slate-400 leading-tight">-</span>
            )}
          </div>
          {row.fdTerima && (
            <span className="text-[13px] text-[var(--color-secondary)] font-medium mt-1 leading-snug">
              {row.fdTerima}
            </span>
          )}
          {row.fdLocalTrackingNo && (
            <span className="text-[13px] text-[var(--color-tertiary)] font-medium leading-snug">
              {row.fdLocalTrackingNo}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'fdComodity',
      header: 'Commodity',
      className: 'w-[25%] min-w-[250px]',
      render: (row: Shipment) => {
        // Hanya gunakan fdComodityName untuk penentuan icon dan tooltip
        const comodityInfo = getCommodityIcon(row.fdComodityName);
        const Icon = comodityInfo.Icon;

        return (
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-[var(--color-primary)] leading-[1.4]">
              {row.fdComodity || '-'}
            </span>
            <div title={comodityInfo.tooltip} className={cn("flex items-center w-fit p-1.5 rounded-md cursor-help transition-colors", comodityInfo.bg, comodityInfo.color)}>
              <Icon size={14} />
            </div>
          </div>
        )
      }
    },
    { key: 'fdDesc', header: 'Description', className: 'text-[var(--color-secondary)] min-w-[150px] max-w-[200px] truncate' },
    {
      key: 'fisik',
      header: 'Summary',
      className: 'w-[130px] text-right',
      render: (row: Shipment) => (
        <div className="flex flex-col gap-1 text-[12.5px] leading-tight text-[var(--color-secondary)] whitespace-nowrap items-end mt-1">
          <div className="flex justify-end gap-1.5"><span className="font-medium">Pkg:</span><span className="text-[var(--color-tertiary)] font-semibold">{Number(row.fdJmlPack || 0).toLocaleString('id-ID')} {row.fdSatuan?.trim().toUpperCase()}</span></div>
          <div className="flex justify-end gap-1.5"><span className="font-medium">Wgt:</span><span className="text-[var(--color-primary)] font-semibold">{Number(row.fdJmlBerat || 0).toLocaleString('id-ID')} kg</span></div>
          <div className="flex justify-end gap-1.5"><span className="font-medium">Vol:</span><span className="text-[var(--color-primary)] font-semibold">{Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} m³</span></div>
        </div>
      )
    },
    {
      key: 'shipmentStatus',
      header: 'Status',
      className: 'w-[150px] text-right',
      render: (row: Shipment) => (
        <div className="flex justify-end">
          <StatusBadge status={row.shipmentStatus} />
        </div>
      )
    },
    {
      key: 'aksi',
      header: '',
      className: 'w-[64px] text-right',
      render: (row: Shipment) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedRow(row)
          }}
          className="inline-flex items-center justify-center p-2 text-[var(--color-secondary)] hover:bg-[#F7F5F2] rounded-lg transition-all duration-200"
        >
          <Eye className="w-[18px] h-[18px]" />
        </button>
      )
    },
  ]

  const dimColumns = [
    { key: 'fdPjg', header: 'L (cm)', className: 'py-4', render: (row: ShipmentDimension) => formatNumber(row.fdPjg) },
    { key: 'fdLbr', header: 'W (cm)', className: 'py-4', render: (row: ShipmentDimension) => formatNumber(row.fdLbr) },
    { key: 'fdTng', header: 'H (cm)', className: 'py-4', render: (row: ShipmentDimension) => formatNumber(row.fdTng) },
    { key: 'fdQty', header: 'Qty', className: 'py-4 font-medium', render: (row: ShipmentDimension) => formatNumber(row.fdQty) },
    { key: 'fdDescr', header: 'Description', className: 'py-4' },
  ]



  return (
    <div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      {/* Header Container */}
      <div className="flex flex-shrink-0 flex-col">
        <h1 className="font-[var(--font-display)] font-medium text-[26px] sm:text-[32px] lg:text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Daftar Resi</h1>
        <p className="text-[13.5px] sm:text-[15.2px] text-[var(--color-secondary)] m-0 mb-4 sm:mb-8">
          Manage shipment list and tracking information.
        </p>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-0 min-w-0 overflow-hidden">
        {/* Filter Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[#E4E1DA] p-4 sm:p-6 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-5">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setListTypeFilter('ALL'); goToPage(1) }}
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
                onClick={() => { setListTypeFilter('1'); goToPage(1) }}
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
                onClick={() => { setListTypeFilter('2'); goToPage(1) }}
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

            {(listTypeFilter !== 'ALL' || statusFilter !== 'ALL' || branchFilter !== 'ALL') && (
              <button
                onClick={() => { setListTypeFilter('ALL'); setStatusFilter('ALL'); setBranchFilter('ALL'); goToPage(1) }}
                className="text-[12px] font-medium text-[var(--color-secondary)] hover:text-[var(--color-tertiary)] flex items-center gap-1 self-start sm:self-auto"
              >
                <X size={13} /> Hapus semua filter
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen((o) => !o)}
            className="sm:hidden w-full flex items-center justify-between py-1 mb-3 border-t border-[#E4E1DA] pt-3"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-primary)]">
              Filter Status &amp; Cabang
              {(statusFilter !== 'ALL' || branchFilter !== 'ALL') && (
                <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[var(--color-tertiary)] text-[var(--color-on-primary)] text-[10.5px] font-semibold">
                  {(statusFilter !== 'ALL' ? 1 : 0) + (branchFilter !== 'ALL' ? 1 : 0)}
                </span>
              )}
            </span>
            <ChevronDown size={16} className={cn("text-[var(--color-secondary)] transition-transform", mobileFiltersOpen && "rotate-180")} />
          </button>

          <div className={cn(mobileFiltersOpen ? "flex" : "hidden", "sm:flex flex-col")}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 mb-3">
              <SectionLabel>Status</SectionLabel>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <Pill active={statusFilter === 'ALL'} onClick={() => { setStatusFilter('ALL'); goToPage(1) }}>Semua</Pill>
                {STATUS_ORDER.map((step) => (
                  <Pill key={step} active={statusFilter === step} onClick={() => { setStatusFilter(step); goToPage(1) }}>
                    {STATUS_STYLES[step].label}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 mb-1 sm:mb-3.5">
              <SectionLabel>Cabang</SectionLabel>
              <BranchPicker selected={branchFilter} onChange={(b) => { setBranchFilter(b); goToPage(1) }} branches={uniqueBranches} isLoading={branchesLoading} />
            </div>
          </div>

          {(listTypeFilter !== 'ALL' || statusFilter !== 'ALL' || branchFilter !== 'ALL') && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 sm:pt-3.5 mt-3 sm:mt-1 border-t border-[#E4E1DA]">
              <span className="font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)] mr-1">Filter aktif:</span>
              {[
                listTypeFilter !== 'ALL' && (listTypeFilter === '1' ? 'Udara' : 'Laut'),
                statusFilter !== 'ALL' && STATUS_STYLES[statusFilter as number]?.label,
                branchFilter !== 'ALL' && branchFilter
              ].filter(Boolean).map((f) => (
                <span key={String(f)} className="bg-[#F3E4E0] text-[var(--color-tertiary)] text-[12.5px] px-2.5 py-1 rounded-[var(--radius-sm)] font-semibold">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Wrapper for Toolbar & Table */}
        <div className="sticky top-4 lg:top-8 z-10 flex flex-col h-[calc(100vh-var(--topbar-height)-32px)] lg:h-[calc(100vh-var(--topbar-height)-64px)] shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5 bg-[var(--color-surface)] border border-[#E4E1DA] border-b-0 rounded-t-[var(--radius-lg)] px-3 sm:px-6 py-3 sm:py-[14px] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1 sm:max-w-[320px]">
                <Search size={17} className="absolute left-3 sm:left-[14px] top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari customer, tracking, marking..."
                  className="w-full pl-9 sm:pl-[42px] pr-[14px] py-2.5 sm:py-[10px] rounded-[var(--radius-md)] border border-[#E4E1DA] text-[14px] text-[var(--color-primary)] font-[var(--font-body)]
                    outline-none focus:border-[var(--color-secondary)] transition-colors bg-transparent"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex sm:hidden items-center gap-1 bg-[#F7F5F2] rounded-lg p-0.5 border border-[#E4E1DA] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  title="Compact list"
                  className={cn('p-2 rounded-md transition-all', viewMode === 'compact' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table"
                  className={cn('p-2 rounded-md transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <Rows3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid"
                  className={cn('p-2 rounded-md transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-center gap-x-2 gap-y-1 text-[12.5px] sm:text-[14px] font-medium text-[var(--color-secondary)] sm:flex-1 min-w-0">
              <span className="flex items-center gap-1.5 min-w-0">
                {isFetching && !isLoading && <Loader2 size={13} className="shrink-0 animate-spin text-blue-500" />}
                <span className="truncate">
                  <span className="sm:hidden">
                    <span className="text-[var(--color-primary)]">{filteredData.length.toLocaleString('id-ID')}</span>
                    {" / "}
                    <span className="text-[var(--color-primary)]">{total.toLocaleString('id-ID')}</span>
                  </span>
                  <span className="hidden sm:inline">
                    Menampilkan <span className="text-[var(--color-primary)]">{filteredData.length.toLocaleString('id-ID')}</span> dari{" "}
                    <span className="text-[var(--color-primary)]">{total.toLocaleString('id-ID')}</span> shipment
                  </span>
                </span>
              </span>
              <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                <span>Rows:</span>
                <select
                  value={limit} onChange={(e) => { setLimit(Number(e.target.value)); goToPage(1) }}
                  className="text-[12.5px] text-[var(--color-primary)] border border-[#E4E1DA] rounded-[var(--radius-sm)] px-2 py-1 outline-none bg-[var(--color-surface)] cursor-pointer font-[var(--font-body)]"
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2.5 shrink-0 text-[13.6px] text-[var(--color-secondary)]">
              <div className="flex items-center gap-1 bg-[#F7F5F2] rounded-lg p-0.5 border border-[#E4E1DA]">
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  title="Compact list"
                  className={cn('p-1.5 rounded-md transition-all', viewMode === 'compact' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table"
                  className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <Rows3 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid"
                  className={cn('p-1.5 rounded-md transition-all', viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--color-primary)]' : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]')}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <div className="w-px h-5 bg-[#E4E1DA] mx-1"></div>

              <div className="flex items-center gap-2.5">
                Rows:
                <select
                  value={limit} onChange={(e) => { setLimit(Number(e.target.value)); goToPage(1) }}
                  className="text-[13.6px] text-[var(--color-primary)] border border-[#E4E1DA] rounded-[var(--radius-sm)] px-3 py-1.5 outline-none bg-[var(--color-surface)] cursor-pointer font-[var(--font-body)]"
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="relative bg-[var(--color-surface)] border border-[#E4E1DA] rounded-b-[var(--radius-lg)] flex-1 overflow-hidden flex flex-col">
            {/* Progress bar tipis */}
            {isFetching && !isLoading && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden z-10">
                <div className="h-full w-1/3 bg-blue-500 animate-[loaderSlide_1.1s_ease-in-out_infinite]" />
              </div>
            )}
            <style>{`
            @keyframes loaderSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>

            <div className="bg-slate-50/50 flex-1 overflow-auto">
              {viewMode === 'table' ? (
                <Table
                  tableClassName="min-w-[1000px]"
                  columns={columns}
                  data={filteredData}
                  keyExtractor={(row) => row.fdListCode}
                  isLoading={isLoading}
                  onRowClick={(row) => setSelectedRow(row)}
                  emptyMessage={dataList.length > 0 && filteredData.length === 0 ? "Tidak ada pengiriman dengan filter yang dipilih." : "No shipments found."}
                  getRowClassName={(row) => cn(
                    'bg-white hover:bg-[#EFF6FF] transition-colors duration-200 cursor-pointer border-b border-[#E4E1DA]',
                    selectedRow?.fdListCode === row.fdListCode && 'bg-[#EFF6FF]'
                  )}
                />
              ) : viewMode === 'compact' ? (
                <div className="h-full">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-16 gap-4">
                      <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat daftar resi...</p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
                      {dataList.length > 0 ? "Tidak ada pengiriman dengan filter yang dipilih." : "No shipments found."}
                    </div>
                  ) : (
                    <div className="bg-white">
                      {groupByStatus(filteredData).map((group) => (
                        <div key={group.step}>
                          {/* Sticky group header, mirip kontak HP yang dikelompokkan per huruf */}
                          <div className="sticky top-0 z-[1] flex items-center justify-between px-4 sm:px-6 py-2 bg-[#F7F5F2]/95 backdrop-blur-sm border-y border-[#E4E1DA]">
                            <span className="font-[var(--font-label)] text-[11px] tracking-[0.08em] uppercase text-[var(--color-secondary)]">
                              {group.label}
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--color-secondary)]">
                              {group.items.length.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {group.items.map((row) => (
                            <div
                              key={row.fdListCode}
                              onClick={() => setSelectedRow(row)}
                              className={cn(
                                "flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-[#EFEDE7] cursor-pointer transition-colors",
                                selectedRow?.fdListCode === row.fdListCode ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFC]"
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                {/* Baris atas: Customer + status badge kecil */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-[14.5px] text-[var(--color-primary)] truncate">
                                    {row.fdCustName || '—'}
                                  </span>
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap shrink-0',
                                    (STATUS_STYLES[row.shipmentStatus?.statusStep ?? 0] || STATUS_STYLES[0]).bg,
                                    (STATUS_STYLES[row.shipmentStatus?.statusStep ?? 0] || STATUS_STYLES[0]).text
                                  )}>
                                    {row.shipmentStatus?.statusLabel || STATUS_STYLES[row.shipmentStatus?.statusStep ?? 0]?.label}
                                  </span>
                                </div>
                                {/* Baris bawah: Marking / Receipt No, abu-abu */}
                                <div className="flex items-center gap-1.5 mt-0.5 text-[12.5px] text-[var(--color-secondary)] truncate">
                                  {(row.fdMarkingCode || row.fdMarkingNo) && (
                                    <span className="uppercase font-medium truncate">
                                      {[row.fdMarkingCode, row.fdMarkingNo].filter(Boolean).join(' ')}
                                    </span>
                                  )}
                                  {row.fdTerima && (row.fdMarkingCode || row.fdMarkingNo) && <span className="shrink-0">·</span>}
                                  {row.fdTerima && <span className="truncate">{row.fdTerima}</span>}
                                  {!row.fdMarkingCode && !row.fdMarkingNo && !row.fdTerima && <span>—</span>}
                                </div>
                              </div>
                              <ChevronDown size={15} className="shrink-0 -rotate-90 text-slate-300" />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 sm:p-6 h-full">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-16 gap-4">
                      <span className="w-10 h-10 border-4 border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[var(--color-secondary)] text-sm animate-pulse">Memuat daftar resi...</p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
                      {dataList.length > 0 ? "Tidak ada pengiriman dengan filter yang dipilih." : "No shipments found."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                      {filteredData.map(row => (
                        <div
                          key={row.fdListCode}
                          onClick={() => setSelectedRow(row)}
                          className={cn(
                            "bg-[var(--surface)] border rounded-[8px] overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col",
                            selectedRow?.fdListCode === row.fdListCode ? "border-[var(--color-tertiary)] ring-1 ring-[var(--color-tertiary)]/20 shadow-sm" : "border-[#E4E1DA]"
                          )}
                        >
                          {/* Header */}
                          <div className="px-4 sm:px-[20px] py-3 sm:py-[16px] flex items-center justify-between bg-[var(--neutral)] border-b border-[#E4E1DA] gap-3">
                            <div className="min-w-0">
                              <div className="font-['Space_Grotesk'] text-[0.6rem] sm:text-[0.65rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mb-[3px]">List No.</div>
                              <div className="font-['Fraunces'] font-semibold text-[1rem] sm:text-[1.1rem] tracking-[-0.01em] text-[var(--color-primary)] truncate">{row.fdListCode}</div>
                            </div>
                            <div className="shrink-0">
                              <StatusBadge status={row.shipmentStatus} />
                            </div>
                          </div>

                          {/* Body */}
                          <div className="pt-1 px-4 sm:px-[20px]">
                            <div className="flex flex-col items-start gap-[4px] py-3 sm:py-[16px] border-b border-[#EFEDE7]">
                              <div className="font-['Space_Grotesk'] text-[0.62rem] sm:text-[0.68rem] tracking-[0.06em] uppercase text-[var(--color-secondary)] shrink-0">Customer</div>
                              <div className="font-['Fraunces'] font-semibold text-[0.95rem] sm:text-[1.05rem] tracking-[-0.01em] text-[var(--color-primary)] leading-tight">{row.fdCustName || '—'}</div>
                            </div>

                            <div className="flex items-center justify-between gap-3 py-3 sm:py-[16px] border-b border-[#EFEDE7]">
                              <div className="font-['Space_Grotesk'] text-[0.62rem] sm:text-[0.68rem] tracking-[0.06em] uppercase text-[var(--color-secondary)] shrink-0">Receipt No.</div>
                              <div className="text-[0.85rem] sm:text-[0.92rem] font-semibold text-[var(--color-primary)] text-right truncate">{row.fdTerima || '—'}</div>
                            </div>

                            <div className="flex items-center justify-between gap-3 py-3 sm:py-[16px] border-b border-[#EFEDE7]">
                              <div className="font-['Space_Grotesk'] text-[0.62rem] sm:text-[0.68rem] tracking-[0.06em] uppercase text-[var(--color-secondary)] shrink-0">Tracking</div>
                              <div className="font-['Space_Grotesk'] text-[0.78rem] sm:text-[0.85rem] text-[var(--color-tertiary)] font-semibold text-right truncate">{row.fdLocalTrackingNo || '—'}</div>
                            </div>

                            <div className="flex items-center justify-between gap-3 py-3 sm:py-[16px] border-b border-[#EFEDE7]">
                              <div className="font-['Space_Grotesk'] text-[0.62rem] sm:text-[0.68rem] tracking-[0.06em] uppercase text-[var(--color-secondary)] shrink-0">Marking</div>
                              <div className="flex items-center gap-[6px] text-[0.85rem] sm:text-[0.92rem] font-semibold text-[var(--color-primary)] text-right justify-end truncate">
                                {row.fdMarkingCode && <span>{row.fdMarkingCode}</span>}
                                {row.fdMarkingNo && <span>{row.fdMarkingNo}</span>}
                                {!row.fdMarkingCode && !row.fdMarkingNo && <span className="text-[var(--color-secondary)]">—</span>}
                              </div>
                            </div>

                            <div className="flex items-center py-3 sm:py-[16px]">
                              <div className="grid grid-cols-3 w-full gap-2 sm:gap-[12px]">
                                <div className="flex flex-col items-center text-center gap-[4px] border-r border-[#EFEDE7]">
                                  <div className="font-['Space_Grotesk'] text-[0.58rem] sm:text-[0.65rem] tracking-[0.06em] uppercase text-[var(--color-secondary)]">Pkg</div>
                                  <div className="text-[0.82rem] sm:text-[0.92rem] font-bold text-[var(--color-tertiary)]">{Number(row.fdJmlPack || 0).toLocaleString('id-ID')} {row.fdSatuan?.trim()}</div>
                                </div>
                                <div className="flex flex-col items-center text-center gap-[4px] border-r border-[#EFEDE7]">
                                  <div className="font-['Space_Grotesk'] text-[0.58rem] sm:text-[0.65rem] tracking-[0.06em] uppercase text-[var(--color-secondary)]">Wgt</div>
                                  <div className="text-[0.82rem] sm:text-[0.92rem] font-bold text-[var(--color-primary)]">{Number(row.fdJmlBerat || 0).toLocaleString('id-ID')} kg</div>
                                </div>
                                <div className="flex flex-col items-center text-center gap-[4px]">
                                  <div className="font-['Space_Grotesk'] text-[0.58rem] sm:text-[0.65rem] tracking-[0.06em] uppercase text-[var(--color-secondary)]">Vol</div>
                                  <div className="text-[0.82rem] sm:text-[0.92rem] font-bold text-[var(--color-primary)]">{Number(row.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })} m³</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="px-4 sm:px-[20px] pb-4 sm:pb-[20px] pt-3 sm:pt-[16px] mt-auto">
                            <button className="w-full flex items-center justify-center gap-[8px] border border-[var(--color-tertiary)] bg-[var(--surface)] text-[var(--color-tertiary)] rounded-[24px] p-[11px] sm:p-[12px] font-['Public_Sans'] text-[0.84rem] sm:text-[0.88rem] font-semibold cursor-pointer hover:bg-[#F3E4E0] transition-colors">
                              ◎ View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 bg-white w-full">
              <Pagination
                page={page}
                limit={limit}
                total={total}
                totalPages={Math.ceil(total / limit)}
                onPageChange={goToPage}
              />
              {Math.ceil(total / limit) > 1 && (
                <div className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
                  <span className="hidden sm:inline">Go to page</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.ceil(total / limit)}
                    value={jumpPage}
                    placeholder={String(page)}
                    onChange={(e) => setJumpPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      const totalPages = Math.ceil(total / limit)
                      const target = Math.min(Math.max(1, Number(jumpPage) || 1), totalPages)
                      goToPage(target)
                      setJumpPage('')
                    }}
                    className="w-16 text-center bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  />
                  <span className="whitespace-nowrap">of {Math.ceil(total / limit).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel Slider & Backdrop */}
      {selectedRow && selectedShipment && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedRow(null)}
          />

          {/* Modal Detail — dirancang mobile-first sebagai bottom sheet penuh, tetap dialog di desktop */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
            <div className="w-full sm:max-w-2xl bg-white shadow-2xl rounded-t-[28px] sm:rounded-2xl flex flex-col overflow-hidden pointer-events-auto h-[94vh] sm:h-auto sm:max-h-[90vh]">

              {/* Drag handle (mobile only) */}
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0"
                aria-label="Tutup"
              >
                <div className="w-10 h-1.5 rounded-full bg-slate-300" />
              </button>

              {/* Header (sticky) */}
              <div className="flex flex-shrink-0 items-start justify-between gap-3 px-5 sm:px-8 pt-1 sm:pt-6 pb-4 sm:pb-6 border-b border-slate-100">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[19px] sm:text-xl font-semibold text-slate-900 truncate">
                      {selectedShipment.fdListCode}
                    </h2>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedShipment.fdListCode, 'listCode')}
                      className="p-1.5 text-slate-400 active:text-slate-600 hover:text-slate-600 shrink-0"
                      aria-label="Salin nomor list"
                    >
                      {copiedField === 'listCode' ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={selectedShipment.shipmentStatus} />
                    {selectedShipment.shipmentStatus?.fdGudang?.trim() && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500">
                        <MapPin size={12} />
                        {selectedShipment.shipmentStatus.fdGudang.trim()}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="hidden sm:inline-flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200 self-start shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 sm:py-7 bg-[#FAFAF9]">
                {isLoadingDetail ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <span className="w-8 h-8 border-[3px] border-[var(--color-tertiary)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-500">Memuat detail...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">

                    {/* Information (accordion) */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setInfoOpen((o) => !o)}
                        className="w-full flex items-center justify-between p-4 sm:p-6 sm:pb-0"
                      >
                        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                          <Calendar size={15} className="text-[var(--color-tertiary)]" /> Informasi
                        </h3>
                        <ChevronDown size={17} className={cn("text-slate-400 transition-transform sm:hidden", infoOpen && "rotate-180")} />
                      </button>

                      <div className={cn("flex-col gap-0 px-4 sm:px-6 pb-1 sm:pb-6", infoOpen ? "flex" : "hidden sm:flex", "sm:pt-4")}>
                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50">
                          <span className="text-[12.5px] text-slate-500 shrink-0">Customer</span>
                          <span className="text-[13.5px] font-semibold text-slate-900 text-right truncate">{selectedShipment.fdCustName || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50">
                          <span className="text-[12.5px] text-slate-500 shrink-0">Receipt No.</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedShipment.fdTerima, 'terima')}
                            className="flex items-center gap-1.5 min-w-0"
                          >
                            <span className="text-[13.5px] font-semibold text-slate-900 text-right truncate">{selectedShipment.fdTerima || '—'}</span>
                            {selectedShipment.fdTerima && (
                              copiedField === 'terima' ? <Check size={13} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="text-slate-300 shrink-0" />
                            )}
                          </button>
                        </div>
                        {selectedShipment.fdLocalTrackingNo && (
                          <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50">
                            <span className="text-[12.5px] text-slate-500 shrink-0">Tracking</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedShipment.fdLocalTrackingNo, 'tracking')}
                              className="flex items-center gap-1.5 min-w-0"
                            >
                              <span className="text-[13.5px] font-semibold text-[var(--color-tertiary)] text-right truncate">{selectedShipment.fdLocalTrackingNo}</span>
                              {copiedField === 'tracking' ? <Check size={13} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="text-slate-300 shrink-0" />}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50">
                          <span className="text-[12.5px] text-slate-500 shrink-0">Agent Date</span>
                          <span className="text-[13.5px] font-semibold text-slate-900 text-right">{formatDate(selectedShipment.fdTglAgent)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50">
                          <span className="text-[12.5px] text-slate-500 shrink-0">Marking</span>
                          <span className="text-[13.5px] font-semibold text-slate-900 text-right truncate">
                            {[selectedShipment.fdMarkingCode, selectedShipment.fdMarkingNo].filter(Boolean).join(' ') || '—'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 py-3">
                          <span className="text-[12.5px] text-slate-500">Commodity</span>
                          <span className="text-[13.5px] font-semibold text-slate-900">{selectedShipment.fdComodity || '—'}</span>
                          {selectedShipment.fdDesc && (
                            <span className="text-[12.5px] text-slate-500 leading-snug">{selectedShipment.fdDesc}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Summary */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
                      <h3 className="text-[13px] font-semibold text-slate-900 mb-3.5 flex items-center gap-2">
                        <Scale size={15} className="text-[var(--color-tertiary)]" /> Summary
                      </h3>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="flex flex-col items-center text-center gap-1 bg-[#F8FAFC] rounded-xl py-3.5">
                          <p className="text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Package</p>
                          <p className="text-[17px] sm:text-xl font-bold text-slate-900 tabular-nums leading-none">
                            {Number(selectedShipment.fdJmlPack || 0).toLocaleString('id-ID')}
                          </p>
                          {selectedShipment.fdSatuan && (
                            <p className="text-[10.5px] text-slate-400 font-medium">{selectedShipment.fdSatuan.trim().toUpperCase()}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-center text-center gap-1 bg-[#F8FAFC] rounded-xl py-3.5">
                          <p className="text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Weight</p>
                          <p className="text-[17px] sm:text-xl font-bold text-slate-900 tabular-nums leading-none">
                            {Number(selectedShipment.fdJmlBerat || 0).toLocaleString('id-ID')}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-medium">KG</p>
                        </div>
                        <div className="flex flex-col items-center text-center gap-1 bg-[#F8FAFC] rounded-xl py-3.5">
                          <p className="text-[10.5px] uppercase tracking-wide text-slate-500 font-medium">Volume</p>
                          <p className="text-[17px] sm:text-xl font-bold text-slate-900 tabular-nums leading-none">
                            {Number(selectedShipment.fdM3 || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-medium">M³</p>
                        </div>
                      </div>
                    </div>

                    {/* Dimensions (accordion, collapsed by default) */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDimsOpen((o) => !o)}
                        className="w-full flex items-center justify-between p-4 sm:p-6"
                      >
                        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                          <Ruler size={15} className="text-[var(--color-tertiary)]" /> Dimensions
                          {dimensions.length > 0 && (
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {dimensions.length}
                            </span>
                          )}
                        </h3>
                        <ChevronRight size={17} className={cn("text-slate-400 transition-transform", dimsOpen && "rotate-90")} />
                      </button>

                      {dimsOpen && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                          {isLoadingDimensions ? (
                            <div className="text-center text-[13px] text-slate-500 py-6">Memuat dimensi...</div>
                          ) : dimensions.length > 0 ? (
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                              <Table
                                columns={dimColumns}
                                data={dimensions}
                                keyExtractor={(row) => `${row.fdListCode}-${row.fdListDCode}`}
                                emptyMessage="No dimensions available."
                              />
                              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100">
                                <span className="text-[12.5px] font-medium text-slate-600">Total Volume</span>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-[15px] font-semibold text-slate-900 tabular-nums">
                                    {totalDimensiM3.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-500">m³</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-[13px] text-slate-500 py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              Tidak ada data dimensi untuk shipment ini.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timeline (accordion, collapsed by default) */}
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setTimelineOpen((o) => !o)}
                        className="w-full flex items-center justify-between p-4 sm:p-6"
                      >
                        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                          <Truck size={15} className="text-[var(--color-tertiary)]" /> Timeline Pengiriman
                        </h3>
                        <ChevronRight size={17} className={cn("text-slate-400 transition-transform", timelineOpen && "rotate-90")} />
                      </button>

                      {timelineOpen && (
                        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                          <div className="flex flex-col">
                            {(() => {
                              const status = selectedShipment.shipmentStatus
                              const gudang = status?.fdGudang?.trim()
                              const steps = [
                                { label: 'Waiting Loading', date: status?.fdLoadDate, stepValue: 1 },
                                { label: 'ETD', date: status?.fdETD, stepValue: 2 },
                                { label: 'ETA', date: status?.fdETA, stepValue: 3 },
                                { label: 'Warehouse', date: status?.fdExitDate, stepValue: 4, sub: gudang ? `Lokasi: ${gudang}` : undefined },
                                { label: 'Delivery', date: null, stepValue: 5, noDate: true },
                                { label: 'Delivered', date: null, stepValue: 6, noDate: true },
                              ]
                              const currentStep = status?.statusStep ?? 0
                              return steps.map((step, idx) => {
                                const isDone = currentStep >= step.stepValue
                                const isCurrent = currentStep === step.stepValue
                                const isLast = idx === steps.length - 1
                                return (
                                  <div key={step.label} className="relative flex gap-3.5 pb-5 last:pb-0">
                                    {!isLast && (
                                      <div className={cn(
                                        "absolute top-6 bottom-0 left-[11px] w-[2px] -ml-px",
                                        currentStep > step.stepValue ? "bg-[var(--color-tertiary)]" : "bg-slate-200"
                                      )} />
                                    )}
                                    <div className={cn(
                                      "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white mt-0.5",
                                      isDone ? "border-[var(--color-tertiary)]" : "border-slate-300",
                                      isCurrent && "ring-4 ring-[#F3E4E0]"
                                    )}>
                                      {isDone
                                        ? <CheckCircle2 size={15} className="text-[var(--color-tertiary)] fill-white" />
                                        : <Circle size={8} className="text-slate-300 fill-slate-300" />
                                      }
                                    </div>
                                    <div className="flex-1 flex items-start justify-between gap-3 pt-0.5">
                                      <div className="min-w-0">
                                        <p className={cn("text-[13.5px] font-semibold", isDone ? "text-slate-900" : "text-slate-400")}>
                                          {step.label}
                                        </p>
                                        {step.sub && isDone && (
                                          <p className="text-[12px] text-slate-500 mt-0.5">{step.sub}</p>
                                        )}
                                      </div>
                                      <p className={cn("text-[11.5px] font-medium whitespace-nowrap shrink-0 pt-0.5", isDone ? "text-slate-600" : "text-slate-400")}>
                                        {step.noDate
                                          ? (isDone ? 'Selesai' : 'Menunggu')
                                          : (step.date ? formatDate(step.date) : 'Menunggu')}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* Footer aksi cepat (sticky, mobile-first) */}
              <div className="shrink-0 flex items-center gap-2.5 px-5 sm:px-8 py-3.5 sm:py-4 border-t border-slate-100 bg-white pb-[calc(env(safe-area-inset-bottom)+14px)] sm:pb-4">
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedShipment.fdTerima || selectedShipment.fdLocalTrackingNo, 'footerCopy')}
                  disabled={!selectedShipment.fdTerima && !selectedShipment.fdLocalTrackingNo}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full border border-[var(--color-tertiary)] text-[var(--color-tertiary)] text-[13.5px] font-semibold disabled:opacity-40 disabled:border-slate-200 disabled:text-slate-400 active:bg-[#F3E4E0] transition-colors"
                >
                  {copiedField === 'footerCopy' ? <Check size={16} /> : <Copy size={16} />}
                  {copiedField === 'footerCopy' ? 'Tersalin' : 'Salin No. Resi'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="flex-1 sm:flex-none sm:px-8 flex items-center justify-center gap-2 py-3 rounded-full bg-[var(--color-primary)] text-white text-[13.5px] font-semibold active:opacity-80 transition-opacity"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
