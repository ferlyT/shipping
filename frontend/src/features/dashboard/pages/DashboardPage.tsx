import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  FileText,
  Truck,
  Box,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  X,
  Plane,
  Ship,
  TrendingUp,
  CreditCard,
  Warehouse,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { dashboardApi } from '../services/dashboard.service'
import { useToastStore } from '@/stores/toastStore'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ROUTES } from '@/lib/constants'
import {
  formatDate,
  formatCurrency,
  formatCompactRupiah,
  formatNumber,
  formatDecimal,
  displayCustName,
} from '@/lib/utils'
import type { DashboardStats, ActionableAlertConsignee } from '../types/dashboard.types'
import { useTranslation } from '@/hooks/useTranslation'

function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="p-4 sm:p-6 w-full space-y-6 pb-24 font-[var(--font-body)]">
      <PageHeader
        title={t('dashboard.overviewTitle')}
        subtitle={t('dashboard.overviewSubtitle')}
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.dashboard'), path: ROUTES.DASHBOARD },
          { label: t('dashboard.overviewTitle') },
        ]}
      />

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} variant="bordered" className="h-full">
            <Card.Body className="p-3.5 sm:p-5 flex flex-col justify-between h-full gap-3">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                <div className="w-8 h-8 rounded-xl skeleton-shimmer shrink-0" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-28 rounded skeleton-shimmer" />
                <div className="h-3 w-20 rounded skeleton-shimmer" />
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Actionable Alerts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="h-32 rounded-xl border border-[var(--color-border)] p-4 skeleton-shimmer" />
        ))}
      </div>

      {/* DO Pipeline Skeleton */}
      <div className="h-36 rounded-xl border border-[var(--color-border)] p-4 skeleton-shimmer" />

      {/* Financial Overview Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-28 rounded-xl border border-[var(--color-border)] p-4 skeleton-shimmer" />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { addToast } = useToastStore()
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // State for Alert Consignee Detail Modal
  const [alertModal, setAlertModal] = useState<{
    open: boolean
    type: 'eta' | 'sla'
    title: string
    subtitle: string
    items: ActionableAlertConsignee[]
  }>({
    open: false,
    type: 'eta',
    title: '',
    subtitle: '',
    items: [],
  })

  useEffect(() => {
    fetchStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const res = await dashboardApi.stats()
      setData(res.data.data)
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : t('dashboard.errorLoad'),
        type: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !data) return <DashboardSkeleton />

  const statCards = [
    {
      title: t('dashboard.totalCustomers'),
      value: data.metrics.totalCustomers,
      icon: Users,
      accentColor: '#3B82F6',
      trend: data.trends.customers,
      link: ROUTES.CUSTOMERS,
    },
    {
      title: t('dashboard.totalInvoices'),
      value: data.metrics.totalInvoices,
      subValue: formatCurrency(data.metrics.totalInvoiceAmount),
      icon: FileText,
      accentColor: '#10B981',
      trend: data.trends.invoices,
      link: ROUTES.BILLING,
    },
    {
      title: t('dashboard.totalDeliveryOrders'),
      value: data.metrics.totalDeliveryOrders,
      icon: Truck,
      accentColor: '#F59E0B',
      trend: data.trends.deliveryOrders,
      link: ROUTES.DELIVERY_ORDERS,
    },
    {
      title: t('dashboard.totalShipments'),
      value: data.metrics.totalShipments,
      icon: Box,
      accentColor: '#8B5CF6',
      trend: data.trends.shipments,
      link: ROUTES.SHIPMENTS,
    },
  ]

  const openEtaModal = () => {
    setAlertModal({
      open: true,
      type: 'eta',
      title: t('dashboard.etaNotExit'),
      subtitle: `${data.actionableAlerts?.etaNotExit?.total || 0} ${t('dashboard.etaNotExitDesc')}`,
      items: data.actionableAlerts?.etaNotExit?.topConsignees || [],
    })
  }

  const openSlaModal = () => {
    setAlertModal({
      open: true,
      type: 'sla',
      title: t('dashboard.missedSla'),
      subtitle: `${data.actionableAlerts?.missedTargetSLA?.total || 0} ${t('dashboard.missedSlaDesc')}`,
      items: data.actionableAlerts?.missedTargetSLA?.topConsignees || [],
    })
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={t('dashboard.overviewTitle')}
        subtitle={t('dashboard.overviewSubtitle')}
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.dashboard'), path: ROUTES.DASHBOARD },
          { label: t('dashboard.overviewTitle') },
        ]}
      />

      {/* ─── Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <Link key={idx} to={stat.link} className="no-underline">
            <Card variant="accent" accentColor={stat.accentColor} className="h-full hover:shadow-md transition-all">
              <Card.Body className="p-3.5 sm:p-5 flex flex-col justify-between h-full gap-2 sm:gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--color-secondary)] truncate">
                    {stat.title}
                  </span>
                  <div className="p-1.5 sm:p-2 rounded-xl bg-[var(--color-neutral)] shrink-0" style={{ color: stat.accentColor }}>
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  <h3 className="text-xl sm:text-3xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums tracking-tight">
                    {formatNumber(stat.value)}
                  </h3>

                  <div>
                    {stat.trend ? (
                      <div className={`flex items-center gap-1 text-[11px] sm:text-xs font-medium ${stat.trend.type === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stat.trend.type === 'up' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span className="truncate">
                          {stat.trend.value} {stat.trend.label === 'vs bulan lalu' ? t('dashboard.vsLastMonth') : stat.trend.label}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] sm:text-xs text-[var(--color-muted)]">
                        <span>{t('dashboard.noTrendData')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {stat.subValue && (
                  <div className="border-t border-[var(--color-border)] pt-1.5 sm:pt-2 text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                    {stat.subValue}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Link>
        ))}
      </div>

      {/* ─── 1. Operasional Lapangan & Peringatan Dini (Actionable Alerts) ─── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
              {t('dashboard.actionableAlerts')}
            </h2>
          </div>
          <Link
            to={ROUTES.SHIPMENT_BATCHES}
            className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
          >
            {t('common.detail')} Batch <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: ETA Not Exit */}
          <div className="rounded-xl border border-amber-500/30 bg-transparent p-4 flex flex-col justify-between gap-3 hover:border-amber-500/60 transition-all shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {t('dashboard.etaNotExit')}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-secondary)] line-clamp-1">
                    {t('dashboard.etaNotExitDesc')}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {formatNumber(data.actionableAlerts?.etaNotExit?.total || 0)}
                </span>
                <span className="text-xs text-[var(--color-secondary)] ml-1">batch</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
              <div className="flex items-center gap-3 text-[var(--color-secondary)]">
                <span>
                  Udara:{' '}
                  <strong className="text-[var(--color-primary)] font-semibold">
                    {data.actionableAlerts?.etaNotExit?.air || 0}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Laut:{' '}
                  <strong className="text-[var(--color-primary)] font-semibold">
                    {data.actionableAlerts?.etaNotExit?.sea || 0}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={openEtaModal}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                {t('dashboard.viewDelayedConsignees')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2: Missed Target SLA */}
          <div className="rounded-xl border border-rose-500/30 bg-transparent p-4 flex flex-col justify-between gap-3 hover:border-rose-500/60 transition-all shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                    {t('dashboard.missedSla')}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-secondary)] line-clamp-1">
                    {t('dashboard.missedSlaDesc')}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {formatNumber(data.actionableAlerts?.missedTargetSLA?.total || 0)}
                </span>
                <span className="text-xs text-[var(--color-secondary)] ml-1">batch</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs">
              <div className="flex items-center gap-3 text-[var(--color-secondary)]">
                <span>
                  Udara:{' '}
                  <strong className="text-[var(--color-primary)] font-semibold">
                    {data.actionableAlerts?.missedTargetSLA?.air || 0}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Laut:{' '}
                  <strong className="text-[var(--color-primary)] font-semibold">
                    {data.actionableAlerts?.missedTargetSLA?.sea || 0}
                  </strong>
                </span>
              </div>
              <button
                type="button"
                onClick={openSlaModal}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                {t('dashboard.viewDelayedConsignees')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Distribusi & Pengantaran Lokal (Delivery Orders Pipeline) ─── */}
      <Card variant="bordered">
        <Card.Header
          title={t('dashboard.deliveryPipeline')}
          subtitle={t('dashboard.deliveryPipelineSub')}
          icon={<Truck className="w-4 h-4 text-amber-600" />}
          action={
            <Link
              to={ROUTES.DELIVERY_ORDERS}
              className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
            >
              {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />
        <Card.Body className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Scheduled */}
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-transparent space-y-1">
              <span className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
                {t('dashboard.doScheduled')}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                {formatNumber(data.deliveryStatus?.scheduled || 0)}
              </div>
              <div className="text-[11px] text-[var(--color-secondary)]">Surat jalan terbit</div>
            </div>

            {/* On Delivery */}
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-transparent space-y-1">
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                {t('dashboard.doOnDelivery')}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {formatNumber(data.deliveryStatus?.onDelivery || 0)}
              </div>
              <div className="text-[11px] text-[var(--color-secondary)]">Armada dalam perjalanan</div>
            </div>

            {/* Delivered */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-transparent space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t('dashboard.doDelivered')}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatNumber(data.deliveryStatus?.delivered || 0)}
              </div>
              <div className="text-[11px] text-[var(--color-secondary)]">Barang telah sampai</div>
            </div>

            {/* Outstanding SJ */}
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-transparent space-y-1">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {t('dashboard.doOutstanding')}
              </span>
              <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {formatNumber(data.deliveryStatus?.outstandingSJ || 0)}
              </div>
              <div className="text-[11px] text-[var(--color-secondary)]">Menunggu tanda terima kembali</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-secondary)]">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[var(--color-tertiary)]" />
              <span>
                {t('dashboard.totalDistributed')}:{' '}
                <strong className="text-[var(--color-primary)] font-semibold">
                  {formatNumber(data.deliveryStatus?.totalPackages || 0)} Koli
                </strong>{' '}
                •{' '}
                <strong className="text-[var(--color-primary)] font-semibold">
                  {formatDecimal(data.deliveryStatus?.totalWeight || 0, 1)} Kg
                </strong>
              </span>
            </div>
            <Link
              to={ROUTES.DELIVERY_ORDERS_LIST}
              className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline"
            >
              Buka Manajemen Surat Jalan →
            </Link>
          </div>
        </Card.Body>
      </Card>

      {/* ─── 3. Keuangan & Arus Kas (Billing & Cash Flow) ───────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
              {t('dashboard.financialOverview')}
            </h2>
          </div>
          <Link
            to={ROUTES.BILLING_VALIDATION_LIST}
            className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
          >
            Audit Validasi <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Draft Invoices Pending Validation */}
          <Link to={ROUTES.BILLING_VALIDATION_LIST} className="no-underline">
            <Card variant="bordered" className="h-full hover:border-[var(--color-tertiary)] transition-all">
              <Card.Body className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
                    {t('dashboard.draftQueue')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-500 bg-transparent">
                    {formatNumber(data.financialOverview?.draftInvoicesCount || 0)} Draft
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] tabular-nums">
                  {formatCurrency(data.financialOverview?.draftInvoicesAmount || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.draftQueueDesc')}
                </p>
              </Card.Body>
            </Card>
          </Link>

          {/* Overdue Invoices */}
          <Link to={ROUTES.BILLING} className="no-underline">
            <Card variant="bordered" className="h-full hover:border-rose-500/50 transition-all">
              <Card.Body className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    {t('dashboard.overdueInvoices')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-rose-500/40 text-rose-500 bg-transparent">
                    {formatNumber(data.financialOverview?.overdueInvoicesCount || 0)} Inv
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatCompactRupiah(data.financialOverview?.overdueInvoicesAmount || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.overdueDesc')}
                </p>
              </Card.Body>
            </Card>
          </Link>

          {/* Monthly Revenue */}
          <Link to={ROUTES.BILLING} className="no-underline">
            <Card variant="bordered" className="h-full hover:border-emerald-500/50 transition-all">
              <Card.Body className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {t('dashboard.monthlyRevenue')}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-500 bg-transparent">
                    {formatNumber(data.financialOverview?.monthlyInvoicesCount || 0)} Terbit
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCompactRupiah(data.financialOverview?.monthlyRevenue || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.monthlyRevenueDesc')}
                </p>
              </Card.Body>
            </Card>
          </Link>
        </div>
      </div>

      {/* ─── 4. Analitik Jalur Asal (Origin) & Jadwal Kedatangan Mendatang ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origin Volume & Weight Share */}
        <Card variant="bordered">
          <Card.Header
            title={t('dashboard.originAnalytics')}
            subtitle={t('dashboard.originAnalyticsSub')}
            icon={<TrendingUp className="w-4 h-4 text-sky-500" />}
          />
          <Card.Body className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider font-semibold bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)] text-[var(--color-secondary)]">
                  <tr>
                    <th className="py-2 px-3.5">Cabang Asal</th>
                    <th className="py-2 px-3 text-right">Resi (Air/Sea)</th>
                    <th className="py-2 px-3 text-right">Volume (m³)</th>
                    <th className="py-2 px-3.5 text-right">Berat (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {(data.originAnalytics?.branches || []).slice(0, 6).map((branch) => (
                    <tr key={branch.branchCode} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                      <td className="py-2.5 px-3.5 font-bold text-[var(--color-primary)]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-tertiary)]" />
                          {branch.branchCode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-[var(--color-secondary)] tabular-nums">
                        {formatNumber(branch.totalShipments)}{' '}
                        <span className="text-[10.5px] opacity-70">
                          ({branch.airShipments}/{branch.seaShipments})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-[var(--color-primary)] tabular-nums">
                        {formatDecimal(branch.totalVolume, 2)} m³
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-semibold text-[var(--color-primary)] tabular-nums">
                        {formatDecimal(branch.totalWeight, 1)} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>

        {/* Upcoming Arrivals (48-72 Hours) */}
        <Card variant="bordered">
          <Card.Header
            title={t('dashboard.upcomingArrivals')}
            subtitle={t('dashboard.upcomingArrivalsSub')}
            icon={<Calendar className="w-4 h-4 text-emerald-500" />}
            action={
              <Link
                to={ROUTES.SHIPMENT_BATCHES}
                className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1"
              >
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card.Body className="p-0 divide-y divide-[var(--color-border)]">
            {(data.originAnalytics?.upcomingArrivals || []).length > 0 ? (
              (data.originAnalytics?.upcomingArrivals || []).slice(0, 5).map((batch) => (
                <div key={batch.markingCode} className="p-3 sm:p-3.5 hover:bg-[var(--color-neutral)]/40 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs font-mono text-[var(--color-primary)]">
                        {batch.markingCode}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-transparent text-[var(--color-secondary)]">
                        {batch.listType === 1 ? (
                          <>
                            <Plane className="w-3 h-3 text-sky-500" /> Udara
                          </>
                        ) : (
                          <>
                            <Ship className="w-3 h-3 text-emerald-500" /> Laut
                          </>
                        )}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-primary)]">
                        {batch.branchCode}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ETA: {batch.eta ? formatDate(batch.eta) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                    <span className="truncate max-w-[200px]" title={batch.consignee || 'Unknown'}>
                      Consignee: <strong className="text-[var(--color-primary)]">{batch.consignee || 'Unknown'}</strong>
                    </span>
                    <span>Gudang: {batch.gudang || '—'}</span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t('dashboard.noUpcoming')} className="m-4" />
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ─── Chart Section ────────────────────────────────────────── */}
      <Card variant="bordered">
        <Card.Header
          title={t('dashboard.chartTitle')}
          subtitle={t('dashboard.chartSubtitle')}
        />
        <Card.Body className="p-3 sm:p-6">
          <div className="h-[280px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-secondary)' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--color-secondary)' }}
                  tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.08)' }}
                  labelStyle={{ fontWeight: 'bold', color: 'var(--color-primary)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} />
                <Line name={t('dashboard.legendInvoices')} type="monotone" dataKey="invoices" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line name={t('dashboard.legendDeliveryOrders')} type="monotone" dataKey="deliveryOrders" stroke="#F59E0B" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line name={t('dashboard.legendShipments')} type="monotone" dataKey="shipments" stroke="#8B5CF6" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* ─── Recent Activities ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="bordered">
          <Card.Header
            title={t('dashboard.recentInvoices')}
            icon={<FileText className="w-4 h-4 text-emerald-600" />}
            action={
              <Link to={ROUTES.BILLING} className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card.Body className="p-0 divide-y divide-[var(--color-border)]">
            {data.recentActivity.invoices.length > 0 ? (
              data.recentActivity.invoices.map((invoice) => (
                <div key={invoice.fdInvNo} className="p-4 hover:bg-[var(--color-neutral)]/50 transition-colors flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-sm text-[var(--color-primary)]">{displayCustName(invoice.customer?.fdCustName || invoice.fdCustCode, t('dashboard.unknownCustomer'))}</div>
                    <div className="text-xs text-[var(--color-secondary)] font-mono mt-0.5">{invoice.fdInvNo} • {formatDate(invoice.fdInvDate)}</div>
                  </div>
                  <div className="text-right font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(invoice.fdJumlah1)}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t('dashboard.noRecentInvoices')} className="m-4" />
            )}
          </Card.Body>
        </Card>

        <Card variant="bordered">
          <Card.Header
            title={t('dashboard.recentDeliveryOrders')}
            icon={<Truck className="w-4 h-4 text-amber-600" />}
            action={
              <Link to={ROUTES.DELIVERY_ORDERS} className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1">
                {t('common.viewAll')} <ArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <Card.Body className="p-0 divide-y divide-[var(--color-border)]">
            {data.recentActivity.deliveryOrders.length > 0 ? (
              data.recentActivity.deliveryOrders.map((doItem) => {
                const markingCode = doItem.entryList?.fdMarkingCode
                const markingNo = doItem.entryList?.fdMarkingNo
                const satuan = doItem.entryList?.fdSatuan || doItem.fdSatuan || 'Pack'
                const packQty = doItem.fdJmlPackSJ != null ? Number(doItem.fdJmlPackSJ) : null
                const berat = doItem.fdJmlBeratSJ != null ? Number(doItem.fdJmlBeratSJ) : null

                return (
                  <div key={doItem.fdSJNo} className="p-4 hover:bg-[var(--color-neutral)]/50 transition-colors space-y-1">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--color-primary)] font-mono">{doItem.fdSJNo}</span>
                        {(markingCode || markingNo) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                            {markingCode} {markingNo ? `#${markingNo}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-secondary)] truncate max-w-[160px] font-medium" title={displayCustName(doItem.fdCustNameSJ || doItem.fdCustCode)}>
                        {displayCustName(doItem.fdCustNameSJ || doItem.fdCustCode)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-[var(--color-secondary)]">
                      <span>
                        {doItem.fdCarID ? ` ${doItem.fdCarID.trim()}` : '—'} • {formatDate(doItem.fdSJDate)}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {packQty != null ? `${formatNumber(packQty)} ${satuan.trim()}` : '—'}
                        {berat != null ? ` • ${formatDecimal(berat, 2)} Kg` : ''}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState title={t('dashboard.noRecentDeliveryOrders')} className="m-4" />
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ─── Modal Rincian Consignee Alert ─────────────────────────── */}
      {alertModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
                  {alertModal.title}
                </h3>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  {alertModal.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}
                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {alertModal.items.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--color-secondary)]">
                  Tidak ada rincian consignee yang mengalami deviasi saat ini.
                </div>
              ) : (
                alertModal.items.map((consignee, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--color-border)] bg-transparent space-y-2 hover:border-[var(--color-tertiary)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--color-primary)]">
                        {consignee.name || 'Unknown Consignee'}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded border ${
                          alertModal.type === 'eta'
                            ? 'border-amber-500/40 text-amber-500'
                            : 'border-rose-500/40 text-rose-500'
                        }`}
                      >
                        {consignee.count} BATCH
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(consignee.codes || []).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs"
                        >
                          <span className="font-mono font-semibold text-[var(--color-primary)]">
                            {b.code}
                          </span>
                          {alertModal.type === 'eta' ? (
                            <span className="text-[11px] font-bold text-amber-500">
                              +{b.aging} hari
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-500">
                              {b.transit}h / tgt {b.target}h
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex justify-end">
              <button
                type="button"
                onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg border border-[var(--color-border)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}