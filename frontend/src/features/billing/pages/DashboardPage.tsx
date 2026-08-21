import { useState } from 'react'
import { CreditCard, CalendarDays, Plane, Ship } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { TrendChart } from '../components/TrendChart'
import { EmployeeChart } from '../components/EmployeeChart'
import { SjVsBillChart } from '../components/SjVsBillChart'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/hooks/useTranslation'
import { useBillingDashboard } from '../hooks/useBillingDashboard'
import { useSwipeTab } from '../hooks/useSwipeTab'

type MetricMode = 'count' | 'value'
type ChartTab = 'harian' | 'bulanan' | 'karyawan' | 'sj-vs-bill'

const KPI_CARDS = [
  { id: 'target_udara', key: 'billing.targetAir', value: '4 List', desc: 'Kiki: 4 | Yati: 0', icon: Plane, color: 'text-amber-500' },
  { id: 'target_laut', key: 'billing.targetSea', value: '52 List', desc: 'Thara: 48 | Rico: 2 | Ferly: 2', icon: Ship, color: 'text-emerald-500' },
  { id: 'inv_month', key: 'billing.monthInvoices', value: '946', desc: '↘ 81.6% vs bulan lalu', subDesc1: '223', subDesc2: '723', icon: CalendarDays, color: 'text-sky-500' },
  { id: 'amt_month', key: 'billing.monthAmount', value: 'Rp. 10.837.404.519,95', desc: '↘ 83.7% vs bulan lalu', subDesc1: 'Rp 2,26 M', subDesc2: 'Rp 8,57 M', icon: CreditCard, color: 'text-rose-500' },
]

export default function BillingDashboardPage() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<ChartTab>('harian')
  const [trendMetric, setTrendMetric] = useState<MetricMode>('count')
  const [employeeMetric, setEmployeeMetric] = useState<MetricMode>('count')
  const [activeSjPic, setActiveSjPic] = useState<string>('all')
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(30)

  const {
    kpis,
    daily,
    monthly,
    byEmployeeSeries,
    byEmployeeData,
    sjVsBillData,
    isLoadingKpi,
    isLoadingTrends,
    isLoadingByEmployee,
    isLoadingSjVsBill,
  } = useBillingDashboard(daysFilter)

  const chartTabs: { value: ChartTab; label: string }[] = [
    { value: 'harian', label: t('billing.tab.daily') },
    { value: 'bulanan', label: t('billing.tab.monthly') },
    { value: 'karyawan', label: t('billing.tab.employee') },
    { value: 'sj-vs-bill', label: t('billing.tab.sjVsBill') },
  ]
  const metricOptions: { value: MetricMode; label: string }[] = [
    { value: 'count', label: t('billing.metric.count') },
    { value: 'value', label: t('billing.metric.value') },
  ]

  const { handleTouchStart, handleTouchEnd } = useSwipeTab(chartTabs, activeTab, setActiveTab)

  if (isLoadingKpi && !kpis) return <LoadingSpinner message={t('common.loadingBilling')} />

  return (
    <div
      className="p-4 sm:p-6 w-full space-y-6 sm:space-y-8 animate-fadeIn pb-24 bg-[var(--color-neutral)] font-[var(--font-body)]"
    >
      <PageHeader
        title={t('billing.title')}
        subtitle={t('billing.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing') },
          { label: t('nav.dashboard') },
        ]}
      />

      <div
        className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {KPI_CARDS.map((card) => (
          <div
            key={card.id}
            className="relative group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden min-w-[240px] xs:min-w-[260px] sm:min-w-0 shrink-0 sm:shrink snap-start"
          >
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider">{t(card.key)}</p>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-[var(--color-neutral)] ${card.color} bg-opacity-20`}>
                <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] mb-1 truncate" title={card.value}>
              {card.value}
            </h3>
            <p className="text-[10px] sm:text-xs text-[var(--color-secondary)] truncate">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm p-4 sm:p-6 mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <SegmentedControl
            options={chartTabs}
            value={activeTab}
            onChange={(val) => setActiveTab(val as ChartTab)}
            className="w-full sm:w-auto overflow-x-auto"
            fullWidth={isMobile}
          />
          {(activeTab === 'karyawan' || activeTab === 'sj-vs-bill') && (
            <div className="flex items-center justify-between sm:justify-start gap-2.5 w-full sm:w-auto animate-fadeIn">
              <label className="text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider shrink-0">
                {t('billing.timeRange')}
              </label>
              <select
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value) as 7 | 14 | 30)}
                className="h-8 sm:h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] hover:bg-[var(--color-surface)] px-2.5 py-1 text-xs sm:text-sm font-semibold text-[var(--color-primary)] shadow-sm focus:border-[var(--color-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]/20 transition-all cursor-pointer"
              >
                <option value={7}>{t('billing.lastDays', { days: 7 })}</option>
                <option value={14}>{t('billing.lastDays', { days: 14 })}</option>
                <option value={30}>{t('billing.lastDays', { days: 30 })}</option>
              </select>
            </div>
          )}
        </div>
        <div className="w-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {activeTab === 'harian' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                  {t('billing.title')}
                </h2>
                <SegmentedControl options={metricOptions} value={trendMetric} onChange={setTrendMetric} fullWidth={isMobile} />
              </div>
              <TrendChart data={daily} isLoading={isLoadingTrends} emptyMessage={t('billing.noDataDays', { days: 30 })} isMobile={isMobile} metric={trendMetric} />
            </>
          )}

          {activeTab === 'bulanan' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                  {t('billing.monthlyBillTitle')}
                </h2>
                <SegmentedControl options={metricOptions} value={trendMetric} onChange={setTrendMetric} fullWidth={isMobile} />
              </div>
              <TrendChart data={monthly} isLoading={isLoadingTrends} emptyMessage={t('billing.noData12Months')} isMobile={isMobile} metric={trendMetric} />
            </>
          )}

          {activeTab === 'karyawan' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                    {t('billing.employeePerformanceTitle')}
                  </h2>
                  <p className="text-xs text-[var(--color-secondary)] mt-1">
                    {employeeMetric === 'count'
                      ? t('billing.employeeCountDesc', { days: daysFilter })
                      : t('billing.employeeValueDesc', { days: daysFilter })}
                    {t('billing.top5Others')}
                  </p>
                </div>
                <SegmentedControl options={metricOptions} value={employeeMetric} onChange={setEmployeeMetric} fullWidth={isMobile} />
              </div>
              <EmployeeChart
                data={byEmployeeData}
                series={byEmployeeSeries}
                isLoading={isLoadingByEmployee}
                isMobile={isMobile}
                metric={employeeMetric}
              />
            </>
          )}

          {activeTab === 'sj-vs-bill' && (
            <>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                  {t('billing.sjVsBillDynamicTitle', { days: daysFilter })}
                </h2>
                <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                  {t('billing.sjVsBillDesc')}
                </p>
              </div>
              <SjVsBillChart
                data={sjVsBillData}
                isLoading={isLoadingSjVsBill}
                isMobile={isMobile}
                activeSjPic={activeSjPic}
                setActiveSjPic={setActiveSjPic}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
