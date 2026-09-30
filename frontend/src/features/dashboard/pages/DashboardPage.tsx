import { useState, useEffect, useMemo } from 'react'
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
  Calendar,
  X,
  Plane,
  Ship,
  TrendingUp,
  CreditCard,
  Warehouse,
  RefreshCw,
  Search,
  ChevronRight,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  cn,
} from '@/lib/utils'
import type { DashboardStats, ActionableAlertConsignee } from '../types/dashboard.types'
import { useTranslation } from '@/hooks/useTranslation'

function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="p-4 sm:p-6 w-full space-y-6 pb-24 font-[var(--font-body)] animate-fadeIn">
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
          <div
            key={idx}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between h-36 gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded skeleton-shimmer" />
              <div className="w-9 h-9 rounded-xl skeleton-shimmer shrink-0" />
            </div>
            <div className="space-y-2">
              <div className="h-8 w-28 rounded skeleton-shimmer" />
              <div className="h-3 w-20 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Actionable Alerts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="h-36 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 skeleton-shimmer" />
        ))}
      </div>

      {/* DO Pipeline Skeleton */}
      <div className="h-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 skeleton-shimmer" />

      {/* Financial Overview Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-32 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 skeleton-shimmer" />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 skeleton-shimmer" />
    </div>
  )
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="p-3.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-2xl text-xs space-y-2.5 min-w-[200px] backdrop-blur-md">
      <div className="font-bold text-[var(--color-primary)] font-mono border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider">Histori 12 Bln</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
              <span className="text-[var(--color-secondary)] text-[11.5px] font-medium">{item.name}</span>
            </div>
            <span className="font-bold font-mono text-[var(--color-primary)] tabular-nums">
              {formatNumber(item.value)}
            </span>
          </div>
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // Interactive Chart metric filter
  const [chartMetric, setChartMetric] = useState<'all' | 'invoices' | 'deliveryOrders' | 'shipments'>('all')

  // Search in alert modal
  const [modalSearch, setModalSearch] = useState('')

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

  const fetchStats = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      const res = await dashboardApi.stats()
      setData(res.data.data)
      setLastRefreshed(new Date())
      if (isManual) {
        addToast({
          message: 'Data dashboard berhasil diperbarui',
          type: 'success',
        })
      }
    } catch (err: unknown) {
      addToast({
        message: err instanceof Error ? err.message : t('dashboard.errorLoad'),
        type: 'error',
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const openEtaModal = () => {
    setModalSearch('')
    setAlertModal({
      open: true,
      type: 'eta',
      title: t('dashboard.etaNotExit'),
      subtitle: `${data?.actionableAlerts?.etaNotExit?.total || 0} ${t('dashboard.etaNotExitDesc')}`,
      items: data?.actionableAlerts?.etaNotExit?.topConsignees || [],
    })
  }

  const openSlaModal = () => {
    setModalSearch('')
    setAlertModal({
      open: true,
      type: 'sla',
      title: t('dashboard.missedSla'),
      subtitle: `${data?.actionableAlerts?.missedTargetSLA?.total || 0} ${t('dashboard.missedSlaDesc')}`,
      items: data?.actionableAlerts?.missedTargetSLA?.topConsignees || [],
    })
  }

  // Filtered items in modal
  const filteredModalItems = useMemo(() => {
    if (!modalSearch.trim()) return alertModal.items
    const q = modalSearch.toLowerCase().trim()
    return alertModal.items.filter((item) => {
      const matchName = (item.name || '').toLowerCase().includes(q)
      const matchCode = (item.codes || []).some((c) => (c.code || '').toLowerCase().includes(q))
      return matchName || matchCode
    })
  }, [alertModal.items, modalSearch])

  // Origin max volume for progress bar calculation
  const maxOriginVolume = useMemo(() => {
    if (!data?.originAnalytics?.branches?.length) return 1
    return Math.max(...data.originAnalytics.branches.map((b) => b.totalVolume || 0), 1)
  }, [data?.originAnalytics?.branches])

  if (isLoading || !data) return <DashboardSkeleton />

  const statCards = [
    {
      title: t('dashboard.totalCustomers'),
      value: data.metrics.totalCustomers,
      icon: Users,
      accentColor: 'text-sky-500',
      badgeBorder: 'border-sky-500/30',
      badgeBg: 'bg-sky-500/10',
      glowClass: 'from-sky-500/5 to-transparent',
      trend: data.trends.customers,
      link: ROUTES.CUSTOMERS,
    },
    {
      title: t('dashboard.totalInvoices'),
      value: data.metrics.totalInvoices,
      subValue: formatCurrency(data.metrics.totalInvoiceAmount),
      icon: FileText,
      accentColor: 'text-emerald-500',
      badgeBorder: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10',
      glowClass: 'from-emerald-500/5 to-transparent',
      trend: data.trends.invoices,
      link: ROUTES.BILLING,
    },
    {
      title: t('dashboard.totalDeliveryOrders'),
      value: data.metrics.totalDeliveryOrders,
      icon: Truck,
      accentColor: 'text-amber-500',
      badgeBorder: 'border-amber-500/30',
      badgeBg: 'bg-amber-500/10',
      glowClass: 'from-amber-500/5 to-transparent',
      trend: data.trends.deliveryOrders,
      link: ROUTES.DELIVERY_ORDERS,
    },
    {
      title: t('dashboard.totalShipments'),
      value: data.metrics.totalShipments,
      icon: Box,
      accentColor: 'text-violet-500',
      badgeBorder: 'border-violet-500/30',
      badgeBg: 'bg-violet-500/10',
      glowClass: 'from-violet-500/5 to-transparent',
      trend: data.trends.shipments,
      link: ROUTES.SHIPMENTS,
    },
  ]

  const pipelineStages = [
    {
      id: 'scheduled',
      label: t('dashboard.doScheduled'),
      subLabel: 'Surat jalan terbit',
      value: data.deliveryStatus?.scheduled || 0,
      colorClass: 'text-[var(--color-primary)]',
      borderClass: 'border-[var(--color-border)]',
      badgeClass: 'border-[var(--color-border-strong)] text-[var(--color-secondary)] bg-[var(--color-neutral)]/50',
    },
    {
      id: 'onDelivery',
      label: t('dashboard.doOnDelivery'),
      subLabel: 'Armada perjalanan',
      value: data.deliveryStatus?.onDelivery || 0,
      colorClass: 'text-sky-600 dark:text-sky-400',
      borderClass: 'border-sky-500/30 hover:border-sky-500/60',
      badgeClass: 'border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10',
    },
    {
      id: 'delivered',
      label: t('dashboard.doDelivered'),
      subLabel: 'Sampai di tujuan',
      value: data.deliveryStatus?.delivered || 0,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-emerald-500/30 hover:border-emerald-500/60',
      badgeClass: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    },
    {
      id: 'outstandingSJ',
      label: t('dashboard.doOutstanding'),
      subLabel: 'Tanda terima fisik',
      value: data.deliveryStatus?.outstandingSJ || 0,
      colorClass: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/30 hover:border-amber-500/60',
      badgeClass: 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10',
    },
  ]

  const getUrgencyBadge = (etaStr: string | null) => {
    if (!etaStr) return <span className="text-[10px] text-[var(--color-secondary)]">—</span>
    const etaDate = new Date(etaStr)
    if (isNaN(etaDate.getTime())) return <span className="text-[10px] text-[var(--color-secondary)]">—</span>
    const now = new Date()
    const diffDays = Math.ceil((etaDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Hari Ini
        </span>
      )
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
          Besok
        </span>
      )
    }
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10">
        {diffDays} Hari
      </span>
    )
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      {/* ─── Page Header with Live Telemetry & Quick Refresh ───────── */}
      <PageHeader
        title={t('dashboard.overviewTitle')}
        subtitle={t('dashboard.overviewSubtitle')}
        breadcrumbs={[
          { label: t('module.overview'), path: ROUTES.DASHBOARD },
          { label: t('nav.dashboard'), path: ROUTES.DASHBOARD },
          { label: t('dashboard.overviewTitle') },
        ]}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Aktif
            </div>

            <button
              type="button"
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-primary)] hover:border-[var(--color-tertiary)]/50 hover:bg-[var(--color-neutral)] transition-all cursor-pointer disabled:opacity-60 shadow-xs"
              title={`Diperbarui pukul ${lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin text-[var(--color-tertiary)]')} />
              <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan'}</span>
            </button>
          </div>
        }
      />

      {/* ─── Metric Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, idx) => (
          <Link key={idx} to={stat.link} className="no-underline group">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)]/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-full p-4 sm:p-5 relative overflow-hidden">
              {/* Subtle top corner gradient shimmer */}
              <div className={cn('absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br opacity-50 blur-xl pointer-events-none', stat.glowClass)} />

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] truncate">
                    {stat.title}
                  </span>
                  <div className={cn('p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105', stat.badgeBorder, stat.badgeBg, stat.accentColor)}>
                    <stat.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)] font-[var(--font-label)] tabular-nums tracking-tight">
                    {formatNumber(stat.value)}
                  </div>

                  <div>
                    {stat.trend ? (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold">
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10.5px]',
                            stat.trend.type === 'up'
                              ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                              : 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                          )}
                        >
                          {stat.trend.type === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stat.trend.value}
                        </span>
                        <span className="text-[var(--color-secondary)] text-[10.5px] truncate">
                          {stat.trend.label === 'vs bulan lalu' ? t('dashboard.vsLastMonth') : stat.trend.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--color-muted)]">{t('dashboard.noTrendData')}</span>
                    )}
                  </div>
                </div>
              </div>

              {stat.subValue && (
                <div className="mt-3 pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--color-secondary)] text-[11px]">Nilai Omzet:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono truncate">
                    {stat.subValue}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* ─── 1. Operasional Lapangan & Peringatan Dini (Actionable Alerts) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
                {t('dashboard.actionableAlerts')}
              </h2>
            </div>
          </div>
          <Link
            to={ROUTES.SHIPMENT_BATCHES}
            className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1 group"
          >
            <span>{t('common.detail')} Batch</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Card 1: ETA Not Exit */}
          <div className="rounded-2xl border border-amber-500/30 bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-amber-500/60 transition-all duration-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                    {t('dashboard.etaNotExit')}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-secondary)] line-clamp-1 mt-0.5">
                    {t('dashboard.etaNotExitDesc')}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)] font-[var(--font-label)] tabular-nums">
                  {formatNumber(data.actionableAlerts?.etaNotExit?.total || 0)}
                </span>
                <span className="text-xs font-semibold text-[var(--color-secondary)] ml-1">batch</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-semibold">
                  <Plane className="w-3 h-3" /> Udara: {data.actionableAlerts?.etaNotExit?.air || 0}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <Ship className="w-3 h-3" /> Laut: {data.actionableAlerts?.etaNotExit?.sea || 0}
                </span>
              </div>
              <button
                type="button"
                onClick={openEtaModal}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer bg-transparent border-none p-0 group-hover:translate-x-0.5 transition-transform"
              >
                <span>{t('dashboard.viewDelayedConsignees')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Missed Target SLA */}
          <div className="rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-rose-500/60 transition-all duration-200 shadow-xs relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                    {t('dashboard.missedSla')}
                  </div>
                  <div className="text-[11.5px] text-[var(--color-secondary)] line-clamp-1 mt-0.5">
                    {t('dashboard.missedSlaDesc')}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl sm:text-3xl font-bold text-[var(--color-primary)] font-[var(--font-label)] tabular-nums">
                  {formatNumber(data.actionableAlerts?.missedTargetSLA?.total || 0)}
                </span>
                <span className="text-xs font-semibold text-[var(--color-secondary)] ml-1">batch</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)] text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-semibold">
                  <Plane className="w-3 h-3" /> Udara: {data.actionableAlerts?.missedTargetSLA?.air || 0}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                  <Ship className="w-3 h-3" /> Laut: {data.actionableAlerts?.missedTargetSLA?.sea || 0}
                </span>
              </div>
              <button
                type="button"
                onClick={openSlaModal}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer bg-transparent border-none p-0 group-hover:translate-x-0.5 transition-transform"
              >
                <span>{t('dashboard.viewDelayedConsignees')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Distribusi & Pengantaran Lokal (Delivery Orders Pipeline) ─── */}
      <Card variant="bordered" className="rounded-2xl overflow-hidden shadow-xs">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {pipelineStages.map((stage, sIdx) => (
              <div
                key={stage.id}
                className={cn(
                  'p-3.5 sm:p-4 rounded-xl border bg-[var(--color-surface)] space-y-2 transition-all relative overflow-hidden flex flex-col justify-between',
                  stage.borderClass
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                    {stage.label}
                  </span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border', stage.badgeClass)}>
                    Tahap {sIdx + 1}
                  </span>
                </div>

                <div>
                  <div className={cn('text-2xl sm:text-3xl font-bold font-[var(--font-label)] tabular-nums', stage.colorClass)}>
                    {formatNumber(stage.value)}
                  </div>
                  <div className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                    {stage.subLabel}
                  </div>
                </div>

                {/* Progress bar visual aid */}
                <div className="w-full bg-[var(--color-neutral)] rounded-full h-1 overflow-hidden mt-1">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', stage.colorClass.includes('emerald') ? 'bg-emerald-500' : stage.colorClass.includes('sky') ? 'bg-sky-500' : stage.colorClass.includes('amber') ? 'bg-amber-500' : 'bg-[var(--color-secondary)]')}
                    style={{ width: stage.value > 0 ? '100%' : '10%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-secondary)]">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[var(--color-tertiary)] shrink-0" />
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
              className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline inline-flex items-center gap-1"
            >
              <span>Buka Manajemen Surat Jalan</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card.Body>
      </Card>

      {/* ─── 3. Keuangan & Arus Kas (Billing & Cash Flow) ───────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-label)] uppercase tracking-wide">
              {t('dashboard.financialOverview')}
            </h2>
          </div>
          <Link
            to={ROUTES.BILLING_VALIDATION_LIST}
            className="text-xs font-semibold text-[var(--color-tertiary)] hover:underline flex items-center gap-1 group"
          >
            <span>Audit Validasi</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Draft Invoices Pending Validation */}
          <Link to={ROUTES.BILLING_VALIDATION_LIST} className="no-underline group">
            <div className="rounded-2xl border border-amber-500/30 bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between h-full hover:border-amber-500/70 transition-all duration-200 hover:-translate-y-0.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                  {t('dashboard.draftQueue')}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {formatNumber(data.financialOverview?.draftInvoicesCount || 0)} Draft
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] font-mono tabular-nums">
                  {formatCurrency(data.financialOverview?.draftInvoicesAmount || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.draftQueueDesc')}
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Cek & Validasi Antrean</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* Overdue Invoices */}
          <Link to={ROUTES.BILLING} className="no-underline group">
            <div className="rounded-2xl border border-rose-500/30 bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between h-full hover:border-rose-500/70 transition-all duration-200 hover:-translate-y-0.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  {t('dashboard.overdueInvoices')}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-500/40 text-rose-500 bg-rose-500/10">
                  {formatNumber(data.financialOverview?.overdueInvoicesCount || 0)} Inv
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                  {formatCompactRupiah(data.financialOverview?.overdueInvoicesAmount || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.overdueDesc')}
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Kelola Piutang Jatuh Tempo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>

          {/* Monthly Revenue */}
          <Link to={ROUTES.BILLING} className="no-underline group">
            <div className="rounded-2xl border border-emerald-500/30 bg-[var(--color-surface)] p-4 sm:p-5 flex flex-col justify-between h-full hover:border-emerald-500/70 transition-all duration-200 hover:-translate-y-0.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t('dashboard.monthlyRevenue')}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
                  {formatNumber(data.financialOverview?.monthlyInvoicesCount || 0)} Terbit
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {formatCompactRupiah(data.financialOverview?.monthlyRevenue || 0)}
                </div>
                <p className="text-[11.5px] text-[var(--color-secondary)]">
                  {t('dashboard.monthlyRevenueDesc')}
                </p>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Buka Rekap Faktur</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── 4. Analitik Jalur Asal (Origin) & Jadwal Kedatangan Mendatang ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origin Volume & Weight Share */}
        <Card variant="bordered" className="rounded-2xl shadow-xs overflow-hidden">
          <Card.Header
            title={t('dashboard.originAnalytics')}
            subtitle={t('dashboard.originAnalyticsSub')}
            icon={<TrendingUp className="w-4 h-4 text-sky-500" />}
          />
          <Card.Body className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase tracking-wider font-semibold bg-[var(--color-neutral)]/50 border-b border-[var(--color-border)] text-[var(--color-secondary)]">
                  <tr>
                    <th className="py-2.5 px-4">Cabang Hub</th>
                    <th className="py-2.5 px-3 text-right">Resi (Air/Sea)</th>
                    <th className="py-2.5 px-3 text-right">Volume (m³)</th>
                    <th className="py-2.5 px-4 text-right">Berat (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {(data.originAnalytics?.branches || []).slice(0, 6).map((branch) => {
                    const volumePercent = Math.min(100, Math.round(((branch.totalVolume || 0) / maxOriginVolume) * 100))
                    return (
                      <tr key={branch.branchCode} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--color-primary)] font-mono flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[var(--color-tertiary)]" />
                              {branch.branchCode}
                            </span>
                            <div className="w-20 bg-[var(--color-neutral)] rounded-full h-1 overflow-hidden mt-1">
                              <div
                                className="h-full bg-[var(--color-tertiary)] rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(8, volumePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[var(--color-secondary)] tabular-nums">
                          {formatNumber(branch.totalShipments)}{' '}
                          <span className="text-[10px] font-mono opacity-75">
                            ({branch.airShipments}/{branch.seaShipments})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-[var(--color-primary)] tabular-nums font-mono">
                          {formatDecimal(branch.totalVolume, 2)} m³
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-[var(--color-primary)] tabular-nums font-mono">
                          {formatDecimal(branch.totalWeight, 1)} kg
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>

        {/* Upcoming Arrivals (48-72 Hours) */}
        <Card variant="bordered" className="rounded-2xl shadow-xs overflow-hidden">
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
                <div key={batch.markingCode} className="p-3 sm:p-3.5 hover:bg-[var(--color-neutral)]/40 transition-colors space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs font-mono text-[var(--color-primary)]">
                        {batch.markingCode}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-neutral)]/40 text-[var(--color-secondary)]">
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] font-mono">
                        {batch.branchCode}
                      </span>
                    </div>

                    {getUrgencyBadge(batch.eta)}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                    <span className="truncate max-w-[220px]" title={batch.consignee || 'Unknown'}>
                      Consignee: <strong className="text-[var(--color-primary)] font-semibold">{batch.consignee || 'Unknown'}</strong>
                    </span>
                    <span className="text-right">
                      ETA: <strong className="text-[var(--color-primary)] font-mono font-medium">{batch.eta ? formatDate(batch.eta) : '—'}</strong>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t('dashboard.noUpcoming')} className="m-4" />
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ─── 5. Visualisasi Tren Kinerja 12 Bulan (Interactive AreaChart) ─── */}
      <Card variant="bordered" className="rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[var(--color-primary)] font-[var(--font-display)] text-sm sm:text-base tracking-tight leading-tight">
              {t('dashboard.chartTitle')}
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">{t('dashboard.chartSubtitle')}</p>
          </div>

          {/* Metric Selector Pills */}
          <div className="inline-flex p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMetric('all')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px]',
                chartMetric === 'all'
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-xs font-bold'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('invoices')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1',
                chartMetric === 'invoices'
                  ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-[var(--color-secondary)] hover:text-emerald-600'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Faktur
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('deliveryOrders')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1',
                chartMetric === 'deliveryOrders'
                  ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                  : 'text-[var(--color-secondary)] hover:text-amber-600'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Surat Jalan
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('shipments')}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] flex items-center gap-1',
                chartMetric === 'shipments'
                  ? 'bg-[var(--color-surface)] text-violet-600 dark:text-violet-400 shadow-xs font-bold'
                  : 'text-[var(--color-secondary)] hover:text-violet-600'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Resi
            </button>
          </div>
        </div>

        <Card.Body className="p-3 sm:p-6">
          <div className="h-[280px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="invoicesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="doGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="shipmentsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.6} />
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
                <Tooltip content={<CustomChartTooltip />} />

                {(chartMetric === 'all' || chartMetric === 'invoices') && (
                  <Area
                    name={t('dashboard.legendInvoices')}
                    type="monotone"
                    dataKey="invoices"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#invoicesGradient)"
                    activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: 'var(--color-surface)' }}
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'deliveryOrders') && (
                  <Area
                    name={t('dashboard.legendDeliveryOrders')}
                    type="monotone"
                    dataKey="deliveryOrders"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#doGradient)"
                    activeDot={{ r: 5, stroke: '#F59E0B', strokeWidth: 2, fill: 'var(--color-surface)' }}
                  />
                )}
                {(chartMetric === 'all' || chartMetric === 'shipments') && (
                  <Area
                    name={t('dashboard.legendShipments')}
                    type="monotone"
                    dataKey="shipments"
                    stroke="#8B5CF6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#shipmentsGradient)"
                    activeDot={{ r: 5, stroke: '#8B5CF6', strokeWidth: 2, fill: 'var(--color-surface)' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* ─── 6. Riwayat Aktivitas Terkini (Recent Activity) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card variant="bordered" className="rounded-2xl shadow-xs overflow-hidden">
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
              data.recentActivity.invoices.map((invoice) => {
                const custName = displayCustName(invoice.customer?.fdCustName || invoice.fdCustCode, t('dashboard.unknownCustomer'))
                const initials = custName.slice(0, 2).toUpperCase()
                return (
                  <div key={invoice.fdInvNo} className="p-3.5 sm:p-4 hover:bg-[var(--color-neutral)]/40 transition-colors flex justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-[var(--color-primary)] truncate">
                          {custName}
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)] font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="font-bold text-[var(--color-primary)]">{invoice.fdInvNo}</span>
                          <span>•</span>
                          <span>{formatDate(invoice.fdInvDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(invoice.fdJumlah1)}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState title={t('dashboard.noRecentInvoices')} className="m-4" />
            )}
          </Card.Body>
        </Card>

        {/* Recent Delivery Orders */}
        <Card variant="bordered" className="rounded-2xl shadow-xs overflow-hidden">
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
                const custName = displayCustName(doItem.fdCustNameSJ || doItem.fdCustCode)

                return (
                  <div key={doItem.fdSJNo} className="p-3.5 sm:p-4 hover:bg-[var(--color-neutral)]/40 transition-colors space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[var(--color-primary)] font-mono">{doItem.fdSJNo}</span>
                        {(markingCode || markingNo) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase font-mono">
                            {markingCode} {markingNo ? `#${markingNo}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--color-secondary)] truncate max-w-[170px] font-medium" title={custName}>
                        {custName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[var(--color-secondary)]">
                      <span>
                        {doItem.fdCarID ? `Nopol: ${doItem.fdCarID.trim()}` : '—'} • {formatDate(doItem.fdSJDate)}
                      </span>
                      <span className="font-semibold text-[var(--color-primary)] font-mono">
                        {packQty != null ? `${formatNumber(packQty)} ${satuan.trim()}` : '—'}
                        {berat != null ? ` • ${formatDecimal(berat, 1)} Kg` : ''}
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
          <div className="w-full max-w-2xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
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
                className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Cari nama consignee atau kode batch..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {filteredModalItems.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--color-secondary)]">
                  {modalSearch ? 'Tidak ada consignee yang sesuai dengan pencarian.' : 'Tidak ada rincian consignee yang mengalami deviasi saat ini.'}
                </div>
              ) : (
                filteredModalItems.map((consignee, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 hover:border-[var(--color-tertiary)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--color-primary)]">
                        {consignee.name || 'Unknown Consignee'}
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px] font-bold px-2 py-0.5 rounded-full border',
                          alertModal.type === 'eta'
                            ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                            : 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                        )}
                      >
                        {consignee.count} BATCH
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(consignee.codes || []).map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs"
                        >
                          <span className="font-mono font-bold text-[var(--color-primary)]">
                            {b.code}
                          </span>
                          {alertModal.type === 'eta' ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                              +{b.aging} hari
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono">
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
            <div className="p-3.5 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/20 flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-secondary)]">
                Total {filteredModalItems.length} Consignee Terdampak
              </span>
              <button
                type="button"
                onClick={() => setAlertModal((prev) => ({ ...prev, open: false }))}
                className="text-xs font-semibold px-4 py-1.5 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-neutral)] cursor-pointer transition-colors"
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