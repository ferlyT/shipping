import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Package, Weight, Box, Receipt, ListChecks, Layers, ArrowRight } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useShipmentKpis } from '../hooks/useShipmentKpis'

export default function ShipmentsDashboardPage() {
  const { t } = useTranslation()
  const { data: kpiData, isLoading: isLoadingKpi } = useShipmentKpis({})

  const kpis = kpiData

  if (isLoadingKpi && !kpis) return <LoadingSpinner message={t('common.loadingShipment')} />

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-24">
      <PageHeader
        title={t('shipments.title')}
        subtitle={t('shipments.subtitle')}
        breadcrumbs={[
          { label: t('module.logistics'), path: ROUTES.SHIPMENTS },
          { label: t('nav.shipment') },
          { label: t('nav.dashboard') },
        ]}
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Resi */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <Receipt className="w-24 h-24 text-[var(--color-primary)]" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <Receipt className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('shipments.totalResi')}</span>
          </div>
          <div className="mt-3">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.totalResi || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        </div>

        {/* Total Packages */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <Package className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <Package className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('shipments.totalPackages')}</span>
          </div>
          <div className="mt-3">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.totalPackages || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        </div>

        {/* Total Berat */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <Weight className="w-24 h-24 text-purple-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <Weight className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('shipments.totalWeight')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                {Number(kpis?.totalBerat || 0).toLocaleString('id-ID')}
              </h3>
            )}
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow transition-shadow">
          <div className="absolute right-0 top-0 opacity-5 scale-150 -translate-y-4 translate-x-4 group-hover:scale-110 transition-transform duration-500">
            <Box className="w-24 h-24 text-rose-500" />
          </div>
          <div className="flex items-center gap-2 text-[var(--color-secondary)]">
            <Box className="w-4 h-4 text-rose-500" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('shipments.totalVolume')}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            {isLoadingKpi ? (
              <div className="h-8 w-16 bg-[var(--color-border)] animate-pulse rounded"></div>
            ) : (
              <>
                <h3 className="text-3xl font-semibold text-[var(--color-primary)] font-[var(--font-display)] tabular-nums">
                  {Number(kpis?.totalVolume || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                </h3>
                <span className="text-sm font-bold text-[var(--color-secondary)] ml-1">m³</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={ROUTES.SHIPMENTS_LIST}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] transition-colors">
              <ListChecks className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('shipments.listTitle')}
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                {t('shipments.listSubtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>

        <Link
          to={ROUTES.SHIPMENT_BATCHES}
          className="group flex items-center justify-between gap-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)] transition-colors">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)]">
                {t('nav.batchMarking')}
              </h3>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                {t('batchMarking.subtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all shrink-0" />
        </Link>
      </div>
    </div>
  )
}
