import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Warehouse,
  RefreshCw,
  ArrowRight,
  ListChecks,
  Layers,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import { formatNumber } from '@/lib/utils'
import { DeliveryMomYoySection } from '../components/DeliveryMomYoySection'
import type { KpiData } from '../types/delivery-orders.types'

export default function DashboardPage() {
  const { t } = useTranslation()

  // ── State Periode Bulan Berjalan, MoM, dan YoY ─────────────────────────────
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  // ── 1. Query KPI Umum Delivery Orders (MoM & YoY) ───────────────────────────
  const { data: kpiData, isLoading: isLoadingKpi, isFetching: isFetchingKpi, refetch: refetchKpi } = useQuery({
    queryKey: ['deliveryOrdersKpiDashboard', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getKPIs({ year: selectedYear, month: selectedMonth })
      return res.data as { data: KpiData }
    },
    staleTime: 60000,
  })

  // ── 2. Query Ringkasan Kargo On-Hand di Gudang (Pending Sea & Air) ──────────
  const { data: pendingSeaRes } = useQuery({
    queryKey: ['deliveryDashboardPendingSeaCount'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getGrouped({ page: 1, limit: 1, sent: '0', listType: '2' })
      return res.data as { meta: { total: number } }
    },
    staleTime: 60000,
  })

  const { data: pendingAirRes } = useQuery({
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

  const kpis = kpiData?.data

  const handleRefreshAll = () => {
    refetchKpi()
  }

  const handleMonthChange = (y: number, m: number) => {
    setSelectedYear(y)
    setSelectedMonth(m)
  }

  const handleResetCurrentMonth = () => {
    const curNow = new Date()
    setSelectedYear(curNow.getFullYear())
    setSelectedMonth(curNow.getMonth() + 1)
  }

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* ── Page Header ── */}
      <PageHeader
        title={t('do.inventoryTitle') || 'Distribusi & Pengantaran Lokal (Delivery Orders)'}
        subtitle={t('do.inventorySubtitle') || 'Pusat kendali distribusi surat jalan, evaluasi performa bulanan (MoM & YoY), dan inventori kargo gudang.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: 'Distribusi & DO' },
          { label: t('nav.dashboard') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link to={ROUTES.DELIVERY_ORDERS_INVENTORY}>
              <Button variant="primary" size="sm" className="gap-1.5 cursor-pointer shadow-xs font-semibold">
                <Warehouse size={14} />
                <span>Inventori Stok Gudang</span>
              </Button>
            </Link>
            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer shadow-xs font-semibold">
                <ListChecks size={14} />
                <span>Daftar Surat Jalan</span>
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isFetchingKpi}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFetchingKpi ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* ── Performa Bulan Berjalan, Komparasi MoM & YoY, serta Tren Distribusi ── */}
      <DeliveryMomYoySection
        kpis={kpis}
        isLoading={isLoadingKpi}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onResetCurrentMonth={handleResetCurrentMonth}
      />

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
            <Link
              to={ROUTES.DELIVERY_ORDERS_INVENTORY}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <span>Kelola Stok & Buat Surat Jalan</span>
              <ArrowRight size={13} />
            </Link>
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

      {/* Navigation Shortcut Cards to Logistics Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Link
          to={ROUTES.DELIVERY_ORDERS_INVENTORY}
          className="group flex flex-col justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-xs hover:border-[var(--color-tertiary)] hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--color-primary)] group-hover:text-[var(--color-tertiary)] transition-colors">
                Inventori Stok Gudang
              </h4>
              <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                Kelola kargo tiba di gudang dan terbitkan Surat Jalan pengiriman per listcode.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-semibold text-[var(--color-tertiary)] gap-1">
            <span>Buka Inventori</span>
            <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

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
                Daftar & Riwayat DO
              </h4>
              <p className="text-xs text-[var(--color-secondary)] mt-1 line-clamp-2">
                Eksplorasi tabel surat jalan, pencarian nomor SJ, tracking pengantaran, dan cetak DO.
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
