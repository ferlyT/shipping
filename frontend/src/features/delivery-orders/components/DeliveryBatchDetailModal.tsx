import { useState, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
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
  Clock,
  Truck,
  FileText,
  Tag,
} from 'lucide-react'
import { deliveryOrdersApi } from '../services/delivery-orders.service'
import { useModalEscape } from '@/hooks/useModalEscape'
import { useToastStore } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { cn, formatNumber } from '@/lib/utils'
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
          item.branchName.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [rawItems, selectedModa, selectedBranch, search])

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
        totalPack: number
        totalWeight: number
        markings: Array<{
          markingCode: string
          custName: string
          custCode: string
          items: DeliveryBatchOrderItem[]
          totalSj: number
          totalPack: number
          totalWeight: number
        }>
      }>
      totalSj: number
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
          const displayCustName = custNames.length > 0 ? custNames.join(', ') : '-'
          const custCodes = Array.from(new Set(mItems.map((i) => i.fdCustCode).filter(Boolean)))
          const displayCustCode = custCodes.join(', ')

          return {
            markingCode: mCode === 'TANPA-MARKING' ? '— (Tanpa Marking)' : mCode,
            custName: displayCustName,
            custCode: displayCustCode,
            items: mItems,
            totalSj: mItems.length,
            totalPack: mItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
            totalWeight: Math.round(mItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
          }
        })

        // Sort markings alphabetically
        markings.sort((a, b) => a.markingCode.localeCompare(b.markingCode))

        return {
          branchName,
          branchCode: bItems[0]?.branchCode || 'GZ',
          items: bItems,
          markings,
          totalSj: bItems.length,
          totalPack: bItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
          totalWeight: Math.round(bItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
        }
      })

      // Sort branches by total SJ desc
      branches.sort((a, b) => b.totalSj - a.totalSj)

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
        totalPack: modaItems.reduce((acc, curr) => acc + curr.fdJmlPackSJ, 0),
        totalWeight: Math.round(modaItems.reduce((acc, curr) => acc + curr.fdJmlBeratSJ, 0) * 10) / 10,
      })
    })

    return modas
  }, [filteredItems])

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
      'Customer Master': item.fdCustName,
      'Kode Customer': item.fdCustCode,
      'Kode Marking': item.fdMarkingCode,
      'Marking / Resi': item.fdMarkingNo || '-',
      'List Code': item.fdListCode,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs font-[var(--font-body)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-xl border flex items-center justify-center shrink-0",
                isPagi
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
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
                    "px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border",
                    isPagi
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                  )}
                >
                  {displayDate || batchDate}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)] mt-0.5">
                Rincian Surat Jalan terkonfirmasi terkirim (tbDeliveryConfirm) dikelompokkan berdasarkan Moda & Cabang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-neutral)] transition cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Summary Ribbon ── */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--color-neutral)]/50 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Total SJ */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] font-mono">
              <span className="text-[var(--color-secondary)] text-[11px]">Total:</span>
              <span className="font-bold text-[var(--color-primary)]">
                {formatNumber(batchInfo?.totalSj || 0)} SJ
              </span>
            </div>

            {/* Udara */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 font-mono">
              <span className="text-[11px]">✈️ Air:</span>
              <span className="font-bold">{formatNumber(batchInfo?.sjUdara || 0)} SJ</span>
              <span className="text-[10px] text-[var(--color-secondary)]">
                ({formatNumber(batchInfo?.packUdara || 0)} coly • {(batchInfo?.weightUdara || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg)
              </span>
            </div>

            {/* Laut */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
              <span className="text-[11px]">🚢 Sea:</span>
              <span className="font-bold">{formatNumber(batchInfo?.sjLaut || 0)} SJ</span>
              <span className="text-[10px] text-[var(--color-secondary)]">
                ({formatNumber(batchInfo?.packLaut || 0)} coly • {(batchInfo?.weightLaut || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg)
              </span>
            </div>

            {/* Fisik Total */}
            <div className="hidden md:flex items-center gap-1.5 text-[var(--color-secondary)] font-mono text-[11px]">
              <span>Koli: <b>{formatNumber(batchInfo?.totalPack || 0)}</b></span>
              <span>•</span>
              <span>Berat: <b>{(batchInfo?.totalWeight || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</b></span>
            </div>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0}
            className="gap-1.5 text-xs h-8"
          >
            <Download size={13} />
            <span>Ekspor Excel</span>
          </Button>
        </div>

        {/* ── Toolbar: Search & Quick Filters ── */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2.5 bg-[var(--color-surface)]">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <input
              type="text"
              placeholder="Cari No. SJ, Customer, Marking, Supir, Mobil..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-primary)] placeholder-[var(--color-secondary)] focus:outline-none focus:ring-1 focus:ring-sky-500/40"
            />
            <Search className="w-3.5 h-3.5 text-[var(--color-secondary)] absolute left-2.5 top-2 pointer-events-none" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Moda & Branch Pills */}
          <div className="flex flex-wrap items-center gap-2">
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

            {(search || selectedModa !== 'all' || selectedBranch !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedModa('all')
                  setSelectedBranch('all')
                }}
                className="text-xs text-[var(--color-secondary)] hover:text-sky-500 flex items-center gap-1 px-1.5 py-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Modal Body: Grouped List ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-16 w-full skeleton-shimmer rounded-xl" />
              <div className="h-32 w-full skeleton-shimmer rounded-xl" />
              <div className="h-32 w-full skeleton-shimmer rounded-xl" />
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
              <p className="font-medium text-sm">Tidak ada Surat Jalan yang cocok dengan filter aktif.</p>
              <p className="text-[11px]">Coba bersihkan pencarian atau pilih moda/cabang lain.</p>
            </div>
          ) : (
            groupedData.map((modaGroup) => (
              <div
                key={modaGroup.moda}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden"
              >
                {/* ── Moda Header Banner ── */}
                <div
                  className={cn(
                    "px-4 py-2.5 border-b border-[var(--color-border)] flex items-center justify-between",
                    modaGroup.moda === 'Udara'
                      ? "bg-sky-500/10 text-sky-800 dark:text-sky-200"
                      : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{modaGroup.moda === 'Udara' ? '✈️' : '🚢'}</span>
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
                  <div className="text-[11px] font-mono opacity-80 flex items-center gap-2">
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
                      <div key={branch.branchName} className="p-3 sm:p-4 space-y-2.5">
                        {/* Branch Title & Toggle */}
                        <div
                          onClick={() => toggleCollapse(collapseKey)}
                          className="flex items-center justify-between cursor-pointer select-none group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition">
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-[var(--color-secondary)]" />
                              <span className="font-bold text-xs text-[var(--color-primary)] font-[var(--font-display)]">
                                {branch.branchName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-mono font-semibold bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                                {branch.branchCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                {branch.totalSj} SJ
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                {branch.markings.length} Marking
                              </span>
                            </div>
                          </div>
                          <div className="text-[11px] text-[var(--color-secondary)] font-mono flex items-center gap-2">
                            <span>{formatNumber(branch.totalPack)} coly</span>
                            <span>•</span>
                            <span>{branch.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                          </div>
                        </div>

                        {/* Branch Table */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/30">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/70 text-[var(--color-secondary)] font-medium">
                                  <th className="py-2 px-2.5 text-center w-10">No</th>
                                  <th className="py-2 px-2.5">No. Surat Jalan</th>
                                  <th className="py-2 px-2.5">Customer & Resi / Alamat</th>
                                  <th className="py-2 px-2.5">Armada & Supir</th>
                                  <th className="py-2 px-2.5 text-right">Koli / Coly</th>
                                  <th className="py-2 px-2.5 text-right">Berat (Kg)</th>
                                  <th className="py-2 px-2.5 text-center">List Code</th>
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
                                        className="bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/80 border-t-2 border-b border-[var(--color-border)] cursor-pointer select-none transition-colors"
                                      >
                                        <td colSpan={7} className="py-2 px-3">
                                          <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[var(--color-secondary)]">
                                                {isMarkingCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                              </span>
                                              <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                                <Tag size={11} className="shrink-0 text-amber-500" />
                                                <span>{marking.markingCode}</span>
                                              </span>
                                              <span
                                                className="font-semibold text-xs text-[var(--color-primary)] truncate max-w-[260px]"
                                                title={marking.custName}
                                              >
                                                {marking.custName}
                                              </span>
                                              {marking.custCode && (
                                                <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                                                  ({marking.custCode})
                                                </span>
                                              )}
                                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                                {marking.totalSj} SJ
                                              </span>
                                            </div>
                                            <div className="text-[11px] font-mono text-[var(--color-secondary)] flex items-center gap-2">
                                              <span>{formatNumber(marking.totalPack)} coly</span>
                                              <span>•</span>
                                              <span>{marking.totalWeight.toLocaleString('id-ID', { maximumFractionDigits: 1 })} kg</span>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Rows of SJ under this marking */}
                                      {!isMarkingCollapsed &&
                                        marking.items.map((item, itemIdx) => (
                                          <tr
                                            key={item.fdSJNo}
                                            className="hover:bg-[var(--color-neutral)]/60 transition-colors"
                                          >
                                            <td className="py-2 px-2.5 text-center text-[var(--color-secondary)] font-mono text-[10px]">
                                              {itemIdx + 1}
                                            </td>
                                            <td className="py-2 px-2.5 font-mono font-bold text-[var(--color-primary)]">
                                              <span>{item.fdSJNo}</span>
                                              <span className="block text-[9.5px] text-[var(--color-secondary)] font-normal">
                                                {item.fdSJDate}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 max-w-[240px]">
                                              <div className="font-semibold text-[var(--color-primary)] truncate" title={item.fdCustName}>
                                                {item.fdCustName}
                                              </div>
                                              {item.fdMarkingNo && (
                                                <div className="text-[10px] text-[var(--color-secondary)] font-mono truncate">
                                                  No/Resi: <span className="font-semibold text-[var(--color-primary)]">{item.fdMarkingNo}</span>
                                                </div>
                                              )}
                                              {(item.fdAddr || item.fdCity) && (
                                                <div className="text-[9.5px] text-[var(--color-secondary)] truncate" title={`${item.fdAddr} ${item.fdCity}`}>
                                                  {[item.fdAddr, item.fdCity].filter(Boolean).join(', ')}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-[var(--color-secondary)]">
                                              <div className="flex items-center gap-1 font-mono text-[10.5px] text-[var(--color-primary)]">
                                                <Truck size={11} className="shrink-0 text-sky-500" />
                                                <span>{item.fdCarID}</span>
                                              </div>
                                              <div className="text-[10px] truncate" title={item.fdSupir}>
                                                {item.fdSupir}
                                              </div>
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-mono text-[var(--color-primary)]">
                                              <span className="font-semibold">{formatNumber(item.fdJmlPackSJ)}</span>
                                              <span className="text-[9.5px] text-[var(--color-secondary)] ml-1">
                                                {item.fdSatuan}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-mono text-[var(--color-primary)] font-medium">
                                              {item.fdJmlBeratSJ.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                                            </td>
                                            <td className="py-2 px-2.5 text-center font-mono text-[10px] text-[var(--color-secondary)]">
                                              {item.fdListCode || '—'}
                                            </td>
                                          </tr>
                                        ))}
                                    </Fragment>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
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
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between text-xs">
          <div className="text-[var(--color-secondary)]">
            Menampilkan <b className="text-[var(--color-primary)]">{filteredItems.length}</b> dari {rawItems.length} total Surat Jalan
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
