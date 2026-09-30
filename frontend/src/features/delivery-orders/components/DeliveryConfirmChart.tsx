import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import {
  BarChart3,
  Clock,
  Layers,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Package,
  Weight,
  ArrowUpDown,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { cn, formatNumber } from '@/lib/utils'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import type { 
  DeliveryConfirmBatchItem, 
  DeliveryDailyCompareItem 
} from '../types/delivery-orders.types'
import { DeliveryBatchDetailModal } from './DeliveryBatchDetailModal'
import { DeliveryEstimasiDetailModal } from './DeliveryEstimasiDetailModal'

export type ConfirmViewMode = 'compare' | 'batches' // compare (Estimasi vs Realisasi) vs batches (Sesi FoxPro)
export type ConfirmMetric = 'sj' | 'coly' | 'weight'
export type ConfirmModeFilter = 'all' | '1' | '2' // all, 1 (Udara), 2 (Laut)
export type DaysRange = 7 | 14 | 30 | 60

export function DeliveryConfirmChart() {
  const addToast = useToastStore((s) => s.addToast)

  // Filters
  const [viewMode, setViewMode] = useState<ConfirmViewMode>('compare')
  const [days, setDays] = useState<DaysRange>(30)
  const [metric, setMetric] = useState<ConfirmMetric>('sj')
  const [modeFilter, setModeFilter] = useState<ConfirmModeFilter>('all')

  // Table pagination & sorting
  const [tablePage, setTablePage] = useState<number>(1)
  const [tableLimit, setTableLimit] = useState<number>(10)
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('desc')

  // Batch detail modal state
  const [batchModalState, setBatchModalState] = useState<{
    isOpen: boolean
    batchDate: string
    batchSession: 'Pagi' | 'Sore'
    batchTime?: string
    displayDate?: string
  }>({
    isOpen: false,
    batchDate: '',
    batchSession: 'Pagi',
  })

  const handleOpenBatchDetail = (
    date: string,
    session: 'Pagi' | 'Sore',
    time?: string,
    displayDate?: string
  ) => {
    setBatchModalState({
      isOpen: true,
      batchDate: date,
      batchSession: session,
      batchTime: time,
      displayDate,
    })
  }

  // Estimasi detail modal state (Toleransi H+1)
  const [estimasiModalState, setEstimasiModalState] = useState<{
    isOpen: boolean
    estimasiDate: string
    displayDate?: string
    initialFilter: 'all' | 'overdue' | 'pending' | 'tolerance' | 'sent'
  }>({
    isOpen: false,
    estimasiDate: '',
    displayDate: '',
    initialFilter: 'overdue',
  })

  const handleOpenEstimasiDetail = (
    date: string,
    displayDate?: string,
    filter: 'all' | 'overdue' | 'pending' | 'tolerance' | 'sent' = 'overdue'
  ) => {
    setEstimasiModalState({
      isOpen: true,
      estimasiDate: date,
      displayDate,
      initialFilter: filter,
    })
  }

  // Fetch query
  const {
    data: trendsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['delivery-confirm-trends', days],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getConfirmTrends(days)
      return res.data
    },
    staleTime: 30_000,
  })

  const batches: DeliveryConfirmBatchItem[] = useMemo(() => trendsData?.data || [], [trendsData])
  const dailyComparison: DeliveryDailyCompareItem[] = useMemo(() => trendsData?.dailyComparison || [], [trendsData])
  const summary = useMemo(() => trendsData?.summary || {
    days,
    totalBatches: 0,
    totalSjSent: 0,
    totalSjUdara: 0,
    totalSjLaut: 0,
    totalColySent: 0,
    totalWeightSent: 0,
    avgSjPerBatch: 0,
    totalSjEstimated: 0,
    totalEstUdara: 0,
    totalEstLaut: 0,
    totalEstColy: 0,
    totalEstWeight: 0,
    overallAchievementPct: 0,
    diffTotalSj: 0,
    totalPendingOverdueSj: 0,
    totalPendingSj: 0,
  }, [trendsData, days])

  // Filtered daily data for compare chart
  const dailyChartData = useMemo(() => {
    return dailyComparison.map((d) => {
      const estSj = modeFilter === '1' ? d.estSjUdara : modeFilter === '2' ? d.estSjLaut : d.totalEstSj
      const realSj = modeFilter === '1' ? d.realSjUdara : modeFilter === '2' ? d.realSjLaut : d.totalRealSj
      const estPack = modeFilter === '1' ? d.estPackUdara : modeFilter === '2' ? d.estPackLaut : d.totalEstPack
      const realPack = modeFilter === '1' ? d.realPackUdara : modeFilter === '2' ? d.realPackLaut : d.totalRealPack
      const estWeight = modeFilter === '1' ? d.estWeightUdara : modeFilter === '2' ? d.estWeightLaut : d.totalEstWeight
      const realWeight = modeFilter === '1' ? d.realWeightUdara : modeFilter === '2' ? d.realWeightLaut : d.totalRealWeight

      return {
        ...d,
        // Active metric values
        estValue: metric === 'coly' ? estPack : metric === 'weight' ? estWeight : estSj,
        realValue: metric === 'coly' ? realPack : metric === 'weight' ? realWeight : realSj,
        // Breakdown for stacked display
        estUdaraVal: metric === 'coly' ? d.estPackUdara : metric === 'weight' ? d.estWeightUdara : d.estSjUdara,
        estLautVal: metric === 'coly' ? d.estPackLaut : metric === 'weight' ? d.estWeightLaut : d.estSjLaut,
        realUdaraVal: metric === 'coly' ? d.realPackUdara : metric === 'weight' ? d.realWeightUdara : d.realSjUdara,
        realLautVal: metric === 'coly' ? d.realPackLaut : metric === 'weight' ? d.realWeightLaut : d.realSjLaut,
      }
    })
  }, [dailyComparison, modeFilter, metric])

  // Filtered batch data for batches chart
  const batchChartData = useMemo(() => {
    return batches.map((b) => ({
      ...b,
      displaySjUdara: modeFilter === '2' ? 0 : b.sjUdara,
      displaySjLaut: modeFilter === '1' ? 0 : b.sjLaut,
      displayPackUdara: modeFilter === '2' ? 0 : b.packUdara,
      displayPackLaut: modeFilter === '1' ? 0 : b.packLaut,
      displayWeightUdara: modeFilter === '2' ? 0 : b.weightUdara,
      displayWeightLaut: modeFilter === '1' ? 0 : b.weightLaut,
    }))
  }, [batches, modeFilter])

  // Sorted items for table based on active viewMode
  const sortedDaily = useMemo(() => {
    const list = [...dailyComparison]
    return list.sort((a, b) => {
      const tA = new Date(a.date).getTime()
      const tB = new Date(b.date).getTime()
      return tableSortOrder === 'desc' ? tB - tA : tA - tB
    })
  }, [dailyComparison, tableSortOrder])

  const sortedBatches = useMemo(() => {
    const list = [...batches]
    return list.sort((a, b) => {
      const tA = new Date(a.batchTimestamp || a.batchDate).getTime()
      const tB = new Date(b.batchTimestamp || b.batchDate).getTime()
      return tableSortOrder === 'desc' ? tB - tA : tA - tB
    })
  }, [batches, tableSortOrder])

  // Paged table data
  const currentTableList = viewMode === 'compare' ? sortedDaily : sortedBatches
  const totalTablePages = Math.ceil(currentTableList.length / tableLimit) || 1
  const pagedList = useMemo(() => {
    const start = (tablePage - 1) * tableLimit
    return currentTableList.slice(start, start + tableLimit)
  }, [currentTableList, tablePage, tableLimit])

  // Excel Export
  const handleExportExcel = () => {
    if (dailyComparison.length === 0 && batches.length === 0) {
      addToast({ type: 'info', message: 'Tidak ada data konfirmasi untuk diekspor' })
      return
    }

    const wb = XLSX.utils.book_new()

    // Sheet 1: Perbandingan Harian (Estimasi vs Realisasi)
    const exportDaily = dailyComparison.map((d, idx) => {
      const rowB = d.batches && d.batches.length > 0 ? d.batches : batches.filter((b) => b.batchDate === d.date)
      const batchTimeDetailStr = rowB && rowB.length > 0
        ? rowB.map((b) => `${b.batchSession} ${b.batchTime || b.batchTimestamp?.slice(11, 16) || ''} (${b.totalSj} SJ [Air: ${b.sjUdara}, Sea: ${b.sjLaut}])`).join(', ')
        : '-'

      return {
        No: idx + 1,
        Tanggal: d.date,
        Hari: d.dayName,
        'Target SJ Estimasi': d.totalEstSj,
        'Estimasi Udara': d.estSjUdara,
        'Estimasi Laut': d.estSjLaut,
        'Realisasi SJ Terkirim': d.totalRealSj,
        'Realisasi Udara': d.realSjUdara,
        'Realisasi Laut': d.realSjLaut,
        'Selisih SJ (+/-)': d.diffSj,
        '% Ketercapaian': `${d.achievementPct}%`,
        'SJ Overdue (> H+1)': d.pendingOverdueSj ?? 0,
        'SJ Pending dlm Toleransi H+1': d.pendingToleransiSj ?? 0,
        'Total SJ Pending': d.pendingSjTotal ?? 0,
        'Koli Estimasi': d.totalEstPack,
        'Koli Realisasi': d.totalRealPack,
        'Berat Estimasi (Kg)': d.totalEstWeight,
        'Berat Realisasi (Kg)': d.totalRealWeight,
        'Jumlah Sesi Batch': d.batchCount,
        'Detail Jam Batch': batchTimeDetailStr,
      }
    })
    const ws1 = XLSX.utils.json_to_sheet(exportDaily)
    XLSX.utils.book_append_sheet(wb, ws1, 'Estimasi_vs_Realisasi')

    // Sheet 2: Sesi Batch FoxPro
    const exportBatches = batches.map((b, idx) => ({
      No: idx + 1,
      'Tanggal Batch': b.batchDate,
      Sesi: b.batchSession,
      'Jam Cetak FoxPro': b.batchTime || (b.batchTimestamp ? b.batchTimestamp.slice(11, 16) : '-'),
      'Label Batch': b.batchLabel,
      'Timestamp Cetak Laporan': b.batchTimestamp ? new Date(b.batchTimestamp).toLocaleString('id-ID') : '',
      'SJ Udara': b.sjUdara,
      'SJ Laut': b.sjLaut,
      'Total SJ Terkirim': b.totalSj,
      'Koli Udara': b.packUdara,
      'Koli Laut': b.packLaut,
      'Total Koli': b.totalPack,
      'Berat Udara (Kg)': b.weightUdara,
      'Berat Laut (Kg)': b.weightLaut,
      'Total Berat (Kg)': b.totalWeight,
    }))
    const ws2 = XLSX.utils.json_to_sheet(exportBatches)
    XLSX.utils.book_append_sheet(wb, ws2, 'Sesi_Batch_tbDeliveryConfirm')

    const fileName = `Tren_Konfirmasi_Estimasi_Delivery_${days}Hari_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, fileName)
    addToast({ type: 'success', message: 'File Excel perbandingan estimasi & konfirmasi berhasil diunduh' })
  }

  // Active Metric Config
  const metricConfig = useMemo(() => {
    switch (metric) {
      case 'coly':
        return {
          title: 'Jumlah Koli / Coly',
          unit: 'coly',
          udaraKey: 'displayPackUdara',
          lautKey: 'displayPackLaut',
          formatter: (val: number) => `${formatNumber(val)} coly`,
        }
      case 'weight':
        return {
          title: 'Tonase Berat Fisik',
          unit: 'kg',
          udaraKey: 'displayWeightUdara',
          lautKey: 'displayWeightLaut',
          formatter: (val: number) => `${val.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`,
        }
      case 'sj':
      default:
        return {
          title: 'Jumlah Surat Jalan',
          unit: 'SJ',
          udaraKey: 'displaySjUdara',
          lautKey: 'displaySjLaut',
          formatter: (val: number) => `${formatNumber(val)} SJ`,
        }
    }
  }, [metric])

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Toolbar: Controls & Filters ── */}
      <div className="p-3 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-2.5 sm:space-y-3">
        {/* Row 1: View Mode Switcher & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          {/* View Mode Selector: Compare vs Batches */}
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs font-medium w-full sm:w-auto">
            <button
              type="button"
              onClick={() => { setViewMode('compare'); setTablePage(1); }}
              className={cn(
                "flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition cursor-pointer select-none inline-flex items-center justify-center gap-1.5",
                viewMode === 'compare'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <Target size={13} className="text-indigo-500 shrink-0" />
              <span className="hidden xs:inline">Estimasi vs Realisasi</span>
              <span className="xs:hidden">Estimasi</span>
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('batches'); setTablePage(1); }}
              className={cn(
                "flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition cursor-pointer select-none inline-flex items-center justify-center gap-1.5",
                viewMode === 'batches'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <Layers size={13} className="text-sky-500 shrink-0" />
              <span className="hidden xs:inline">Sesi Batch FoxPro</span>
              <span className="xs:hidden">Batch FoxPro</span>
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={dailyComparison.length === 0}
              className="gap-1.5 cursor-pointer text-xs flex-1 sm:flex-initial justify-center"
            >
              <Download size={13} />
              <span>Ekspor Excel</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 cursor-pointer text-xs shrink-0"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              <span className="hidden xs:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Row 2: Horizontally scrollable pill strip for Metrik, Moda, and Days */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]/60 overflow-x-auto no-scrollbar py-0.5 whitespace-nowrap">
          {/* Metrik Selector */}
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setMetric('sj')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none",
                metric === 'sj'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Surat Jalan (SJ)
            </button>
            <button
              type="button"
              onClick={() => setMetric('coly')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none",
                metric === 'coly'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Koli / Coly
            </button>
            <button
              type="button"
              onClick={() => setMetric('weight')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none",
                metric === 'weight'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Berat (Kg)
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)] shrink-0" />

          {/* Moda Filter */}
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs font-medium shrink-0">
            <button
              type="button"
              onClick={() => setModeFilter('all')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none",
                modeFilter === 'all'
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              Semua Moda
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('1')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none inline-flex items-center gap-1",
                modeFilter === '1'
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/40 font-semibold"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <span>✈️ Udara</span>
            </button>
            <button
              type="button"
              onClick={() => setModeFilter('2')}
              className={cn(
                "px-2.5 py-1 rounded-md transition cursor-pointer select-none inline-flex items-center gap-1",
                modeFilter === '2'
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 font-semibold"
                  : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              )}
            >
              <span>🚢 Laut</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[var(--color-border)] shrink-0" />

          {/* Rentang Hari */}
          <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs font-medium shrink-0">
            {([7, 14, 30, 60] as DaysRange[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "px-2 py-1 rounded-md transition cursor-pointer select-none",
                  days === d
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                {d} Hari
              </button>
            ))}
          </div>
        </div>

        {/* Informational Sub-banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-[var(--color-secondary)] pt-1.5 border-t border-[var(--color-border)]/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Siklus Batch tbDeliveryConfirm:</span>
            </span>
            <span className="font-medium text-[var(--color-primary)]">
              Sesi Pagi (~09:30) & Sesi Sore (~14:30)
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span>Target Estimasi: {formatNumber(summary.totalSjEstimated)} SJ</span>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Realisasi Terkirim: {formatNumber(summary.totalSjSent)} SJ ({summary.overallAchievementPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI Ribbon Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Target Estimasi Kirim */}
        <div className="p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Target Estimasi</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {formatNumber(summary.totalSjEstimated)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
            <span>✈️ {formatNumber(summary.totalEstUdara)}</span>
            <span>🚢 {formatNumber(summary.totalEstLaut)}</span>
          </div>
        </div>

        {/* Realisasi Terkonfirmasi Terkirim */}
        <div className="p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Realisasi Terkirim</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatNumber(summary.totalSjSent)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
            <span className="text-sky-600 dark:text-sky-400">✈️ {formatNumber(summary.totalSjUdara)}</span>
            <span className="text-emerald-600 dark:text-emerald-400">🚢 {formatNumber(summary.totalSjLaut)}</span>
          </div>
        </div>

        {/* Rasio Ketercapaian (% Achievement) */}
        <div className="p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Ketercapaian</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-[var(--color-primary)] font-mono flex items-center gap-1.5">
            <span>{summary.overallAchievementPct}%</span>
            {summary.diffTotalSj >= 0 ? (
              <span className="text-xs px-1.5 py-0.5 rounded font-normal bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight size={12} />
                +{summary.diffTotalSj}
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded font-normal bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center">
                <ArrowDownRight size={12} />
                {summary.diffTotalSj}
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-secondary)]">
            <span>Rasio Realisasi vs Estimasi</span>
          </div>
        </div>

        {/* Pending Overdue (> H+1) */}
        <div className={cn(
          "p-3 sm:p-3.5 rounded-xl border transition-colors",
          (summary.totalPendingOverdueSj || 0) > 0
            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-secondary)]"
        )}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Pending (&gt; H+1)</span>
            <AlertTriangle className={cn("w-4 h-4", (summary.totalPendingOverdueSj || 0) > 0 ? "text-rose-500" : "text-[var(--color-secondary)]")} />
          </div>
          <div className={cn("text-xl font-bold font-mono", (summary.totalPendingOverdueSj || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-[var(--color-primary)]")}>
            {formatNumber(summary.totalPendingOverdueSj || 0)} <span className="text-xs font-normal">SJ</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-secondary)]">
            <span>Total Pending: {formatNumber(summary.totalPendingSj || 0)} SJ</span>
          </div>
        </div>

        {/* Total Coly (Realisasi vs Estimasi) */}
        <div className="p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Total Koli / Coly</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-[var(--color-primary)] font-mono">
            {formatNumber(summary.totalColySent)}
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-secondary)]">
            <span>Target: {formatNumber(summary.totalEstColy)} coly</span>
          </div>
        </div>

        {/* Total Tonase Berat */}
        <div className="p-3 sm:p-3.5 rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-secondary)] mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Total Tonase Berat</span>
            <Weight className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-[var(--color-primary)] font-mono">
            {summary.totalWeightSent.toLocaleString('id-ID', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">kg</span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--color-secondary)]">
            <span>Target: {summary.totalEstWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg</span>
          </div>
        </div>
      </div>

      {/* ── Chart Container ── */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              <span>
                {viewMode === 'compare'
                  ? `Perbandingan Estimasi Kirim vs Realisasi Terkonfirmasi (${metricConfig.title})`
                  : `Tren Konfirmasi per Sesi Batch FoxPro (${metricConfig.title})`}
              </span>
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              {viewMode === 'compare'
                ? 'Agregasi harian membandingkan target estimasi kirim (fdEstimasi) dengan surat jalan yang terkonfirmasi terkirim (tbDeliveryConfirm)'
                : 'Dikelompokkan berdasarkan timestamp cetak laporan tbDeliveryConfirm per sesi Pagi (~09:30) dan Sore (~14:30)'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {viewMode === 'compare' ? (
              <>
                <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />
                  <span>📋 Target Estimasi</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
                  <span>✅ Realisasi Terkirim</span>
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
                  <span>🚢 Laut</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400">
                  <span className="w-2.5 h-2.5 rounded bg-sky-600 inline-block" />
                  <span>✈️ Udara</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Chart View */}
        {isLoading ? (
          <div className="h-[270px] sm:h-[400px] w-full skeleton-shimmer rounded-xl" />
        ) : (viewMode === 'compare' ? dailyChartData.length === 0 : batchChartData.length === 0) ? (
          <div className="h-[240px] flex flex-col items-center justify-center text-[var(--color-secondary)] text-sm space-y-2">
            <Layers className="w-8 h-8 opacity-40" />
            <p>Belum ada data konfirmasi atau estimasi dalam {days} hari terakhir.</p>
          </div>
        ) : viewMode === 'compare' ? (
          /* ── Chart 1: Estimasi vs Realisasi (Grouped Bar) ── */
          <div className="h-[270px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyChartData}
                margin={{ top: 12, right: 8, left: -22, bottom: 20 }}
                barCategoryGap="25%"
                barGap={4}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
                  tickFormatter={(val) => formatNumber(val)}
                  width={42}
                />

                {/* Custom Tooltip Compare Mode */}
                <Tooltip
                  cursor={{ fill: 'var(--color-neutral)', opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const row = payload[0]?.payload as DeliveryDailyCompareItem & { estValue: number; realValue: number }
                    if (!row) return null

                    const pct = row.achievementPct || 0
                    const isSuccess = pct >= 100

                    return (
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 shadow-xl text-xs font-[var(--font-body)] min-w-[260px] space-y-2.5 backdrop-blur-md">
                        {/* Header */}
                        <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
                          <span className="font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                            {row.displayDate} ({row.dayName})
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1",
                            isSuccess
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          )}>
                            <span>{pct}% Tercapai</span>
                          </span>
                        </div>

                        {/* Breakdown perbandingan */}
                        <div className="space-y-2">
                          {/* Target Estimasi */}
                          <div className="p-2 rounded-lg bg-[var(--color-neutral)]/60 border border-[var(--color-border)] space-y-1">
                            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                              <span className="inline-flex items-center gap-1">
                                <Target size={12} />
                                <span>Target Estimasi:</span>
                              </span>
                              <span className="font-mono text-sm">
                                {metricConfig.formatter(row.estValue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                              <span>✈️ Udara: {formatNumber(row.estSjUdara)} SJ</span>
                              <span>🚢 Laut: {formatNumber(row.estSjLaut)} SJ</span>
                            </div>
                            <div className="text-[10px] text-[var(--color-secondary)]">
                              Fisik: {formatNumber(row.totalEstPack)} coly • {row.totalEstWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                            </div>
                          </div>

                          {/* Realisasi Terkonfirmasi */}
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Realisasi Terkonfirmasi:</span>
                              </span>
                              <span className="font-mono text-sm">
                                {metricConfig.formatter(row.realValue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                              <span>✈️ Udara: {formatNumber(row.realSjUdara)} SJ</span>
                              <span>🚢 Laut: {formatNumber(row.realSjLaut)} SJ</span>
                            </div>
                            <div className="text-[10px] text-[var(--color-secondary)]">
                              Fisik: {formatNumber(row.totalRealPack)} coly • {row.totalRealWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                            </div>
                          </div>
                        </div>

                        {/* Rincian Sesi Batch & Jam Cetak */}
                        {(() => {
                          const rowBatches = (row.batches && row.batches.length > 0)
                            ? row.batches
                            : batches.filter((b) => b.batchDate === row.date)
                          if (!rowBatches || rowBatches.length === 0) return null
                          return (
                            <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
                              <span className="text-[10px] text-[var(--color-secondary)] uppercase font-semibold block">
                                Sesi Cetak Laporan FoxPro ({rowBatches.length} batch):
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {rowBatches.map((b, bIdx) => {
                                  const time = b.batchTime || (b.batchTimestamp ? b.batchTimestamp.slice(11, 16) : '')
                                  const isPagi = b.batchSession === 'Pagi'
                                  return (
                                    <span
                                      key={bIdx}
                                      className={cn(
                                        "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border",
                                        isPagi
                                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                          : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                      )}
                                    >
                                      {b.batchSession}{time ? ` ${time}` : ''}: {b.totalSj} SJ (✈️{b.sjUdara} 🚢{b.sjLaut})
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Selisih Ketercapaian */}
                        <div className="border-t border-[var(--color-border)] pt-2 flex items-center justify-between text-[11px]">
                          <span className="text-[var(--color-secondary)]">Selisih Realisasi vs Target:</span>
                          <span className={cn(
                            "font-bold font-mono",
                            row.diffSj >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {row.diffSj >= 0 ? `+${row.diffSj}` : row.diffSj} SJ
                          </span>
                        </div>
                      </div>
                    )
                  }}
                />

                {/* Bar 1: Target Estimasi (Indigo) */}
                <Bar
                  dataKey="estValue"
                  name="📋 Target Estimasi"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />

                {/* Bar 2: Realisasi Terkonfirmasi (Emerald) */}
                <Bar
                  dataKey="realValue"
                  name="✅ Realisasi Terkirim"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* ── Chart 2: Sesi Batch FoxPro (Stacked Bar) ── */
          <div className="h-[270px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={batchChartData}
                margin={{ top: 12, right: 8, left: -22, bottom: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="batchLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary)', fontFamily: 'var(--font-label)' }}
                  tickFormatter={(val) => formatNumber(val)}
                  width={42}
                />

                {/* Custom Multi-theme Tooltip Batch Mode */}
                <Tooltip
                  cursor={{ fill: 'var(--color-neutral)', opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const row = payload[0]?.payload as DeliveryConfirmBatchItem
                    if (!row) return null

                    const rowSj = row.totalSj || 0
                    const uSjPct = rowSj > 0 ? Math.round((row.sjUdara / rowSj) * 100) : 0
                    const lSjPct = rowSj > 0 ? 100 - uSjPct : 0

                    return (
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3.5 shadow-xl text-xs font-[var(--font-body)] min-w-[240px] space-y-2.5 backdrop-blur-md">
                        <div className="border-b border-[var(--color-border)] pb-2 flex items-center justify-between">
                          <span className="font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                            {row.batchLabel}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                            row.batchSession === 'Pagi'
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                          )}>
                            Sesi {row.batchSession}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                              <span>✈️ Udara:</span>
                            </span>
                            <span className="font-semibold text-[var(--color-primary)] tabular-nums">
                              {formatNumber(row.sjUdara)} SJ • {formatNumber(row.packUdara)} coly • {row.weightUdara.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>🚢 Laut:</span>
                            </span>
                            <span className="font-semibold text-[var(--color-primary)] tabular-nums">
                              {formatNumber(row.sjLaut)} SJ • {formatNumber(row.packLaut)} coly • {row.weightLaut.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-[var(--color-border)] pt-2 space-y-1">
                          <div className="flex items-center justify-between font-bold text-[var(--color-primary)]">
                            <span className="text-[11px] text-[var(--color-secondary)] uppercase">Total Sesi Ini</span>
                            <span className="tabular-nums font-mono text-sm">
                              {formatNumber(row.totalSj)} SJ
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
                            <span>Fisik: {formatNumber(row.totalPack)} coly</span>
                            <span>{row.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                          </div>
                        </div>

                        {rowSj > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="h-1.5 w-full bg-[var(--color-neutral)] rounded-full overflow-hidden flex">
                              <div
                                style={{ width: `${uSjPct}%` }}
                                className="bg-sky-500 h-full transition-all duration-300"
                              />
                              <div
                                style={{ width: `${lSjPct}%` }}
                                className="bg-emerald-500 h-full transition-all duration-300"
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[var(--color-secondary)]">
                              <span>Udara {uSjPct}%</span>
                              <span>Laut {lSjPct}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  }}
                />

                <Bar
                  dataKey={metricConfig.lautKey}
                  name="🚢 Laut"
                  fill="#059669"
                  stackId="confirmBatch"
                  radius={modeFilter === '2' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
                <Bar
                  dataKey={metricConfig.udaraKey}
                  name="✈️ Udara"
                  fill="#0284c7"
                  stackId="confirmBatch"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Table: Log Riwayat (Sesuai View Mode) ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] font-[var(--font-display)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>
                {viewMode === 'compare'
                  ? 'Tabel Log Harian: Target Estimasi vs Realisasi Terkonfirmasi'
                  : 'Log Riwayat Sesi Cetak Laporan (tbDeliveryConfirm)'}
              </span>
            </h4>
            <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
              Menampilkan {currentTableList.length} baris data dalam {days} hari terakhir
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTableSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition cursor-pointer"
            >
              <ArrowUpDown size={12} />
              <span>Urutan: {tableSortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          {viewMode === 'compare' ? (
            /* ── Table Mode Compare: Estimasi vs Realisasi ── */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] font-medium">
                  <th className="py-2.5 px-3.5 text-center w-12">No</th>
                  <th className="py-2.5 px-3.5">Tanggal</th>
                  <th className="py-2.5 px-3.5 text-right font-medium text-indigo-600 dark:text-indigo-400">Target Estimasi</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">Realisasi Terkirim</th>
                  <th className="py-2.5 px-3.5 text-center">Ketercapaian</th>
                  <th className="py-2.5 px-3.5 text-right">Selisih (+/-)</th>
                  <th className="py-2.5 px-3.5 text-center min-w-[130px]">Status Pending (&gt; H+1)</th>
                  <th className="py-2.5 px-3.5 text-right">Koli (Real vs Est)</th>
                  <th className="py-2.5 px-3.5 text-right">Tonase Berat (Real vs Est)</th>
                  <th className="py-2.5 px-3.5 text-center min-w-[160px]">Sesi Batch & Jam Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pagedList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-[var(--color-secondary)]">
                      Tidak ada data perbandingan estimasi vs realisasi.
                    </td>
                  </tr>
                ) : (
                  (pagedList as DeliveryDailyCompareItem[]).map((item, idx) => {
                    const globalIdx = (tablePage - 1) * tableLimit + idx + 1
                    const isSuccess = item.achievementPct >= 100
                    const fullDateLabel = `${item.dayName ? `${item.dayName}, ` : ''}${item.displayDate} ${item.date ? item.date.slice(0, 4) : ''}`
                    return (
                      <tr
                        key={item.date}
                        className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 text-center text-[var(--color-secondary)] font-mono text-[11px]">
                          {globalIdx}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                          <span>{item.displayDate} ({item.dayName})</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                          {item.totalEstSj > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEstimasiDetail(item.date, fullDateLabel, 'all')}
                              className="inline-flex items-center gap-1 hover:underline text-indigo-600 dark:text-indigo-400 font-medium cursor-pointer"
                              title={`Lihat seluruh ${item.totalEstSj} target Surat Jalan estimasi ${fullDateLabel}`}
                            >
                              <span>{formatNumber(item.totalEstSj)} SJ</span>
                              <ArrowUpRight size={10} className="opacity-60" />
                            </button>
                          ) : (
                            <span>{formatNumber(item.totalEstSj)} SJ</span>
                          )}
                          <span className="block text-[10px] text-[var(--color-secondary)] font-normal">
                            Ud: {item.estSjUdara} • Lt: {item.estSjLaut}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(item.totalRealSj)} SJ
                          <span className="block text-[10px] text-[var(--color-secondary)] font-normal">
                            Ud: {item.realSjUdara} • Lt: {item.realSjLaut}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-mono font-semibold text-[11px]",
                            isSuccess
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          )}>
                            {item.achievementPct}%
                          </span>
                        </td>
                        <td className={cn(
                          "py-2.5 px-3.5 text-right font-mono font-semibold",
                          item.diffSj >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {item.diffSj >= 0 ? `+${item.diffSj}` : item.diffSj} SJ
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          {(() => {
                            const overdue = item.pendingOverdueSj ?? 0
                            const toleransi = item.pendingToleransiSj ?? 0
                            const totalPending = item.pendingSjTotal ?? (overdue + toleransi)

                            if (overdue > 0) {
                              return (
                                <div className="inline-flex flex-col items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEstimasiDetail(item.date, fullDateLabel, 'overdue')}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-all cursor-pointer shadow-2xs"
                                    title={`Klik untuk melihat rincian ${overdue} Surat Jalan pending yang lewat batas toleransi H+1 (${fullDateLabel})`}
                                  >
                                    <AlertTriangle size={11} className="shrink-0 text-rose-500" />
                                    <span>{formatNumber(overdue)} SJ Overdue</span>
                                    <ArrowUpRight size={10} className="opacity-70" />
                                  </button>
                                  {toleransi > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEstimasiDetail(item.date, fullDateLabel, 'tolerance')}
                                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline mt-0.5 font-mono cursor-pointer"
                                      title={`Klik untuk melihat ${toleransi} SJ masih dalam batas toleransi H+1 (${fullDateLabel})`}
                                    >
                                      +{toleransi} dlm H+1
                                    </button>
                                  )}
                                </div>
                              )
                            }

                            if (toleransi > 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEstimasiDetail(item.date, fullDateLabel, 'tolerance')}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-medium text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
                                  title={`Klik untuk melihat ${toleransi} Surat Jalan pending dalam batas toleransi H+1 (${fullDateLabel})`}
                                >
                                  <Clock size={11} className="shrink-0 text-amber-500" />
                                  <span>{formatNumber(toleransi)} SJ (H+1)</span>
                                  <ArrowUpRight size={10} className="opacity-70" />
                                </button>
                              )
                            }

                            if (item.totalEstSj > 0 && totalPending === 0) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEstimasiDetail(item.date, fullDateLabel, 'sent')}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                                  title="Seluruh Surat Jalan target estimasi tanggal ini sudah terkirim. Klik untuk melihat daftar."
                                >
                                  <CheckCircle2 size={11} className="shrink-0 text-emerald-500" />
                                  <span>0 Pending</span>
                                </button>
                              )
                            }

                            return (
                              <span className="text-[var(--color-secondary)] italic text-[11px]">—</span>
                            )
                          })()}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-primary)]">
                          {formatNumber(item.totalRealPack)}
                          <span className="text-[10px] text-[var(--color-secondary)] block font-normal">
                            / {formatNumber(item.totalEstPack)} coly
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-primary)]">
                          {item.totalRealWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                          <span className="text-[10px] text-[var(--color-secondary)] block font-normal">
                            / {item.totalEstWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {(() => {
                            const rowBatches = (item.batches && item.batches.length > 0)
                              ? item.batches
                              : batches.filter((b) => b.batchDate === item.date)

                            if (!rowBatches || rowBatches.length === 0) {
                              return (
                                <span className="text-[var(--color-secondary)] italic text-[11px]">—</span>
                              )
                            }

                            return (
                              <div className="inline-flex flex-col gap-1 items-stretch min-w-[145px] max-w-[185px] text-left">
                                {rowBatches.map((b, bIdx) => {
                                  const time = b.batchTime || (b.batchTimestamp ? b.batchTimestamp.slice(11, 16) : '')
                                  const isPagi = b.batchSession === 'Pagi'
                                  return (
                                    <div
                                      key={`${b.batchDate}-${b.batchSession}-${bIdx}`}
                                      onClick={() => handleOpenBatchDetail(b.batchDate, b.batchSession, time, item.displayDate)}
                                      className={cn(
                                        "flex items-center justify-between gap-2 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer select-none hover:shadow-xs hover:border-sky-500/50 hover:bg-sky-500/5 group",
                                        isPagi
                                          ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30"
                                          : "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border-indigo-500/30"
                                      )}
                                      title={`Klik untuk melihat rincian ${b.totalSj} Surat Jalan sesi ${b.batchSession} (${time || '—'} WIB)\nTotal: ${b.totalSj} SJ (${b.sjUdara} Udara, ${b.sjLaut} Laut)\nKoli: ${formatNumber(b.totalPack)} • Berat: ${b.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                          className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform",
                                            isPagi ? "bg-amber-500 shadow-amber-500/50" : "bg-indigo-500 shadow-indigo-500/50"
                                          )}
                                        />
                                        <span className="text-[9.5px] uppercase font-bold tracking-wider opacity-85">
                                          {b.batchSession}
                                        </span>
                                        <span className="font-bold text-[var(--color-primary)]">
                                          {time || '—'}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-[var(--color-surface)]/70 border border-[var(--color-border)]/60 text-[var(--color-primary)] shrink-0 group-hover:border-sky-500/40 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                        {b.totalSj} SJ
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* ── Table Mode Batches: Rincian per Sesi FoxPro ── */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 text-[var(--color-secondary)] font-medium">
                  <th className="py-2.5 px-3.5 text-center w-12">No</th>
                  <th className="py-2.5 px-3.5">Tanggal & Sesi Batch</th>
                  <th className="py-2.5 px-3.5">Waktu Laporan FoxPro</th>
                  <th className="py-2.5 px-3.5 text-right">SJ Udara</th>
                  <th className="py-2.5 px-3.5 text-right">SJ Laut</th>
                  <th className="py-2.5 px-3.5 text-right font-semibold text-[var(--color-primary)]">Total SJ</th>
                  <th className="py-2.5 px-3.5 text-right">Total Koli</th>
                  <th className="py-2.5 px-3.5 text-right">Total Berat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {pagedList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--color-secondary)]">
                      Tidak ada riwayat batch konfirmasi.
                    </td>
                  </tr>
                ) : (
                  (pagedList as DeliveryConfirmBatchItem[]).map((item, idx) => {
                    const globalIdx = (tablePage - 1) * tableLimit + idx + 1
                    return (
                      <tr
                        key={`${item.batchDate}-${item.batchSession}-${idx}`}
                        className="hover:bg-[var(--color-neutral)]/40 transition-colors"
                      >
                        <td className="py-2.5 px-3.5 text-center text-[var(--color-secondary)] font-mono text-[11px]">
                          {globalIdx}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-[var(--color-primary)]">
                          <div className="flex items-center gap-2">
                            <span>{item.batchLabel}</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                              item.batchSession === 'Pagi'
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                            )}>
                              {item.batchSession}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-[var(--color-secondary)] font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-sky-500 shrink-0" />
                            <span className="font-semibold text-[var(--color-primary)]">
                              {item.batchTime ? `${item.batchTime} WIB` : item.batchTimestamp ? `${item.batchTimestamp.slice(11, 16)} WIB` : '-'}
                            </span>
                            {item.batchTimestamp && (
                              <span className="text-[10px] text-[var(--color-secondary)]">
                                ({item.batchDate})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-sky-600 dark:text-sky-400">
                          {item.sjUdara > 0 ? `${formatNumber(item.sjUdara)} SJ` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {item.sjLaut > 0 ? `${formatNumber(item.sjLaut)} SJ` : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[var(--color-primary)]">
                          <button
                            type="button"
                            onClick={() => handleOpenBatchDetail(item.batchDate, item.batchSession, item.batchTime, item.batchLabel)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:border-sky-500/30 border border-transparent transition cursor-pointer select-none"
                            title="Lihat rincian Surat Jalan batch ini"
                          >
                            <span>{formatNumber(item.totalSj)} SJ</span>
                            <ArrowUpRight size={11} className="opacity-70" />
                          </button>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-secondary)]">
                          {formatNumber(item.totalPack)} coly
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-[var(--color-secondary)]">
                          {item.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {pagedList.length === 0 ? (
            <div className="py-12 px-4 text-center text-[var(--color-secondary)]">
              <Calendar className="w-8 h-8 opacity-40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                Tidak ada data {viewMode === 'compare' ? 'perbandingan estimasi vs realisasi' : 'riwayat batch konfirmasi'}
              </p>
              <p className="text-xs text-[var(--color-secondary)] mt-0.5">
                Tidak ditemukan data dalam rentang {days} hari terakhir.
              </p>
            </div>
          ) : viewMode === 'compare' ? (
            /* ── Mobile Cards: Compare Mode (Estimasi vs Realisasi) ── */
            <div className="divide-y divide-[var(--color-border)]/60">
              {(pagedList as DeliveryDailyCompareItem[]).map((item, idx) => {
                const globalIdx = (tablePage - 1) * tableLimit + idx + 1
                const isSuccess = item.achievementPct >= 100
                const rowBatches = (item.batches && item.batches.length > 0)
                  ? item.batches
                  : batches.filter((b) => b.batchDate === item.date)
                const overdue = item.pendingOverdueSj ?? 0
                const toleransi = item.pendingToleransiSj ?? 0
                const totalPending = item.pendingSjTotal ?? (overdue + toleransi)

                return (
                  <div key={item.date} className="p-3 space-y-2.5">
                    {/* Header: Tanggal & Ketercapaian Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--color-secondary)] w-5 shrink-0">
                          #{globalIdx}
                        </span>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-[var(--color-primary)] font-[var(--font-display)]">
                            {item.displayDate}
                          </span>
                          <span className="text-[11px] text-[var(--color-secondary)] ml-1">
                            ({item.dayName})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "px-2 py-0.5 rounded font-mono font-semibold text-[11px] border",
                          isSuccess
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        )}>
                          {item.achievementPct}%
                        </span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-mono text-[10.5px] font-semibold border",
                          item.diffSj >= 0 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        )}>
                          {item.diffSj >= 0 ? `+${item.diffSj}` : item.diffSj} SJ
                        </span>
                      </div>
                    </div>

                    {/* Grid 2 Kolom: Target Estimasi vs Realisasi Terkirim */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Box Target Estimasi */}
                      <div className="p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400">
                            Target Estimasi
                          </span>
                          <Target size={11} className="text-indigo-500" />
                        </div>
                        <div>
                          {item.totalEstSj > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEstimasiDetail(item.date, item.displayDate, 'all')}
                              className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              title={`Lihat rincian ${item.totalEstSj} SJ target estimasi`}
                            >
                              <span>{formatNumber(item.totalEstSj)} SJ</span>
                              <ArrowUpRight size={11} className="opacity-70" />
                            </button>
                          ) : (
                            <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                              {formatNumber(item.totalEstSj)} SJ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)]">
                          ✈️ {item.estSjUdara} • 🚢 {item.estSjLaut}
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)] truncate">
                          {formatNumber(item.totalEstPack)} coly • {item.totalEstWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg
                        </div>
                      </div>

                      {/* Box Realisasi Terkirim */}
                      <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                            Realisasi Terkirim
                          </span>
                          <CheckCircle2 size={11} className="text-emerald-500" />
                        </div>
                        <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatNumber(item.totalRealSj)} SJ
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)]">
                          ✈️ {item.realSjUdara} • 🚢 {item.realSjLaut}
                        </div>
                        <div className="text-[10px] text-[var(--color-secondary)] truncate">
                          {formatNumber(item.totalRealPack)} coly • {item.totalRealWeight.toLocaleString('id-ID', { maximumFractionDigits: 0 })} kg
                        </div>
                      </div>
                    </div>

                    {/* Row Pending Status */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[11px] text-[var(--color-secondary)]">
                        Status Pending:
                      </span>
                      <div>
                        {overdue > 0 ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEstimasiDetail(item.date, item.displayDate, 'overdue')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10.5px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-all cursor-pointer shadow-2xs"
                              title={`Klik untuk melihat ${overdue} SJ overdue`}
                            >
                              <AlertTriangle size={11} className="shrink-0 text-rose-500" />
                              <span>{formatNumber(overdue)} SJ Overdue</span>
                              <ArrowUpRight size={10} className="opacity-70" />
                            </button>
                            {toleransi > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenEstimasiDetail(item.date, item.displayDate, 'tolerance')}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-mono cursor-pointer"
                                title={`Klik untuk melihat ${toleransi} SJ dlm H+1`}
                              >
                                +{toleransi} dlm H+1
                              </button>
                            )}
                          </div>
                        ) : toleransi > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEstimasiDetail(item.date, item.displayDate, 'tolerance')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium text-[10.5px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
                            title={`Klik untuk melihat ${toleransi} SJ pending dalam H+1`}
                          >
                            <Clock size={11} className="shrink-0 text-amber-500" />
                            <span>{formatNumber(toleransi)} SJ (H+1)</span>
                            <ArrowUpRight size={10} className="opacity-70" />
                          </button>
                        ) : item.totalEstSj > 0 && totalPending === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEstimasiDetail(item.date, item.displayDate, 'sent')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Seluruh target estimasi terkirim. Klik untuk melihat daftar."
                          >
                            <CheckCircle2 size={11} className="shrink-0 text-emerald-500" />
                            <span>0 Pending</span>
                          </button>
                        ) : (
                          <span className="text-[var(--color-secondary)] italic text-[11px]">—</span>
                        )}
                      </div>
                    </div>

                    {/* Row Sesi Batch tbDeliveryConfirm */}
                    {rowBatches && rowBatches.length > 0 && (
                      <div className="pt-1.5 border-t border-[var(--color-border)]/50 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-[var(--color-secondary)] block">
                          Sesi Cetak FoxPro ({rowBatches.length} batch):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rowBatches.map((b, bIdx) => {
                            const time = b.batchTime || (b.batchTimestamp ? b.batchTimestamp.slice(11, 16) : '')
                            const isPagi = b.batchSession === 'Pagi'
                            return (
                              <div
                                key={`${b.batchDate}-${b.batchSession}-${bIdx}`}
                                onClick={() => handleOpenBatchDetail(b.batchDate, b.batchSession, time, item.displayDate)}
                                className={cn(
                                  "flex items-center justify-between gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border transition-all cursor-pointer select-none hover:shadow-xs hover:border-sky-500/50 hover:bg-sky-500/5 group flex-1 min-w-[135px]",
                                  isPagi
                                    ? "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30"
                                    : "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 border-indigo-500/30"
                                )}
                                title={`Klik untuk rincian ${b.totalSj} SJ sesi ${b.batchSession}`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform",
                                      isPagi ? "bg-amber-500 shadow-amber-500/50" : "bg-indigo-500 shadow-indigo-500/50"
                                    )}
                                  />
                                  <span className="text-[9.5px] uppercase font-bold tracking-wider opacity-85">
                                    {b.batchSession}
                                  </span>
                                  <span className="font-bold text-[var(--color-primary)]">
                                    {time || '—'}
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-[var(--color-surface)]/70 border border-[var(--color-border)]/60 text-[var(--color-primary)] shrink-0 group-hover:border-sky-500/40 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                  {b.totalSj} SJ
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── Mobile Cards: Batches Mode (Sesi FoxPro) ── */
            <div className="divide-y divide-[var(--color-border)]/60">
              {(pagedList as DeliveryConfirmBatchItem[]).map((item, idx) => {
                const globalIdx = (tablePage - 1) * tableLimit + idx + 1
                const isPagi = item.batchSession === 'Pagi'
                const time = item.batchTime || (item.batchTimestamp ? item.batchTimestamp.slice(11, 16) : '')

                return (
                  <div key={`${item.batchDate}-${item.batchSession}-${idx}`} className="p-3 space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--color-secondary)] w-5 shrink-0">
                          #{globalIdx}
                        </span>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-[var(--color-primary)] font-[var(--font-display)]">
                            {item.batchLabel}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[10px] font-semibold border",
                              isPagi
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                            )}>
                              Sesi {item.batchSession}
                            </span>
                            <span className="text-[10.5px] font-mono text-[var(--color-secondary)] flex items-center gap-1">
                              <Clock size={11} className="text-sky-500" />
                              <span>{time ? `${time} WIB` : '-'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Total SJ Button (opens modal) */}
                      <button
                        type="button"
                        onClick={() => handleOpenBatchDetail(item.batchDate, item.batchSession, item.batchTime, item.batchLabel)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 font-mono font-bold text-xs transition cursor-pointer shrink-0 shadow-2xs"
                        title="Lihat rincian Surat Jalan batch ini"
                      >
                        <span>{formatNumber(item.totalSj)} SJ</span>
                        <ArrowUpRight size={12} className="opacity-70" />
                      </button>
                    </div>

                    {/* Breakdown Udara vs Laut */}
                    <div className="p-2 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/60 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                          <span>✈️ Udara:</span>
                        </span>
                        <span className="font-mono text-[11px] text-[var(--color-primary)]">
                          {item.sjUdara > 0 ? `${formatNumber(item.sjUdara)} SJ • ${formatNumber(item.packUdara)} coly • ${item.weightUdara.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                          <span>🚢 Laut:</span>
                        </span>
                        <span className="font-mono text-[11px] text-[var(--color-primary)]">
                          {item.sjLaut > 0 ? `${formatNumber(item.sjLaut)} SJ • ${formatNumber(item.packLaut)} coly • ${item.weightLaut.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Total Fisik */}
                    <div className="flex items-center justify-between text-[11px] text-[var(--color-secondary)] pt-0.5">
                      <span>Total Fisik Muatan:</span>
                      <span className="font-mono font-semibold text-[var(--color-primary)]">
                        {formatNumber(item.totalPack)} coly • {item.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Table Pagination */}
        {totalTablePages > 1 && (
          <div className="p-3 sm:p-3.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 text-[var(--color-secondary)]">
              <span>Menampilkan {pagedList.length} dari {currentTableList.length} data</span>
              <div className="flex items-center gap-1 ml-auto sm:ml-2">
                <span className="hidden xs:inline">Baris:</span>
                <select
                  value={tableLimit}
                  onChange={(e) => {
                    setTableLimit(Number(e.target.value))
                    setTablePage(1)
                  }}
                  className="px-2 py-0.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded text-xs text-[var(--color-primary)] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={tablePage <= 1}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 h-auto text-xs"
              >
                Sebelumnya
              </Button>
              <span className="px-2 text-xs font-medium text-[var(--color-primary)] text-center">
                Hal. {tablePage} dari {totalTablePages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={tablePage >= totalTablePages}
                onClick={() => setTablePage((p) => p + 1)}
                className="px-2.5 py-1 h-auto text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Rincian Surat Jalan per Batch ── */}
      <DeliveryBatchDetailModal
        isOpen={batchModalState.isOpen}
        onClose={() => setBatchModalState((prev) => ({ ...prev, isOpen: false }))}
        batchDate={batchModalState.batchDate}
        batchSession={batchModalState.batchSession}
        batchTime={batchModalState.batchTime}
        displayDate={batchModalState.displayDate}
      />

      {/* ── Modal Rincian Target Estimasi & Pending Overdue (> H+1) ── */}
      <DeliveryEstimasiDetailModal
        isOpen={estimasiModalState.isOpen}
        onClose={() => setEstimasiModalState((prev) => ({ ...prev, isOpen: false }))}
        estimasiDate={estimasiModalState.estimasiDate}
        displayDate={estimasiModalState.displayDate}
        initialFilter={estimasiModalState.initialFilter}
      />
    </div>
  )
}
