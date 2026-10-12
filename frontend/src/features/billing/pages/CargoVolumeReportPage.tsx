import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Layers,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Users,
  Package,
  Ship,
  Plane,
  Scale,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { billingApi } from '../services/billing.service'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { formatNumber, formatDecimal } from '@/lib/utils'

type SortColumn = 'custName' | 'sales' | 'totalResi' | 'totalM3' | 'totalBeratUdara' | 'totalBeratLaut'

export default function CargoVolumeReportPage() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  // Filter state
  const [selectedBranch, setSelectedBranch] = useState<string>('SG')
  const [yearFrom, setYearFrom] = useState<number>(currentYear)
  const [yearTo, setYearTo] = useState<number>(currentYear)
  const [selectedMode, setSelectedMode] = useState<number>(0) // 0: Semua, 1: Udara, 2: Laut
  const [selectedComodity, setSelectedComodity] = useState<number>(0) // 0: Semua
  const [selectedSales, setSelectedSales] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')

  // Sorting state
  const [sortCol, setSortCol] = useState<SortColumn>('totalM3')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination state
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Expanded customers state (Set of custKey)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  // Query API
  const { data: reportData, isLoading, isFetching } = useQuery({
    queryKey: [
      'report-cargo-volume',
      selectedBranch,
      yearFrom,
      yearTo,
      selectedMode,
      selectedComodity,
      selectedSales,
      search,
    ],
    queryFn: async () => {
      const res = await billingApi.getCargoVolumeReport({
        branch: selectedBranch !== 'ALL' ? selectedBranch : undefined,
        yearFrom,
        yearTo,
        mode: selectedMode > 0 ? selectedMode : undefined,
        typeComodity: selectedComodity > 0 ? selectedComodity : undefined,
        sales: selectedSales !== 'ALL' ? selectedSales : undefined,
        search: search.trim() || undefined,
      })
      return res
    },
    staleTime: 60_000,
  })

  const branches = reportData?.meta?.branches || [
    { code: 'GZ', name: 'GUANGZHOU' },
    { code: 'SG', name: 'SINGAPORE' },
    { code: 'HK', name: 'HONGKONG' },
    { code: 'SH', name: 'SHANGHAI' },
    { code: 'SZ', name: 'SHENZHEN' },
    { code: 'YW', name: 'YI WU' },
  ]

  const commodities = useMemo(() => {
    if (!reportData?.meta?.commodities) return []
    if (selectedMode === 0) return reportData.meta.commodities
    return reportData.meta.commodities.filter((c) => c.listType === selectedMode)
  }, [reportData?.meta?.commodities, selectedMode])

  const availableYears = reportData?.meta?.availableYears || [currentYear, currentYear - 1, currentYear - 2]

  // Unique sales options
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

  // Sorting
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
      } else if (sortCol === 'totalResi') {
        valA = a.totalResi
        valB = b.totalResi
      } else if (sortCol === 'totalM3') {
        valA = a.totalM3
        valB = b.totalM3
      } else if (sortCol === 'totalBeratUdara') {
        valA = a.totalBeratUdara
        valB = b.totalBeratUdara
      } else if (sortCol === 'totalBeratLaut') {
        valA = a.totalBeratLaut
        valB = b.totalBeratLaut
      } else {
        valA = a.totalM3
        valB = b.totalM3
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return items
  }, [reportData?.data, sortCol, sortDir])

  // Pagination
  const totalItems = sortedData.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const currentPage = Math.min(page, totalPages)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const handleSort = (colKey: SortColumn) => {
    if (sortCol === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(colKey)
      setSortDir('desc')
    }
  }

  // Toggle expand customer
  const toggleExpand = (custKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(custKey)) {
        next.delete(custKey)
      } else {
        next.add(custKey)
      }
      return next
    })
  }

  const expandAll = () => {
    const allKeys = new Set(sortedData.map((d) => `${d.fdCustCode}|${d.fdCustName}`))
    setExpandedKeys(allKeys)
  }

  const collapseAll = () => {
    setExpandedKeys(new Set())
  }

  // Export Excel: Rekapitulasi Customer & Sales
  const handleExportSummaryExcel = () => {
    if (!sortedData || sortedData.length === 0) return

    const rows = sortedData.map((item, idx) => ({
      No: idx + 1,
      'Kode Pelanggan': item.fdCustCode,
      'Nama Pelanggan': item.fdCustName,
      'Sales Marketing': item.fdSalesNM,
      'Jumlah Listcode': item.totalResi,
      'Total Volume M3 (Laut)': item.totalM3,
      'Total Berat Udara (KG)': item.totalBeratUdara,
      'Total Berat Laut (KG)': item.totalBeratLaut,
    }))

    // Tambahkan baris total
    rows.push({
      No: '' as any,
      'Kode Pelanggan': 'GRAND TOTAL',
      'Nama Pelanggan': `${reportData?.summary.totalCustomers || 0} Pelanggan`,
      'Sales Marketing': '',
      'Jumlah Listcode': reportData?.summary.totalResi || 0,
      'Total Volume M3 (Laut)': reportData?.summary.grandTotalM3 || 0,
      'Total Berat Udara (KG)': reportData?.summary.grandTotalBeratUdara || 0,
      'Total Berat Laut (KG)': reportData?.summary.grandTotalBeratLaut || 0,
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pelanggan')

    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Report_Rekap_Volume_Berat_${selectedBranch}_${yearFrom}-${yearTo}_${dateStr}.xlsx`)
  }

  // Export Excel: Detail Per Resi Transaksional
  const handleExportDetailExcel = () => {
    if (!sortedData || sortedData.length === 0) return

    const detailRows: any[] = []
    let counter = 1

    for (const item of sortedData) {
      if (item.resiDetails && item.resiDetails.length > 0) {
        for (const resi of item.resiDetails) {
          detailRows.push({
            No: counter++,
            'Kode Pelanggan': item.fdCustCode,
            'Nama Pelanggan': item.fdCustName,
            Sales: item.fdSalesNM,
            'No. Resi': resi.fdTerima || '-',
            'No. Listcode': resi.fdListCode,
            'Kode Marking': resi.fdMarkingCode,
            Cabang: resi.fdBranchCode,
            'Tahun Muat': resi.fdTahun,
            Moda: resi.fdListType === 1 ? 'Udara' : 'Laut',
            'Tipe Komoditi': resi.fdComodityName,
            'No. Faktur (Bill)': resi.fdInvNo || '-',
            'M3 Terhitung': resi.calculatedM3,
            'Sumber M3': resi.sourceM3,
            'Berat Udara (KG)': resi.calculatedBeratUdara,
            'Berat Laut (KG)': resi.calculatedBeratLaut,
          })
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(detailRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detail Resi Kargo')

    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `Report_Detail_Resi_Volume_Berat_${selectedBranch}_${yearFrom}-${yearTo}_${dateStr}.xlsx`)
  }

  return (
    <div className="p-3.5 sm:p-5 w-full space-y-3.5 animate-fadeIn pb-20 bg-[var(--color-neutral)] font-[var(--font-body)]">
      <PageHeader
        title={t('nav.reportCargoVolume')}
        subtitle="Analisis kubikasi muatan laut, tonase udara, dan status billing kargo per pelanggan & sales berdasarkan cabang dan tahun muat (fdLoadDate)"
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: 'Report', path: ROUTES.REPORT_CARGO_VOLUME },
          { label: t('nav.reportCargoVolume') },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSummaryExcel}
              disabled={isLoading || sortedData.length === 0}
              className="flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors shadow-2xs font-semibold rounded-lg px-2.5 py-1 text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Rekap (.xlsx)</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportDetailExcel}
              disabled={isLoading || sortedData.length === 0}
              className="flex items-center gap-1.5 cursor-pointer text-sky-600 dark:text-sky-400 border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/10 transition-colors shadow-2xs font-semibold rounded-lg px-2.5 py-1 text-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Export Detail Resi (.xlsx)</span>
            </Button>
          </div>
        }
      />

      {/* 5 Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Total Pelanggan */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-sky-500/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="w-3.5 h-3.5 text-[var(--color-secondary)]/80 shrink-0" />
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-[var(--color-secondary)] truncate">
                Pelanggan Aktif
              </span>
            </div>
          </div>
          <div>
            <div className="text-[18px] sm:text-[19px] font-mono font-bold text-[var(--color-primary)] tracking-tight leading-none">
              {isLoading ? (
                <div className="h-5 w-16 rounded skeleton-shimmer" />
              ) : (
                `${formatNumber(reportData?.summary.totalCustomers || 0)}`
              )}
            </div>
            <div className="text-[10.5px] text-[var(--color-secondary)] mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-[var(--color-border)]/50">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
              <span className="truncate">Cabang {selectedBranch === 'ALL' ? 'Semua' : selectedBranch} · {yearFrom}–{yearTo}</span>
            </div>
          </div>
        </div>

        {/* Total Resi */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-indigo-500/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="w-3.5 h-3.5 text-indigo-500/80 shrink-0" />
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-[var(--color-secondary)] truncate">
                Total Resi (Coly)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[18px] sm:text-[19px] font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
              {isLoading ? (
                <div className="h-5 w-20 rounded skeleton-shimmer" />
              ) : (
                `${formatNumber(reportData?.summary.totalResi || 0)}`
              )}
            </div>
            <div className="text-[10.5px] text-[var(--color-secondary)] mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-[var(--color-border)]/50">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
              <span className="truncate">Akumulasi ListCode Muatan</span>
            </div>
          </div>
        </div>

        {/* Total Volume M3 (Laut) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-sky-500/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Ship className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-sky-600 dark:text-sky-400 truncate">
                Volume Laut (M³)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[18px] sm:text-[19px] font-mono font-bold text-sky-600 dark:text-sky-400 tracking-tight leading-none">
              {isLoading ? (
                <div className="h-5 w-24 rounded skeleton-shimmer" />
              ) : (
                `${formatDecimal(reportData?.summary.grandTotalM3 || 0, 2)}`
              )}
              <span className="text-xs font-normal text-[var(--color-secondary)] ml-1 font-sans">m³</span>
            </div>
            <div className="text-[10.5px] text-[var(--color-secondary)] mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-[var(--color-border)]/50">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
              <span className="truncate">Bill &rarr; Gdg &rarr; PL &rarr; Entry</span>
            </div>
          </div>
        </div>

        {/* Total Berat Udara (KG) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-amber-500/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Plane className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-amber-600 dark:text-amber-400 truncate">
                Tonase Udara (KG)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[18px] sm:text-[19px] font-mono font-bold text-amber-600 dark:text-amber-400 tracking-tight leading-none">
              {isLoading ? (
                <div className="h-5 w-24 rounded skeleton-shimmer" />
              ) : (
                `${formatDecimal(reportData?.summary.grandTotalBeratUdara || 0, 1)}`
              )}
              <span className="text-xs font-normal text-[var(--color-secondary)] ml-1 font-sans">kg</span>
            </div>
            <div className="text-[10.5px] text-[var(--color-secondary)] mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-[var(--color-border)]/50">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="truncate">Muatan Moda Udara</span>
            </div>
          </div>
        </div>

        {/* Total Berat Laut (KG) */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-teal-500/40">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Scale className="w-3.5 h-3.5 text-teal-500 shrink-0" />
              <span className="text-[10.5px] uppercase font-semibold tracking-wider text-teal-600 dark:text-teal-400 truncate">
                Tonase Laut (KG)
              </span>
            </div>
          </div>
          <div>
            <div className="text-[18px] sm:text-[19px] font-mono font-bold text-teal-600 dark:text-teal-400 tracking-tight leading-none">
              {isLoading ? (
                <div className="h-5 w-24 rounded skeleton-shimmer" />
              ) : (
                `${formatDecimal(reportData?.summary.grandTotalBeratLaut || 0, 1)}`
              )}
              <span className="text-xs font-normal text-[var(--color-secondary)] ml-1 font-sans">kg</span>
            </div>
            <div className="text-[10.5px] text-[var(--color-secondary)] mt-1.5 flex items-center gap-1.5 pt-1.5 border-t border-[var(--color-border)]/50">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
              <span className="truncate">Fisik Muatan Kapal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Filter Modern */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--color-border)] pb-2.5">
          {/* Segmented Pill Selector for Moda */}
          <div className="inline-flex items-center p-0.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs font-medium">
            <button
              onClick={() => {
                setSelectedMode(0)
                setSelectedComodity(0)
                setPage(1)
              }}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${selectedMode === 0
                  ? 'bg-[var(--color-surface)] text-[var(--color-primary)] font-bold shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
            >
              Semua Moda
            </button>
            <button
              onClick={() => {
                setSelectedMode(2)
                setSelectedComodity(0)
                setPage(1)
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${selectedMode === 2
                  ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 font-bold shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
            >
              <Ship className="w-3.5 h-3.5 text-sky-500" />
              <span>Laut (M³)</span>
            </button>
            <button
              onClick={() => {
                setSelectedMode(1)
                setSelectedComodity(0)
                setPage(1)
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${selectedMode === 1
                  ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 font-bold shadow-2xs border border-[var(--color-border)]'
                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                }`}
            >
              <Plane className="w-3.5 h-3.5 text-amber-500" />
              <span>Udara (KG)</span>
            </button>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)]" />
              <input
                type="text"
                placeholder="Cari customer, sales, resi, listcode, marking..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
              />
            </div>
            <button
              onClick={() => {
                setSelectedBranch('SG')
                setYearFrom(currentYear)
                setYearTo(currentYear)
                setSelectedMode(0)
                setSelectedComodity(0)
                setSelectedSales('ALL')
                setSearch('')
              }}
              title="Reset semua filter"
              className="px-2 py-1 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Dropdown Selectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Cabang */}
          <div>
            <label className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block mb-1">
              Cabang
            </label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none text-xs h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-2.5 pr-7 text-[var(--color-primary)] font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">Semua Cabang (Konsolidasi)</option>
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-secondary)] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Tahun Muat (Dari - Ke) */}
          <div>
            <label className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block mb-1">
              Tahun Muat
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <select
                  value={yearFrom}
                  onChange={(e) => {
                    setYearFrom(Number(e.target.value))
                    setPage(1)
                  }}
                  className="w-full appearance-none text-xs h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-2 pr-6 text-[var(--color-primary)] font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={`from-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[var(--color-secondary)] pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
              </div>
              <span className="text-[var(--color-secondary)] font-mono text-xs">-</span>
              <div className="relative flex-1">
                <select
                  value={yearTo}
                  onChange={(e) => {
                    setYearTo(Number(e.target.value))
                    setPage(1)
                  }}
                  className="w-full appearance-none text-xs h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-2 pr-6 text-[var(--color-primary)] font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                >
                  {availableYears.map((y) => (
                    <option key={`to-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[var(--color-secondary)] pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Tipe Komoditi */}
          <div>
            <label className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block mb-1">
              Tipe Komoditi
            </label>
            <div className="relative">
              <select
                value={selectedComodity}
                onChange={(e) => {
                  setSelectedComodity(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full appearance-none text-xs h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-2.5 pr-7 text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={0}>Semua Komoditi</option>
                {commodities.map((c) => (
                  <option key={`${c.listType}-${c.id}`} value={c.id}>
                    {c.name} {selectedMode === 0 ? `(${c.listType === 1 ? 'Udara' : 'Laut'})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-secondary)] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Sales */}
          <div>
            <label className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-wider block mb-1">
              Sales Marketing
            </label>
            <div className="relative">
              <select
                value={selectedSales}
                onChange={(e) => {
                  setSelectedSales(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none text-xs h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-2.5 pr-7 text-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">Semua Sales ({salesOptions.length})</option>
                {salesOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--color-secondary)] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Expand / Collapse Kontrol */}
          <div className="flex items-end gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={expandAll}
              className="flex-1 h-8 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer px-2"
            >
              Buka Semua
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={collapseAll}
              className="flex-1 h-8 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer px-2"
            >
              Tutup Semua
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table Card with Collapsible Nested Drill-down */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xs overflow-hidden">
        <div className="p-2.5 sm:p-3 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              Rekapitulasi Muatan Pelanggan
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono font-bold border border-sky-500/20">
              {totalItems} Pelanggan
            </span>
            {isFetching && !isLoading && (
              <span className="text-[10.5px] text-sky-500 animate-pulse font-medium">Memperbarui...</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-secondary)]">
            <span>Baris per halaman:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="appearance-none text-xs border border-[var(--color-border)] bg-[var(--color-surface)] rounded-lg pl-2.5 pr-6 py-1 text-[var(--color-primary)] font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--color-secondary)] pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] text-[var(--color-secondary)] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2 px-2.5 w-10 text-center">No</th>
                <th className="py-2 px-2.5 w-10 text-center">Detail</th>
                <th
                  onClick={() => handleSort('custName')}
                  className="py-2 px-2.5 cursor-pointer hover:text-[var(--color-primary)] select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pelanggan</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('sales')}
                  className="py-2 px-2.5 cursor-pointer hover:text-[var(--color-primary)] select-none w-36"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sales</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalResi')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none w-24"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Jumlah Resi</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--color-secondary)]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalM3')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none w-32"
                >
                  <div className="flex items-center justify-end gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                    <span>Total M³ (Laut)</span>
                    <ArrowUpDown className="w-3 h-3 text-sky-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalBeratUdara')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none w-32"
                >
                  <div className="flex items-center justify-end gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                    <span>Berat Udara (KG)</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('totalBeratLaut')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:text-[var(--color-primary)] select-none w-32"
                >
                  <div className="flex items-center justify-end gap-1.5 text-teal-600 dark:text-teal-400 font-bold">
                    <span>Berat Laut (KG)</span>
                    <ArrowUpDown className="w-3 h-3 text-teal-500" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td colSpan={8} className="py-2 px-2.5">
                      <div className="h-6 rounded-xl skeleton-shimmer w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--color-secondary)]">
                    Tidak ada data kargo yang sesuai dengan parameter filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((cust, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1
                  const custKey = `${cust.fdCustCode}|${cust.fdCustName}`
                  const isExpanded = expandedKeys.has(custKey)

                  return (
                    <React.Fragment key={custKey}>
                      <tr
                        onClick={() => toggleExpand(custKey)}
                        className={`hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors ${isExpanded ? 'bg-sky-500/5 dark:bg-sky-500/10' : ''
                          }`}
                      >
                        <td className="py-2 px-2.5 text-center text-[var(--color-secondary)] font-mono text-[11px]">
                          {globalIdx}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(custKey)
                            }}
                            className="p-1 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                            title={isExpanded ? 'Tutup detail resi' : 'Buka detail resi'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-sky-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-2.5">
                          <div>
                            <div className="font-bold text-[var(--color-primary)] hover:text-sky-500 transition-colors">
                              {cust.fdCustName}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--color-secondary)]">
                              {cust.fdCustCode}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-2.5">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-secondary)]">
                            {cust.fdSalesNM}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] font-bold text-[var(--color-primary)]">
                            {formatNumber(cust.totalResi)}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          {cust.totalM3 > 0 ? `${formatDecimal(cust.totalM3, 4)} m³` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {cust.totalBeratUdara > 0 ? `${formatDecimal(cust.totalBeratUdara, 2)} kg` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-[11px] font-bold text-teal-600 dark:text-teal-400">
                          {cust.totalBeratLaut > 0 ? `${formatDecimal(cust.totalBeratLaut, 2)} kg` : '-'}
                        </td>
                      </tr>

                      {/* Baris Expand: Rincian Resi Transaksional */}
                      {isExpanded && (
                        <tr className="bg-[var(--color-surface-hover)]/40 border-b border-[var(--color-border)]">
                          <td colSpan={8} className="p-2.5 pl-8 sm:pl-10">
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                <div className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-2">
                                  <span>Rincian Resi Kargo: <strong className="text-sky-500">{cust.fdCustName}</strong></span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)] font-mono">
                                    {cust.resiDetails?.length || 0} resi kargo
                                  </span>
                                </div>
                              </div>

                              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                                <table className="w-full text-[11px] text-left border-collapse">
                                  <thead className="bg-[var(--color-neutral)] text-[var(--color-secondary)] font-bold uppercase text-[9.5px] border-b border-[var(--color-border)] sticky top-0">
                                    <tr>
                                      <th className="py-1.5 px-2 w-8 text-center">No</th>
                                      <th className="py-1.5 px-2">No. Resi</th>
                                      <th className="py-1.5 px-2">No. Listcode</th>
                                      <th className="py-1.5 px-2">Kode Marking</th>
                                      <th className="py-1.5 px-2">Moda</th>
                                      <th className="py-1.5 px-2">Komoditi</th>
                                      <th className="py-1.5 px-2">No. Faktur (Bill)</th>
                                      <th className="py-1.5 px-2 text-right text-sky-600 dark:text-sky-400">Volume M³</th>
                                      <th className="py-1.5 px-2">Sumber M³</th>
                                      <th className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400">Berat Udara</th>
                                      <th className="py-1.5 px-2 text-right text-teal-600 dark:text-teal-400">Berat Laut</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--color-border)]/60 font-mono text-[11px]">
                                    {cust.resiDetails?.map((resi, rIdx) => (
                                      <tr key={`${resi.fdListCode}-${rIdx}`} className="hover:bg-sky-500/5 transition-colors">
                                        <td className="py-1.5 px-2 text-center text-[var(--color-secondary)]">
                                          {rIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-2 font-bold text-sky-600 dark:text-sky-400">
                                          {resi.fdTerima || '-'}
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--color-primary)]">
                                          {resi.fdListCode}
                                        </td>
                                        <td className="py-1.5 px-2 text-[var(--color-secondary)]">
                                          {resi.fdMarkingCode}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          {resi.fdListType === 1 ? (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-sans font-medium w-fit border border-amber-500/20">
                                              <Plane className="w-2.5 h-2.5 text-amber-500" />
                                              <span>Udara</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-sans font-medium w-fit border border-sky-500/20">
                                              <Ship className="w-2.5 h-2.5 text-sky-500" />
                                              <span>Laut</span>
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-2 font-sans text-[var(--color-secondary)]">
                                          {resi.fdComodityName}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          {resi.fdInvNo ? (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              {resi.fdInvNo}
                                            </span>
                                          ) : (
                                            <span className="text-[var(--color-secondary)]">-</span>
                                          )}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-sky-600 dark:text-sky-400">
                                          {resi.calculatedM3 > 0 ? formatDecimal(resi.calculatedM3, 4) : '-'}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <span
                                            className={`text-[9.5px] px-2 py-0.5 rounded-md font-sans font-bold ${resi.sourceM3 === 'BILLING'
                                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                : resi.sourceM3 === 'GUDANG'
                                                  ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                                                  : resi.sourceM3 === 'PACKING_LIST'
                                                    ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                                    : resi.sourceM3 === 'ENTRY_LIST'
                                                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                      : 'text-[var(--color-secondary)]'
                                              }`}
                                          >
                                            {resi.sourceM3}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-amber-600 dark:text-amber-400 font-bold">
                                          {resi.calculatedBeratUdara > 0
                                            ? `${formatDecimal(resi.calculatedBeratUdara, 2)} kg`
                                            : '-'}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-teal-600 dark:text-teal-400 font-bold">
                                          {resi.calculatedBeratLaut > 0
                                            ? `${formatDecimal(resi.calculatedBeratLaut, 2)} kg`
                                            : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
            {/* Grand Total Footer */}
            {sortedData.length > 0 && (
              <tfoot className="bg-[var(--color-surface-hover)] border-t-2 border-[var(--color-border)] font-bold text-xs">
                <tr>
                  <td colSpan={3} className="py-2 px-2.5 uppercase text-[var(--color-primary)]">
                    GRAND TOTAL KONSOLIDASI ({reportData?.summary.totalCustomers || 0} Cust)
                  </td>
                  <td className="py-2 px-2.5"></td>
                  <td className="py-2 px-2.5 text-right font-mono text-[var(--color-primary)]">
                    {formatNumber(reportData?.summary.totalResi || 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-sky-600 dark:text-sky-400 text-xs sm:text-sm">
                    {formatDecimal(reportData?.summary.grandTotalM3 || 0, 2)} m³
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                    {formatDecimal(reportData?.summary.grandTotalBeratUdara || 0, 1)} kg
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-teal-600 dark:text-teal-400 text-xs sm:text-sm">
                    {formatDecimal(reportData?.summary.grandTotalBeratLaut || 0, 1)} kg
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="p-2.5 sm:p-3 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="text-[var(--color-secondary)]">
            Menampilkan <strong className="text-[var(--color-primary)] font-mono">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
            <strong className="text-[var(--color-primary)] font-mono">{Math.min(currentPage * pageSize, totalItems)}</strong> dari{' '}
            <strong className="text-[var(--color-primary)] font-mono">{totalItems}</strong> pelanggan
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="text-xs h-8 px-3 rounded-lg cursor-pointer"
            >
              Sebelumnya
            </Button>
            <div className="text-xs font-mono px-2 text-[var(--color-primary)] font-bold">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="text-xs h-8 px-3 rounded-lg cursor-pointer"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
