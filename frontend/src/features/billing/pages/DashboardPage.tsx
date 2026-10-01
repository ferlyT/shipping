import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, CalendarDays, Plane, Ship, ShieldCheck, ScrollText } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '../components/TrendChart'
import { EmployeeChart } from '../components/EmployeeChart'
import { SjVsBillChart } from '../components/SjVsBillChart'
import {
  BillingPeriodNavigator,
  BillingPeriodMatrixTable,
  GrowthPill,
} from '../components/BillingPeriodMatrixSection'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/hooks/useTranslation'
import { cn, formatCurrency, formatNumber, formatCompactRupiah } from '@/lib/utils'
import { useBillingDashboard } from '../hooks/useBillingDashboard'
import { useSwipeTab } from '../hooks/useSwipeTab'

type MetricMode = 'count' | 'value'
type TrendModeFilter = 'all' | 'udara' | 'laut'
type ChartTab = 'harian' | 'bulanan' | 'komparasi' | 'karyawan' | 'sj-vs-bill'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [activeTab, setActiveTab] = useState<ChartTab>('harian')
  const [trendMetric, setTrendMetric] = useState<MetricMode>('count')
  const [trendMode, setTrendMode] = useState<TrendModeFilter>('all')
  const [employeeMetric, setEmployeeMetric] = useState<MetricMode>('count')
  const [activeSjPic, setActiveSjPic] = useState<string>('all')
  const [daysFilter, setDaysFilter] = useState<7 | 14 | 30>(30)
  const [showYoY, setShowYoY] = useState<boolean>(true)

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
  }

  const handleResetCurrentMonth = () => {
    const n = new Date()
    setSelectedYear(n.getFullYear())
    setSelectedMonth(n.getMonth() + 1)
  }

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
  } = useBillingDashboard(daysFilter, selectedYear, selectedMonth)

  const chartTabs: { value: ChartTab; label: string }[] = [
    { value: 'harian', label: t('billing.tab.daily') },
    { value: 'bulanan', label: t('billing.tab.monthly') },
    { value: 'komparasi', label: t('billing.tab.comparison') },
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
        categories: kpis?.targetBillUdara?.categories,
        icon: Plane,
        color: 'text-amber-500',
        path: `${ROUTES.BILLING_TARGET}?type=udara`,
      },
      {
        id: 'target_laut',
        key: 'billing.targetSea',
        value: `${formatNumber(lTotal)} List`,
        desc: `Thara: ${lThara} | Rico: ${lRico} | Ferly: ${lFerly}`,
        categories: kpis?.targetBillLaut?.categories,
        icon: Ship,
        color: 'text-emerald-500',
        path: `${ROUTES.BILLING_TARGET}?type=laut`,
      },
      {
        id: 'inv_month',
        key: 'billing.monthInvoices',
        value: formatNumber(invCount),
        desc: invDesc,
        comp: kpis?.comparisons?.totalInvoices,
        icon: CalendarDays,
        color: 'text-sky-500',
        path: ROUTES.BILLING_LIST,
      },
      {
        id: 'amt_month',
        key: 'billing.monthAmount',
        value: formatCurrency(amtTotal),
        desc: amtDesc,
        comp: kpis?.comparisons?.totalTagihan,
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

      {/* ── Toolbar Navigasi Periode Bulan & Tahun (MoM & YoY Audit) ── */}
      <BillingPeriodNavigator
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onResetCurrentMonth={handleResetCurrentMonth}
        prevMonthName={kpis?.prevMonth?.monthName}
        lastYearMonthName={kpis?.lastYearSameMonth?.monthName}
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
                {card.categories ? (
                  <div className="space-y-2 mt-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {(() => {
                        const targetMode = card.id === 'target_udara' ? 'udara' : 'laut'
                        return (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=sj_sent`)
                              }}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                              title="Klik untuk filter Surat Jalan yang sudah terkirim (fdSent = 1) namun belum di-bill"
                            >
                              SJ Sent: {card.categories.sjSent}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=cod`)
                              }}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                              title="Klik untuk filter kargo COD atau prioritas Urgent"
                            >
                              COD/Urgent: {card.categories.codUrgent}
                            </button>
                            {card.categories.agingGt7 > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                   e.stopPropagation()
                                   navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=aging`)
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                                title="Klik untuk filter kargo dengan umur aging > 7 hari"
                              >
                                Aging &gt; 7: {card.categories.agingGt7}
                              </button>
                            )}
                            {card.categories.fcl > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=fcl`)
                                }}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                title="Klik untuk filter kargo kontainer (FCL)"
                              >
                                FCL: {card.categories.fcl}
                              </button>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] truncate pt-1 border-t border-[var(--color-border)]/50">
                      PIC: {card.desc}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] sm:text-xs text-[var(--color-secondary)] truncate">{card.desc}</p>
                    {card.comp && (
                      <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-[var(--color-border)]/50 flex-wrap">
                        <GrowthPill
                          label="MoM"
                          percent={card.comp.momPercent}
                          diff={card.comp.momDiff}
                          prevValue={card.comp.prev}
                          isCurrency={card.id === 'amt_month'}
                          unit={card.id === 'inv_month' ? 'Bill' : undefined}
                        />
                        <GrowthPill
                          label="YoY"
                          percent={card.comp.yoyPercent}
                          diff={card.comp.yoyDiff}
                          prevValue={card.comp.lastYear}
                          isCurrency={card.id === 'amt_month'}
                          unit={card.id === 'inv_month' ? 'Bill' : undefined}
                        />
                      </div>
                    )}
                  </div>
                )}
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

          {activeTab === 'komparasi' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                    {t('billing.comparisonMatrixTitle')}
                  </h2>
                  <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                    {t('billing.comparisonMatrixSubtitle')}
                  </p>
                </div>
              </div>

              {/* Quick Summary Cards (3 Periode Highlights) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Total Omzet Tagihan</span>
                  <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                    {isLoadingKpi ? (
                      <div className="h-5 w-28 rounded skeleton-shimmer" />
                    ) : (
                      formatCurrency(kpis?.comparisons?.totalTagihan?.current ?? kpis?.currentMonth?.totalTagihan ?? 0)
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <GrowthPill
                      label="MoM"
                      percent={kpis?.comparisons?.totalTagihan?.momPercent}
                      diff={kpis?.comparisons?.totalTagihan?.momDiff}
                      prevValue={kpis?.comparisons?.totalTagihan?.prev}
                      isCurrency
                    />
                    <GrowthPill
                      label="YoY"
                      percent={kpis?.comparisons?.totalTagihan?.yoyPercent}
                      diff={kpis?.comparisons?.totalTagihan?.yoyDiff}
                      prevValue={kpis?.comparisons?.totalTagihan?.lastYear}
                      isCurrency
                    />
                  </div>
                </div>

                <div className="bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Volume Faktur Diterbitkan</span>
                  <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                    {isLoadingKpi ? (
                      <div className="h-5 w-20 rounded skeleton-shimmer" />
                    ) : (
                      `${formatNumber(kpis?.comparisons?.totalInvoices?.current ?? kpis?.currentMonth?.totalInvoices ?? 0)} Bill`
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <GrowthPill
                      label="MoM"
                      percent={kpis?.comparisons?.totalInvoices?.momPercent}
                      diff={kpis?.comparisons?.totalInvoices?.momDiff}
                      prevValue={kpis?.comparisons?.totalInvoices?.prev}
                      unit="Bill"
                    />
                    <GrowthPill
                      label="YoY"
                      percent={kpis?.comparisons?.totalInvoices?.yoyPercent}
                      diff={kpis?.comparisons?.totalInvoices?.yoyDiff}
                      prevValue={kpis?.comparisons?.totalInvoices?.lastYear}
                      unit="Bill"
                    />
                  </div>
                </div>

                <div className="bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Rata-rata Nilai / Faktur</span>
                  <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                    {isLoadingKpi ? (
                      <div className="h-5 w-24 rounded skeleton-shimmer" />
                    ) : (
                      formatCurrency(kpis?.comparisons?.avgInvoiceValue?.current ?? kpis?.currentMonth?.avgInvoiceValue ?? 0)
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <GrowthPill
                      label="MoM"
                      percent={kpis?.comparisons?.avgInvoiceValue?.momPercent}
                      diff={kpis?.comparisons?.avgInvoiceValue?.momDiff}
                      prevValue={kpis?.comparisons?.avgInvoiceValue?.prev}
                      isCurrency
                    />
                    <GrowthPill
                      label="YoY"
                      percent={kpis?.comparisons?.avgInvoiceValue?.yoyPercent}
                      diff={kpis?.comparisons?.avgInvoiceValue?.yoyDiff}
                      prevValue={kpis?.comparisons?.avgInvoiceValue?.lastYear}
                      isCurrency
                    />
                  </div>
                </div>
              </div>

              {/* Main Content: Tabel Matriks + Panel Audit & Proporsi Moda */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2">
                  <BillingPeriodMatrixTable
                    comparisons={kpis?.comparisons}
                    currentMonth={kpis?.currentMonth}
                    prevMonth={kpis?.prevMonth}
                    lastYearSameMonth={kpis?.lastYearSameMonth}
                    isLoading={isLoadingKpi}
                  />
                </div>
                <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide border-b border-[var(--color-border)] pb-2">
                    Ikhtisar Audit &amp; Komposisi
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/50">
                      <span className="text-[var(--color-secondary)]">Periode Terpilih</span>
                      <span className="font-mono font-bold text-[var(--color-primary)]">{kpis?.currentMonth?.monthName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/50">
                      <span className="text-[var(--color-secondary)]">Bulan Lalu (MoM)</span>
                      <span className="font-mono text-[var(--color-primary)]">{kpis?.prevMonth?.monthName || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]/50">
                      <span className="text-[var(--color-secondary)]">Tahun Lalu (YoY)</span>
                      <span className="font-mono text-[var(--color-primary)]">{kpis?.lastYearSameMonth?.monthName || '-'}</span>
                    </div>

                    {/* Proporsi Moda Udara vs Laut */}
                    {(() => {
                      const totalTagihan = kpis?.comparisons?.totalTagihan?.current ?? kpis?.currentMonth?.totalTagihan ?? 0
                      const tagihanUdara = kpis?.comparisons?.tagihanUdara?.current ?? kpis?.currentMonth?.tagihanUdara ?? 0
                      const tagihanLaut = kpis?.comparisons?.tagihanLaut?.current ?? kpis?.currentMonth?.tagihanLaut ?? 0
                      const airPct = totalTagihan > 0 ? (tagihanUdara / totalTagihan) * 100 : 0
                      const seaPct = totalTagihan > 0 ? (tagihanLaut / totalTagihan) * 100 : 0

                      return (
                        <div className="pt-1 space-y-2 border-b border-[var(--color-border)]/50 pb-3">
                          <span className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                            Pangsa Omzet Moda
                          </span>
                          <div className="h-2 w-full rounded-full bg-[var(--color-neutral)] overflow-hidden flex">
                            <div
                              className="bg-amber-500 h-full transition-all duration-500"
                              style={{ width: `${airPct}%` }}
                              title={`Udara: ${airPct.toFixed(1)}%`}
                            />
                            <div
                              className="bg-sky-500 h-full transition-all duration-500"
                              style={{ width: `${seaPct}%` }}
                              title={`Laut: ${seaPct.toFixed(1)}%`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Udara: {airPct.toFixed(1)}%
                            </span>
                            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                              Laut: {seaPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    <div className="pt-1">
                      <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">
                        Matriks ini mengukur pertumbuhan faktur, omzet tagihan (laut &amp; udara), nilai rata-rata tiket invoice, dan jumlah pelanggan aktif secara bulanan (MoM) serta tahunan (YoY). Gunakan navigasi periode di atas untuk audit bulan lampau.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
