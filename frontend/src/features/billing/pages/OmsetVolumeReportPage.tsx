import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Layers,
  Loader2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { billingApi } from '../services/billing.service'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { formatCurrency, formatNumber, formatDecimal } from '@/lib/utils'

type SortColumn = 'custName' | 'sales' | 'totalM3' | 'totalKgLaut' | 'totalKgUdara' | 'totalFcl' | 'totalOmset' | string

export default function OmsetVolumeReportPage() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  // Filter state
  const [yearFrom, setYearFrom] = useState<number>(currentYear - 1)
  const [yearTo, setYearTo] = useState<number>(currentYear)
  const [search, setSearch] = useState<string>('')
  const [selectedSales, setSelectedSales] = useState<string>('ALL')

  // Sorting state
  const [sortCol, setSortCol] = useState<SortColumn>('totalOmset')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination state
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Export pivot loading state
  const [isExportingPivot, setIsExportingPivot] = useState<boolean>(false)

  // Query API
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report-omset-volume', yearFrom, yearTo, search, selectedSales],
    queryFn: async () => {
      const res = await billingApi.getOmsetVolumeReport({
        yearFrom,
        yearTo,
        search: search.trim() || undefined,
        sales: selectedSales !== 'ALL' ? selectedSales : undefined,
      })
      return res
    },
    staleTime: 60_000,
  })

  const years = reportData?.years || [yearFrom, yearTo]

  // Extract unique sales options
  const salesOptions = useMemo(() => {
    if (!reportData?.data) return []
    const set = new Set<string>()
    for (const item of reportData.data) {
      if (item.fdSalesNM && item.fdSalesNM !== '-') {
        set.add(item.fdSalesNM.trim())
      }
    }
    return Array.from(set).sort()
  }, [reportData?.data])

  // Sort and filter data
  const sortedData = useMemo(() => {
    if (!reportData?.data) return []
    const items = [...reportData.data]

    items.sort((a, b) => {
      let valA: any
      let valB: any

      if (sortCol === 'custName') {
        valA = a.fdCustName.toLowerCase()
        valB = b.fdCustName.toLowerCase()
      } else if (sortCol === 'sales') {
        valA = a.fdSalesNM.toLowerCase()
        valB = b.fdSalesNM.toLowerCase()
      } else if (sortCol === 'totalM3') {
        valA = a.totalM3
        valB = b.totalM3
      } else if (sortCol === 'totalKgLaut') {
        valA = a.totalKgLaut
        valB = b.totalKgLaut
      } else if (sortCol === 'totalKgUdara') {
        valA = a.totalKgUdara
        valB = b.totalKgUdara
      } else if (sortCol === 'totalFcl') {
        valA = a.totalFcl
        valB = b.totalFcl
      } else if (sortCol === 'totalOmset') {
        valA = a.totalOmset
        valB = b.totalOmset
      } else if (sortCol.includes('_')) {
        // Kolom spesifik tahun, misal m3_2025, fdJumlah_2026
        const [metricKey, yearKey] = sortCol.split('_')
        const metricA = a.metrics[yearKey]
        const metricB = b.metrics[yearKey]
        valA = metricA ? (metricA as any)[metricKey] || 0 : 0
        valB = metricB ? (metricB as any)[metricKey] || 0 : 0
      } else {
        valA = a.totalOmset
        valB = b.totalOmset
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return items
  }, [reportData?.data, sortCol, sortDir])

  // Paged data
  const totalItems = sortedData.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(colKey)
      setSortDir('desc')
    }
  }

  // YoY Growth Calculation between earliest and latest selected year (or consecutive 2 years)
  const yoyGrowth = useMemo(() => {
    if (!reportData?.summary?.metricsPerYear || years.length < 2) return null
    const firstYear = String(years[0])
    const lastYear = String(years[years.length - 1])

    const mFirst = reportData.summary.metricsPerYear[firstYear]
    const mLast = reportData.summary.metricsPerYear[lastYear]
    if (!mFirst || !mLast) return null

    const calcGrowth = (curr: number, prev: number) => {
      const diff = curr - prev
      const pct = prev > 0 ? (diff / prev) * 100 : curr > 0 ? 100 : 0
      return { curr, prev, diff, pct }
    }

    return {
      firstYear,
      lastYear,
      m3: calcGrowth(mLast.m3, mFirst.m3),
      kgLaut: calcGrowth(mLast.kgLaut, mFirst.kgLaut),
      kgUdara: calcGrowth(mLast.kgUdara, mFirst.kgUdara),
      totalFcl: calcGrowth(mLast.totalFcl, mFirst.totalFcl),
      omset: calcGrowth(mLast.fdJumlah, mFirst.fdJumlah),
    }
  }, [reportData?.summary?.metricsPerYear, years])

  // Helper render growth badge
  const renderGrowthBadge = (
    growth: { curr: number; prev: number; diff: number; pct: number } | undefined,
    label?: string
  ) => {
    if (!growth) return null
    const { pct, diff } = growth
    const isUp = pct > 0
    const isZero = pct === 0
    const Icon = isZero ? Minus : isUp ? ArrowUpRight : ArrowDownRight
    const colorClass = isZero
      ? 'text-[var(--color-secondary)] border-[var(--color-border)] bg-[var(--color-neutral)]/40'
      : isUp
      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10'

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border tabular-nums transition-colors ${colorClass}`}
        title={`Perubahan: ${diff >= 0 ? '+' : ''}${formatNumber(diff)} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%) vs ${yoyGrowth?.firstYear}`}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span>
          {isUp ? '+' : ''}
          {pct.toFixed(1)}% {label || 'YoY'}
        </span>
      </span>
    )
  }

  // Helper render per-cell trend arrow (membandingkan tahun berjalan vs tahun sebelumnya)
  const renderCellTrend = (curr: number, prev: number | undefined) => {
    if (prev === undefined || prev === 0 && curr === 0) return null
    if (curr === prev) return null
    const isUp = curr > prev
    const diff = curr - prev
    const pct = prev > 0 ? (diff / prev) * 100 : 100
    const Icon = isUp ? ArrowUpRight : ArrowDownRight
    const colorClass = isUp
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'

    return (
      <span
        className={`inline-flex items-center ml-1 text-[9px] font-bold shrink-0 ${colorClass}`}
        title={`vs tahun sebelumnya: ${isUp ? '+' : ''}${formatNumber(diff)} (${isUp ? '+' : ''}${pct.toFixed(1)}%)`}
      >
        <Icon className="w-2.5 h-2.5 inline" />
      </span>
    )
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (!sortedData || sortedData.length === 0) return

    const rows: any[] = []

    for (const item of sortedData) {
      const row: Record<string, any> = {
        'Kode Customer': item.fdCustCode,
        'Nama Customer': item.fdCustName,
        Sales: item.fdSalesNM,
      }

      for (const y of years) {
        const yStr = String(y)
        const m = item.metrics[yStr] || { m3: 0, kgLaut: 0, kgUdara: 0, totalFcl: 0, fdJumlah: 0 }
        row[`${y} M3`] = m.m3
        row[`${y} KG Laut`] = m.kgLaut
        row[`${y} KG Udara`] = m.kgUdara
        row[`${y} FCL`] = m.totalFcl
        row[`${y} Omset (Rp)`] = m.fdJumlah
      }

      row['Grand Total M3'] = item.totalM3
      row['Grand Total KG Laut'] = item.totalKgLaut
      row['Grand Total KG Udara'] = item.totalKgUdara
      row['Grand Total FCL'] = item.totalFcl
      row['Grand Total Omset (Rp)'] = item.totalOmset

      rows.push(row)
    }

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Omset & Volume')

    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Report_Omset_Volume_${years.join('-')}_${dateStr}.xlsx`)
  }

  // Export Pivot 4 Sheet (ExcelJS backend)
  const handleExportPivotExcel = async () => {
    setIsExportingPivot(true)
    const toastId = toast.loading('Sedang menyiapkan file Excel Pivot (4 Sheet)...')
    try {
      const res = await billingApi.exportOmsetVolumePivotExcel()
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const runTs = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const fileName = `billing_pivot_report_${runTs}.xlsx`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('File Excel Pivot (4 Sheet) berhasil diunduh', { id: toastId })
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengekspor file Excel Pivot', { id: toastId })
    } finally {
      setIsExportingPivot(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6 animate-fadeIn pb-24 bg-[var(--color-neutral)] font-[var(--font-body)]">
      <PageHeader
        title="Report Omset & Volume Customer"
        subtitle="Analisis perbandingan multi-tahun (YoY) kubikasi, berat kargo udara & laut, kontainer FCL, serta pendapatan omzet"
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: 'Report', path: ROUTES.REPORT_OMSET_VOLUME },
          { label: 'Omset & Volume' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportExcel}
              disabled={isLoading || sortedData.length === 0}
              className="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors shadow-2xs font-semibold"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (Rekap)</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportPivotExcel}
              disabled={isExportingPivot}
              className="flex items-center gap-1.5 cursor-pointer text-sky-600 dark:text-sky-400 border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 transition-colors shadow-2xs font-semibold"
            >
              {isExportingPivot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              <span>{isExportingPivot ? 'Mengekspor Pivot...' : 'Export Pivot (4 Sheet)'}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block mb-1">
              Total Customer Aktif
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--color-primary)]">
              {isLoading ? (
                <div className="h-7 w-20 rounded skeleton-shimmer" />
              ) : (
                `${formatNumber(reportData?.summary.totalCustomers || 0)} Cust`
              )}
            </div>
          </div>
          <div className="pt-2">
            <span className="text-[11px] text-[var(--color-secondary)] block">
              Periode {years.join(' s/d ')}
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block mb-1">
              Total Volume M3
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-sky-600 dark:text-sky-400">
              {isLoading ? (
                <div className="h-7 w-28 rounded skeleton-shimmer" />
              ) : (
                `${formatDecimal(reportData?.summary.grandTotalM3 || 0, 2)} m³`
              )}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[11px] text-[var(--color-secondary)]">Akumulasi multi-tahun</span>
            {renderGrowthBadge(yoyGrowth?.m3)}
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block mb-1">
              Berat Kargo Laut & Udara
            </span>
            <div className="text-base sm:text-lg font-mono font-bold text-blue-600 dark:text-blue-400 flex flex-col gap-1">
              {isLoading ? (
                <div className="h-7 w-32 rounded skeleton-shimmer" />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      🚢 {formatDecimal(reportData?.summary.grandTotalKgLaut || 0, 1)} kg
                    </span>
                    {renderGrowthBadge(yoyGrowth?.kgLaut, 'Laut')}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      ✈️ {formatDecimal(reportData?.summary.grandTotalKgUdara || 0, 1)} kg
                    </span>
                    {renderGrowthBadge(yoyGrowth?.kgUdara, 'Udara')}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-[var(--color-secondary)]">Tonase kargo</span>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block mb-1">
              Total Kontainer FCL
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {isLoading ? (
                <div className="h-7 w-20 rounded skeleton-shimmer" />
              ) : (
                `${formatNumber(reportData?.summary.grandTotalFcl || 0)} FCL`
              )}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[11px] text-[var(--color-secondary)]">Full Container Load</span>
            {renderGrowthBadge(yoyGrowth?.totalFcl)}
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] block mb-1">
              Total Omset Pendapatan
            </span>
            <div className="text-xl sm:text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? (
                <div className="h-7 w-32 rounded skeleton-shimmer" />
              ) : (
                formatCurrency(reportData?.summary.grandTotalOmset || 0)
              )}
            </div>
          </div>
          <div className="pt-2 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[11px] text-[var(--color-secondary)]">Billing revenue</span>
            {renderGrowthBadge(yoyGrowth?.omset)}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-secondary)]" />
              <span className="text-xs font-semibold text-[var(--color-secondary)]">Tahun:</span>
              <select
                value={yearFrom}
                onChange={(e) => {
                  setYearFrom(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-transparent text-xs font-bold text-[var(--color-primary)] border-none focus:outline-none cursor-pointer"
              >
                {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                  <option key={`from-${y}`} value={y} className="bg-[var(--color-surface)]">
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-xs text-[var(--color-secondary)]">s/d</span>
              <select
                value={yearTo}
                onChange={(e) => {
                  setYearTo(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-transparent text-xs font-bold text-[var(--color-primary)] border-none focus:outline-none cursor-pointer"
              >
                {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                  <option key={`to-${y}`} value={y} className="bg-[var(--color-surface)]">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 shadow-2xs">
              <span className="text-xs font-semibold text-[var(--color-secondary)]">Sales:</span>
              <select
                value={selectedSales}
                onChange={(e) => {
                  setSelectedSales(e.target.value)
                  setPage(1)
                }}
                className="bg-transparent text-xs font-bold text-[var(--color-primary)] border-none focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[var(--color-surface)]">
                  Semua Sales ({salesOptions.length})
                </option>
                {salesOptions.map((s) => (
                  <option key={s} value={s} className="bg-[var(--color-surface)]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama customer, kode, atau sales..."
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-tertiary)] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel Multi-Year Pivot Matrix */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
              Rekapitulasi Volume & Omset Per Customer
            </h3>
            <p className="text-xs text-[var(--color-secondary)] mt-0.5">
              Menampilkan {formatNumber(paginatedData.length)} dari total {formatNumber(totalItems)} customer aktif
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-secondary)]">Tampilkan per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(1)
              }}
              className="text-xs font-semibold rounded border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] px-2 py-1 cursor-pointer"
            >
              {[15, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} baris
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              {/* Header Tingkat 1: Grup Tahun & Grand Total */}
              <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] font-semibold text-[var(--color-secondary)] text-[10px] uppercase tracking-wider">
                <th
                  rowSpan={2}
                  className="px-3 py-2.5 border-r border-[var(--color-border)] sticky left-0 z-30 bg-[var(--color-neutral)] min-w-[220px]"
                >
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('custName')}
                  >
                    <span>Nama Customer</span>
                    {sortCol === 'custName' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--color-primary)]" /> : <ArrowDown className="w-3 h-3 text-[var(--color-primary)]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  rowSpan={2}
                  className="px-2.5 py-2.5 border-r border-[var(--color-border)] min-w-[90px]"
                >
                  <div
                    className="flex items-center gap-1.5 cursor-pointer hover:text-[var(--color-primary)] select-none"
                    onClick={() => handleSort('sales')}
                  >
                    <span>Sales</span>
                    {sortCol === 'sales' ? (
                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[var(--color-primary)]" /> : <ArrowDown className="w-3 h-3 text-[var(--color-primary)]" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                {/* Sub Kolom Per Tahun */}
                {years.map((y) => (
                  <th
                    key={`head-year-${y}`}
                    colSpan={5}
                    className="px-3 py-1.5 text-center border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 font-bold text-[11px] text-[var(--color-primary)]"
                  >
                    Tahun {y}
                  </th>
                ))}

                {/* Grand Total Multi-Tahun */}
                <th
                  colSpan={5}
                  className="px-3 py-1.5 text-center bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[11px]"
                >
                  Grand Total Konsolidasi
                </th>
              </tr>

              {/* Header Tingkat 2: Metrik Spesifik (M3, Laut, Udara, FCL, Omset) */}
              <tr className="bg-[var(--color-neutral)] border-b border-[var(--color-border)] font-semibold text-[var(--color-secondary)] text-[10px] uppercase tracking-wider">
                {years.map((y) => (
                  <React.Fragment key={`sub-cols-${y}`}>
                    <th
                      className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                      onClick={() => handleSort(`m3_${y}`)}
                      title={`Volume M3 Tahun ${y}`}
                    >
                      M3
                    </th>
                    <th
                      className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                      onClick={() => handleSort(`kgLaut_${y}`)}
                      title={`KG Laut Tahun ${y}`}
                    >
                      KG Laut
                    </th>
                    <th
                      className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                      onClick={() => handleSort(`kgUdara_${y}`)}
                      title={`KG Udara Tahun ${y}`}
                    >
                      KG Udara
                    </th>
                    <th
                      className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                      onClick={() => handleSort(`totalFcl_${y}`)}
                      title={`Kontainer FCL Tahun ${y}`}
                    >
                      FCL
                    </th>
                    <th
                      className="px-2.5 py-2 text-right border-r border-[var(--color-border)] cursor-pointer hover:text-[var(--color-primary)] select-none min-w-[110px]"
                      onClick={() => handleSort(`fdJumlah_${y}`)}
                      title={`Omset Pendapatan Tahun ${y}`}
                    >
                      Omset (Rp)
                    </th>
                  </React.Fragment>
                ))}

                {/* Sub Kolom Grand Total */}
                <th
                  className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('totalM3')}
                >
                  Tot M3
                </th>
                <th
                  className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('totalKgLaut')}
                >
                  Tot Laut
                </th>
                <th
                  className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('totalKgUdara')}
                >
                  Tot Udara
                </th>
                <th
                  className="px-2 py-2 text-right cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('totalFcl')}
                >
                  Tot FCL
                </th>
                <th
                  className="px-2.5 py-2 text-right font-bold text-[var(--color-primary)] cursor-pointer hover:text-[var(--color-primary)] select-none min-w-[125px]"
                  onClick={() => handleSort('totalOmset')}
                >
                  Tot Omset
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} className="border-b border-[var(--color-border)]/50">
                    <td className="px-3 py-3 sticky left-0 bg-[var(--color-surface)]">
                      <div className="h-4 w-40 rounded skeleton-shimmer" />
                    </td>
                    <td className="px-2.5 py-3">
                      <div className="h-4 w-12 rounded skeleton-shimmer" />
                    </td>
                    {years.map((y) => (
                      <React.Fragment key={`skel-val-${idx}-${y}`}>
                        <td className="px-2 py-3 text-right"><div className="h-4 w-10 ml-auto rounded skeleton-shimmer" /></td>
                        <td className="px-2 py-3 text-right"><div className="h-4 w-10 ml-auto rounded skeleton-shimmer" /></td>
                        <td className="px-2 py-3 text-right"><div className="h-4 w-10 ml-auto rounded skeleton-shimmer" /></td>
                        <td className="px-2 py-3 text-right"><div className="h-4 w-8 ml-auto rounded skeleton-shimmer" /></td>
                        <td className="px-2 py-3 text-right border-r border-[var(--color-border)]/50"><div className="h-4 w-16 ml-auto rounded skeleton-shimmer" /></td>
                      </React.Fragment>
                    ))}
                    <td className="px-2 py-3 text-right"><div className="h-4 w-12 ml-auto rounded skeleton-shimmer" /></td>
                    <td className="px-2 py-3 text-right"><div className="h-4 w-12 ml-auto rounded skeleton-shimmer" /></td>
                    <td className="px-2 py-3 text-right"><div className="h-4 w-12 ml-auto rounded skeleton-shimmer" /></td>
                    <td className="px-2 py-3 text-right"><div className="h-4 w-10 ml-auto rounded skeleton-shimmer" /></td>
                    <td className="px-2.5 py-3 text-right"><div className="h-4 w-20 ml-auto rounded skeleton-shimmer" /></td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + years.length * 5 + 5}
                    className="px-6 py-12 text-center text-xs text-[var(--color-secondary)]"
                  >
                    Tidak ada data omset dan volume customer untuk filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rowIdx) => (
                  <tr
                    key={item.fdCustCode || rowIdx}
                    className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-neutral)]/40 transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-3 py-2.5 border-r border-[var(--color-border)] sticky left-0 z-20 bg-[var(--color-surface)] shadow-[1px_0_0_0_var(--color-border)]">
                      <div className="font-semibold text-[var(--color-primary)] truncate max-w-[210px]" title={item.fdCustName}>
                        {item.fdCustName}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--color-secondary)]">
                        {item.fdCustCode}
                      </div>
                    </td>

                    {/* Sales */}
                    <td className="px-2.5 py-2.5 border-r border-[var(--color-border)] font-mono text-[11px] text-[var(--color-secondary)]">
                      {item.fdSalesNM || '-'}
                    </td>

                    {/* Nilai Per Tahun */}
                    {years.map((y, yIdx) => {
                      const yStr = String(y)
                      const prevYearStr = yIdx > 0 ? String(years[yIdx - 1]) : undefined
                      const m = item.metrics[yStr]
                      const prevM = prevYearStr ? item.metrics[prevYearStr] : undefined
                      return (
                        <React.Fragment key={`val-${item.fdCustCode}-${y}`}>
                          <td className="px-2 py-2.5 text-right font-mono text-[11px] text-sky-600 dark:text-sky-400 whitespace-nowrap">
                            <span>{m && m.m3 > 0 ? formatDecimal(m.m3, 2) : '-'}</span>
                            {m && m.m3 > 0 && prevM && renderCellTrend(m.m3, prevM.m3)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono text-[11px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            <span>{m && m.kgLaut > 0 ? formatDecimal(m.kgLaut, 1) : '-'}</span>
                            {m && m.kgLaut > 0 && prevM && renderCellTrend(m.kgLaut, prevM.kgLaut)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono text-[11px] text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            <span>{m && m.kgUdara > 0 ? formatDecimal(m.kgUdara, 1) : '-'}</span>
                            {m && m.kgUdara > 0 && prevM && renderCellTrend(m.kgUdara, prevM.kgUdara)}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono text-[11px] text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            <span>{m && m.totalFcl > 0 ? formatNumber(m.totalFcl) : '-'}</span>
                            {m && m.totalFcl > 0 && prevM && renderCellTrend(m.totalFcl, prevM.totalFcl)}
                          </td>
                          <td className="px-2.5 py-2.5 text-right font-mono text-[11px] font-medium text-[var(--color-primary)] border-r border-[var(--color-border)] whitespace-nowrap">
                            <span>{m && m.fdJumlah > 0 ? formatCurrency(m.fdJumlah) : '-'}</span>
                            {m && m.fdJumlah > 0 && prevM && renderCellTrend(m.fdJumlah, prevM.fdJumlah)}
                          </td>
                        </React.Fragment>
                      )
                    })}

                    {/* Grand Total Multi-Tahun */}
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-500/5">
                      {item.totalM3 > 0 ? formatDecimal(item.totalM3, 2) : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/5">
                      {item.totalKgLaut > 0 ? formatDecimal(item.totalKgLaut, 1) : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/5">
                      {item.totalKgUdara > 0 ? formatDecimal(item.totalKgUdara, 1) : '-'}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/5">
                      {item.totalFcl > 0 ? formatNumber(item.totalFcl) : '-'}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/5">
                      {item.totalOmset > 0 ? formatCurrency(item.totalOmset) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Footer */}
            {reportData?.summary && (
              <tfoot>
                <tr className="bg-[var(--color-neutral)] border-t-2 border-[var(--color-border)] font-bold text-[11px] text-[var(--color-primary)]">
                  <td
                    colSpan={2}
                    className="px-3 py-3 border-r border-[var(--color-border)] sticky left-0 z-20 bg-[var(--color-neutral)] uppercase"
                  >
                    TOTAL KONSOLIDASI ({formatNumber(reportData.summary.totalCustomers)} CUSTOMER)
                  </td>

                  {/* Summary per tahun */}
                  {years.map((y, yIdx) => {
                    const yStr = String(y)
                    const prevYearStr = yIdx > 0 ? String(years[yIdx - 1]) : undefined
                    const m = reportData.summary.metricsPerYear[yStr] || { m3: 0, kgLaut: 0, kgUdara: 0, totalFcl: 0, fdJumlah: 0 }
                    const prevM = prevYearStr ? reportData.summary.metricsPerYear[prevYearStr] : undefined
                    return (
                      <React.Fragment key={`foot-${y}`}>
                        <td className="px-2 py-3 text-right font-mono text-sky-700 dark:text-sky-300 whitespace-nowrap">
                          <span>{formatDecimal(m.m3, 2)}</span>
                          {prevM && renderCellTrend(m.m3, prevM.m3)}
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          <span>{formatDecimal(m.kgLaut, 1)}</span>
                          {prevM && renderCellTrend(m.kgLaut, prevM.kgLaut)}
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-amber-700 dark:text-amber-300 whitespace-nowrap">
                          <span>{formatDecimal(m.kgUdara, 1)}</span>
                          {prevM && renderCellTrend(m.kgUdara, prevM.kgUdara)}
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                          <span>{formatNumber(m.totalFcl)}</span>
                          {prevM && renderCellTrend(m.totalFcl, prevM.totalFcl)}
                        </td>
                        <td className="px-2.5 py-3 text-right font-mono text-rose-700 dark:text-rose-400 border-r border-[var(--color-border)] whitespace-nowrap">
                          <span>{formatCurrency(m.fdJumlah)}</span>
                          {prevM && renderCellTrend(m.fdJumlah, prevM.fdJumlah)}
                        </td>
                      </React.Fragment>
                    )
                  })}

                  {/* Grand Total Footer */}
                  <td className="px-2 py-3 text-right font-mono text-sky-700 dark:text-sky-300 bg-sky-500/10">
                    {formatDecimal(reportData.summary.grandTotalM3, 2)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-blue-700 dark:text-blue-300 bg-blue-500/10">
                    {formatDecimal(reportData.summary.grandTotalKgLaut, 1)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-amber-700 dark:text-amber-300 bg-amber-500/10">
                    {formatDecimal(reportData.summary.grandTotalKgUdara, 1)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-500/10">
                    {formatNumber(reportData.summary.grandTotalFcl)}
                  </td>
                  <td className="px-2.5 py-3 text-right font-mono text-rose-700 dark:text-rose-400 bg-rose-500/10">
                    {formatCurrency(reportData.summary.grandTotalOmset)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-[var(--color-secondary)]">
            Halaman <span className="font-bold text-[var(--color-primary)]">{currentPage}</span> dari{' '}
            <span className="font-bold text-[var(--color-primary)]">{totalPages}</span> ({formatNumber(totalItems)} data)
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="cursor-pointer"
            >
              Sebelumnya
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="cursor-pointer"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
