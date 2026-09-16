import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Warehouse,
  Boxes,
  FileText, 
  Weight, 
  RefreshCw,
  ArrowRight,
  ListChecks,
  Layers,
  Truck,
  Clock,
  CheckCircle2,
  Search,
  Ship,
  Plane,
  Eye,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { ROUTES } from '@/lib/constants'
import { usePagination } from '@/hooks/usePagination'
import { useDebounce } from '@/hooks/useDebounce'
import { formatNumber, cn } from '@/lib/utils'
import type { KpiData, GroupedDataRow, ListType } from '../types/delivery-orders.types'

export default function DashboardPage() {
  const { t } = useTranslation()

  // ── State Filter Inventori Stok Gudang ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ListType>('sea')
  const [statusFilter, setStatusFilter] = useState<'0' | '1' | 'all'>('0') // default: 0 = belum kirim / di gudang
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 350)
  const inventoryPg = usePagination(10)

  // ── 1. Query KPI Umum Delivery Orders ───────────────────────────────────────
  const { data: kpiData, isLoading: isLoadingKpi, isFetching: isFetchingKpi, refetch: refetchKpi } = useQuery({
    queryKey: ['deliveryOrdersKpiDashboard'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getKPIs({})
      return res.data as { data: KpiData }
    },
    staleTime: 60000,
  })

  // ── 2. Query Ringkasan Kargo On-Hand di Gudang (Pending Sea & Air) ──────────
  const { data: pendingSeaRes, isLoading: isLoadingPendingSea } = useQuery({
    queryKey: ['deliveryDashboardPendingSeaCount'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({ page: 1, limit: 1, sent: '0', listType: '2' })
      return res.data as { meta: { total: number } }
    },
    staleTime: 60000,
  })

  const { data: pendingAirRes, isLoading: isLoadingPendingAir } = useQuery({
    queryKey: ['deliveryDashboardPendingAirCount'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({ page: 1, limit: 1, sent: '0', listType: '1' })
      return res.data as { meta: { total: number } }
    },
    staleTime: 60000,
  })

  const totalPendingSea = pendingSeaRes?.meta?.total ?? 0
  const totalPendingAir = pendingAirRes?.meta?.total ?? 0
  const totalWarehouseCargoOnHand = totalPendingSea + totalPendingAir

  // ── 3. Query Tabel Data Inventori Stok Gudang ────────────────────────────────
  const {
    data: inventoryResponseData,
    isLoading: isLoadingInventory,
    isFetching: isFetchingInventory,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: [
      'deliveryDashboardInventory',
      activeTab,
      statusFilter,
      inventoryPg.page,
      inventoryPg.limit,
      debouncedSearch,
    ],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({
        page: inventoryPg.page,
        limit: inventoryPg.limit,
        sent: statusFilter === 'all' ? undefined : statusFilter,
        listType: activeTab === 'air' ? '1' : '2',
        search: debouncedSearch || undefined,
      })
      return res.data as { data: GroupedDataRow[]; meta: { total: number } }
    },
    staleTime: 30000,
  })

  const inventoryItems: GroupedDataRow[] = inventoryResponseData?.data || []
  const inventoryTotal = inventoryResponseData?.meta?.total || 0
  const inventoryTotalPages = Math.ceil(inventoryTotal / inventoryPg.limit) || 1

  const kpis = kpiData?.data

  const handleRefreshAll = () => {
    refetchKpi()
    refetchInventory()
  }

  const handleTabChange = (type: ListType) => {
    setActiveTab(type)
    inventoryPg.reset()
  }

  const handleStatusFilterChange = (status: '0' | '1' | 'all') => {
    setStatusFilter(status)
    inventoryPg.reset()
  }

  const scrollToInventorySection = () => {
    const el = document.getElementById('warehouse-inventory-panel')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* ── Page Header ── */}
      <PageHeader
        title={t('do.inventoryTitle') || 'Surat Jalan & Inventori Gudang'}
        subtitle={t('do.inventorySubtitle') || 'Pusat kendali stok kargo di gudang (on-hand inventory), kargo siap kirim, dan pelacakan surat jalan pengiriman.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: 'Inventori Gudang & DO' },
          { label: t('nav.dashboard') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="primary" size="sm" className="gap-1.5 cursor-pointer shadow-xs font-semibold">
                <ListChecks size={14} />
                <span>Buka Modul Surat Jalan</span>
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isFetchingKpi || isFetchingInventory}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFetchingKpi || isFetchingInventory ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* ── KPI Cards: Inventori Gudang & Delivery Orders ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Stok Kargo di Gudang (Warehouse On-Hand) */}
        <div className="col-span-2 sm:col-span-1 flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs relative overflow-hidden group hover:border-amber-500/50 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-amber-500/30 text-amber-500">
              <Warehouse className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              Di Gudang
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Stok Kargo Gudang
          </p>
          {isLoadingPendingSea || isLoadingPendingAir ? (
            <div className="mt-2 h-7 sm:h-8 w-24 rounded-md skeleton-shimmer" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-none font-mono">
                {formatNumber(totalWarehouseCargoOnHand)}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-secondary)]">
                Item Kargo
              </span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-secondary)] mt-1 truncate">
            {formatNumber(totalPendingSea)} Laut · {formatNumber(totalPendingAir)} Udara
          </p>
        </div>

        {/* KPI 2: Kargo Selesai Keluar / Terkirim */}
        <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-emerald-500/30 text-emerald-500">
              <Boxes className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              Terkirim
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Total Koli Terkirim
          </p>
          {isLoadingKpi ? (
            <div className="mt-2 h-7 sm:h-8 w-24 rounded-md skeleton-shimmer" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-none font-mono">
                {formatNumber(kpis?.totalPackages || 0)}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-secondary)]">
                Koli
              </span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-secondary)] mt-1 truncate">
            Surat jalan terselesaikan
          </p>
        </div>

        {/* KPI 3: Total Dokumen Surat Jalan */}
        <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs relative overflow-hidden group hover:border-blue-500/50 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-blue-500/30 text-blue-500">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
              Dokumen DO
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Total Surat Jalan
          </p>
          {isLoadingKpi ? (
            <div className="mt-2 h-7 sm:h-8 w-24 rounded-md skeleton-shimmer" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400 leading-none font-mono">
                {formatNumber(kpis?.totalSJ || 0)}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-secondary)]">
                SJ
              </span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-secondary)] mt-1 truncate">
            Riwayat sejak bulan lalu
          </p>
        </div>

        {/* KPI 4: Total Berat Muatan */}
        <div className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs relative overflow-hidden group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-purple-500/30 text-purple-500">
              <Weight className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              Tonase
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            Total Berat Kargo
          </p>
          {isLoadingKpi ? (
            <div className="mt-2 h-7 sm:h-8 w-24 rounded-md skeleton-shimmer" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400 leading-none font-mono">
                {formatNumber(kpis?.totalWeight || 0)}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-secondary)]">
                kg
              </span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-secondary)] mt-1 truncate">
            Bobot timbangan terverifikasi
          </p>
        </div>

        {/* KPI 5: Dalam Pengantaran (On Delivery) */}
        <Link 
          to={ROUTES.DELIVERY_ORDERS_LIST}
          className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-5 shadow-xs relative overflow-hidden group hover:border-sky-500/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-sky-500/30 text-sky-500">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400">
              On Delivery
            </span>
          </div>
          <p className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            {t('do.onDelivery') || 'Dalam Pengantaran'}
          </p>
          {isLoadingKpi ? (
            <div className="mt-2 h-7 sm:h-8 w-24 rounded-md skeleton-shimmer" />
          ) : (
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-xl sm:text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400 leading-none font-mono">
                {formatNumber(kpis?.onDelivery || 0)}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-secondary)]">
                SJ
              </span>
            </div>
          )}
          <p className="text-[10px] text-[var(--color-secondary)] mt-1 truncate">
            {t('do.onDeliveryDesc') || 'Armada bertugas di jalan'}
          </p>
        </Link>
      </div>

      {/* ── Pipeline Alur Pergudangan (Warehouse Workflow Cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Stok Barang di Gudang (Awaiting Delivery Order) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-amber-500/30 text-amber-500 shrink-0">
                <Warehouse className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-primary)] truncate">
                  Stok Mengendap di Gudang (Ready to Ship)
                </h4>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5 leading-snug">
                  Kargo manifest yang telah tiba di gudang dan siap diterbitkan surat jalan pengiriman kepada customer.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-amber-500/40 text-amber-500 shrink-0">
              {formatNumber(totalWarehouseCargoOnHand)} Item
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-[var(--color-secondary)]">
              Pantau kargo masuk yang belum dikirim
            </span>
            <button
              type="button"
              onClick={scrollToInventorySection}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <span>Lihat Tabel Stok Gudang</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Card 2: Kargo Selesai Terdistribusi (Delivered & Completed) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-transparent border border-emerald-500/30 text-emerald-500 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-primary)] truncate">
                  Kargo Selesai Terkirim (Delivered)
                </h4>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5 leading-snug">
                  Surat jalan pengiriman yang telah berhasil diserahterimakan dan ditandatangani oleh penerima kargo.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-emerald-500/40 text-emerald-500 shrink-0">
              {formatNumber(kpis?.totalPackages || 0)} Koli
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs text-[var(--color-secondary)]">
              Arsip riwayat surat jalan lengkap
            </span>
            <Link
              to={ROUTES.DELIVERY_ORDERS_LIST}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <span>Buka Riwayat Terkirim</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── FITUR UTAMA: PANEL INVENTORI STOK KARGO DI GUDANG (WAREHOUSE INVENTORY TABLE) ── */}
      <div
        id="warehouse-inventory-panel"
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs overflow-hidden transition-all"
      >
        {/* Header Toolbar Panel Inventori */}
        <div className="p-3.5 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] shrink-0">
                <Warehouse size={16} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide flex items-center gap-2">
                  <span>Inventori Stok Kargo di Gudang</span>
                  <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] font-normal lowercase">
                    {formatNumber(inventoryTotal)} item
                  </span>
                </h3>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  Daftar kargo barang fisik yang tersimpan di gudang transit berdasarkan data manifest masuk (Entry List)
                </p>
              </div>
            </div>

            {/* Tab Moda: Laut vs Udara */}
            <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-0.5 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabChange('sea')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === 'sea'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] shadow-2xs font-bold border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Ship size={13} className="text-blue-500" />
                <span>Kapal / Laut ({formatNumber(totalPendingSea)})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('air')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  activeTab === 'air'
                    ? "bg-[var(--color-neutral)] text-[var(--color-primary)] shadow-2xs font-bold border border-[var(--color-border)]"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Plane size={13} className="text-amber-500" />
                <span>Udara ({formatNumber(totalPendingAir)})</span>
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Search & Filter Status Gudang */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Filter Status Gudang */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => handleStatusFilterChange('0')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs",
                  statusFilter === '0'
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                📦 Di Gudang (Belum Kirim)
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('1')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs",
                  statusFilter === '1'
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                ✓ Sudah Terkirim Penuh
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange('all')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap shadow-2xs",
                  statusFilter === 'all'
                    ? "bg-[var(--color-neutral)] border-[var(--color-border-strong)] text-[var(--color-primary)] font-bold"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Semua Manifest
              </button>
            </div>

            {/* Search Input Box */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    inventoryPg.reset()
                  }}
                  placeholder="Cari Marking, Customer, Resi..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/60 focus:outline-hidden focus:border-[var(--color-tertiary)] shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => refetchInventory()}
                disabled={isFetchingInventory}
                className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
                title="Refresh Data Inventori"
              >
                <RefreshCw size={13} className={isFetchingInventory ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* ── TABEL DATA INVENTORI GUDANG ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] bg-[var(--color-neutral)]/60 border-b border-[var(--color-border)] font-[var(--font-label)]">
              <tr>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Marking & Cabang</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Customer / Penerima</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Komoditi Kargo</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Resi / List Code</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)] text-center">Stok Gudang (On-Hand vs Masuk)</th>
                <th className="px-4 py-3 border-b border-[var(--color-border)]">Status Inventori</th>
                <th className="px-3 py-3 border-b border-[var(--color-border)] text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoadingInventory ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-3.5"><div className="h-4 w-24 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-36 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-28 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 w-20 rounded skeleton-shimmer" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 w-28 rounded-full skeleton-shimmer mx-auto" /></td>
                    <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full skeleton-shimmer" /></td>
                    <td className="px-3 py-3.5 text-center"><div className="h-6 w-16 rounded-md skeleton-shimmer mx-auto" /></td>
                  </tr>
                ))
              ) : inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[var(--color-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Warehouse size={32} className="text-[var(--color-secondary)]/40" />
                      <p className="font-semibold text-sm text-[var(--color-primary)]">
                        Tidak Ada Data Kargo di Gudang
                      </p>
                      <p className="text-[11px] max-w-sm">
                        {debouncedSearch
                          ? `Tidak ditemukan inventori dengan kata kunci "${debouncedSearch}". Coba ubah kata kunci pencarian.`
                          : 'Seluruh kargo untuk filter ini telah terkirim atau belum ada manifest kargo masuk.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                inventoryItems.map((row, idx) => {
                  const sisa = Number(row.sisa || 0)
                  const total = Number(row.totalQty || 0)
                  const terkirim = Number(row.totalTerkirim || 0)
                  const isFullInStock = sisa > 0 && terkirim === 0
                  const isPartial = sisa > 0 && terkirim > 0

                  const isEven = idx % 2 === 0

                  return (
                    <tr
                      key={`${row.listCode}-${row.markingCode}-${idx}`}
                      className={cn(
                        "group transition-colors hover:bg-[var(--color-neutral)]/40",
                        isEven ? "bg-[var(--color-surface)]" : "bg-[var(--color-neutral)]/20"
                      )}
                    >
                      {/* Marking & Cabang */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[var(--color-primary)] font-mono text-xs">
                            {row.markingCode?.trim() || '—'}
                          </span>
                        </div>
                        {row.branchName && (
                          <div className="text-[10px] text-[var(--color-secondary)] mt-0.5 flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] font-semibold text-[9px] uppercase tracking-wider">
                              {row.branchCode || 'BR'}
                            </span>
                            <span className="truncate max-w-[120px]">{row.branchName.trim()}</span>
                          </div>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[220px]">
                        <div className="font-semibold text-[var(--color-primary)] text-xs truncate leading-snug" title={row.customerName}>
                          {row.customerName?.trim() || '—'}
                        </div>
                      </td>

                      {/* Komoditi */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] max-w-[200px]" title={row.comodity}>
                        <div className="text-xs text-[var(--color-secondary)] truncate font-medium">
                          {row.comodity?.trim() || '—'}
                        </div>
                      </td>

                      {/* Resi / List Code */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">
                          {row.listCode}
                        </span>
                        {row.resiNo && row.resiNo.trim() && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate max-w-[140px]" title={row.resiNo.trim()}>
                            Resi: {row.resiNo.trim()}
                          </div>
                        )}
                      </td>

                      {/* Stok Gudang (On-Hand vs Masuk) */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1 text-xs font-bold font-mono">
                            <span className={cn(
                              sisa > 0 ? "text-amber-600 dark:text-amber-400 font-extrabold" : "text-[var(--color-secondary)]"
                            )}>
                              {sisa}
                            </span>
                            <span className="text-[var(--color-secondary)] font-normal text-[11px]">
                              / {total} Koli
                            </span>
                          </div>

                          {/* Progress Meter Bar */}
                          <div className="w-24 bg-[var(--color-neutral)] h-1.5 rounded-full overflow-hidden mt-1 border border-[var(--color-border)]/60">
                            <div
                              className={cn(
                                "h-full transition-all rounded-full",
                                isFullInStock
                                  ? "bg-amber-500"
                                  : isPartial
                                    ? "bg-purple-500"
                                    : "bg-emerald-500"
                              )}
                              style={{ width: `${Math.min(100, total > 0 ? (sisa / total) * 100 : 0)}%` }}
                            />
                          </div>

                          <span className="text-[9px] font-bold text-[var(--color-secondary)] mt-0.5">
                            {isFullInStock
                              ? '100% di Gudang'
                              : isPartial
                                ? `Sisa ${sisa} Koli (${terkirim} Terkirim)`
                                : '0 Koli (Lengkap Terkirim)'}
                          </span>
                        </div>
                      </td>

                      {/* Status Inventori */}
                      <td className="px-4 py-3 border-b border-[var(--color-border)] whitespace-nowrap">
                        {isFullInStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400">
                            <Clock size={11} className="shrink-0" />
                            <span>Stok Gudang</span>
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-transparent border border-purple-500/40 text-purple-600 dark:text-purple-400">
                            <Layers size={11} className="shrink-0" />
                            <span>Parsial Kirim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={11} className="shrink-0" />
                            <span>Terkirim</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="px-3 py-3 border-b border-[var(--color-border)] text-center whitespace-nowrap">
                        <Link
                          to={`${ROUTES.DELIVERY_ORDERS_LIST}?search=${encodeURIComponent(row.markingCode?.trim() || row.listCode)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] transition-all cursor-pointer shadow-2xs"
                          title="Buka pengelompokan Surat Jalan untuk kargo ini"
                        >
                          <Eye size={12} className="text-[var(--color-tertiary)]" />
                          <span>Kelola SJ</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Panel: Pagination & Quick Link */}
        <div className="p-3.5 sm:p-4 bg-[var(--color-neutral)]/40 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
            <span>Menampilkan data stok kargo moda <strong>{activeTab === 'sea' ? 'Laut' : 'Udara'}</strong></span>
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap ml-auto">
            <Pagination
              page={inventoryPg.page}
              totalPages={inventoryTotalPages}
              onPageChange={inventoryPg.goToPage}
              total={inventoryTotal}
              limit={inventoryPg.limit}
            />

            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="secondary" size="sm" className="gap-1 text-xs cursor-pointer">
                <span>Buka Seluruh Daftar DO</span>
                <ArrowRight size={12} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Shortcut Cards to Logistics Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Link
          to={ROUTES.DELIVERY_ORDERS_LIST}
          className="group flex flex-col justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-xs hover:border-[var(--color-tertiary)] hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-primary)] group-hover:text-[var(--color-tertiary)] transition-colors">
                Daftar & Grouping DO
              </h4>
              <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                Eksplorasi tabel surat jalan, pengelompokan per cabang & marking, serta cetak surat jalan.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[var(--color-tertiary)] gap-1">
            <span>Buka Halaman</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to={ROUTES.SHIPMENTS}
          className="group flex flex-col justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-xs hover:border-[var(--color-tertiary)] hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-primary)] group-hover:text-[var(--color-tertiary)] transition-colors">
                Pengiriman Logistik
              </h4>
              <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                Monitoring kargo pengiriman, tracking resi, dan rincian fisik paket yang dikirimkan.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[var(--color-tertiary)] gap-1">
            <span>Buka Modul</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to={ROUTES.SHIPMENT_BATCHES}
          className="group flex flex-col justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-xs hover:border-[var(--color-tertiary)] hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-primary)] group-hover:text-[var(--color-tertiary)] transition-colors">
                Batch Marking Kontainer
              </h4>
              <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                Pantau kedatangan batch marking kontainer kapal dan status sortir muatan gudang.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[var(--color-tertiary)] gap-1">
            <span>Buka Modul</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
