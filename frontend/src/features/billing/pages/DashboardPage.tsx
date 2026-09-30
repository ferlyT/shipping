import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, CalendarDays, Plane, Ship, ShieldCheck, ScrollText } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '../components/TrendChart'
import { EmployeeChart } from '../components/EmployeeChart'
import { SjVsBillChart } from '../components/SjVsBillChart'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, formatCurrency, formatNumber, formatCompactRupiah } from '@/lib/utils'
import { useBillingDashboard } from '../hooks/useBillingDashboard'
import { useSwipeTab } from '../hooks/useSwipeTab'

type MetricMode = 'count' | 'value'
type TrendModeFilter = 'all' | 'udara' | 'laut'
type ChartTab = 'harian' | 'bulanan' | 'karyawan' | 'sj-vs-bill'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<ChartTab>('harian')
  const [trendMetric, setTrendMetric] = useState<MetricMode>('count')
  const [trendMode, setTrendMode] = useState<TrendModeFilter>('all')
  const [employeeMetric, setEmployeeMetric] = useState<MetricMode>('count')
  const [activeSjPic, setActiveSjPic] = useState<string>('all')
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(30)
  const [showYoY, setShowYoY] = useState<boolean>(true)

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
  const trendModeOptions: { value: TrendModeFilter; label: string }[] = [
    { value: 'all', label: t('billing.trend.filterAll') },
    { value: 'udara', label: `✈️ ${t('billing.trend.filterAir')}` },
    { value: 'laut', label: `🚢 ${t('billing.trend.filterSea')}` },
  ]

  const { handleTouchStart, handleTouchEnd } = useSwipeTab(chartTabs, activeTab, setActiveTab)

  const isKpiLoading = isLoadingKpi && !kpis

  const kpiCards = useMemo(() => {
    const uTotal = kpis?.targetBillUdara?.total ?? 0
    const uKiki = kpis?.targetBillUdara?.breakdown?.kiki ?? 0
    const uYati = kpis?.targetBillUdara?.breakdown?.yati ?? 0

    const lTotal = kpis?.targetBillLaut?.total ?? 0
    const lThara = kpis?.targetBillLaut?.breakdown?.thara ?? 0
    const lRico = kpis?.targetBillLaut?.breakdown?.rico ?? 0
    const lFerly = kpis?.targetBillLaut?.breakdown?.ferly ?? 0

    const invCount = kpis?.invoicesBulanIni ?? 0
    const invTrend = kpis?.trend?.invoicesBulanIni
    const invTrendIcon = invTrend?.direction === 'up' ? '↗' : invTrend?.direction === 'down' ? '↘' : '→'
    const invDesc = invTrend && invTrend.value !== 0
      ? `${invTrendIcon} ${Math.abs(invTrend.value)}% ${t('shipments.vsLastMonth')}`
      : `${t('common.air')}: ${kpis?.invoicesBulanIniBreakdown?.udara ?? 0} | ${t('common.sea')}: ${kpis?.invoicesBulanIniBreakdown?.laut ?? 0}`

    const amtTotal = kpis?.tagihanBulanIni ?? 0
    const amtTrend = kpis?.trend?.tagihanBulanIni
    const amtTrendIcon = amtTrend?.direction === 'up' ? '↗' : amtTrend?.direction === 'down' ? '↘' : '→'
    const amtDesc = amtTrend && amtTrend.value !== 0
      ? `${amtTrendIcon} ${Math.abs(amtTrend.value)}% ${t('shipments.vsLastMonth')}`
      : `${t('common.air')}: ${formatCompactRupiah(kpis?.tagihanBulanIniBreakdown?.udara ?? 0)} | ${t('common.sea')}: ${formatCompactRupiah(kpis?.tagihanBulanIniBreakdown?.laut ?? 0)}`

    return [
      {
        id: 'target_udara',
        key: 'billing.targetAir',
        value: `${formatNumber(uTotal)} List`,
        desc: `Kiki: ${uKiki} | Yati: ${uYati}`,
        icon: Plane,
        color: 'text-amber-500',
        path: ROUTES.BILLING_TARGET,
      },
      {
        id: 'target_laut',
        key: 'billing.targetSea',
        value: `${formatNumber(lTotal)} List`,
        desc: `Thara: ${lThara} | Rico: ${lRico} | Ferly: ${lFerly}`,
        icon: Ship,
        color: 'text-emerald-500',
        path: ROUTES.BILLING_TARGET,
      },
      {
        id: 'inv_month',
        key: 'billing.monthInvoices',
        value: formatNumber(invCount),
        desc: invDesc,
        icon: CalendarDays,
        color: 'text-sky-500',
        path: ROUTES.BILLING_LIST,
      },
      {
        id: 'amt_month',
        key: 'billing.monthAmount',
        value: formatCurrency(amtTotal),
        desc: amtDesc,
        icon: CreditCard,
        color: 'text-rose-500',
        path: ROUTES.BILLING_LIST,
      },
    ]
  }, [kpis, t])

  return (
    <div
      className="p-4 sm:p-6 w-full space-y-6 sm:space-y-8 animate-fadeIn pb-24 bg-[var(--color-neutral)] font-[var(--font-body)]"
    >
      <PageHeader
        title={t('billing.title')}
        subtitle={t('billing.subtitle')}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING },
          { label: t('nav.billingDashboard') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t('nav.validationList')}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.BILLING_LIST)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ScrollText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('nav.billingList')}</span>
            </Button>
          </div>
        }
      />

      <div
        className="flex items-stretch gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {kpiCards.map((card) => (
          <div
            key={card.id}
            onClick={() => card.path && navigate(card.path)}
            className={cn(
              "relative group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden min-w-[240px] xs:min-w-[260px] sm:min-w-0 shrink-0 sm:shrink snap-start",
              card.path && "cursor-pointer hover:border-[var(--color-tertiary)]"
            )}
          >
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <p className="text-[10px] sm:text-xs font-bold text-[var(--color-secondary)] uppercase tracking-wider">{t(card.key)}</p>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-[var(--color-neutral)] ${card.color} bg-opacity-20`}>
                <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            {isKpiLoading ? (
              <div className="space-y-1.5">
                <div className="h-6 sm:h-7 w-28 rounded-md skeleton-shimmer" />
                <div className="h-3 w-20 rounded skeleton-shimmer" />
              </div>
            ) : (
              <>
                <h3 className="text-lg sm:text-2xl font-bold text-[var(--color-primary)] font-[var(--font-display)] mb-1 truncate" title={card.value}>
                  {card.value}
                </h3>
                <p className="text-[10px] sm:text-xs text-[var(--color-secondary)] truncate">{card.desc}</p>
              </>
            )}
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
          {(activeTab === 'harian' || activeTab === 'karyawan' || activeTab === 'sj-vs-bill') && (
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
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                    {t('billing.dailyBillTitle', { days: daysFilter })}
                  </h2>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    {trendMetric === 'count' ? t('billing.metric.count') : t('billing.metric.value')} • {trendMode === 'all' ? t('billing.trend.proportion') : trendMode === 'udara' ? t('billing.targetAir') : t('billing.targetSea')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <SegmentedControl
                    options={trendModeOptions}
                    value={trendMode}
                    onChange={(val) => setTrendMode(val as TrendModeFilter)}
                    className="shrink-0"
                    fullWidth={isMobile}
                  />
                  <SegmentedControl
                    options={metricOptions}
                    value={trendMetric}
                    onChange={setTrendMetric}
                    className="shrink-0"
                    fullWidth={isMobile}
                  />
                </div>
              </div>
              <TrendChart
                data={daily}
                isLoading={isLoadingTrends}
                emptyMessage={t('billing.noDataDays', { days: daysFilter })}
                isMobile={isMobile}
                metric={trendMetric}
                modeFilter={trendMode}
              />
            </>
          )}

          {activeTab === 'bulanan' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                    {t('billing.monthlyBillTitle')}
                  </h2>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    {trendMetric === 'count' ? t('billing.metric.count') : t('billing.metric.value')} • {trendMode === 'all' ? t('billing.trend.proportion') : trendMode === 'udara' ? t('billing.targetAir') : t('billing.targetSea')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowYoY((prev) => !prev)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 select-none",
                      showYoY
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                        : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
                    )}
                    title="Tampilkan / sembunyikan garis perbandingan Tahun Lalu (YoY)"
                  >
                    <span className={cn("w-2 h-2 rounded-full transition-colors", showYoY ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
                    <span>YoY {showYoY ? 'Aktif' : 'Off'}</span>
                  </button>
                  <SegmentedControl
                    options={trendModeOptions}
                    value={trendMode}
                    onChange={(val) => setTrendMode(val as TrendModeFilter)}
                    className="shrink-0"
                    fullWidth={isMobile}
                  />
                  <SegmentedControl
                    options={metricOptions}
                    value={trendMetric}
                    onChange={setTrendMetric}
                    className="shrink-0"
                    fullWidth={isMobile}
                  />
                </div>
              </div>
              <TrendChart
                data={monthly}
                isLoading={isLoadingTrends}
                emptyMessage={t('billing.noData12Months')}
                isMobile={isMobile}
                metric={trendMetric}
                modeFilter={trendMode}
                showYoY={showYoY}
                isMonthly={true}
              />
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
