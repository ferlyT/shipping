import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  RefreshCw, 
  Search, 
  X, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Truck, 
  CheckCircle2, 
  Download, 
  Printer, 
  ShieldAlert, 
  ArrowUpDown,
  RotateCcw,
  BarChart3
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useDebounce } from '@/hooks/useDebounce'
import { useToastStore } from '@/stores/toastStore'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { DeliveryConfirmModal } from '../components/DeliveryConfirmModal'
import { DeliveryConfirmChart } from '../components/DeliveryConfirmChart'
import type { 
  DeliveryMonitoringItem, 
  DeliveryMonitoringKPIs,
  DeliveryMonitoringQueryParams 
} from '../types/delivery-orders.types'

export default function MonitoringPage() {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  // ── Tab State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'pending' | 'trends'>('pending')

  // ── Filter States ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)

  const [agingFilter, setAgingFilter] = useState<'all' | 'today' | '1-2' | '3-5' | '6-7' | '>7'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'ontime'>('all')
  const [listTypeFilter, setListTypeFilter] = useState<'all' | '1' | '2'>('all')
  const [branchFilter, setBranchFilter] = useState<string>('')
  
  // Date filters: default from beginning of 2026
  const [startDate, setStartDate] = useState<string>('2026-01-01')
  const [endDate, setEndDate] = useState<string>('')

  // Sorting
  const [sortBy, setSortBy] = useState<string>('fdSJDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [page, setPage] = useState<number>(1)
  const [limit, setLimit] = useState<number>(50)

  // Selection states for batch confirmation
  const [selectedSjNos, setSelectedSjNos] = useState<Set<string>>(new Set())

  // Modal confirmation states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false)
  const [itemsToConfirm, setItemsToConfirm] = useState<DeliveryMonitoringItem[]>([])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, agingFilter, statusFilter, listTypeFilter, branchFilter, startDate, endDate])

  // ── Query Monitoring Data ──────────────────────────────────────────────────
  const queryParams: DeliveryMonitoringQueryParams = useMemo(() => ({
    page,
    limit,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: debouncedSearch || undefined,
    aging: agingFilter !== 'all' ? agingFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    listType: listTypeFilter !== 'all' ? listTypeFilter : undefined,
    branch: branchFilter || undefined,
    sortBy,
    sortOrder,
  }), [page, limit, startDate, endDate, debouncedSearch, agingFilter, statusFilter, listTypeFilter, branchFilter, sortBy, sortOrder])

  const {
    data: responseData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['delivery-orders-monitoring', queryParams],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getMonitoring(queryParams)
      return res.data
    },
    staleTime: 15_000,
  })

  const rows: DeliveryMonitoringItem[] = responseData?.data || []
  const meta = responseData?.meta || { page: 1, limit: 50, total: 0, totalPages: 1 }
  const kpis: DeliveryMonitoringKPIs = responseData?.kpis || {
    totalPending: 0,
    overdueCount: 0,
    todayCount: 0,
    aging1to2Count: 0,
    aging3to5Count: 0,
    aging6to7Count: 0,
    agingOver7Count: 0,
    airCount: 0,
    seaCount: 0,
    totalPackages: 0,
    totalWeight: 0,
  }

  // ── Batch Selection Handlers ───────────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allNos = new Set(rows.map((r) => r.fdSJNo))
      setSelectedSjNos(allNos)
    } else {
      setSelectedSjNos(new Set())
    }
  }

  const handleToggleSelectRow = (sjNo: string) => {
    setSelectedSjNos((prev) => {
      const next = new Set(prev)
      if (next.has(sjNo)) next.delete(sjNo)
      else next.add(sjNo)
      return next
    })
  }

  const isAllCurrentPageSelected = useMemo(() => {
    if (rows.length === 0) return false
    return rows.every((r) => selectedSjNos.has(r.fdSJNo))
  }, [rows, selectedSjNos])

  // Open Single Confirm
  const handleOpenSingleConfirm = (item: DeliveryMonitoringItem) => {
    setItemsToConfirm([item])
    setIsConfirmModalOpen(true)
  }

  // Open Batch Confirm
  const handleOpenBatchConfirm = () => {
    if (selectedSjNos.size === 0) return
    const items = rows.filter((r) => selectedSjNos.has(r.fdSJNo))
    if (items.length === 0) {
      addToast({ type: 'error', message: 'Surat Jalan terpilih tidak ada di halaman ini' })
      return
    }
    setItemsToConfirm(items)
    setIsConfirmModalOpen(true)
  }

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('')
    setAgingFilter('all')
    setStatusFilter('all')
    setListTypeFilter('all')
    setBranchFilter('')
    setStartDate('2026-01-01')
    setEndDate('')
    setSortBy('fdSJDate')
    setSortOrder('desc')
    setSelectedSjNos(new Set())
  }

  // Handle Sort Change
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // ── Excel Export ───────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (rows.length === 0) {
      addToast({ type: 'info', message: 'Tidak ada data untuk diekspor' })
      return
    }

    const exportData = rows.map((r, idx) => ({
      No: idx + 1,
      'No. SJ': r.fdSJNo,
      'Tanggal SJ': r.fdSJDate ? r.fdSJDate.slice(0, 10) : '',
      'Estimasi Kirim': r.fdEstimasi ? r.fdEstimasi.slice(0, 10) : '',
      Status: r.isOverdue ? `Overdue (${r.overdueDays} hr)` : 'On-Time',
      'Aging (Hari)': r.agingDays,
      'Nama Customer': r.fdCustName || r.fdCustNameSJ,
      'Kode Cust': r.fdCustCode || '',
      'Kode List': r.fdListCode || '',
      Marking: r.fdMarkingCode || '',
      'No Marking': r.fdMarkingNo || '',
      Moda: r.fdListType === 1 ? 'Udara' : 'Laut',
      Jumlah: r.fdJmlPackSJ,
      Satuan: r.fdSatuan,
      'Berat (Kg)': r.fdJmlBeratSJ,
      'Kubikasi (M3)': r.fdM3,
      'Armada/Plat': r.fdCarID || '',
      Supir: r.fdSupir || '',
      'Telp Supir': r.fdTelpSupir || '',
      'Alamat Tujuan': r.fdAddr ? `${r.fdAddr} ${r.fdCity || ''}` : '',
      Keterangan: r.fdDescr || '',
      'Sudah Cetak': r.fdPrint === 1 ? 'Ya' : 'Belum',
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SJ_Belum_Terkirim')
    const fileName = `Monitoring_SJ_Belum_Terkirim_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    addToast({ type: 'success', message: 'File Excel berhasil diunduh' })
  }

  return (
    <div className="p-2.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-3.5 sm:space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* ── Page Header ── */}
      <PageHeader
        title={activeTab === 'pending' ? 'Monitoring Surat Jalan Belum Terkirim' : 'Monitoring & Tren Konfirmasi Terkirim'}
        subtitle={
          activeTab === 'pending'
            ? 'Pantau dan konfirmasi surat jalan yang sudah dibuat namun armada/pengiriman belum tereksekusi (fdSent = 0)'
            : 'Statistik dan histori batch surat jalan yang sudah terkirim (fdSent = 1) berdasarkan laporan cetak tbDeliveryConfirm'
        }
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrders'), path: ROUTES.DELIVERY_ORDERS_LIST },
          { label: activeTab === 'pending' ? 'Monitoring Belum Terkirim' : 'Tren Konfirmasi Terkirim' },
        ]}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            {activeTab === 'pending' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={rows.length === 0}
                  className="gap-1 sm:gap-1.5 cursor-pointer text-xs px-2 sm:px-3 py-1.5"
                >
                  <Download size={13} className="sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Ekspor Excel</span>
                  <span className="xs:hidden">Excel</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="gap-1 sm:gap-1.5 cursor-pointer text-xs px-2 sm:px-3 py-1.5"
                >
                  <RefreshCw size={13} className={cn("sm:w-3.5 sm:h-3.5", isFetching && 'animate-spin')} />
                  <span>Refresh</span>
                </Button>
              </>
            )}
            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="secondary" size="sm" className="gap-1 sm:gap-1.5 cursor-pointer text-xs px-2 sm:px-3 py-1.5">
                <span>Daftar Semua SJ</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-[var(--color-border)] pb-2 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={cn(
            "flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition cursor-pointer select-none shrink-0",
            activeTab === 'pending'
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold shadow-2xs"
              : "text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] border border-transparent"
          )}
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500 shrink-0" />
          <span className="hidden sm:inline">Surat Jalan Pending (fdSent = 0)</span>
          <span className="sm:hidden">Pending (fdSent = 0)</span>
          <span className="px-1.5 py-0.2 sm:py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-mono bg-sky-500/20 text-sky-700 dark:text-sky-300">
            {formatNumber(kpis.totalPending)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('trends')}
          className={cn(
            "flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition cursor-pointer select-none shrink-0",
            activeTab === 'trends'
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold shadow-2xs"
              : "text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] border border-transparent"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
          <span className="hidden sm:inline">Tren Konfirmasi Terkirim (tbDeliveryConfirm)</span>
          <span className="sm:hidden">Tren Konfirmasi (tbDeliveryConfirm)</span>
        </button>
      </div>

      {activeTab === 'trends' ? (
        <DeliveryConfirmChart />
      ) : (
        <>
          {/* ── KPI Ribbon Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {/* Total Belum Terkirim */}
        <div 
          onClick={() => { setAgingFilter('all'); setStatusFilter('all'); }}
          className={cn(
            "p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer select-none bg-[var(--color-surface)]",
            agingFilter === 'all' && statusFilter === 'all'
              ? "border-sky-500/70 ring-1 ring-sky-500/30 bg-sky-500/5"
              : "border-[var(--color-border)] hover:border-slate-300 dark:hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[10.5px] sm:text-[11px] uppercase tracking-wider">Total Pending</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[var(--color-primary)] font-mono">
            {formatNumber(kpis.totalPending)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10.5px] sm:text-[11px] text-[var(--color-secondary)]">
            <span>{formatNumber(kpis.totalPackages)} coly</span>
            <span>{kpis.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg</span>
          </div>
        </div>

        {/* Overdue (Lewat Estimasi) */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue'); setAgingFilter('all'); }}
          className={cn(
            "p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer select-none bg-[var(--color-surface)]",
            statusFilter === 'overdue'
              ? "border-rose-500/70 ring-1 ring-rose-500/30 bg-rose-500/10"
              : "border-[var(--color-border)] hover:border-rose-400/50"
          )}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 mb-1">
            <span className="font-medium text-[10.5px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Lewat Estimasi</span>
              <span className="xs:hidden">Overdue</span>
            </span>
            <span className="text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              Atensi
            </span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatNumber(kpis.overdueCount)}
          </div>
          <div className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--color-secondary)] truncate">
            Estimasi tanggal terlewati
          </div>
        </div>

        {/* Dibuat Hari Ini */}
        <div 
          onClick={() => { setAgingFilter(agingFilter === 'today' ? 'all' : 'today'); setStatusFilter('all'); }}
          className={cn(
            "p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer select-none bg-[var(--color-surface)]",
            agingFilter === 'today'
              ? "border-emerald-500/70 ring-1 ring-emerald-500/30 bg-emerald-500/10"
              : "border-[var(--color-border)] hover:border-emerald-400/50"
          )}
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="font-medium text-[10.5px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Hari Ini
            </span>
            <span className="text-[10px] text-[var(--color-secondary)]">Aging 0d</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatNumber(kpis.todayCount)}
          </div>
          <div className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--color-secondary)]">
            Dibuat hari ini
          </div>
        </div>

        {/* Aging 1 - 2 Hari */}
        <div 
          onClick={() => { setAgingFilter(agingFilter === '1-2' ? 'all' : '1-2'); setStatusFilter('all'); }}
          className={cn(
            "p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer select-none bg-[var(--color-surface)]",
            agingFilter === '1-2'
              ? "border-amber-500/70 ring-1 ring-amber-500/30 bg-amber-500/10"
              : "border-[var(--color-border)] hover:border-amber-400/50"
          )}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
            <span className="font-medium text-[10.5px] sm:text-[11px] uppercase tracking-wider">Aging 1 - 2 Hari</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {formatNumber(kpis.aging1to2Count)}
          </div>
          <div className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--color-secondary)]">
            Proses muat armada
          </div>
        </div>

        {/* Aging > 7 Hari */}
        <div 
          onClick={() => { setAgingFilter(agingFilter === '>7' ? 'all' : '>7'); setStatusFilter('all'); }}
          className={cn(
            "p-2.5 sm:p-3.5 rounded-xl border transition cursor-pointer select-none bg-[var(--color-surface)] col-span-2 sm:col-span-1",
            agingFilter === '>7'
              ? "border-rose-500/70 ring-1 ring-rose-500/30 bg-rose-500/10"
              : "border-[var(--color-border)] hover:border-rose-400/50"
          )}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 mb-1">
            <span className="font-medium text-[10.5px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Aging &gt; 7 Hari
            </span>
            <span className="text-[10px] text-rose-400">Tertunda</span>
          </div>
          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">
            {formatNumber(kpis.agingOver7Count)}
          </div>
          <div className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--color-secondary)]">
            Periksa kendala lapangan
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="p-3 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
        {/* Row 1: Search bar & Date Range & Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari No. SJ, Customer, Marking, List Code, Supir, Plat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
            <Search className="w-4 h-4 text-[var(--color-secondary)] absolute left-3 top-2.5 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date range pickers & Reset */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-secondary)] flex-wrap sm:flex-nowrap">
            <span className="whitespace-nowrap text-[11px]">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 sm:flex-initial px-2 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40 min-w-[120px]"
            />
            <span className="whitespace-nowrap text-[11px]">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Sekarang"
              className="flex-1 sm:flex-initial px-2 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500/40 min-w-[120px]"
            />

            {/* Tombol Reset Filter */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs gap-1 shrink-0 px-2.5 py-1.5 h-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Pill Filters (Aging, Status, Moda) */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]/60 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">
          {/* Aging Filter */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-[var(--color-secondary)] mr-1 text-[11px] font-medium">Aging:</span>
            {(['all', 'today', '1-2', '3-5', '6-7', '>7'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAgingFilter(a)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none shrink-0",
                  agingFilter === a
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold shadow-2xs"
                    : "bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
                )}
              >
                {a === 'all' && 'Semua'}
                {a === 'today' && 'Hari Ini'}
                {a === '1-2' && '1-2 Hari'}
                {a === '3-5' && '3-5 Hari'}
                {a === '6-7' && '6-7 Hari'}
                {a === '>7' && '> 7 Hari'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[var(--color-border)] shrink-0 mx-1" />

          {/* Status Estimasi */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-[var(--color-secondary)] mr-1 text-[11px] font-medium">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none shrink-0",
                statusFilter === 'all'
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold shadow-2xs"
                  : "bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
              )}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none flex items-center gap-1 shrink-0",
                statusFilter === 'overdue'
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/50 font-semibold shadow-2xs"
                  : "bg-transparent border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </button>
            <button
              onClick={() => setStatusFilter('ontime')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none shrink-0",
                statusFilter === 'ontime'
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50 font-semibold shadow-2xs"
                  : "bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
              )}
            >
              On-Time
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)] shrink-0 mx-1" />

          {/* Moda Filter */}
          <div className="flex items-center gap-1 text-xs shrink-0">
            <span className="text-[var(--color-secondary)] mr-1 text-[11px] font-medium">Moda:</span>
            {(['all', '1', '2'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setListTypeFilter(m)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer select-none shrink-0",
                  listTypeFilter === m
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold shadow-2xs"
                    : "bg-transparent border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
                )}
              >
                {m === 'all' && 'Semua'}
                {m === '1' && '✈️ Udara'}
                {m === '2' && '🚢 Laut'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Batch Selection Floating Alert / Bar ── */}
      {selectedSjNos.size > 0 && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-amber-500 text-white font-bold text-[11px] w-5 h-5 flex items-center justify-center shrink-0">
              {selectedSjNos.size}
            </div>
            <span className="font-semibold">
              {selectedSjNos.size} Surat Jalan dipilih untuk konfirmasi pengiriman massal
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSelectedSjNos(new Set())}
              className="px-2.5 py-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] text-xs font-medium cursor-pointer"
            >
              Batalkan
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenBatchConfirm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 font-semibold text-xs shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Konfirmasi Kirim ({selectedSjNos.size} SJ)</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Data View: Table on Desktop & Cards on Mobile ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-2xs">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--color-primary)] border-collapse">
            <thead className="bg-[var(--color-neutral)]/70 border-b border-[var(--color-border)] text-[11px] text-[var(--color-secondary)] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-sky-500 focus:ring-sky-400 border-[var(--color-border)] w-3.5 h-3.5"
                  />
                </th>
                <th 
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[var(--color-primary)]"
                  onClick={() => handleSort('fdSJNo')}
                >
                  <div className="flex items-center gap-1">
                    No. SJ & Tanggal
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[var(--color-primary)]"
                  onClick={() => handleSort('fdCustName')}
                >
                  <div className="flex items-center gap-1">
                    Customer
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Marking & Resi</th>
                <th className="py-2.5 px-3">Moda & Muatan</th>
                <th 
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[var(--color-primary)]"
                  onClick={() => handleSort('fdEstimasi')}
                >
                  <div className="flex items-center gap-1">
                    Estimasi Kirim
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th 
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[var(--color-primary)]"
                  onClick={() => handleSort('agingDays')}
                >
                  <div className="flex items-center gap-1">
                    Aging
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Armada & Supir</th>
                <th className="py-2.5 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]/60 font-normal">
              {isLoading ? (
                // Skeleton loading state
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-3 text-center">
                      <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded mx-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--color-secondary)]">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
                    <p className="text-sm font-semibold text-[var(--color-primary)]">
                      Tidak ada Surat Jalan pending
                    </p>
                    <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                      Semua Surat Jalan sesuai kriteria pencarian sudah dikonfirmasi kirim (fdSent = 1).
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isSelected = selectedSjNos.has(row.fdSJNo)
                  return (
                    <tr
                      key={row.fdSJNo}
                      className={cn(
                        "hover:bg-[var(--color-neutral)]/50 transition",
                        isSelected && "bg-sky-500/10 dark:bg-sky-950/30"
                      )}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(row.fdSJNo)}
                          className="rounded text-sky-500 focus:ring-sky-400 border-[var(--color-border)] w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* No. SJ & Tanggal */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={ROUTES.DELIVERY_DETAIL(row.fdSJNo)}
                            className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline"
                          >
                            {row.fdSJNo}
                          </Link>
                          {row.fdPrint === 1 && (
                            <span 
                              title="Sudah Dicetak" 
                              className="p-0.5 rounded text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20"
                            >
                              <Printer className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                          {formatDate(row.fdSJDate)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="font-semibold text-[var(--color-primary)] truncate" title={row.fdCustName}>
                          {row.fdCustName}
                        </div>
                        <div className="text-[11px] font-mono text-[var(--color-secondary)]">
                          {row.fdCustCode || '-'}
                        </div>
                      </td>

                      {/* Marking & Resi */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-semibold text-[var(--color-primary)]">
                          {row.fdMarkingCode || '-'}
                          {row.fdMarkingNo ? ` / ${row.fdMarkingNo}` : ''}
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)] font-mono">
                          List: {row.fdListCode || '-'}
                        </div>
                      </td>

                      {/* Moda & Muatan */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {row.fdListType === 1 ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              ✈️ Udara
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              🚢 Laut
                            </span>
                          )}
                          <span className="font-bold text-[var(--color-primary)] font-mono">
                            {row.fdJmlPackSJ} {row.fdSatuan || 'COLY'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)]">
                          {row.fdJmlBeratSJ} kg {row.fdM3 > 0 ? `• ${row.fdM3.toFixed(4)} m³` : ''}
                        </div>
                      </td>

                      {/* Estimasi Kirim & Status Overdue */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[var(--color-primary)]">
                          {formatDate(row.fdEstimasi)}
                        </div>
                        {row.isOverdue ? (
                          <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Lewat {row.overdueDays} hari
                          </div>
                        ) : (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            On-Time
                          </div>
                        )}
                      </td>

                      {/* Aging Badge */}
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                            row.agingDays <= 0 && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                            row.agingDays >= 1 && row.agingDays <= 2 && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                            row.agingDays >= 3 && row.agingDays <= 5 && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                            row.agingDays >= 6 && row.agingDays <= 7 && "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
                            row.agingDays > 7 && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          )}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {row.agingDays === 0 ? 'Hari Ini' : `${row.agingDays} Hari`}
                        </span>
                      </td>

                      {/* Armada & Supir */}
                      <td className="py-2.5 px-3 max-w-[160px]">
                        <div className="font-mono font-semibold text-[var(--color-primary)] text-xs">
                          {row.fdCarID || '-'}
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)] truncate">
                          {row.fdSupir || '-'}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenSingleConfirm(row)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] py-1 px-2.5 h-auto flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Truck className="w-3 h-3" />
                            Kirim
                          </Button>
                          <Link
                            to={ROUTES.DELIVERY_PRINT(row.fdSJNo)}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition"
                            title="Cetak Surat Jalan"
                          >
                            <Printer className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {/* Mobile Select All Bar */}
          {rows.length > 0 && (
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-[var(--color-primary)]">
                <input
                  type="checkbox"
                  checked={isAllCurrentPageSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-400 border-[var(--color-border)] w-4 h-4 cursor-pointer"
                />
                <span>Pilih Semua di Halaman Ini ({rows.length})</span>
              </label>
            </div>
          )}

          {isLoading ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[var(--color-border)] animate-pulse space-y-2">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3.5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 px-4 text-center text-[var(--color-secondary)]">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                Tidak ada Surat Jalan pending
              </p>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                Semua Surat Jalan sesuai kriteria sudah dikonfirmasi kirim.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]/60">
              {rows.map((row) => {
                const isSelected = selectedSjNos.has(row.fdSJNo)
                return (
                  <div
                    key={row.fdSJNo}
                    className={cn(
                      "p-3 space-y-2.5 transition",
                      isSelected && "bg-sky-500/10 dark:bg-sky-950/30"
                    )}
                  >
                    {/* Header: Checkbox + SJ No + Print + Aging */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(row.fdSJNo)}
                          className="rounded text-sky-500 focus:ring-sky-400 border-[var(--color-border)] w-4 h-4 cursor-pointer mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to={ROUTES.DELIVERY_DETAIL(row.fdSJNo)}
                              className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              {row.fdSJNo}
                            </Link>
                            {row.fdPrint === 1 && (
                              <span title="Sudah Dicetak" className="p-0.5 rounded text-[9.5px] text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20">
                                <Printer className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-[var(--color-secondary)]">
                            SJ: {formatDate(row.fdSJDate)}
                          </div>
                        </div>
                      </div>

                      {/* Aging Badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0",
                          row.agingDays <= 0 && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                          row.agingDays >= 1 && row.agingDays <= 2 && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                          row.agingDays >= 3 && row.agingDays <= 5 && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                          row.agingDays >= 6 && row.agingDays <= 7 && "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
                          row.agingDays > 7 && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        )}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {row.agingDays === 0 ? 'Hari Ini' : `${row.agingDays} Hari`}
                      </span>
                    </div>

                    {/* Customer & Marking */}
                    <div className="p-2 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/60 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--color-primary)] truncate" title={row.fdCustName}>
                          {row.fdCustName}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-secondary)] shrink-0">
                          {row.fdCustCode || '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono flex-wrap">
                        <span className="px-1.5 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          🏷️ {row.fdMarkingCode || '-'}
                        </span>
                        {row.fdMarkingNo && (
                          <span className="text-[10px] text-[var(--color-secondary)]">
                            No: <b className="text-[var(--color-primary)]">{row.fdMarkingNo}</b>
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--color-secondary)]">
                          • List: {row.fdListCode || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Muatan, Moda & Estimasi */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10.5px] text-[var(--color-secondary)] block">Muatan & Moda:</span>
                        <div className="flex items-center gap-1.5">
                          {row.fdListType === 1 ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              ✈️ Udara
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              🚢 Laut
                            </span>
                          )}
                          <span className="font-bold font-mono text-[var(--color-primary)]">
                            {row.fdJmlPackSJ} {row.fdSatuan || 'COLY'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-[var(--color-secondary)] font-mono">
                          {row.fdJmlBeratSJ} kg {row.fdM3 > 0 ? `• ${row.fdM3.toFixed(4)} m³` : ''}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10.5px] text-[var(--color-secondary)] block">Estimasi Kirim:</span>
                        <div className="font-medium text-[var(--color-primary)]">
                          {formatDate(row.fdEstimasi)}
                        </div>
                        {row.isOverdue ? (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Lewat {row.overdueDays} hr
                          </div>
                        ) : (
                          <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400">
                            On-Time
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Armada, Supir & Action */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-border)]/50 gap-2">
                      <div className="flex items-center gap-1.5 text-[var(--color-secondary)] min-w-0">
                        <Truck size={12} className="text-sky-500 shrink-0" />
                        <span className="font-mono font-semibold text-[var(--color-primary)] text-[11px] shrink-0">
                          {row.fdCarID || 'Plat —'}
                        </span>
                        <span>•</span>
                        <span className="truncate text-[11px]" title={row.fdSupir || undefined}>
                          {row.fdSupir || 'Supir —'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          to={ROUTES.DELIVERY_PRINT(row.fdSJNo)}
                          target="_blank"
                          className="p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition"
                          title="Cetak SJ"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenSingleConfirm(row)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1 px-2.5 h-auto flex items-center gap-1 font-medium shadow-xs"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Kirim</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Table Footer & Pagination ── */}
        <div className="p-3 sm:p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--color-secondary)]">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full sm:w-auto">
            <span>Menampilkan {rows.length} dari {formatNumber(meta.total)} pending</span>
            <div className="flex items-center gap-1 ml-auto sm:ml-2">
              <span className="hidden xs:inline">Baris:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded text-xs text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-sky-500/40"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 h-auto text-xs"
            >
              Sebelumnya
            </Button>
            <span className="px-2 text-xs font-medium text-[var(--color-primary)] text-center">
              Hal. {page} / {meta.totalPages || 1}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 h-auto text-xs"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>
    </>
  )}

      {/* ── Delivery Confirm Modal ── */}
      <DeliveryConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        items={itemsToConfirm}
        onSuccess={() => {
          setSelectedSjNos(new Set())
          refetch()
        }}
      />
    </div>
  )
}
