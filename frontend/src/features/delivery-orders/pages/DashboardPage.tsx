import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { 
  Package, 
  FileText, 
  Weight, 
  CalendarClock,
  RefreshCw,
  ArrowRight,
  ListChecks,
  Layers,
  Truck,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useTranslation } from '@/hooks/useTranslation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/lib/constants'
import type { KpiData } from '../types/delivery-orders.types'

const kpiTokens = [
  { 
    key: 'totalSJ' as const, 
    labelKey: 'do.totalSjSinceLastMonth', 
    icon: FileText, 
    accent: 'text-blue-500', 
    chip: 'bg-transparent border border-blue-500/30 text-blue-500' 
  },
  { 
    key: 'totalPackages' as const, 
    labelKey: 'do.totalPackages', 
    icon: Package, 
    accent: 'text-emerald-500', 
    chip: 'bg-transparent border border-emerald-500/30 text-emerald-500' 
  },
  { 
    key: 'totalWeight' as const, 
    labelKey: 'do.totalWeight', 
    icon: Weight, 
    accent: 'text-purple-500', 
    chip: 'bg-transparent border border-purple-500/30 text-purple-500',
    unit: 'kg'
  },
  { 
    key: 'sjBulanIni' as const, 
    labelKey: 'do.thisMonth', 
    icon: CalendarClock, 
    accent: 'text-rose-500', 
    chip: 'bg-transparent border border-rose-500/30 text-rose-500' 
  },
]

export default function DashboardPage() {
  const { t } = useTranslation()

  const { data: kpiData, isLoading: isLoadingKpi, isFetching, refetch } = useQuery({
    queryKey: ['deliveryOrdersKpiDashboard'],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getKPIs({})
      return res.data as { data: KpiData }
    }
  })

  const kpis = kpiData?.data

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 w-full min-w-0 space-y-6 font-[var(--font-body)] animate-fadeIn pb-24">
      {/* Page Header */}
      <PageHeader
        title={t('do.title') || 'Delivery Orders'}
        subtitle={t('do.subtitle') || 'Ringkasan metrik dan ikhtisar operasional surat jalan pengiriman barang.'}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.DELIVERY_ORDERS },
          { label: t('nav.deliveryOrder') },
          { label: t('nav.dashboard') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Link to={ROUTES.DELIVERY_ORDERS_LIST}>
              <Button variant="primary" size="sm" className="gap-1.5 cursor-pointer">
                <ListChecks size={14} />
                <span>Buka Daftar Surat Jalan</span>
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              <span>{t('common.refresh')}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {kpiTokens.map(({ key, labelKey, icon: Icon, accent, chip, unit }) => (
          <div key={key} className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 sm:p-6 shadow-xs relative overflow-hidden group hover:border-[var(--color-tertiary)]/50 transition-all">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${chip}`}>
                <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${accent}`} />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
              {t(labelKey)}
            </p>
            {isLoadingKpi ? (
              <div className="mt-2 h-7 sm:h-9 w-24 sm:w-32 rounded-md skeleton-shimmer" />
            ) : (
              <div className="mt-1 flex items-baseline gap-1.5">
                <h3 className="text-xl sm:text-3xl font-bold tabular-nums text-[var(--color-primary)] leading-none font-mono">
                  {Number(kpis?.[key] || 0).toLocaleString('en-US')}
                </h3>
                {unit && (
                  <span className="text-xs sm:text-sm font-semibold text-[var(--color-secondary)]">
                    {unit}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Status & Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Status Card: Pending Delivery */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent border border-amber-500/30 text-amber-500">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-primary)]">
                  Dalam Pengiriman (Pending)
                </h4>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  Surat jalan yang belum diterima atau masih dalam proses distribusi kurir.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-amber-500/40 text-amber-500">
              Pending
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-secondary)]">
              Pantau surat jalan belum sampai
            </span>
            <Link
              to={ROUTES.DELIVERY_ORDERS_LIST}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <span>Buka Grouping Pending</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Status Card: Delivered */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent border border-emerald-500/30 text-emerald-500">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[var(--color-primary)]">
                  Selesai Diantar (Delivered)
                </h4>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  Surat jalan yang telah berhasil terkirim dan diserahterimakan kepada customer.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-transparent border border-emerald-500/40 text-emerald-500">
              Delivered
            </span>
          </div>
          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-secondary)]">
              Lihat riwayat pengiriman selesai
            </span>
            <Link
              to={ROUTES.DELIVERY_ORDERS_LIST}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-tertiary)] hover:underline cursor-pointer"
            >
              <span>Buka Riwayat Selesai</span>
              <ArrowRight size={13} />
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
