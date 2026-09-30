import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  X,
  Search,
  Download,
  RotateCcw,
  Plane,
  Ship,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Package,
  Weight,
  User,
  ExternalLink,
  Rows3,
  LayoutGrid,
  PhoneCall,
  Inbox,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useToastStore } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { cn, formatNumber, displayCustName } from '@/lib/utils'
import type { DeliveryEstimasiDetailItem } from '../types/delivery-orders.types'

interface DeliveryEstimasiDetailModalProps {
  isOpen: boolean
  onClose: () => void
  estimasiDate: string // YYYY-MM-DD
  displayDate?: string
  initialFilter?: 'all' | 'overdue' | 'pending' | 'tolerance' | 'sent'
}

/**
 * Format tanggal ke standar Indonesia tanpa risiko timezone shift:
 * - formatIndoDate("2026-09-23", { includeDayName: true }) => "Rabu, 23 Sep 2026"
 * - formatIndoDate("2026-09-24") => "24 Sep 2026"
 * - formatIndoDate("2026-09-24 14:30:00", { includeTime: true }) => "24 Sep 2026, 14:30 WIB"
 */
export function formatIndoDate(
  dateValue: string | Date | null | undefined,
  options?: { includeDayName?: boolean; includeYear?: boolean; includeTime?: boolean }
): string {
  if (!dateValue) return '—'

  let year: number, month: number, day: number
  let hours: number | null = null, minutes: number | null = null

  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/)
    if (match) {
      year = parseInt(match[1], 10)
      month = parseInt(match[2], 10) - 1
      day = parseInt(match[3], 10)
      if (match[4] && match[5]) {
        hours = parseInt(match[4], 10)
        minutes = parseInt(match[5], 10)
      }
    } else {
      const d = new Date(dateValue)
      if (isNaN(d.getTime())) return String(dateValue)
      year = d.getFullYear()
      month = d.getMonth()
      day = d.getDate()
      hours = d.getHours()
      minutes = d.getMinutes()
    }
  } else {
    year = dateValue.getFullYear()
    month = dateValue.getMonth()
    day = dateValue.getDate()
    hours = dateValue.getHours()
    minutes = dateValue.getMinutes()
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const dObj = new Date(year, month, day)
  const dayName = dayNames[dObj.getDay()]
  const monthName = monthNames[month]

  let res = ''
  if (options?.includeDayName) {
    res += `${dayName}, `
  }
  res += `${String(day).padStart(2, '0')} ${monthName}`
  if (options?.includeYear !== false) {
    res += ` ${year}`
  }
  if (options?.includeTime && hours !== null && minutes !== null) {
    res += `, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} WIB`
  }

  return res
}

