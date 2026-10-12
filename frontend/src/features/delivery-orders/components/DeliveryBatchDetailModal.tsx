import { useState, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  X,
  Layers,
  Search,
  Download,
  RotateCcw,
  Plane,
  Ship,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Truck,
  FileText,
  Tag,
  FileCheck,
  AlertCircle,
  ExternalLink,
  Rows3,
  LayoutGrid,
  Users,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useToastStore } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { cn, formatNumber, displayCustName } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { DeliveryBatchOrderItem } from '../types/delivery-orders.types'

interface DeliveryBatchDetailModalProps {
  isOpen: boolean
  onClose: () => void
  batchDate: string // YYYY-MM-DD
  batchSession: 'Pagi' | 'Sore'
  batchTime?: string
  displayDate?: string
}

export function DeliveryBatchDetailModal({
  isOpen,
  onClose,
  batchDate,
  batchSession,
  batchTime,
  displayDate,
}: DeliveryBatchDetailModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  useModalEscape(isOpen, onClose)

  // Filter states
  const [search, setSearch] = useState<string>('')
  const [selectedModa, setSelectedModa] = useState<'all' | 'Udara' | 'Laut'>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedBillingStatus, setSelectedBillingStatus] = useState<'all' | 'billed' | 'unbilled'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [collapsedBranches, setCollapsedBranches] = useState<Record<string, boolean>>({})
  const [collapsedMarkings, setCollapsedMarkings] = useState<Record<string, boolean>>({})

  // Fetch batch detail from backend
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['delivery-confirm-batch-detail', batchDate, batchSession],
    queryFn: async () => {
      const res = await deliveryOrdersApi.getConfirmBatchDetail(batchDate, batchSession)
      return res.data?.data
    },
    enabled: isOpen && Boolean(batchDate),
    staleTime: 60 * 1000,
  })

  const batchInfo = data
  const rawItems = useMemo(() => batchInfo?.items || [], [batchInfo])

  // Rekapitulasi status penagihan/billing Surat Jalan pada batch ini
  const billingStats = useMemo(() => {
    if (batchInfo?.billingRecap) {
      return {
        billedCount: batchInfo.billingRecap.billedSjCount,
        unbilledCount: batchInfo.billingRecap.unbilledSjCount,
        billedPack: batchInfo.billingRecap.billedPack,
        billedWeight: batchInfo.billingRecap.billedWeight,
        unbilledPack: batchInfo.billingRecap.unbilledPack,
        unbilledWeight: batchInfo.billingRecap.unbilledWeight,
      }
    }
    const billed = rawItems.filter((i) => i.isBilled)
    const unbilled = rawItems.filter((i) => !i.isBilled)
    return {
      billedCount: billed.length,
      unbilledCount: unbilled.length,
      billedPack: billed.reduce((acc, c) => acc + c.fdJmlPackSJ, 0),
      billedWeight: Math.round(billed.reduce((acc, c) => acc + c.fdJmlBeratSJ, 0) * 10) / 10,
      unbilledPack: unbilled.reduce((acc, c) => acc + c.fdJmlPackSJ, 0),
      unbilledWeight: Math.round(unbilled.reduce((acc, c) => acc + c.fdJmlBeratSJ, 0) * 10) / 10,
    }
  }, [batchInfo, rawItems])

  // Unique branches for filter
  const branchOptions = useMemo(() => {
    const set = new Set<string>()
    rawItems.forEach((i) => {
      if (i.branchName) set.add(i.branchName)
    })
    return Array.from(set).sort()
  }, [rawItems])

  // Filtered items
  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      // Moda filter
      if (selectedModa !== 'all' && item.moda !== selectedModa) return false

      // Branch filter
      if (selectedBranch !== 'all' && item.branchName !== selectedBranch) return false

      // Billing filter
      if (selectedBillingStatus === 'billed' && !item.isBilled) return false
      if (selectedBillingStatus === 'unbilled' && item.isBilled) return false

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const match =
          item.fdSJNo.toLowerCase().includes(q) ||
          item.fdCustName.toLowerCase().includes(q) ||
          item.fdCustCode.toLowerCase().includes(q) ||
          item.fdMarkingCode.toLowerCase().includes(q) ||
          (item.fdMarkingNo && item.fdMarkingNo.toLowerCase().includes(q)) ||
          item.fdSupir.toLowerCase().includes(q) ||
          item.fdCarID.toLowerCase().includes(q) ||
          item.fdListCode.toLowerCase().includes(q) ||
          item.branchName.toLowerCase().includes(q) ||
          (item.invNos && item.invNos.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [rawItems, selectedModa, selectedBranch, selectedBillingStatus, search])

  // Grouping: Moda (Outer) -> Branch Name (Middle) -> Marking Code (Inner)
  const groupedData = useMemo(() => {
    const modas: Array<{
      moda: 'Udara' | 'Laut'
      label: string
      icon: typeof Plane
      color: string
      badgeClass: string
      items: DeliveryBatchOrderItem[]
      branches: Array<{
        branchName: string
        branchCode: string
        items: DeliveryBatchOrderItem[]
        totalSj: number
        billedSj: number
        unbilledSj: number
        totalPack: number
        totalWeight: number
        markings: Array<{
          markingCode: string
          custName: string
          custCode: string
          custNamesList: string[]
          custCodesList: string[]
          uniqueCustomerCount: number
          items: DeliveryBatchOrderItem[]
          totalSj: number
          billedSj: number
          unbilledSj: number
          totalPack: number
          totalWeight: number
        }>
      }>
      totalSj: number
      billedSj: number
      unbilledSj: number
      totalPack: number
      totalWeight: number
    }> = []

    const modaTypes: Array<'Udara' | 'Laut'> = ['Udara', 'Laut']

    modaTypes.forEach((mType) => {
      const modaItems = filteredItems.filter((i) => i.moda === mType)
      if (modaItems.length === 0) return

      // Group by branch
      const branchMap = new Map<string, DeliveryBatchOrderItem[]>()
      modaItems.forEach((item) => {
        const bName = item.branchName || 'Lainnya'
        if (!branchMap.has(bName)) branchMap.set(bName, [])
        branchMap.get(bName)!.push(item)
      })

      const branches = Array.from(branchMap.entries()).map(([branchName, bItems]) => {
        // Group by marking code within branch
        const markingMap = new Map<string, DeliveryBatchOrderItem[]>()
        bItems.forEach((item) => {
          const mCode = item.fdMarkingCode?.trim() || 'TANPA-MARKING'
          if (!markingMap.has(mCode)) markingMap.set(mCode, [])
          markingMap.get(mCode)!.push(item)
        })

        const markings = Array.from(markingMap.entries()).map(([mCode, mItems]) => {
          const custNames = Array.from(new Set(mItems.map((i) => i.fdCustName).filter(Boolean)))
          const displayCust = custNames.length > 0 ? custNames.join(', ') : '-'
          const custCodes = Array.from(new Set(mItems.map((i) => i.fdCustCode).filter(Boolean)))
          const displayCustCode = custCodes.join(', ')

          const billedSj = mItems.filter((i) => i.isBilled).length
          const unbilledSj = mItems.filter((i) => !i.isBilled).length

          return {
            markingCode: mCode === 'TANPA-MARKING' ? '— (Tanpa Marking)' : mCode,
            custName: displayCust,
            custCode: displayCustCode,
            custNamesList: custNames,
            custCodesList: custCodes,
            uniqueCustomerCount: custNames.length,
            items: mItems,
            totalSj: mItems.length,
            billedSj,
            unbilledSj,
            totalPack: mItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
            totalWeight: Math.round(mItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
          }
        })

        // Sort markings alphabetically
        markings.sort((a, b) => a.markingCode.localeCompare(b.markingCode))

        const billedSj = bItems.filter((i) => i.isBilled).length
        const unbilledSj = bItems.filter((i) => !i.isBilled).length

        return {
          branchName,
          branchCode: bItems[0]?.branchCode || 'GZ',
          items: bItems,
          markings,
          totalSj: bItems.length,
          billedSj,
          unbilledSj,
          totalPack: bItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
          totalWeight: Math.round(bItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
        }
      })

      // Sort branches by total SJ desc
      branches.sort((a, b) => b.totalSj - a.totalSj)

      const billedSj = modaItems.filter((i) => i.isBilled).length
      const unbilledSj = modaItems.filter((i) => !i.isBilled).length

      modas.push({
        moda: mType,
        label: mType === 'Udara' ? 'Moda Udara (Air)' : 'Moda Laut (Sea)',
        icon: mType === 'Udara' ? Plane : Ship,
        color: mType === 'Udara' ? 'sky' : 'emerald',
        badgeClass:
          mType === 'Udara'
            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        items: modaItems,
        branches,
        totalSj: modaItems.length,
        billedSj,
        unbilledSj,
        totalPack: modaItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
        totalWeight: Math.round(modaItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
      })
    })

    return modas
  }, [filteredItems])

  // Check if any accordion item is currently collapsed
  const isAnyCollapsed = useMemo(() => {
    return Object.values(collapsedBranches).some(Boolean) || Object.values(collapsedMarkings).some(Boolean)
  }, [collapsedBranches, collapsedMarkings])

  // Toggle expand/collapse all
  const toggleAll = () => {
    if (isAnyCollapsed) {
      // Expand all
      setCollapsedBranches({})
      setCollapsedMarkings({})
    } else {
      // Collapse all
      const newBranches: Record<string, boolean> = {}
      const newMarkings: Record<string, boolean> = {}
      groupedData.forEach((m) => {
        m.branches.forEach((b) => {
          newBranches[`${m.moda}-${b.branchName}`] = true
          b.markings.forEach((k) => {
            newMarkings[`${m.moda}-${b.branchName}-${k.markingCode}`] = true
          })
        })
      })
      setCollapsedBranches(newBranches)
      setCollapsedMarkings(newMarkings)
    }
  }

  // Toggle collapse branch
  const toggleCollapse = (key: string) => {
    setCollapsedBranches((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Toggle collapse marking
  const toggleCollapseMarking = (key: string) => {
    setCollapsedMarkings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Export Excel
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      addToast({ type: 'info', message: 'Tidak ada data Surat Jalan untuk diekspor' })
      return
    }

    const rows = filteredItems.map((item, idx) => ({
      No: idx + 1,
      Moda: item.moda,
      Cabang: item.branchName,
      'Kode Cabang': item.branchCode,
      'No. Surat Jalan': item.fdSJNo,
      'Tanggal SJ': item.fdSJDate,
      'Customer Master': displayCustName(item.fdCustName),
      'Kode Customer': item.fdCustCode,
      'Kode Marking': item.fdMarkingCode,
      'Marking / Resi': item.fdMarkingNo || '-',
      'List Code': item.fdListCode,
      'Status Penagihan': item.isBilled ? 'Sudah Dibuat Bill' : 'Belum Dibuat Bill',
      'No Invoice': item.invNos || '-',
      'Tgl Invoice': item.invDates || '-',
      'Plat Mobil': item.fdCarID,
      Supir: item.fdSupir,
      'Koli (Pack)': item.fdJmlPackSJ,
      Satuan: item.fdSatuan,
      'Berat (Kg)': item.fdJmlBeratSJ,
      'Waktu Cetak Laporan': item.batchTime || batchTime || '-',
      'Tanggal Batch': batchDate,
      Sesi: batchSession,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, `SJ_Batch_${batchSession}`)

    const filename = `Surat_Jalan_Batch_${batchDate}_${batchSession}.xlsx`
    XLSX.writeFile(wb, filename)
    addToast({ type: 'success', message: 'Data Surat Jalan batch berhasil diekspor ke Excel' })
  }

  if (!isOpen) return null

  const effectiveTime = batchInfo?.batchTime || batchTime || ''
  const isPagi = batchSession === 'Pagi'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-6xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs font-[var(--font-body)] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-center shrink-0 shadow-xs",
                isPagi
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
              )}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] font-[var(--font-display)]">
                  Surat Jalan Batch: Sesi {batchSession}
                </h3>
                {effectiveTime && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <Clock size={11} />
                    <span>{effectiveTime} WIB</span>
                  </span>
                )}
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border font-mono",
                    isPagi
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                  )}
                >
                  {displayDate || batchDate}
                </span>

                {/* Billing Progress Pill */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <FileCheck size={11} />
                  <span>
                    Bill: {billingStats.billedCount}/{rawItems.length} SJ ({rawItems.length > 0 ? Math.round((billingStats.billedCount / rawItems.length) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                Rincian Surat Jalan terkonfirmasi terkirim (tbDeliveryConfirm) dikelompokkan per Moda & Cabang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle Expand/Collapse All */}
            <button
              type="button"
              onClick={toggleAll}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition cursor-pointer flex items-center gap-1 text-xs"
              title={isAnyCollapsed ? 'Buka semua grup cabang & marking' : 'Tutup semua grup cabang & marking'}
            >
              <ChevronsUpDown size={14} />
              <span className="hidden sm:inline font-medium">
                {isAnyCollapsed ? 'Buka Semua' : 'Tutup Semua'}
              </span>
            </button>

            {/* Ekspor Excel */}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="gap-1.5 text-xs h-8"
              title="Unduh seluruh data Surat Jalan terfilter ke Excel"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Ekspor Excel</span>
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-neutral)] transition cursor-pointer"
              title="Tutup dialog (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Executive KPI Cards Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 px-4 sm:px-6 py-3 bg-[var(--color-neutral)]/40 border-b border-[var(--color-border)]">
          {/* 1. Total Surat Jalan */}
          <div
            onClick={() => {
              setSelectedModa('all')
              setSelectedBillingStatus('all')
            }}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer select-none group",
              selectedModa === 'all' && selectedBillingStatus === 'all'
                ? "bg-[var(--color-surface)] border-sky-500/50 ring-1 ring-sky-500/30 shadow-xs"
                : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-secondary)]/40"
            )}
            title="Tampilkan seluruh Surat Jalan tanpa filter"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-[var(--color-secondary)] tracking-wider">
              <span>Total Batch</span>
              <Layers size={13} className="text-sky-500 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-[var(--color-primary)]">
                {formatNumber(batchInfo?.totalSj || 0)} <span className="text-[11px] font-normal text-[var(--color-secondary)]">SJ</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {formatNumber(batchInfo?.totalPack || 0)} coly
              </span>
            </div>
            <div className="text-[10px] text-[var(--color-secondary)] font-mono mt-0.5 flex items-center justify-between">
              <span>{(batchInfo?.totalWeight || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
              <span className="text-[9.5px] opacity-75">Semua</span>
            </div>
          </div>

          {/* 2. Udara (Air) */}
          <div
            onClick={() => setSelectedModa((prev) => (prev === 'Udara' ? 'all' : 'Udara'))}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              selectedModa === 'Udara'
                ? "bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/40 text-sky-700 dark:text-sky-300 shadow-xs"
                : "bg-sky-500/5 border-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10"
            )}
            title="Filter hanya pengiriman jalur Udara"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider">
              <span>✈️ Air Freight</span>
              <span className="text-[9.5px] font-mono px-1 rounded bg-sky-500/20">
                {batchInfo?.totalSj ? Math.round(((batchInfo.sjUdara || 0) / batchInfo.totalSj) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className="text-base sm:text-lg font-bold font-mono">
                {formatNumber(batchInfo?.sjUdara || 0)} <span className="text-[11px] font-normal opacity-75">SJ</span>
              </span>
              <span className="text-[10px] font-mono opacity-80 truncate">
                {formatNumber(batchInfo?.packUdara || 0)} coly
              </span>
            </div>
            <div className="text-[10px] font-mono mt-0.5 opacity-80">
              {(batchInfo?.weightUdara || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
            </div>
          </div>

          {/* 3. Laut (Sea) */}
          <div
            onClick={() => setSelectedModa((prev) => (prev === 'Laut' ? 'all' : 'Laut'))}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              selectedModa === 'Laut'
                ? "bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                : "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            )}
            title="Filter hanya pengiriman jalur Laut"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider">
              <span>🚢 Sea Freight</span>
              <span className="text-[9.5px] font-mono px-1 rounded bg-emerald-500/20">
                {batchInfo?.totalSj ? Math.round(((batchInfo.sjLaut || 0) / batchInfo.totalSj) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className="text-base sm:text-lg font-bold font-mono">
                {formatNumber(batchInfo?.sjLaut || 0)} <span className="text-[11px] font-normal opacity-75">SJ</span>
              </span>
              <span className="text-[10px] font-mono opacity-80 truncate">
                {formatNumber(batchInfo?.packLaut || 0)} coly
              </span>
            </div>
            <div className="text-[10px] font-mono mt-0.5 opacity-80">
              {(batchInfo?.weightLaut || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
            </div>
          </div>

          {/* 4. Sudah Dibuat Bill */}
          <div
            onClick={() => setSelectedBillingStatus((prev) => (prev === 'billed' ? 'all' : 'billed'))}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer select-none",
              selectedBillingStatus === 'billed'
                ? "bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-xs"
                : "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-500/40"
            )}
            title="Filter Surat Jalan yang SUDAH diterbitkan bill/invoice"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
              <span>🧾 Sudah Bill</span>
              <span className="text-[9.5px] font-mono px-1 rounded bg-emerald-500/15">
                {rawItems.length > 0 ? Math.round((billingStats.billedCount / rawItems.length) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(billingStats.billedCount)} <span className="text-[11px] font-normal opacity-75">SJ</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {formatNumber(billingStats.billedPack)} coly
              </span>
            </div>
            <div className="text-[10px] font-mono text-[var(--color-secondary)] mt-0.5">
              {billingStats.billedWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
            </div>
          </div>

          {/* 5. Belum Dibuat Bill */}
          <div
            onClick={() => setSelectedBillingStatus((prev) => (prev === 'unbilled' ? 'all' : 'unbilled'))}
            className={cn(
              "p-2.5 rounded-xl border transition-all cursor-pointer select-none col-span-2 sm:col-span-1",
              selectedBillingStatus === 'unbilled'
                ? "bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/40 text-amber-700 dark:text-amber-300 shadow-xs"
                : billingStats.unbilledCount > 0
                  ? "bg-amber-500/5 border-amber-500/25 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-[var(--color-surface)] border-[var(--color-border)]"
            )}
            title="Filter Surat Jalan yang BELUM dibuatkan bill/invoice"
          >
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400 tracking-wider">
              <span>⏳ Belum Bill</span>
              {billingStats.unbilledCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              )}
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1">
              <span className="text-base sm:text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatNumber(billingStats.unbilledCount)} <span className="text-[11px] font-normal opacity-75">SJ</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--color-secondary)] truncate">
                {formatNumber(billingStats.unbilledPack)} coly
              </span>
            </div>
            <div className="text-[10px] font-mono text-[var(--color-secondary)] mt-0.5">
              {billingStats.unbilledWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
            </div>
          </div>
        </div>

        {/* ── Toolbar: Search & Quick Filters ── */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2.5 bg-[var(--color-surface)]">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Cari No. SJ, Invoice, Customer, Marking, Supir, Mobil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-sky-500/40"
            />
            <Search className="w-3.5 h-3.5 text-[var(--color-secondary)] absolute left-2.5 top-2 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Billing Filter Segmented */}
            <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs">
              <button
                type="button"
                onClick={() => setSelectedBillingStatus('all')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium",
                  selectedBillingStatus === 'all'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Semua Bill
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillingStatus('billed')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium inline-flex items-center gap-1",
                  selectedBillingStatus === 'billed'
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <span>✓ Sudah Bill ({billingStats.billedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBillingStatus('unbilled')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium inline-flex items-center gap-1",
                  selectedBillingStatus === 'unbilled'
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                <span>⚠️ Belum Bill ({billingStats.unbilledCount})</span>
              </button>
            </div>

            {/* Moda Filter */}
            <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs">
              <button
                type="button"
                onClick={() => setSelectedModa('all')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium",
                  selectedModa === 'all'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                Semua Moda
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('Udara')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium inline-flex items-center gap-1",
                  selectedModa === 'Udara'
                    ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                ✈️ Air
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('Laut')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer select-none font-medium inline-flex items-center gap-1",
                  selectedModa === 'Laut'
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
              >
                🚢 Sea
              </button>
            </div>

            {/* Branch Selector */}
            {branchOptions.length > 1 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="py-1 px-2.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] focus:outline-none"
              >
                <option value="all">Semua Cabang ({branchOptions.length})</option>
                {branchOptions.map((bName) => (
                  <option key={bName} value={bName}>
                    {bName}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Switcher [ ▤ Tabel | 📱 Kartu ] */}
            <div className="inline-flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1",
                  viewMode === 'table'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
                title="Tampilan Tabel Berdensitas Tinggi"
              >
                <Rows3 size={13} />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  "px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1",
                  viewMode === 'cards'
                    ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-2xs"
                    : "text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
                )}
                title="Tampilan Kartu Responsif"
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>

            {(search || selectedModa !== 'all' || selectedBranch !== 'all' || selectedBillingStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedModa('all')
                  setSelectedBranch('all')
                  setSelectedBillingStatus('all')
                }}
                className="text-xs text-[var(--color-secondary)] hover:text-sky-500 flex items-center gap-1 px-1.5 py-1 cursor-pointer"
                title="Reset semua filter"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Modal Body: Grouped List ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-16 w-full skeleton-shimmer rounded-xl" />
                <div className="h-16 w-full skeleton-shimmer rounded-xl" />
                <div className="h-16 w-full skeleton-shimmer rounded-xl" />
                <div className="h-16 w-full skeleton-shimmer rounded-xl" />
              </div>
              <div className="h-44 w-full skeleton-shimmer rounded-xl" />
              <div className="h-44 w-full skeleton-shimmer rounded-xl" />
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-rose-500 space-y-2">
              <p className="font-semibold">Gagal memuat rincian Surat Jalan batch.</p>
              <Button size="sm" variant="secondary" onClick={() => refetch()}>
                Coba Lagi
              </Button>
            </div>
          ) : groupedData.length === 0 ? (
            <div className="py-16 text-center text-[var(--color-secondary)] space-y-2">
              <FileText className="w-8 h-8 opacity-40 mx-auto" />
              <p className="font-medium text-sm text-[var(--color-primary)]">
                Tidak ada Surat Jalan yang cocok dengan filter aktif.
              </p>
              <p className="text-[11px]">Coba bersihkan pencarian atau pilih moda/cabang lain.</p>
              {(search || selectedModa !== 'all' || selectedBranch !== 'all' || selectedBillingStatus !== 'all') && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setSelectedModa('all')
                    setSelectedBranch('all')
                    setSelectedBillingStatus('all')
                  }}
                  className="mt-2 text-xs"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          ) : (
            groupedData.map((modaGroup) => (
              <div
                key={modaGroup.moda}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden"
              >
                {/* ── Moda Header Banner ── */}
                <div
                  className={cn(
                    "px-4 sm:px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between",
                    modaGroup.moda === 'Udara'
                      ? "bg-sky-500/10 text-sky-800 dark:text-sky-200"
                      : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{modaGroup.moda === 'Udara' ? '✈️' : '🚢'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm tracking-wide">
                          {modaGroup.label}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono",
                            modaGroup.badgeClass
                          )}
                        >
                          {modaGroup.totalSj} Surat Jalan
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono opacity-85 flex items-center gap-2 font-medium">
                    <span>{formatNumber(modaGroup.totalPack)} coly</span>
                    <span>•</span>
                    <span>{modaGroup.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                  </div>
                </div>

                {/* ── Inner Branch Groups ── */}
                <div className="divide-y divide-[var(--color-border)]">
                  {modaGroup.branches.map((branch) => {
                    const collapseKey = `${modaGroup.moda}-${branch.branchName}`
                    const isCollapsed = Boolean(collapsedBranches[collapseKey])

                    return (
                      <div key={branch.branchName} className="p-3.5 sm:p-4 space-y-3">
                        {/* Branch Title & Toggle Bar */}
                        <div
                          onClick={() => toggleCollapse(collapseKey)}
                          className="flex items-center justify-between cursor-pointer select-none group p-2.5 rounded-xl bg-[var(--color-neutral)]/40 hover:bg-[var(--color-neutral)]/70 border border-[var(--color-border)]/70 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition">
                              {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Building2 size={14} className="text-sky-500 shrink-0" />
                              <span className="font-bold text-xs text-[var(--color-primary)] font-[var(--font-display)]">
                                {branch.branchName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                                {branch.branchCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                {branch.totalSj} SJ
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ✓ {branch.billedSj} Bill
                              </span>
                              {branch.unbilledSj > 0 && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  ⚠️ {branch.unbilledSj} Belum
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                {branch.markings.length} Marking
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-[var(--color-secondary)] font-mono flex items-center gap-2 shrink-0">
                            <span><b>{formatNumber(branch.totalPack)}</b> coly</span>
                            <span>•</span>
                            <span><b>{branch.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</b> kg</span>
                          </div>
                        </div>

                        {/* Content inside Branch */}
                        {!isCollapsed && (
                          <>
                            {viewMode === 'table' ? (
                              /* ── Table Mode ── */
                              <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                                <table className="w-full text-left border-collapse text-[11px]">
                                  <thead>
                                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/80 text-[var(--color-secondary)] font-medium sticky top-0 z-10 backdrop-blur-xs">
                                      <th className="py-2.5 px-3 text-center w-10">No</th>
                                      <th className="py-2.5 px-3 min-w-[130px]">No. Surat Jalan</th>
                                      <th className="py-2.5 px-3 min-w-[200px]">Customer & Resi / Alamat</th>
                                      <th className="py-2.5 px-3 min-w-[150px]">Status Penagihan</th>
                                      <th className="py-2.5 px-3 min-w-[130px]">Armada & Supir</th>
                                      <th className="py-2.5 px-3 text-right min-w-[90px]">Koli</th>
                                      <th className="py-2.5 px-3 text-right min-w-[90px]">Berat (Kg)</th>
                                      <th className="py-2.5 px-3 text-center min-w-[80px]">List Code</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--color-border)]/60">
                                    {branch.markings.map((marking) => {
                                      const markingKey = `${modaGroup.moda}-${branch.branchName}-${marking.markingCode}`
                                      const isMarkingCollapsed = Boolean(collapsedMarkings[markingKey])

                                      return (
                                        <Fragment key={marking.markingCode}>
                                          {/* Marking Section Subheader Row */}
                                          <tr
                                            onClick={() => toggleCollapseMarking(markingKey)}
                                            className="bg-[var(--color-neutral)]/45 hover:bg-[var(--color-neutral)]/80 border-t border-b border-[var(--color-border)] cursor-pointer select-none transition-colors group/marking"
                                          >
                                            <td colSpan={8} className="py-2.5 px-3">
                                              <div className="flex items-center justify-between gap-3">
                                                {/* Sisi Kiri: Collapse Icon, Marking Tag, Customer Info, SJ & Bill Badges */}
                                                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                                  <span className="text-[var(--color-secondary)] group-hover/marking:text-[var(--color-primary)] transition shrink-0">
                                                    {isMarkingCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                                  </span>

                                                  {/* Marking Code Tag */}
                                                  <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 shadow-2xs">
                                                    <Tag size={11} className="shrink-0 text-amber-500" />
                                                    <span>{marking.markingCode}</span>
                                                  </span>

                                                  {/* Customer Information */}
                                                  {marking.uniqueCustomerCount <= 1 ? (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      <span
                                                        className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[260px] sm:max-w-[340px]"
                                                        title={marking.custName}
                                                      >
                                                        {displayCustName(marking.custName)}
                                                      </span>
                                                      {marking.custCodesList[0] && (
                                                        <span className="text-[10px] font-mono text-[var(--color-secondary)] shrink-0">
                                                          ({marking.custCodesList[0]})
                                                        </span>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      <span
                                                        className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[200px] sm:max-w-[260px]"
                                                        title={marking.custNamesList[0]}
                                                      >
                                                        {displayCustName(marking.custNamesList[0])}
                                                      </span>
                                                      <span
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 shrink-0 cursor-help"
                                                        title={`Konsolidasi ${marking.uniqueCustomerCount} Pelanggan:\n${marking.custNamesList
                                                          .map((name, i) => `${i + 1}. ${name}${marking.custCodesList[i] ? ` (${marking.custCodesList[i]})` : ''}`)
                                                          .join('\n')}`}
                                                      >
                                                        <Users size={10} className="shrink-0 text-indigo-500" />
                                                        <span>+{marking.uniqueCustomerCount - 1} Pelanggan</span>
                                                      </span>
                                                    </div>
                                                  )}

                                                  {/* SJ & Bill Status Badges */}
                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                                      {marking.totalSj} SJ
                                                    </span>
                                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                      ✓ {marking.billedSj} Bill
                                                    </span>
                                                    {marking.unbilledSj > 0 && (
                                                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        ⚠️ {marking.unbilledSj} Belum
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>

                                                {/* Sisi Kanan: Koli & Berat (Terkunci permanen di kanan) */}
                                                <div className="text-[11px] font-mono text-[var(--color-secondary)] flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                                  <span><b>{formatNumber(marking.totalPack)}</b> coly</span>
                                                  <span className="opacity-40">•</span>
                                                  <span><b>{marking.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</b> kg</span>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>

                                          {/* Rows of SJ under this marking */}
                                          {!isMarkingCollapsed &&
                                            marking.items.map((item, itemIdx) => (
                                              <tr
                                                key={item.fdSJNo}
                                                className="hover:bg-[var(--color-neutral)]/50 transition-colors group"
                                              >
                                                <td className="py-2.5 px-3 text-center text-[var(--color-secondary)] font-mono text-[10px]">
                                                  {itemIdx + 1}
                                                </td>
                                                <td className="py-2.5 px-3 font-mono">
                                                  <Link
                                                    to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                                                    className="font-bold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors"
                                                    title={`Lihat detail Surat Jalan ${item.fdSJNo}`}
                                                  >
                                                    <span>{item.fdSJNo}</span>
                                                    <ExternalLink size={10} className="text-[var(--color-secondary)] opacity-60 group-hover:opacity-100" />
                                                  </Link>
                                                  <span className="block text-[9.5px] text-[var(--color-secondary)] font-normal mt-0.5">
                                                    {item.fdSJDate}
                                                  </span>
                                                </td>
                                                <td className="py-2.5 px-3 max-w-[240px]">
                                                  <div className="font-semibold text-[var(--color-primary)] truncate" title={item.fdCustName}>
                                                    {displayCustName(item.fdCustName)}
                                                  </div>
                                                  {item.fdMarkingNo && (
                                                    <div className="text-[10px] text-[var(--color-secondary)] font-mono truncate mt-0.5">
                                                      No/Resi: <span className="font-semibold text-[var(--color-primary)]">{item.fdMarkingNo}</span>
                                                    </div>
                                                  )}
                                                  {(item.fdAddr || item.fdCity) && (
                                                    <div className="text-[9.5px] text-[var(--color-secondary)] truncate mt-0.5" title={`${item.fdAddr} ${item.fdCity}`}>
                                                      {[item.fdAddr, item.fdCity].filter(Boolean).join(', ')}
                                                    </div>
                                                  )}
                                                </td>

                                                {/* Status Penagihan */}
                                                <td className="py-2.5 px-3 min-w-[150px] max-w-[220px]">
                                                  {item.isBilled ? (
                                                    <div className="space-y-1">
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        <FileCheck size={11} className="text-emerald-500 shrink-0" />
                                                        <span>Sudah Ada Bill</span>
                                                      </span>
                                                      {item.invNos && (
                                                        <div className="flex flex-wrap gap-1 items-center">
                                                          {item.invNos.split(',').map((inv, idx) => {
                                                            const cleanInv = inv.trim()
                                                            return (
                                                              <Link
                                                                key={idx}
                                                                to={ROUTES.BILLING_VALIDATION_DETAIL(cleanInv)}
                                                                className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline hover:text-sky-700 dark:hover:text-sky-300"
                                                                title={`Buka validasi invoice ${cleanInv}`}
                                                              >
                                                                <span>{cleanInv}</span>
                                                                <ExternalLink size={9} className="opacity-70 shrink-0" />
                                                              </Link>
                                                            )
                                                          })}
                                                        </div>
                                                      )}
                                                      {item.invDates && (
                                                        <div className="text-[9px] text-[var(--color-secondary)] font-mono">
                                                          Tgl: {item.invDates}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-0.5">
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                                        <AlertCircle size={11} className="text-amber-500 shrink-0" />
                                                        <span>Belum Ada Bill</span>
                                                      </span>
                                                      <div className="text-[9.5px] text-[var(--color-secondary)] font-mono">
                                                        {item.fdListCode ? `LC: ${item.fdListCode}` : 'Belum Manifest'}
                                                      </div>
                                                    </div>
                                                  )}
                                                </td>

                                                <td className="py-2.5 px-3 text-[var(--color-secondary)]">
                                                  <div className="flex items-center gap-1 font-mono text-[10.5px] text-[var(--color-primary)]">
                                                    <Truck size={11} className="shrink-0 text-sky-500" />
                                                    <span>{item.fdCarID}</span>
                                                  </div>
                                                  <div className="text-[10px] truncate mt-0.5" title={item.fdSupir}>
                                                    {item.fdSupir}
                                                  </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)]">
                                                  <span className="font-bold">{formatNumber(item.fdJmlPackSJ)}</span>
                                                  <span className="text-[9.5px] text-[var(--color-secondary)] ml-1 font-normal">
                                                    {item.fdSatuan}
                                                  </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono text-[var(--color-primary)] font-bold">
                                                  {item.fdJmlBeratSJ.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono text-[10px]">
                                                  <span className="px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                                                    {item.fdListCode || '—'}
                                                  </span>
                                                </td>
                                              </tr>
                                            ))}
                                        </Fragment>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              /* ── Cards Mode ── */
                              <div className="space-y-4 pt-1">
                                {branch.markings.map((marking) => {
                                  const markingKey = `${modaGroup.moda}-${branch.branchName}-${marking.markingCode}`
                                  const isMarkingCollapsed = Boolean(collapsedMarkings[markingKey])

                                  return (
                                    <div key={marking.markingCode} className="space-y-2.5">
                                      {/* Marking Header Strip */}
                                      <div
                                        onClick={() => toggleCollapseMarking(markingKey)}
                                        className="p-2.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-[var(--color-neutral)]/80 transition-colors group/marking"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                          <span className="text-[var(--color-secondary)] group-hover/marking:text-[var(--color-primary)] transition shrink-0">
                                            {isMarkingCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0 shadow-2xs">
                                            <Tag size={11} className="shrink-0 text-amber-500" />
                                            <span>{marking.markingCode}</span>
                                          </span>

                                          {/* Customer Information */}
                                          {marking.uniqueCustomerCount <= 1 ? (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span
                                                className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[240px]"
                                                title={marking.custName}
                                              >
                                                {displayCustName(marking.custName)}
                                              </span>
                                              {marking.custCodesList[0] && (
                                                <span className="text-[10px] font-mono text-[var(--color-secondary)] shrink-0">
                                                  ({marking.custCodesList[0]})
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span
                                                className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[180px] sm:max-w-[220px]"
                                                title={marking.custNamesList[0]}
                                              >
                                                {displayCustName(marking.custNamesList[0])}
                                              </span>
                                              <span
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 shrink-0 cursor-help"
                                                title={`Konsolidasi ${marking.uniqueCustomerCount} Pelanggan:\n${marking.custNamesList
                                                  .map((name, i) => `${i + 1}. ${name}${marking.custCodesList[i] ? ` (${marking.custCodesList[i]})` : ''}`)
                                                  .join('\n')}`}
                                              >
                                                <Users size={10} className="shrink-0 text-indigo-500" />
                                                <span>+{marking.uniqueCustomerCount - 1} Pelanggan</span>
                                              </span>
                                            </div>
                                          )}

                                          {/* Badges */}
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                              {marking.totalSj} SJ
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                              ✓ {marking.billedSj} Bill
                                            </span>
                                            {marking.unbilledSj > 0 && (
                                              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                ⚠️ {marking.unbilledSj} Belum
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="text-[11px] font-mono text-[var(--color-secondary)] shrink-0 flex items-center gap-1.5 whitespace-nowrap">
                                          <span><b>{formatNumber(marking.totalPack)}</b> coly</span>
                                          <span className="opacity-40">•</span>
                                          <span><b>{marking.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })}</b> kg</span>
                                        </div>
                                      </div>

                                      {/* Cards Grid */}
                                      {!isMarkingCollapsed && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2 sm:pl-3">
                                          {marking.items.map((item, itemIdx) => (
                                            <div
                                              key={item.fdSJNo}
                                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2.5 shadow-2xs hover:border-[var(--color-secondary)]/40 transition-colors"
                                            >
                                              {/* Card Top: No SJ & Status Badge */}
                                              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--color-border)] pb-2">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-[10px] font-mono font-medium text-[var(--color-secondary)] w-5 text-center">
                                                    #{itemIdx + 1}
                                                  </span>
                                                  <Link
                                                    to={ROUTES.DELIVERY_DETAIL(item.fdSJNo)}
                                                    className="font-mono font-bold text-xs text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                                                    title={`Buka detail Surat Jalan ${item.fdSJNo}`}
                                                  >
                                                    <span>{item.fdSJNo}</span>
                                                    <ExternalLink size={10} className="text-[var(--color-secondary)] opacity-70" />
                                                  </Link>
                                                  <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                                                    ({item.fdSJDate})
                                                  </span>
                                                </div>
                                                {/* Status Penagihan Pill */}
                                                {item.isBilled ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                                    <FileCheck size={11} className="text-emerald-500 shrink-0" />
                                                    <span>Sudah Bill</span>
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                                    <AlertCircle size={11} className="text-amber-500 shrink-0" />
                                                    <span>Belum Bill</span>
                                                  </span>
                                                )}
                                              </div>

                                              {/* Customer & Marking */}
                                              <div>
                                                <div className="font-semibold text-xs text-[var(--color-primary)] truncate" title={item.fdCustName}>
                                                  {displayCustName(item.fdCustName)}
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-[var(--color-secondary)] mt-0.5 font-mono">
                                                  <span className="font-medium text-amber-600 dark:text-amber-400">
                                                    {item.fdMarkingCode || '—'}
                                                  </span>
                                                  {item.fdMarkingNo && <span>• {item.fdMarkingNo}</span>}
                                                  {item.fdCustCode && <span>({item.fdCustCode})</span>}
                                                </div>
                                                {(item.fdAddr || item.fdCity) && (
                                                  <div className="text-[10px] text-[var(--color-secondary)] truncate mt-0.5">
                                                    {[item.fdAddr, item.fdCity].filter(Boolean).join(', ')}
                                                  </div>
                                                )}
                                              </div>

                                              {/* 2-col Logistics info: Driver & Physical Cargo */}
                                              <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-[var(--color-neutral)]/50 border border-[var(--color-border)]/60 text-[11px]">
                                                <div>
                                                  <span className="text-[9.5px] uppercase font-semibold text-[var(--color-secondary)] block">
                                                    Armada & Supir
                                                  </span>
                                                  <div className="flex items-center gap-1 font-mono font-medium text-[var(--color-primary)] mt-0.5">
                                                    <Truck size={11} className="text-sky-500 shrink-0" />
                                                    <span>{item.fdCarID}</span>
                                                  </div>
                                                  <div className="text-[10px] text-[var(--color-secondary)] truncate">
                                                    {item.fdSupir}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <span className="text-[9.5px] uppercase font-semibold text-[var(--color-secondary)] block">
                                                    Muatan Fisik
                                                  </span>
                                                  <div className="font-mono font-bold text-[var(--color-primary)] mt-0.5">
                                                    {formatNumber(item.fdJmlPackSJ)} <span className="text-[9.5px] font-normal text-[var(--color-secondary)]">{item.fdSatuan}</span>
                                                  </div>
                                                  <div className="font-mono text-[10px] text-[var(--color-secondary)]">
                                                    {item.fdJmlBeratSJ.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Invoice Link Box */}
                                              <div className="pt-0.5">
                                                {item.isBilled ? (
                                                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10.5px]">
                                                    <div className="flex items-center justify-between gap-1 flex-wrap">
                                                      <span className="text-[9.5px] uppercase font-semibold text-emerald-700 dark:text-emerald-300">
                                                        Faktur Terbit:
                                                      </span>
                                                      {item.invDates && (
                                                        <span className="text-[9px] font-mono text-[var(--color-secondary)]">
                                                          {item.invDates}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                      {item.invNos?.split(',').map((inv, idx) => {
                                                        const cleanInv = inv.trim()
                                                        return (
                                                          <Link
                                                            key={idx}
                                                            to={ROUTES.BILLING_VALIDATION_DETAIL(cleanInv)}
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-emerald-500/30 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline"
                                                          >
                                                            <span>{cleanInv}</span>
                                                            <ExternalLink size={9} />
                                                          </Link>
                                                        )
                                                      })}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10.5px] flex items-center justify-between">
                                                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                                                      Belum Terbit Invoice
                                                    </span>
                                                    <span className="font-mono text-[9.5px] text-[var(--color-secondary)]">
                                                      LC: {item.fdListCode || '—'}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between text-xs gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 text-[var(--color-secondary)] flex-wrap">
            <span>
              Menampilkan <b className="text-[var(--color-primary)]">{filteredItems.length}</b> dari {rawItems.length} total Surat Jalan
            </span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
              ✓ Sudah Bill: {filteredItems.filter((i) => i.isBilled).length} SJ
            </span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
              ⏳ Belum Bill: {filteredItems.filter((i) => !i.isBilled).length} SJ
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose} className="px-4">
            Tutup
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
