import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Plane,
  Ship,
  ShieldCheck,
  ShieldAlert,
  ScrollText,
  FileDown,
  Loader2,
  Receipt,
  FileQuestion,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { TrendChart } from '../components/TrendChart'
import { SjVsBillChart } from '../components/SjVsBillChart'
import { EmployeeChart } from '../components/EmployeeChart'
import { BatchExitComparisonSection } from '../components/BatchExitComparisonSection'
import { UnissuedBillsModal } from '../components/UnissuedBillsModal'
import {
  BillingPeriodNavigator,
  BillingPeriodMatrixTable,
  BillingBranchComparisonTable,
  GrowthPill,
} from '../components/BillingPeriodMatrixSection'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useTranslation } from '@/hooks/useTranslation'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'
import { cn, formatCurrency, formatNumber, formatCompactRupiah } from '@/lib/utils'
import { useBillingDashboard } from '../hooks/useBillingDashboard'
import { useBillingDashboardPermissions } from '../hooks/useBillingPermissions'
import { exportDashboardToPdf } from '../utils/dashboard-pdf.utils'
import { DashboardPdfFullReport } from '../components/DashboardPdfFullReport'

type TrendModeFilter = 'all' | 'udara' | 'laut'
type FinanceChartTab = 'bulanan' | 'komparasi' | 'harian'
type OperationChartTab = 'karyawan' | 'sj-vs-bill' | 'volume' | 'komparasi'
type DashboardView = 'finance' | 'operation'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useAuthStore()
  const { canViewOperation, canViewFinance, canViewAny } = useBillingDashboardPermissions()
  const now = new Date()

  // Master View Switcher (Default: Operation jika berhak, fallback ke Finance)
  const initialView: DashboardView = canViewOperation ? 'operation' : 'finance'
  const [dashboardView, setDashboardView] = useState<DashboardView>(initialView)

  useEffect(() => {
    if (!canViewOperation && canViewFinance && dashboardView === 'operation') {
      setDashboardView('finance')
    } else if (!canViewFinance && canViewOperation && dashboardView === 'finance') {
      setDashboardView('operation')
    }
  }, [canViewOperation, canViewFinance, dashboardView])
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL')
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false)

  // Finance-Specific State (Eksklusif Nilai Uang Rp)
  const [financeActiveTab, setFinanceActiveTab] = useState<FinanceChartTab>('bulanan')
  const [financeTrendMode, setFinanceTrendMode] = useState<TrendModeFilter>('all')
  const [financeDaysFilter, setFinanceDaysFilter] = useState<7 | 14 | 30>(30)
  const [showYoY, setShowYoY] = useState<boolean>(true)

  // Operation-Specific State (Eksklusif Kuantiti Bill, Kargo & PIC)
  const [opActiveTab, setOpActiveTab] = useState<OperationChartTab>('karyawan')
  const [opEmployeeDaysFilter, setOpEmployeeDaysFilter] = useState<7 | 14 | 30 | 365>(30)
  const [opSjDaysFilter, setOpSjDaysFilter] = useState<7 | 14 | 30 | 365>(30)
  const [activeSjPic, setActiveSjPic] = useState<string>('all')
  const [batchExitAllTime, setBatchExitAllTime] = useState<boolean>(false)
  const [volumeTrendPeriod, setVolumeTrendPeriod] = useState<'daily' | 'monthly'>('daily')
  const [volumeTrendMode, setVolumeTrendMode] = useState<TrendModeFilter>('all')
  const [unissuedModalOpen, setUnissuedModalOpen] = useState<boolean>(false)
  const [unissuedModalInitialAging, setUnissuedModalInitialAging] = useState<'all' | 'le7' | '8to14' | '15to30' | 'gt30'>('all')

  const dashboardRef = useRef<HTMLDivElement>(null)
  const financeReportRef = useRef<HTMLDivElement>(null)
  const operationReportRef = useRef<HTMLDivElement>(null)

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year)
    setSelectedMonth(month)
  }

  const handleResetCurrentMonth = () => {
    const n = new Date()
    setSelectedYear(n.getFullYear())
    setSelectedMonth(n.getMonth() + 1)
  }

  const handleExportPdf = async () => {
    const isFin = dashboardView === 'finance'
    const targetElement = isFin
      ? (financeReportRef.current || dashboardRef.current)
      : (operationReportRef.current || dashboardRef.current)
    if (!targetElement) return
    setIsExportingPdf(true)
    const toastId = toast.loading(
      isFin ? t('billing.exportingPdfFinance') : t('billing.exportingPdfOperation')
    )
    try {
      const branchName = selectedBranch === 'ALL' ? t('billing.allBranches') : selectedBranch
      const monthName = kpis?.currentMonth?.monthName || `${selectedMonth}/${selectedYear}`
      const cleanFileName = isFin
        ? `Laporan-Finance-Billing-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`
        : `Laporan-Operation-Billing-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.pdf`

      await exportDashboardToPdf(targetElement, {
        fileName: cleanFileName,
        periodLabel: monthName,
        printedBy: user?.fullName || user?.fdEmpName || user?.username || 'Finance PIC',
        activeTabLabel: isFin ? 'Laporan Finansial (Omzet Rp)' : 'Laporan Operasional (Target & Kargo)',
        selectedBranchLabel: branchName,
      })

      toast.success(
        isFin ? t('billing.pdfExportSuccessFinance') : t('billing.pdfExportSuccessOperation'),
        { id: toastId }
      )
    } catch (err) {
      console.error('Failed to export dashboard PDF:', err)
      toast.error(t('billing.pdfExportError'), { id: toastId })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const {
    kpis,
    daily,
    monthly,
    byEmployeeSeries,
    byEmployeeData,
    sjVsBillData,
    unbilledSjDetails,
    batchExitSummary,
    batchExitBatches,
    isLoadingKpi,
    isLoadingTrends,
    isLoadingByEmployee,
    isLoadingSjVsBill,
    isLoadingBatchExit,
  } = useBillingDashboard(
    financeDaysFilter,
    selectedYear,
    selectedMonth,
    batchExitAllTime,
    opEmployeeDaysFilter,
    opSjDaysFilter
  )

  // Finance Tabs Configuration (Kunci ke Rp)
  const financeChartTabs: { value: FinanceChartTab; label: string }[] = [
    { value: 'bulanan', label: t('billing.tab.monthly') },
    { value: 'komparasi', label: t('billing.tab.comparison') },
    { value: 'harian', label: t('billing.tab.daily') },
  ]

  // Operation Tabs Configuration (Kunci ke Count / Fisik / Karyawan / Komparasi)
  const opChartTabs: { value: OperationChartTab; label: string }[] = [
    { value: 'karyawan', label: t('billing.opTab.employee') },
    { value: 'sj-vs-bill', label: t('billing.opTab.sjVsBill') },
    { value: 'volume', label: t('billing.opTab.volume') },
    { value: 'komparasi', label: t('billing.opTab.matrix') },
  ]

  const trendModeOptions: { value: TrendModeFilter; label: string }[] = [
    { value: 'all', label: t('billing.trend.filterAll') },
    { value: 'udara', label: `✈️ ${t('billing.trend.filterAir')}` },
    { value: 'laut', label: `🚢 ${t('billing.trend.filterSea')}` },
  ]

  const isKpiLoading = isLoadingKpi && !kpis

  // ── Kartu KPI Finansial (Hanya Angka Uang / Rp) ──
  const financeKpiCards = useMemo(() => {
    const totalOmzet = kpis?.comparisons?.totalTagihan?.current ?? kpis?.currentMonth?.totalTagihan ?? kpis?.tagihanBulanIni ?? 0
    const omzetUdara = kpis?.tagihanBulanIniBreakdown?.udara ?? kpis?.comparisons?.tagihanUdara?.current ?? 0
    const omzetLaut = kpis?.tagihanBulanIniBreakdown?.laut ?? kpis?.comparisons?.tagihanLaut?.current ?? 0
    const avgInvoice = kpis?.comparisons?.avgInvoiceValue?.current ?? kpis?.currentMonth?.avgInvoiceValue ?? 0
    const airPct = totalOmzet > 0 ? (omzetUdara / totalOmzet) * 100 : 0
    const seaPct = totalOmzet > 0 ? (omzetLaut / totalOmzet) * 100 : 0

    return [
      {
        id: 'total_omzet',
        title: t('billing.penagihanBulanIni'),
        value: formatCurrency(totalOmzet),
        subBreakdown: {
          udara: formatCompactRupiah(omzetUdara),
          laut: formatCompactRupiah(omzetLaut),
        },
        comp: kpis?.comparisons?.totalTagihan,
        icon: CreditCard,
        color: 'text-rose-500',
        badge: 'Omzet',
      },
      {
        id: 'omzet_udara',
        title: t('billing.omzetUdara'),
        value: formatCurrency(omzetUdara),
        desc: `Pangsa Omzet: ${airPct.toFixed(1)}%`,
        comp: kpis?.comparisons?.tagihanUdara,
        icon: Plane,
        color: 'text-amber-500',
        badge: 'Air Freight',
      },
      {
        id: 'omzet_laut',
        title: t('billing.omzetLaut'),
        value: formatCurrency(omzetLaut),
        desc: `Pangsa Omzet: ${seaPct.toFixed(1)}%`,
        comp: kpis?.comparisons?.tagihanLaut,
        icon: Ship,
        color: 'text-emerald-500',
        badge: 'Sea Freight',
      },
      {
        id: 'avg_invoice',
        title: t('billing.avgInvoiceValue'),
        value: formatCurrency(avgInvoice),
        desc: 'Rata-rata Nilai per Tiket Faktur',
        comp: kpis?.comparisons?.avgInvoiceValue,
        icon: Receipt,
        color: 'text-blue-500',
        badge: 'Ticket Size',
      },
    ]
  }, [kpis, t])

  // ── Kartu KPI Operasional (Kuantiti Bill, Kargo & Target PIC) ──
  const operationKpiCards = useMemo(() => {
    const uTotal = kpis?.targetBillUdara?.total ?? 0
    const uKiki = kpis?.targetBillUdara?.breakdown?.kiki ?? 0
    const uYati = kpis?.targetBillUdara?.breakdown?.yati ?? 0

    const lTotal = kpis?.targetBillLaut?.total ?? 0
    const lThara = kpis?.targetBillLaut?.breakdown?.thara ?? 0
    const lRico = kpis?.targetBillLaut?.breakdown?.rico ?? 0
    const lFerly = kpis?.targetBillLaut?.breakdown?.ferly ?? 0

    const invCount = kpis?.comparisons?.totalInvoices?.current ?? kpis?.currentMonth?.totalInvoices ?? kpis?.invoicesBulanIni ?? 0
    const invUdara = kpis?.invoicesBulanIniBreakdown?.udara ?? 0
    const invLaut = kpis?.invoicesBulanIniBreakdown?.laut ?? 0

    const unissuedCount = kpis?.unissuedBills?.totalCount ?? 0
    const unissuedNominal = kpis?.unissuedBills?.totalNominal ?? 0
    const unissuedUdara = kpis?.unissuedBills?.countUdara ?? 0
    const unissuedLaut = kpis?.unissuedBills?.countLaut ?? 0
    const unissuedAging = kpis?.unissuedBills?.aging

    return [
      {
        id: 'target_udara',
        title: t('billing.targetAir'),
        value: `${formatNumber(uTotal)} List`,
        desc: `Kiki: ${uKiki} | Yati: ${uYati}`,
        categories: kpis?.targetBillUdara?.categories,
        icon: Plane,
        color: 'text-amber-500',
        path: `${ROUTES.BILLING_TARGET}?type=udara`,
      },
      {
        id: 'target_laut',
        title: t('billing.targetSea'),
        value: `${formatNumber(lTotal)} List`,
        desc: `Thara: ${lThara} | Rico: ${lRico} | Ferly: ${lFerly}`,
        categories: kpis?.targetBillLaut?.categories,
        icon: Ship,
        color: 'text-emerald-500',
        path: `${ROUTES.BILLING_TARGET}?type=laut`,
      },
      {
        id: 'volume_invoices',
        title: t('billing.totalInvoices'),
        value: `${formatNumber(invCount)} Bill`,
        desc: `✈️ ${formatNumber(invUdara)} Bill • 🚢 ${formatNumber(invLaut)} Bill`,
        compInvoices: kpis?.comparisons?.totalInvoices,
        icon: ScrollText,
        color: 'text-sky-500',
        path: ROUTES.BILLING_LIST,
      },
      {
        id: 'unissued_bills',
        title: t('billing.unissuedBillsTitle'),
        value: `${formatNumber(unissuedCount)} Bill`,
        desc: `✈️ ${formatNumber(unissuedUdara)} Bill • 🚢 ${formatNumber(unissuedLaut)} Bill`,
        unissuedNominal,
        unissuedAging,
        icon: FileQuestion,
        color: 'text-amber-500',
        badge: 'Unissued',
      },
    ]
  }, [kpis, t])

  if (!canViewAny) {
    return (
      <div className="p-3.5 sm:p-5 w-full space-y-3.5 sm:space-y-4 animate-fadeIn pb-16 bg-[var(--color-neutral)] font-[var(--font-body)]">
        <PageHeader
          title={t('billing.title')}
          subtitle={t('billing.subtitle')}
          breadcrumbs={[
            { label: t('module.finance'), path: ROUTES.BILLING },
            { label: t('nav.billing'), path: ROUTES.BILLING },
            { label: t('nav.billingDashboard') },
          ]}
        />
        <div className="flex flex-col items-center justify-center min-h-[380px] text-center p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
          </div>
          <h2 className="text-base font-bold text-[var(--color-primary)]">
            {t('billing.accessDeniedTitle')}
          </h2>
          <p className="text-xs text-[var(--color-secondary)] max-w-md mt-1.5 leading-relaxed">
            {t('billing.accessDeniedDesc')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="p-3.5 sm:p-5 w-full space-y-3.5 sm:space-y-4 animate-fadeIn pb-16 bg-[var(--color-neutral)] font-[var(--font-body)]"
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
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPdf}
              disabled={isExportingPdf || isLoadingKpi}
              className={cn(
                "flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs font-semibold",
                dashboardView === 'finance'
                  ? "text-rose-600 dark:text-rose-400 border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
                  : "text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10"
              )}
              title={
                dashboardView === 'finance'
                  ? "Unduh Laporan Keuangan PDF (6 Lembar A4 Landscape)"
                  : "Unduh Laporan Operasional PDF (10 Lembar A4 Landscape)"
              }
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {dashboardView === 'finance'
                      ? t('billing.exportingPdfFinance')
                      : t('billing.exportingPdfOperation')}
                  </span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>
                    {dashboardView === 'finance'
                      ? t('billing.exportPdfFinance')
                      : t('billing.exportPdfOperation')}
                  </span>
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('nav.validationList')}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(ROUTES.BILLING_LIST)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <ScrollText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('nav.billingList')}</span>
            </Button>
          </div>
        }
      />

      {/* ── Container Konten Dashboard yang dapat diekspor ke PDF ── */}
      <div ref={dashboardRef} className="space-y-3.5 sm:space-y-4">
        {/* ── Master Dual-Tab View Switcher (Operation vs Finance) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2.5 sm:p-3 shadow-2xs">
          <div className="flex items-center gap-1.5 p-1 bg-[var(--color-neutral)] rounded-lg border border-[var(--color-border)] w-full sm:w-auto">
            {canViewOperation && (
              <button
                type="button"
                onClick={() => setDashboardView('operation')}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none",
                  dashboardView === 'operation'
                    ? "bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs border border-emerald-500/20"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <Ship className="w-3.5 h-3.5" />
                <span>{t('billing.dashboardTab.operation')}</span>
              </button>
            )}
            {canViewFinance && (
              <button
                type="button"
                onClick={() => setDashboardView('finance')}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none",
                  dashboardView === 'finance'
                    ? "bg-[var(--color-surface)] text-rose-600 dark:text-rose-400 shadow-2xs border border-rose-500/20"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t('billing.dashboardTab.finance')}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-[var(--color-secondary)] px-1 sm:px-0">
            {dashboardView === 'operation'
              ? t('billing.dashboardTab.operationDesc')
              : t('billing.dashboardTab.financeDesc')}
          </p>
        </div>

        {/* ── Toolbar Navigasi Periode Bulan & Tahun (MoM & YoY Audit) ── */}
        <BillingPeriodNavigator
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onMonthChange={handleMonthChange}
          onResetCurrentMonth={handleResetCurrentMonth}
          prevMonthName={kpis?.prevMonth?.monthName}
          lastYearMonthName={kpis?.lastYearSameMonth?.monthName}
        />

      {/* ── Grid Kartu KPI Sesuai Tab Aktif ── */}
      {dashboardView === 'finance' ? (
        /* ── KPI Finansial (Khusus Metrik Uang Rp) ── */
        <div
          className="kpi-cards-grid flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {financeKpiCards.map((card) => {
            const isExecCard = card.id === 'total_omzet'

            return (
              <div
                key={card.id}
                className={cn(
                  "kpi-card-item relative group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden min-w-[260px] xs:min-w-[280px] sm:min-w-0 shrink-0 sm:shrink snap-start flex flex-col justify-between min-h-[148px]",
                  isExecCard && "border-rose-500/25 bg-linear-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-rose-500/5"
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
                        {card.title}
                      </p>
                      {card.badge && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded border",
                          isExecCard
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : "bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]"
                        )}>
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-lg bg-[var(--color-neutral)] ${card.color} bg-opacity-20`}>
                      <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  {isKpiLoading ? (
                    <div className="space-y-1.5 py-1">
                      <div className="h-6 w-32 rounded-md skeleton-shimmer" />
                      <div className="h-3 w-20 rounded skeleton-shimmer" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <h3
                        className="text-base sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] font-[var(--font-display)] leading-tight truncate"
                        title={card.value}
                      >
                        {card.value}
                      </h3>

                      {card.subBreakdown && (
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[10px] font-medium">
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]/60 text-sky-700 dark:text-sky-300">
                            <span className="truncate">✈️ {t('common.air')}:</span>
                            <span className="font-mono font-bold tabular-nums ml-1">
                              {card.subBreakdown.udara}
                            </span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]/60 text-emerald-700 dark:text-emerald-300">
                            <span className="truncate">🚢 {t('common.sea')}:</span>
                            <span className="font-mono font-bold tabular-nums ml-1">
                              {card.subBreakdown.laut}
                            </span>
                          </div>
                        </div>
                      )}

                      {card.desc && (
                        <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] truncate">
                          {card.desc}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Kartu KPI Finansial: MoM & YoY */}
                {!isKpiLoading && (
                  <div className="pt-2 mt-2 border-t border-[var(--color-border)]/50">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <GrowthPill
                        label="MoM"
                        percent={card.comp?.momPercent}
                        diff={card.comp?.momDiff}
                        prevValue={card.comp?.prev}
                        isCurrency
                      />
                      <GrowthPill
                        label="YoY"
                        percent={card.comp?.yoyPercent}
                        diff={card.comp?.yoyDiff}
                        prevValue={card.comp?.lastYear}
                        isCurrency
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── KPI Operasional (Khusus Kuantiti Bill, Kargo, Target PIC & Unissued Draft) ── */
        <div
          className="kpi-cards-grid flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {operationKpiCards.map((card) => {
            const isClickable = Boolean(card.path || card.id === 'unissued_bills')
            const isUnissued = card.id === 'unissued_bills'

            return (
              <div
                key={card.id}
                onClick={() => {
                  if (isUnissued) {
                    setUnissuedModalInitialAging('all')
                    setUnissuedModalOpen(true)
                  } else if (card.path) {
                    navigate(card.path)
                  }
                }}
                className={cn(
                  "kpi-card-item relative group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 overflow-hidden min-w-[260px] xs:min-w-[280px] sm:min-w-0 shrink-0 sm:shrink snap-start flex flex-col justify-between min-h-[148px]",
                  isClickable && "cursor-pointer hover:border-[var(--color-tertiary)]",
                  isUnissued && "border-amber-500/25 bg-linear-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-amber-500/5"
                )}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] sm:text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-wider">
                        {card.title}
                      </p>
                      {card.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          {card.badge}
                        </span>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-lg bg-[var(--color-neutral)] ${card.color} bg-opacity-20`}>
                      <card.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  {isKpiLoading ? (
                    <div className="space-y-1.5 py-1">
                      <div className="h-6 w-28 rounded-md skeleton-shimmer" />
                      <div className="h-3 w-20 rounded skeleton-shimmer" />
                    </div>
                  ) : (
                    <>
                      <h3
                        className="text-base sm:text-xl font-bold font-mono tabular-nums text-[var(--color-primary)] font-[var(--font-display)] mb-1 truncate leading-tight"
                        title={card.value}
                      >
                        {card.value}
                      </h3>
                      {card.categories ? (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
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
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
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
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                                  title="Klik untuk filter kargo COD atau prioritas Urgent"
                                >
                                  COD: {card.categories.codUrgent}
                                </button>
                                {card.categories.agingGt7 > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=aging`)
                                    }}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                                    title="Klik untuk filter kargo dengan umur aging > 7 hari"
                                  >
                                    &gt;7 Hari: {card.categories.agingGt7}
                                  </button>
                                )}
                                {card.categories.fcl > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`${ROUTES.BILLING_TARGET}?type=${targetMode}&group=fcl`)
                                    }}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                    title="Klik untuk filter kargo kontainer (FCL)"
                                  >
                                    FCL: {card.categories.fcl}
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      ) : card.unissuedAging ? (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnissuedModalInitialAging('le7')
                              setUnissuedModalOpen(true)
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            title="Draft bill umur ≤7 hari"
                          >
                            ≤7h: {card.unissuedAging.le7.count}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnissuedModalInitialAging('8to14')
                              setUnissuedModalOpen(true)
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                            title="Draft bill umur 8-14 hari"
                          >
                            8-14h: {card.unissuedAging.d8to14.count}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnissuedModalInitialAging('15to30')
                              setUnissuedModalOpen(true)
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors cursor-pointer"
                            title="Draft bill umur 15-30 hari"
                          >
                            15-30h: {card.unissuedAging.d15to30.count}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setUnissuedModalInitialAging('gt30')
                              setUnissuedModalOpen(true)
                            }}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
                            title="Draft bill umur >30 hari (Perlu Ditagih)"
                          >
                            &gt;30h: {card.unissuedAging.gt30.count}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] truncate mt-0.5">
                          {card.desc}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Footer Kartu KPI Operasional */}
                {!isKpiLoading && (
                  <div className="pt-2 mt-2 border-t border-[var(--color-border)]/50">
                    {card.compInvoices ? (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--color-secondary)]">Pertumbuhan Faktur:</span>
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {card.compInvoices.momPercent !== undefined
                            ? `${card.compInvoices.momPercent > 0 ? '+' : ''}${card.compInvoices.momPercent}% MoM`
                            : '-'}
                        </span>
                      </div>
                    ) : isUnissued ? (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--color-secondary)]">Nominal Tertahan:</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(card.unissuedNominal ?? 0)}
                        </span>
                      </div>
                    ) : card.categories ? (
                      <p className="text-[10px] text-[var(--color-secondary)] truncate">
                        PIC: {card.desc}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── KONTEN TAB OPERASIONAL (Kuantiti Bill, Kargo, Batch Exit, Arus SJ, KPI Karyawan) ── */}
      {dashboardView === 'operation' && (
        <div className="space-y-3.5 sm:space-y-4 animate-fadeIn">
          {/* Widget 1: Perbandingan Batch Marking Exit vs Bill Dibuat */}
          <BatchExitComparisonSection
            summary={batchExitSummary}
            batches={batchExitBatches}
            isLoading={isLoadingBatchExit}
            selectedPeriodLabel={kpis?.currentMonth?.monthName || `${selectedMonth}/${selectedYear}`}
            allTime={batchExitAllTime}
            onToggleAllTime={() => setBatchExitAllTime((prev) => !prev)}
          />

          {/* Widget 2: Panel Analitik Operasional & Kinerja PIC */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xs p-3 sm:p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pb-2.5 border-b border-[var(--color-border)]">
              <SegmentedControl
                options={opChartTabs}
                value={opActiveTab}
                onChange={(val) => setOpActiveTab(val as OperationChartTab)}
                className="w-full lg:w-auto overflow-x-auto shrink-0"
                fullWidth={isMobile}
              />

              <div className="flex items-center justify-between lg:justify-end gap-2 flex-wrap w-full lg:w-auto">
                {opActiveTab === 'karyawan' && (
                  <div className="flex items-center gap-1.5 shrink-0 animate-fadeIn">
                    <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider shrink-0">
                      {t('billing.timeRange')}:
                    </span>
                    <select
                      value={opEmployeeDaysFilter}
                      onChange={(e) => setOpEmployeeDaysFilter(Number(e.target.value) as 7 | 14 | 30 | 365)}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] hover:bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)] shadow-2xs focus:border-[var(--color-tertiary)] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value={7}>{t('billing.lastDays', { days: 7 })}</option>
                      <option value={14}>{t('billing.lastDays', { days: 14 })}</option>
                      <option value={30}>{t('billing.lastDays', { days: 30 })}</option>
                      <option value={365}>{t('billing.last1Year')}</option>
                    </select>
                  </div>
                )}

                {opActiveTab === 'sj-vs-bill' && (
                  <div className="flex items-center gap-1.5 shrink-0 animate-fadeIn">
                    <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider shrink-0">
                      {t('billing.timeRange')}:
                    </span>
                    <select
                      value={opSjDaysFilter}
                      onChange={(e) => setOpSjDaysFilter(Number(e.target.value) as 7 | 14 | 30 | 365)}
                      className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] hover:bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)] shadow-2xs focus:border-[var(--color-tertiary)] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value={7}>{t('billing.lastDays', { days: 7 })}</option>
                      <option value={14}>{t('billing.lastDays', { days: 14 })}</option>
                      <option value={30}>{t('billing.lastDays', { days: 30 })}</option>
                      <option value={365}>{t('billing.last1Year')}</option>
                    </select>
                  </div>
                )}

                {opActiveTab === 'volume' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-[var(--color-neutral)] p-0.5 rounded-lg border border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => setVolumeTrendPeriod('daily')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                          volumeTrendPeriod === 'daily'
                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs"
                            : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                        )}
                      >
                        Harian
                      </button>
                      <button
                        type="button"
                        onClick={() => setVolumeTrendPeriod('monthly')}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer",
                          volumeTrendPeriod === 'monthly'
                            ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs"
                            : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                        )}
                      >
                        Bulanan (12 Bln)
                      </button>
                    </div>

                    <SegmentedControl
                      options={trendModeOptions}
                      value={volumeTrendMode}
                      onChange={(val) => setVolumeTrendMode(val as TrendModeFilter)}
                      className="shrink-0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Panel Content Operasional */}
            <div>
              {opActiveTab === 'karyawan' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                        {t('billing.employeePerformanceTitle')}
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)]">
                        {opEmployeeDaysFilter === 365
                          ? `${t('billing.last1Year')} • ${t('billing.top5Others')}`
                          : `${t('billing.employeeCountDesc', { days: opEmployeeDaysFilter })} • ${t('billing.top5Others')}`}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Metrik: Jumlah Bill
                    </span>
                  </div>
                  <EmployeeChart
                    data={byEmployeeData}
                    series={byEmployeeSeries}
                    isLoading={isLoadingByEmployee}
                    isMobile={isMobile}
                    metric="count"
                  />
                </div>
              )}

              {opActiveTab === 'sj-vs-bill' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                        {t('billing.sjVsBillTitle')}
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)]">
                        {t('billing.sjVsBillDesc')} • {opSjDaysFilter === 365 ? t('billing.last1Year') : t('billing.lastDays', { days: opSjDaysFilter })}
                      </p>
                    </div>
                  </div>
                  <SjVsBillChart
                    data={sjVsBillData}
                    isLoading={isLoadingSjVsBill}
                    isMobile={isMobile}
                    activeSjPic={activeSjPic}
                    setActiveSjPic={setActiveSjPic}
                    embedded
                  />
                </div>
              )}

              {opActiveTab === 'volume' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                        {t('billing.volumeTrendTitle')}
                      </h2>
                      <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)]">
                        {t('billing.volumeTrendSubtitle')} • {volumeTrendPeriod === 'daily' ? `${financeDaysFilter} Hari Terakhir` : 'Tren 12 Bulan'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                      Metrik: Jumlah Bill
                    </span>
                  </div>
                  <TrendChart
                    data={volumeTrendPeriod === 'daily' ? daily : monthly}
                    isLoading={isLoadingTrends}
                    emptyMessage={volumeTrendPeriod === 'daily' ? t('billing.noDataDays', { days: financeDaysFilter }) : t('billing.noData12Months')}
                    isMobile={isMobile}
                    metric="count"
                    modeFilter={volumeTrendMode}
                    isMonthly={volumeTrendPeriod === 'monthly'}
                    showYoY={volumeTrendPeriod === 'monthly'}
                  />
                </div>
              )}

              {opActiveTab === 'komparasi' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
                    <div>
                      <h2 className="text-base sm:text-lg font-medium text-[var(--color-primary)] font-[var(--font-display)]">
                        {t('billing.opMatrixTitle')}
                      </h2>
                      <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                        {t('billing.opMatrixSubtitle')}
                      </p>
                    </div>
                  </div>

                  {/* Quick Summary Cards (3 Periode Highlights Operasional - Non-Finansial) */}
                  <div className="comparison-summary-cards grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Total Volume Faktur</span>
                      <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                        {isLoadingKpi ? (
                          <div className="h-5 w-28 rounded skeleton-shimmer" />
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

                    <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Volume Faktur Moda</span>
                      <div className="text-xs font-mono font-bold text-[var(--color-primary)] space-y-1">
                        {isLoadingKpi ? (
                          <div className="h-5 w-28 rounded skeleton-shimmer" />
                        ) : (
                          <>
                            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                              <span>🚢 Laut:</span>
                              <span>{formatNumber(kpis?.comparisons?.invoicesLaut?.current ?? kpis?.currentMonth?.invoicesLaut ?? 0)} Bill</span>
                            </div>
                            <div className="flex justify-between items-center text-sky-700 dark:text-sky-400">
                              <span>✈️ Udara:</span>
                              <span>{formatNumber(kpis?.comparisons?.invoicesUdara?.current ?? kpis?.currentMonth?.invoicesUdara ?? 0)} Bill</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <GrowthPill
                          label="MoM"
                          percent={kpis?.comparisons?.invoicesLaut?.momPercent}
                          diff={kpis?.comparisons?.invoicesLaut?.momDiff}
                          prevValue={kpis?.comparisons?.invoicesLaut?.prev}
                          unit="Bill"
                        />
                      </div>
                    </div>

                    <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Customer Unik Ditagih</span>
                      <div className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                        {isLoadingKpi ? (
                          <div className="h-5 w-28 rounded skeleton-shimmer" />
                        ) : (
                          `${formatNumber(kpis?.comparisons?.uniqueCustomers?.current ?? kpis?.currentMonth?.uniqueCustomers ?? 0)} Cust`
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <GrowthPill
                          label="MoM"
                          percent={kpis?.comparisons?.uniqueCustomers?.momPercent}
                          diff={kpis?.comparisons?.uniqueCustomers?.momDiff}
                          prevValue={kpis?.comparisons?.uniqueCustomers?.prev}
                          unit="Cust"
                        />
                        <GrowthPill
                          label="YoY"
                          percent={kpis?.comparisons?.uniqueCustomers?.yoyPercent}
                          diff={kpis?.comparisons?.uniqueCustomers?.yoyDiff}
                          prevValue={kpis?.comparisons?.uniqueCustomers?.lastYear}
                          unit="Cust"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Main Content: Tabel Matriks Operasional + Panel Audit & Proporsi Volume Moda */}
                  <div className="matrix-and-audit-grid grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2">
                      <BillingPeriodMatrixTable
                        comparisons={kpis?.comparisons}
                        currentMonth={kpis?.currentMonth}
                        prevMonth={kpis?.prevMonth}
                        lastYearSameMonth={kpis?.lastYearSameMonth}
                        selectedBranch={selectedBranch}
                        onSelectBranch={setSelectedBranch}
                        isLoading={isLoadingKpi}
                        variant="operation"
                      />
                    </div>
                    <div className="lg:col-span-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                      <h4 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide border-b border-[var(--color-border)] pb-2">
                        Ikhtisar Audit Volume &amp; Komposisi
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

                        {/* Proporsi Volume Udara vs Laut */}
                        {(() => {
                          const totalInv = kpis?.comparisons?.totalInvoices?.current ?? kpis?.currentMonth?.totalInvoices ?? 0
                          const invUdara = kpis?.comparisons?.invoicesUdara?.current ?? kpis?.currentMonth?.invoicesUdara ?? 0
                          const invLaut = kpis?.comparisons?.invoicesLaut?.current ?? kpis?.currentMonth?.invoicesLaut ?? 0
                          const airPct = totalInv > 0 ? (invUdara / totalInv) * 100 : 0
                          const seaPct = totalInv > 0 ? (invLaut / totalInv) * 100 : 0

                          return (
                            <div className="pt-1 space-y-2 border-b border-[var(--color-border)]/50 pb-3">
                              <span className="text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider block">
                                Pangsa Volume Faktur
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
                              <div className="flex justify-between items-center text-[11px] text-[var(--color-secondary)] font-mono">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                  Udara: {airPct.toFixed(1)}% ({formatNumber(invUdara)} Bill)
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                                  Laut: {seaPct.toFixed(1)}% ({formatNumber(invLaut)} Bill)
                                </span>
                              </div>
                            </div>
                          )
                        })()}

                        <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed pt-1">
                          💡 Matriks komparasi 3 periode operasional memantau tren produksi faktur penagihan fisik, fluktuasi volume kargo antar moda, dan penetrasi jumlah pelanggan tanpa menampilkan metrik finansial/uang.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Toolbar Navigasi Periode Audit */}
                  <BillingPeriodNavigator
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onMonthChange={(y, m) => {
                      setSelectedYear(y)
                      setSelectedMonth(m)
                    }}
                    onResetCurrentMonth={() => {
                      setSelectedYear(now.getFullYear())
                      setSelectedMonth(now.getMonth() + 1)
                    }}
                    prevMonthName={kpis?.prevMonth?.monthName}
                    lastYearMonthName={kpis?.lastYearSameMonth?.monthName}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── KONTEN TAB FINANCE (Eksklusif Nilai Uang Rp: Bulanan, Komparasi, Harian) ── */}
      {dashboardView === 'finance' && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xs p-3 sm:p-4 space-y-3 animate-fadeIn">
          {/* Header Toolbar Finansial */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 pb-2.5 border-b border-[var(--color-border)]">
            <SegmentedControl
              options={financeChartTabs}
              value={financeActiveTab}
              onChange={(val) => setFinanceActiveTab(val as FinanceChartTab)}
              className="w-full lg:w-auto overflow-x-auto shrink-0"
              fullWidth={isMobile}
            />

            <div className="flex items-center justify-between lg:justify-end gap-1.5 flex-wrap w-full lg:w-auto">
              {financeActiveTab === 'harian' && (
                <div className="flex items-center gap-1.5 shrink-0 animate-fadeIn">
                  <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider shrink-0">
                    {t('billing.timeRange')}:
                  </span>
                  <select
                    value={financeDaysFilter}
                    onChange={(e) => setFinanceDaysFilter(Number(e.target.value) as 7 | 14 | 30)}
                    className="h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] hover:bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)] shadow-2xs focus:border-[var(--color-tertiary)] focus:outline-none transition-all cursor-pointer"
                  >
                    <option value={7}>{t('billing.lastDays', { days: 7 })}</option>
                    <option value={14}>{t('billing.lastDays', { days: 14 })}</option>
                    <option value={30}>{t('billing.lastDays', { days: 30 })}</option>
                  </select>
                </div>
              )}

              {financeActiveTab === 'bulanan' && (
                <button
                  type="button"
                  onClick={() => setShowYoY((prev) => !prev)}
                  className={cn(
                    "px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 select-none",
                    showYoY
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]"
                  )}
                  title="Tampilkan / sembunyikan garis perbandingan Tahun Lalu (YoY)"
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full transition-colors", showYoY ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
                  <span>YoY {showYoY ? 'Aktif' : 'Off'}</span>
                </button>
              )}

              {(financeActiveTab === 'harian' || financeActiveTab === 'bulanan') && (
                <SegmentedControl
                  options={trendModeOptions}
                  value={financeTrendMode}
                  onChange={(val) => setFinanceTrendMode(val as TrendModeFilter)}
                  className="shrink-0"
                />
              )}

              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Metrik: Nilai Rp
              </span>
            </div>
          </div>

          {/* Sub-Panel Content Finansial */}
          <div className="w-full">
            {financeActiveTab === 'bulanan' && (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                      {t('billing.monthlyBillTitle')}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)]">
                      {t('billing.metric.value')} • {financeTrendMode === 'all' ? t('billing.trend.proportion') : financeTrendMode === 'udara' ? t('billing.targetAir') : t('billing.targetSea')}
                    </p>
                  </div>
                </div>
                <TrendChart
                  data={monthly}
                  isLoading={isLoadingTrends}
                  emptyMessage={t('billing.noData12Months')}
                  isMobile={isMobile}
                  metric="value"
                  modeFilter={financeTrendMode}
                  showYoY={showYoY}
                  isMonthly={true}
                />
              </>
            )}

            {financeActiveTab === 'komparasi' && (
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

                {/* Quick Summary Cards (3 Periode Highlights Finansial) */}
                <div className="comparison-summary-cards grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
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

                  <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">Omzet Laut &amp; Udara</span>
                    <div className="text-xs font-mono font-bold text-[var(--color-primary)] space-y-1">
                      {isLoadingKpi ? (
                        <div className="h-5 w-28 rounded skeleton-shimmer" />
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                            <span>🚢 Laut:</span>
                            <span>{formatCompactRupiah(kpis?.comparisons?.tagihanLaut?.current ?? kpis?.currentMonth?.tagihanLaut ?? 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sky-700 dark:text-sky-400">
                            <span>✈️ Udara:</span>
                            <span>{formatCompactRupiah(kpis?.comparisons?.tagihanUdara?.current ?? kpis?.currentMonth?.tagihanUdara ?? 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <GrowthPill
                        label="MoM"
                        percent={kpis?.comparisons?.tagihanLaut?.momPercent}
                        diff={kpis?.comparisons?.tagihanLaut?.momDiff}
                        prevValue={kpis?.comparisons?.tagihanLaut?.prev}
                        isCurrency
                      />
                    </div>
                  </div>

                  <div className="comparison-summary-card bg-[var(--color-neutral)]/40 border border-[var(--color-border)] rounded-xl p-3.5 space-y-1.5">
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
                <div className="matrix-and-audit-grid grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2">
                    <BillingPeriodMatrixTable
                      comparisons={kpis?.comparisons}
                      currentMonth={kpis?.currentMonth}
                      prevMonth={kpis?.prevMonth}
                      lastYearSameMonth={kpis?.lastYearSameMonth}
                      selectedBranch={selectedBranch}
                      onSelectBranch={setSelectedBranch}
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
                          Matriks ini mengukur pertumbuhan omzet tagihan (laut &amp; udara), nilai rata-rata tiket invoice, dan pangsa omzet cabang secara bulanan (MoM) serta tahunan (YoY). Gunakan navigasi periode di atas untuk audit bulan lampau.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail Kinerja Penagihan Per Cabang (Branch Comparison Matrix) */}
                <BillingBranchComparisonTable
                  branchComparisons={kpis?.comparisons?.byBranch}
                  selectedBranch={selectedBranch}
                  onSelectBranch={setSelectedBranch}
                  isLoading={isLoadingKpi}
                />
              </div>
            )}

            {financeActiveTab === 'harian' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                      {t('billing.dailyBillTitle', { days: financeDaysFilter })}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-[var(--color-secondary)]">
                      {t('billing.metric.value')} • {financeTrendMode === 'all' ? t('billing.trend.proportion') : financeTrendMode === 'udara' ? t('billing.targetAir') : t('billing.targetSea')}
                    </p>
                  </div>
                </div>
                <TrendChart
                  data={daily}
                  isLoading={isLoadingTrends}
                  emptyMessage={t('billing.noDataDays', { days: financeDaysFilter })}
                  isMobile={isMobile}
                  metric="value"
                  modeFilter={financeTrendMode}
                />
              </>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ── Kontainer Dokumen PDF Standby (Off-Screen) Terpisah Finance & Operation ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -99,
        }}
      >
        {/* Laporan Finansial (5 Lembar Khusus Omzet & Nilai Uang Rp) */}
        <div ref={financeReportRef} style={{ width: '1200px' }}>
          <DashboardPdfFullReport
            reportType="finance"
            kpis={kpis}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            daily={daily}
            monthly={monthly}
            byEmployeeSeries={byEmployeeSeries}
            byEmployeeData={byEmployeeData}
            sjVsBillData={sjVsBillData}
            unbilledSjDetails={unbilledSjDetails}
            batchExitSummary={batchExitSummary}
            batchExitBatches={batchExitBatches}
            selectedBranch={selectedBranch}
            printedBy={user?.fullName || user?.fdEmpName || user?.username || 'Finance PIC'}
            employeeDaysFilter={opEmployeeDaysFilter}
            sjDaysFilter={opSjDaysFilter}
            dailyDaysFilter={financeDaysFilter}
          />
        </div>

        {/* Laporan Operasional (6 Lembar Khusus Target, Kargo & PIC) */}
        <div ref={operationReportRef} style={{ width: '1200px' }}>
          <DashboardPdfFullReport
            reportType="operation"
            kpis={kpis}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            daily={daily}
            monthly={monthly}
            byEmployeeSeries={byEmployeeSeries}
            byEmployeeData={byEmployeeData}
            sjVsBillData={sjVsBillData}
            unbilledSjDetails={unbilledSjDetails}
            batchExitSummary={batchExitSummary}
            batchExitBatches={batchExitBatches}
            selectedBranch={selectedBranch}
            printedBy={user?.fullName || user?.fdEmpName || user?.username || 'Finance PIC'}
            employeeDaysFilter={opEmployeeDaysFilter}
            sjDaysFilter={opSjDaysFilter}
            dailyDaysFilter={financeDaysFilter}
          />
        </div>
      </div>

      {/* Modal Rincian Draft Bill Belum Di-Issue (Unissued Bills) */}
      <UnissuedBillsModal
        isOpen={unissuedModalOpen}
        onClose={() => setUnissuedModalOpen(false)}
        initialAging={unissuedModalInitialAging}
      />
    </div>
  )
}