export function DeliveryEstimasiDetailModal({
  isOpen,
  onClose,
  estimasiDate,
  displayDate,
  initialFilter = 'all',
}: DeliveryEstimasiDetailModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  useModalEscape(isOpen, onClose)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'pending' | 'tolerance' | 'sent'>(initialFilter)
  const [selectedModa, setSelectedModa] = useState<'all' | '1' | '2'>('all')
  const [search, setSearch] = useState<string>('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards'
    }
    return 'table'
  })

  useEffect(() => {
    setStatusFilter(initialFilter)
  }, [initialFilter, isOpen])

  // Query details from backend
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['delivery-estimasi-details', estimasiDate],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getEstimasiDetails(estimasiDate, 'all')
      return res.data?.data
    },
    enabled: isOpen && Boolean(estimasiDate),
    staleTime: 60 * 1000,
  })

  const rawItems: DeliveryEstimasiDetailItem[] = useMemo(() => data?.items || [], [data?.items])

  // Hitung metrik ringkasan
  const totalCount = rawItems.length
  const overdueCount = useMemo(() => rawItems.filter((i) => i.statusLabel === 'PENDING_OVERDUE').length, [rawItems])
  const toleranceCount = useMemo(() => rawItems.filter((i) => i.statusLabel === 'PENDING_TOLERANCE').length, [rawItems])
  const sentCount = useMemo(() => rawItems.filter((i) => i.fdSent === 1).length, [rawItems])
  const maxToleranceDate = rawItems[0]?.maxToleranceDate || null

  // Filtered items
  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      // Status filter
      if (statusFilter === 'overdue' && item.statusLabel !== 'PENDING_OVERDUE') return false
      if (statusFilter === 'tolerance' && item.statusLabel !== 'PENDING_TOLERANCE') return false
      if (statusFilter === 'pending' && item.fdSent === 1) return false
      if (statusFilter === 'sent' && item.fdSent !== 1) return false

      // Moda filter
      if (selectedModa === '1' && item.fdListType !== 1) return false
      if (selectedModa === '2' && item.fdListType !== 2) return false

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const match =
          item.fdSJNo.toLowerCase().includes(q) ||
          item.custName.toLowerCase().includes(q) ||
          (item.fdCustCode && item.fdCustCode.toLowerCase().includes(q)) ||
          (item.fdMarkingCode && item.fdMarkingCode.toLowerCase().includes(q)) ||
          (item.fdMarkingNo && item.fdMarkingNo.toLowerCase().includes(q)) ||
          (item.fdSupir && item.fdSupir.toLowerCase().includes(q)) ||
          (item.fdCarID && item.fdCarID.toLowerCase().includes(q)) ||
          (item.fdListCode && item.fdListCode.toLowerCase().includes(q)) ||
          (item.fdTerima && item.fdTerima.toLowerCase().includes(q)) ||
          (item.fdDescr && item.fdDescr.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [rawItems, statusFilter, selectedModa, search])

  // Total koli & berat item terfilter
  const filteredPack = useMemo(() => filteredItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0), [filteredItems])
  const filteredWeight = useMemo(
    () => Math.round(filteredItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
    [filteredItems]
  )

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada data untuk diekspor' })
      return
    }

    try {
      const rows = filteredItems.map((item, idx) => ({
        No: idx + 1,
        'No Surat Jalan': item.fdSJNo,
        'Tanggal SJ': formatIndoDate(item.fdSJDate),
        'Target Estimasi': formatIndoDate(item.fdEstimasi, { includeDayName: true }),
        'Batas Maksimal (H+1)': formatIndoDate(item.maxToleranceDate, { includeDayName: true }),
        Status:
          item.statusLabel === 'PENDING_OVERDUE'
            ? `PENDING OVERDUE (Lewat ${item.overdueDays} Hari)`
            : item.statusLabel === 'PENDING_TOLERANCE'
            ? 'PENDING (Dalam Toleransi H+1)'
            : item.statusLabel === 'SENT_ONTIME'
            ? 'TERKIRIM TEPAT WAKTU'
            : 'TERKIRIM LEWAT ESTIMASI',
        Moda: item.fdListType === 1 ? 'Udara' : 'Laut',
        Customer: displayCustName(item.custName),
        'Kode Cust': item.fdCustCode || '',
        Marking: item.fdMarkingCode || '',
        'No Marking': item.fdMarkingNo || '',
        'Jumlah Koli': item.fdJmlPackSJ,
        Satuan: item.fdSatuan,
        'Berat (Kg)': item.fdJmlBeratSJ,
        'Plat Kendaraan': item.fdCarID || '',
        Supir: item.fdSupir || '',
        'Telp Supir': item.fdTelpSupir || '',
        'Tanggal Kirim': item.fdSndDate ? formatIndoDate(item.fdSndDate, { includeTime: true }) : '—',
        'No Terima': item.fdTerima || '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Target Estimasi')
      const fileName = `Rincian_Estimasi_${estimasiDate}_${statusFilter}.xlsx`
      XLSX.writeFile(wb, fileName)
      addToast({ type: 'success', message: `Berhasil mengunduh ${fileName}` })
    } catch (err: any) {
      addToast({ type: 'error', message: `Gagal mengekspor data: ${err.message}` })
    }
  }

  if (!isOpen) return null

  const formattedHeaderDate = displayDate || formatIndoDate(estimasiDate, { includeDayName: true })
  const formattedToleranceDate = formatIndoDate(maxToleranceDate, { includeDayName: true })

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]">
      <div
        className="w-full max-w-6xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="p-3 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0">
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <h3 className="text-sm sm:text-lg font-bold text-[var(--color-primary)] font-[var(--font-display)] leading-tight">
                  Rincian Target Estimasi Kirim
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                  {formattedHeaderDate}
                </span>
                {maxToleranceDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] font-mono font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    <Clock size={11} className="text-indigo-500 shrink-0" />
                    <span>Batas H+1: {formattedToleranceDate}</span>
                  </span>
                )}
              </div>

              {/* Aturan Toleransi Info Banner */}
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-[var(--color-secondary)] flex items-start gap-1.5 leading-relaxed">
                <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Aturan Toleransi: <strong className="text-[var(--color-primary)]">fdSent = fdEstimasi + 1 hari itu max (H+1)</strong>. Apabila belum terkirim setelah batas H+1 berstatus <strong className="text-rose-600 dark:text-rose-400">Pending Overdue</strong>.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportExcel}
                className="text-xs gap-1.5 cursor-pointer h-8 px-2 sm:px-3"
                title="Ekspor daftar ke file Excel"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Ekspor Excel</span>
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition cursor-pointer"
                title="Tutup Modal (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Ribbon Ringkasan ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 p-2.5 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] text-xs shrink-0">
          {/* Total Target Estimasi */}
          <div
            onClick={() => setStatusFilter('all')}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              statusFilter === 'all'
                ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/60 shadow-xs"
                : "border-[var(--color-border)] bg-[var(--color-neutral)]/30 hover:bg-[var(--color-neutral)]/50"
            )}
          >
            <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[var(--color-secondary)] block font-medium">
              Target Estimasi
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono text-[var(--color-primary)]">
              {formatNumber(totalCount)} <span className="text-xs font-normal">SJ</span>
            </span>
          </div>

          {/* Pending Overdue (> H+1) */}
          <div
            onClick={() => setStatusFilter('overdue')}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              overdueCount > 0
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15"
                : "bg-[var(--color-neutral)]/30 border-[var(--color-border)] text-[var(--color-secondary)]",
              statusFilter === 'overdue' && "ring-2 ring-rose-500 shadow-xs"
            )}
          >
            <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] uppercase tracking-wider font-semibold">
              <span className="truncate">⚠️ Pending (&gt; H+1)</span>
              {overdueCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0 ml-1" />}
            </div>
            <span className="text-sm sm:text-lg font-bold font-mono">
              {formatNumber(overdueCount)} <span className="text-xs font-normal">SJ</span>
            </span>
          </div>

          {/* Pending Toleransi (<= H+1) */}
          <div
            onClick={() => setStatusFilter('tolerance')}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              toleranceCount > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15"
                : "bg-[var(--color-neutral)]/30 border-[var(--color-border)] text-[var(--color-secondary)]",
              statusFilter === 'tolerance' && "ring-2 ring-amber-500 shadow-xs"
            )}
          >
            <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[var(--color-secondary)] block font-medium truncate">
              🕒 Toleransi H+1
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono">
              {formatNumber(toleranceCount)} <span className="text-xs font-normal">SJ</span>
            </span>
          </div>

          {/* Realisasi Terkirim */}
          <div
            onClick={() => setStatusFilter('sent')}
            className={cn(
              "p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              sentCount > 0
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                : "bg-[var(--color-neutral)]/30 border-[var(--color-border)] text-[var(--color-secondary)]",
              statusFilter === 'sent' && "ring-2 ring-emerald-500 shadow-xs"
            )}
          >
            <span className="text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[var(--color-secondary)] block font-medium truncate">
              ✅ Sudah Terkirim
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono">
              {formatNumber(sentCount)} <span className="text-xs font-normal">SJ</span>
            </span>
          </div>
        </div>

        {/* ── Filter Toolbar ── */}
        <div className="p-2.5 sm:p-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex flex-col gap-2 text-xs shrink-0">
          {/* Row 1: Status Filter Chips (Smooth Horizontal Scroll on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 sm:flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer select-none whitespace-nowrap text-xs",
                statusFilter === 'all'
                  ? "bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs"
                  : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Semua Target ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer select-none whitespace-nowrap text-xs flex items-center gap-1",
                statusFilter === 'overdue'
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-[var(--color-surface)] border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10"
              )}
            >
              <AlertTriangle size={12} />
              <span>Overdue ({overdueCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('tolerance')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer select-none whitespace-nowrap text-xs flex items-center gap-1",
                statusFilter === 'tolerance'
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-[var(--color-surface)] border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              )}
            >
              <Clock size={12} />
              <span>Toleransi H+1 ({toleranceCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('sent')}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition cursor-pointer select-none whitespace-nowrap text-xs flex items-center gap-1",
                statusFilter === 'sent'
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-[var(--color-surface)] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
              )}
            >
              <CheckCircle2 size={12} />
              <span>Sudah Terkirim ({sentCount})</span>
            </button>
          </div>

          {/* Row 2: Moda Filter + View Mode Switcher + Search Input + Refresh */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            {/* Moda Filter */}
            <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedModa('all')}
                className={cn(
                  "px-2 py-1 rounded-md font-medium text-[11px] transition cursor-pointer",
                  selectedModa === 'all'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('1')}
                className={cn(
                  "px-2 py-1 rounded-md font-medium text-[11px] transition cursor-pointer flex items-center gap-1",
                  selectedModa === '1'
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Plane size={11} /> Udara
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('2')}
                className={cn(
                  "px-2 py-1 rounded-md font-medium text-[11px] transition cursor-pointer flex items-center gap-1",
                  selectedModa === '2'
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Ship size={11} /> Laut
              </button>
            </div>

            {/* View Mode Switcher (Kartu / Tabel) */}
            <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Tampilan Kartu (Responsif Mobile)"
                className={cn(
                  "p-1.5 rounded-md text-xs transition cursor-pointer flex items-center gap-1",
                  viewMode === 'cards'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline text-[11px]">Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Lengkap"
                className={cn(
                  "p-1.5 rounded-md text-xs transition cursor-pointer flex items-center gap-1",
                  viewMode === 'table'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Rows3 size={13} />
                <span className="hidden sm:inline text-[11px]">Tabel</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-secondary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari SJ, customer, supir..."
                className="w-full pl-8 pr-7 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              className="p-1.5 h-7 w-7 cursor-pointer shrink-0"
              title="Muat ulang data"
            >
              <RotateCcw size={12} />
            </Button>
          </div>
        </div>

        {/* ── Content Viewport ── */}
        <div className="flex-1 min-h-[260px] overflow-y-auto overflow-x-auto divide-y divide-[var(--color-border)]">
          {isLoading ? (
            /* Standar Loading: Skeleton Shimmer (Anti-Spinner) */
            <div className="p-3 sm:p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col gap-2.5"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 rounded-md skeleton-shimmer" />
                    <div className="h-5 w-24 rounded-md skeleton-shimmer" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-48 rounded skeleton-shimmer" />
                    <div className="h-3 w-36 rounded skeleton-shimmer" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex justify-between items-center">
                    <div className="h-4 w-28 rounded skeleton-shimmer" />
                    <div className="h-4 w-24 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <p className="text-xs text-rose-500 font-medium">
                Gagal memuat data rincian target estimasi. Silakan periksa koneksi Anda.
              </p>
              <Button variant="secondary" size="sm" onClick={() => refetch()} className="cursor-pointer text-xs">
                Coba Lagi
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center gap-2.5 bg-[var(--color-surface)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)]">
                <Inbox size={24} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--color-primary)]">
                  Tidak ada Surat Jalan yang sesuai filter
                </p>
                <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                  {search ? 'Coba ubah kata kunci pencarian atau reset filter status.' : 'Belum ada target pada kriteria yang dipilih.'}
                </p>
              </div>
              {(search || statusFilter !== 'all' || selectedModa !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all')
                    setSelectedModa('all')
                    setSearch('')
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)] text-[var(--color-surface)] hover:opacity-90 transition cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : viewMode === 'cards' ? (
            /* ── Responsive Card View (Mobile & Grid Mode) ── */
            <div className="p-2.5 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
              {filteredItems.map((item, idx) => {
                const isUdara = item.fdListType === 1
                const isOverdue = item.statusLabel === 'PENDING_OVERDUE'
                const isTolerance = item.statusLabel === 'PENDING_TOLERANCE'
                const isSentOnTime = item.statusLabel === 'SENT_ONTIME'

                return (
                  <div
                    key={item.fdSJNo}
                    className={cn(
                      "p-3 sm:p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/20 transition-all shadow-2xs space-y-2.5 flex flex-col justify-between",
                      isOverdue && "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                    )}
                  >
                    {/* Top Row: Index + No SJ + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="text-[10px] font-mono font-medium text-[var(--color-secondary)] bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                          #{idx + 1}
                        </span>
                        <Link
                          to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                          className="font-mono font-bold text-xs sm:text-sm text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 group truncate"
                          title="Buka rincian Surat Jalan"
                        >
                          <Truck size={13} className="text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] shrink-0" />
                          <span className="truncate">{item.fdSJNo}</span>
                          <ExternalLink size={10} className="text-[var(--color-secondary)] opacity-60 group-hover:opacity-100 shrink-0" />
                        </Link>
                      </div>

                      {/* Status Badges */}
                      <div className="shrink-0 text-right">
                        {isOverdue ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 whitespace-nowrap">
                              <AlertTriangle size={11} className="stroke-[2.5]" />
                              <span>Overdue +{item.overdueDays}H</span>
                            </span>
                            <span className="text-[9px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-medium whitespace-nowrap">
                              Batas: {formatIndoDate(item.maxToleranceDate)}
                            </span>
                          </div>
                        ) : isTolerance ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10.5px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              <Clock size={11} />
                              <span>Toleransi H+1</span>
                            </span>
                            <span className="text-[9px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium whitespace-nowrap">
                              s/d {formatIndoDate(item.maxToleranceDate)}
                            </span>
                          </div>
                        ) : isSentOnTime ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                              <CheckCircle2 size={11} />
                              <span>Terkirim</span>
                            </span>
                            {(item.fdLoad || item.fdSndDate) && (
                              <span className="text-[9px] text-[var(--color-secondary)] mt-0.5 whitespace-nowrap">
                                {formatIndoDate(item.fdLoad || item.fdSndDate, { includeTime: (item.fdLoad || item.fdSndDate || '').includes(':') })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 whitespace-nowrap">
                              <Clock size={11} />
                              <span>Terkirim (Late{item.overdueDays > 0 ? ` +${item.overdueDays}H` : ''})</span>
                            </span>
                            {(item.fdLoad || item.fdSndDate) && (
                              <span className="text-[9px] text-[var(--color-secondary)] mt-0.5 whitespace-nowrap">
                                {formatIndoDate(item.fdLoad || item.fdSndDate, { includeTime: (item.fdLoad || item.fdSndDate || '').includes(':') })}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer & Marking Row */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-semibold text-xs sm:text-sm text-[var(--color-primary)] truncate block"
                          title={item.custName}
                        >
                          {displayCustName(item.custName)}
                        </span>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0",
                            isUdara
                              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          )}
                        >
                          {isUdara ? <Plane size={10} /> : <Ship size={10} />}
                          <span>{isUdara ? 'Udara' : 'Laut'}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="font-mono font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          {item.fdMarkingCode || '—'} {item.fdMarkingNo ? `• ${item.fdMarkingNo}` : ''}
                        </span>
                        {item.fdTerima && (
                          <span className="text-[10px] text-[var(--color-secondary)] font-mono bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                            Resi: {item.fdTerima}
                          </span>
                        )}
                        {item.fdCustCode && (
                          <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                            ({item.fdCustCode})
                          </span>
                        )}
                      </div>

                      {item.fdDescr && (
                        <p className="text-[11px] text-[var(--color-secondary)] line-clamp-1 leading-relaxed">
                          {item.fdDescr}
                        </p>
                      )}
                    </div>

                    {/* Logistics & Physical Cargo Box */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/70 text-xs">
                      {/* Driver & Car */}
                      <div className="min-w-0">
                        <span className="text-[9.5px] text-[var(--color-secondary)] block uppercase tracking-wider font-medium">
                          Armada & Supir
                        </span>
                        <div className="flex items-center gap-1 font-medium text-[var(--color-primary)] truncate mt-0.5">
                          <User size={11} className="text-[var(--color-secondary)] shrink-0" />
                          <span className="truncate">{item.fdSupir || 'Supir TBD'}</span>
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)] font-mono mt-0.5 truncate">
                          <span>{item.fdCarID || '—'}</span>
                          {item.fdTelpSupir && (
                            <a
                              href={`tel:${item.fdTelpSupir}`}
                              className="ml-1 text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                              title="Hubungi supir"
                            >
                              <PhoneCall size={9} />
                              <span>{item.fdTelpSupir}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Cargo Muatan */}
                      <div className="text-right">
                        <span className="text-[9.5px] text-[var(--color-secondary)] block uppercase tracking-wider font-medium">
                          Muatan Fisik
                        </span>
                        <div className="font-mono font-bold text-[var(--color-primary)] text-xs mt-0.5">
                          <Package size={11} className="inline mr-1 text-[var(--color-secondary)]" />
                          {formatNumber(item.fdJmlPackSJ)}{' '}
                          <span className="text-[10px] font-normal text-[var(--color-secondary)]">{item.fdSatuan}</span>
                        </div>
                        <div className="font-mono font-semibold text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                          <Weight size={11} className="inline mr-1 text-amber-500" />
                          {item.fdJmlBeratSJ.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                          <span className="text-[10px] font-normal">kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Dates & Action */}
                    <div className="pt-1 border-t border-[var(--color-border)]/50 flex items-center justify-between gap-2 text-[10.5px] text-[var(--color-secondary)]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.fdSJDate && <span>SJ: {formatIndoDate(item.fdSJDate)}</span>}
                        {item.fdEstimasi && (
                          <span className="font-medium text-[var(--color-primary)]">
                            • Est: {formatIndoDate(item.fdEstimasi)}
                          </span>
                        )}
                      </div>

                      <Link
                        to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                      >
                        <span>Detail SJ</span>
                        <ExternalLink size={10} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Desktop Table View ── */
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[var(--color-surface)] z-10 border-b border-[var(--color-border)] shadow-2xs">
                <tr className="bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] font-medium text-[11px]">
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3">No. Surat Jalan</th>
                  <th className="py-2.5 px-3">Moda</th>
                  <th className="py-2.5 px-3">Customer & Marking</th>
                  <th className="py-2.5 px-3 text-right">Koli / Coly</th>
                  <th className="py-2.5 px-3 text-right">Tonase Berat</th>
                  <th className="py-2.5 px-3">Armada & Supir</th>
                  <th className="py-2.5 px-3 text-center min-w-[130px]">Status</th>
                  <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredItems.map((item, idx) => {
                  const isUdara = item.fdListType === 1
                  const isOverdue = item.statusLabel === 'PENDING_OVERDUE'
                  const isTolerance = item.statusLabel === 'PENDING_TOLERANCE'
                  const isSentOnTime = item.statusLabel === 'SENT_ONTIME'

                  return (
                    <tr
                      key={item.fdSJNo}
                      className={cn(
                        "hover:bg-[var(--color-neutral)]/30 transition-colors",
                        isOverdue && "bg-rose-500/5 hover:bg-rose-500/10"
                      )}
                    >
                      <td className="py-2.5 px-3 text-center text-[var(--color-secondary)] font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* No SJ */}
                      <td className="py-2.5 px-3">
                        <Link
                          to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                          className="font-mono font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 group"
                        >
                          <span>{item.fdSJNo}</span>
                          <ExternalLink size={10} className="text-[var(--color-secondary)] opacity-60 group-hover:opacity-100" />
                        </Link>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--color-secondary)] font-mono mt-0.5">
                          {item.fdSJDate && (
                            <span>Tgl SJ: {formatIndoDate(item.fdSJDate)}</span>
                          )}
                          {item.fdTerima && (
                            <span>• Resi: {item.fdTerima}</span>
                          )}
                        </div>
                      </td>

                      {/* Moda */}
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            isUdara
                              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          )}
                        >
                          {isUdara ? <Plane size={10} /> : <Ship size={10} />}
                          <span>{isUdara ? 'Udara' : 'Laut'}</span>
                        </span>
                      </td>

                      {/* Customer & Marking */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-[var(--color-primary)] block truncate max-w-[220px]" title={item.custName}>
                          {displayCustName(item.custName)}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-secondary)] font-mono mt-0.5">
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {item.fdMarkingCode || '—'}
                          </span>
                          {item.fdMarkingNo && <span>• {item.fdMarkingNo}</span>}
                          {item.fdCustCode && <span>({item.fdCustCode})</span>}
                        </div>
                      </td>

                      {/* Koli */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--color-primary)]">
                        {formatNumber(item.fdJmlPackSJ)}{' '}
                        <span className="text-[10px] text-[var(--color-secondary)] font-normal">{item.fdSatuan}</span>
                      </td>

                      {/* Berat */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-[var(--color-primary)]">
                        {item.fdJmlBeratSJ.toLocaleString('id-ID', { maximumFractionDigits: 1 })}{' '}
                        <span className="text-[10px] text-[var(--color-secondary)] font-normal">kg</span>
                      </td>

                      {/* Armada & Supir */}
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-[var(--color-primary)] block flex items-center gap-1">
                          <Truck size={12} className="text-[var(--color-secondary)] shrink-0" />
                          <span>{item.fdSupir || '—'}</span>
                        </span>
                        <div className="text-[10.5px] text-[var(--color-secondary)] font-mono mt-0.5">
                          <span>{item.fdCarID || '—'}</span>
                          {item.fdTelpSupir && (
                            <a
                              href={`tel:${item.fdTelpSupir}`}
                              className="ml-1 text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PhoneCall size={9} />
                              <span>{item.fdTelpSupir}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isOverdue ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] whitespace-nowrap bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              <AlertTriangle size={11} className="stroke-[2.5]" />
                              <span>Overdue +{item.overdueDays}H</span>
                            </span>
                            <span className="text-[9.5px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-medium whitespace-nowrap">
                              Batas: {formatIndoDate(item.maxToleranceDate)}
                            </span>
                          </div>
                        ) : isTolerance ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[10.5px] whitespace-nowrap bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <Clock size={11} />
                              <span>Toleransi H+1</span>
                            </span>
                            <span className="text-[9.5px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium whitespace-nowrap">
                              s/d {formatIndoDate(item.maxToleranceDate)}
                            </span>
                          </div>
                        ) : isSentOnTime ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] whitespace-nowrap bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 size={11} />
                              <span>Terkirim</span>
                            </span>
                            {(item.fdLoad || item.fdSndDate) && (
                              <span className="text-[9.5px] text-[var(--color-secondary)] mt-0.5 whitespace-nowrap" title={item.fdLoad ? `Waktu Load: ${item.fdLoad}` : undefined}>
                                {formatIndoDate(item.fdLoad || item.fdSndDate, { includeTime: (item.fdLoad || item.fdSndDate || '').includes(':') })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10.5px] whitespace-nowrap bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                              <Clock size={11} />
                              <span>Terkirim (Late{item.overdueDays > 0 ? ` +${item.overdueDays}H` : ''})</span>
                            </span>
                            {(item.fdLoad || item.fdSndDate) && (
                              <span className="text-[9.5px] text-[var(--color-secondary)] mt-0.5 whitespace-nowrap" title={item.fdLoad ? `Waktu Load: ${item.fdLoad}` : undefined}>
                                {formatIndoDate(item.fdLoad || item.fdSndDate, { includeTime: (item.fdLoad || item.fdSndDate || '').includes(':') })}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition cursor-pointer"
                          title="Buka Detail Surat Jalan"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-3 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="text-[var(--color-secondary)] text-[11px] sm:text-xs text-center sm:text-left leading-relaxed">
            Menampilkan <strong className="text-[var(--color-primary)]">{filteredItems.length}</strong> dari{' '}
            <strong>{totalCount}</strong> Surat Jalan • Total:{' '}
            <strong className="text-[var(--color-primary)] font-mono">{formatNumber(filteredPack)}</strong> coly •{' '}
            <strong className="text-[var(--color-primary)] font-mono">
              {filteredWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
            </strong>{' '}
            kg
          </div>
          <Button variant="secondary" size="sm" onClick={onClose} className="w-full sm:w-auto cursor-pointer">
            Tutup
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
