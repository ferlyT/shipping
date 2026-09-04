import { useState, useMemo, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  X,
  FileText,
  Search,
  RefreshCw,
  Calendar,
  Ship,
  Plane,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Copy,
  Check,
  Receipt,
  History,
  ArrowRight,
} from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { billingApi } from '../services/billing.service'
import { formatDate, formatCurrency, formatNumber, copyToClipboard, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { useToastStore } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'
import { resolveInvoiceRelation } from '../utils/billing.utils'
import type { CustomerBillingHistoryResponse, CustomerBillingHistoryItem, CustomerBillingHistoryDetail } from '../types/billing.types'

interface CustomerBillingHistoryModalProps {
  isOpen: boolean
  custCode: string | null
  custName?: string | null
  onClose: () => void
}

export function CustomerBillingHistoryModal({
  isOpen,
  custCode,
  custName,
  onClose,
}: CustomerBillingHistoryModalProps) {
  useModalEscape(isOpen, onClose)
  const { addToast } = useToastStore()

  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedModa, setSelectedModa] = useState<'all' | 'air' | 'sea'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'lunas' | 'partial' | 'issued' | 'unpaid' | 'overdue' | 'draft'>('all')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [rowDetails, setRowDetails] = useState<Record<string, CustomerBillingHistoryDetail[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
  const [copiedInvNo, setCopiedInvNo] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customer-billing-history', custCode, selectedYear],
    queryFn: async () => {
      if (!custCode) return null
      const res = await billingApi.customerBillingHistory(custCode, {
        year: selectedYear,
        moda: 'all',
        status: 'all',
        limit: 500,
      })
      return (res.data as { data?: CustomerBillingHistoryResponse })?.data || null
    },
    enabled: isOpen && Boolean(custCode),
    staleTime: 60_000,
  })

  const rawList: CustomerBillingHistoryItem[] = data?.items || []

  // Client-side filtering (Moda, Status, Search by Invoice, Marking Code, Marking No, Nama Comodity) - Instant 0ms response!
  const filteredList = useMemo(() => {
    let list = rawList

    // 1. Filter Moda
    if (selectedModa === 'air') {
      list = list.filter((item) => item.moda === 'Udara')
    } else if (selectedModa === 'sea') {
      list = list.filter((item) => item.moda === 'Laut')
    }

    // 2. Filter Status
    if (selectedStatus === 'lunas') {
      list = list.filter((item) => item.paymentStatus === 'LUNAS')
    } else if (selectedStatus === 'partial') {
      list = list.filter((item) => item.paymentStatus === 'PARTIAL')
    } else if (selectedStatus === 'issued') {
      list = list.filter((item) => item.paymentStatus === 'ISSUED')
    } else if (selectedStatus === 'unpaid') {
      list = list.filter((item) => item.paymentStatus === 'UNPAID')
    } else if (selectedStatus === 'overdue') {
      list = list.filter((item) => item.paymentStatus === 'OVERDUE')
    } else if (selectedStatus === 'draft') {
      list = list.filter((item) => item.paymentStatus === 'DRAFT' || !item.isIssued)
    }

    // 3. Search query: No Invoice, Marking Code, Marking No, List Code, Keterangan, Nama Item (tbBillingDetail.fdItemName)
    if (!search.trim()) return list
    const q = search.toLowerCase().trim()
    return list.filter((item) => {
      const inv = (item.fdInvNo || '').toLowerCase()
      const mark = (item.fdMarkingCode || '').toLowerCase()
      const markNo = (item.fdMarkingNo || '').toLowerCase()
      const listCode = (item.fdListCode || '').toLowerCase()
      const desc = (item.fdDescr || '').toLowerCase()
      const comodities = (item.commodities || []).map((c) => c.toLowerCase())
      const comodityMatch = comodities.some((c) => c.includes(q))
      const detailsMatch = (item.details || []).some(
        (d) =>
          (d.fdItemName || '').toLowerCase().includes(q) ||
          (d.fdComodity || '').toLowerCase().includes(q)
      )
      return (
        inv.includes(q) ||
        mark.includes(q) ||
        markNo.includes(q) ||
        listCode.includes(q) ||
        desc.includes(q) ||
        comodityMatch ||
        detailsMatch
      )
    })
  }, [rawList, selectedModa, selectedStatus, search])

  // Group collapse state (mirip ShipmentTableView)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Pengelompokan Berdasarkan Invoice Induk / Bill Gabungan (mirip groupByTerima di Daftar Resi Shipment)
  const invoiceGroups = useMemo(() => {
    const groupsMap = new Map<string, CustomerBillingHistoryItem[]>()

    for (const item of filteredList) {
      const rel = resolveInvoiceRelation(item.fdInvNo)
      const key = rel.isCombined ? rel.parentInvNo! : item.fdInvNo
      if (!groupsMap.has(key)) {
        groupsMap.set(key, [])
      }
      groupsMap.get(key)!.push(item)
    }

    const groups: {
      groupKey: string
      parentInvNo: string
      isCombinedGroup: boolean
      latestInvDate: string | null
      totalAmount: number
      totalBayar: number
      totalSisa: number
      items: CustomerBillingHistoryItem[]
    }[] = []

    for (const [parentInvNo, items] of groupsMap.entries()) {
      const isCombinedGroup = items.length > 1 || items.some((it) => resolveInvoiceRelation(it.fdInvNo).isCombined)

      // Urutkan item: Bill induk pertama, diikuti sub-bill gabungan A, B, C...
      items.sort((a, b) => {
        const relA = resolveInvoiceRelation(a.fdInvNo)
        const relB = resolveInvoiceRelation(b.fdInvNo)
        if (!relA.isCombined && relB.isCombined) return -1
        if (relA.isCombined && !relB.isCombined) return 1
        return (relA.subCode || '').localeCompare(relB.subCode || '')
      })

      const totalAmount = items.reduce((sum, it) => sum + Number(it.totalAmount || 0), 0)
      const totalBayar = items.reduce((sum, it) => sum + Number(it.totalBayar || 0), 0)
      const totalSisa = items.reduce((sum, it) => sum + Number(it.sisaBayar || 0), 0)
      const latestInvDate = items[0]?.fdInvDate || null

      groups.push({
        groupKey: parentInvNo,
        parentInvNo,
        isCombinedGroup,
        latestInvDate,
        totalAmount,
        totalBayar,
        totalSisa,
        items,
      })
    }

    return groups
  }, [filteredList])

  // Reset page to 1 when filters or search changes
  useEffect(() => {
    setPage(1)
  }, [search, selectedYear, selectedModa, selectedStatus])

  // Pagination calculation based on Groups
  const totalEntries = filteredList.length
  const totalGroupEntries = invoiceGroups.length
  const totalPages = Math.max(1, Math.ceil(totalGroupEntries / pageSize))
  const paginatedGroups = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return invoiceGroups.slice(startIndex, startIndex + pageSize)
  }, [invoiceGroups, page, pageSize])

  // On-demand lazy load when expanding an invoice row
  const toggleExpand = async (invNo: string) => {
    const isCurrentlyExpanded = Boolean(expandedRows[invNo])
    const nextState = !isCurrentlyExpanded
    setExpandedRows((prev) => ({ ...prev, [invNo]: nextState }))

    if (nextState && !rowDetails[invNo]) {
      try {
        setLoadingDetails((prev) => ({ ...prev, [invNo]: true }))
        const res = await billingApi.invoiceDetails(invNo)
        const details = (res.data as { data?: CustomerBillingHistoryDetail[] })?.data || []
        setRowDetails((prev) => ({ ...prev, [invNo]: details }))
      } catch (err) {
        console.error('Failed to fetch invoice details:', err)
        addToast({
          type: 'error',
          message: `Gagal memuat rincian invoice ${invNo}`,
        })
      } finally {
        setLoadingDetails((prev) => ({ ...prev, [invNo]: false }))
      }
    }
  }

  const handleCopy = async (text: string, invNo: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedInvNo(invNo)
      addToast({
        type: 'success',
        message: `No Invoice ${text} berhasil disalin ke clipboard`,
      })
      setTimeout(() => setCopiedInvNo(null), 2000)
    } else {
      addToast({
        type: 'error',
        message: 'Gagal menyalin No Invoice ke clipboard',
      })
    }
  }

  if (!isOpen) return null

  const summary = data?.summary
  const customer = data?.customer

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full h-[100dvh] sm:h-auto max-w-6xl 2xl:max-w-7xl sm:max-h-[92vh] flex flex-col rounded-none sm:rounded-3xl bg-[var(--color-surface)] sm:border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold font-[var(--font-display)] text-[var(--color-primary)] tracking-tight">
                  Riwayat Tagihan / Billing Customer
                </h2>
                {customer?.fdCustCode && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)]">
                    {customer.fdCustCode}
                  </span>
                )}
                {customer?.fdBroker === 1 && (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold">
                    Broker (MKT)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--color-secondary)] truncate mt-0.5">
                {customer?.fdCustName || custName || custCode}
                {customer?.fdSalesNM ? ` · Sales: ${customer.fdSalesNM.trim()}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-xl text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={cn(isFetching && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
              title="Tutup Modal (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SUMMARY KPI CARDS */}
        {summary && (
          <div className="p-3 sm:p-5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Total Invoices */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Total Invoice
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg sm:text-xl font-bold font-mono text-[var(--color-primary)]">
                    {summary.totalInvoices}
                  </span>
                  <span className="text-xs text-[var(--color-secondary)]">Bill</span>
                </div>
                <p className="text-[10px] text-[var(--color-secondary)] mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.lunasCount ?? 0} Lunas</span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{summary.partialCount ?? 0} Sebagian</span>
                  <span>·</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{summary.issuedRecentCount ?? 0} Baru Terbit</span>
                  <span>·</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{summary.unpaidCount ?? 0} Belum Lunas</span>
                  <span>·</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{summary.overdueCount ?? 0} Jatuh Tempo</span>
                </p>
              </div>

              {/* Total Akumulasi Nilai */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Total Tagihan
                </p>
                <p className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                  {formatCurrency(summary.totalAmountIdr)}
                </p>
                <p className="text-[10px] text-[var(--color-secondary)] mt-0.5">
                  Akumulasi nominal invoice
                </p>
              </div>

              {/* Moda Transport */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Moda Pengiriman
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                    <Ship size={13} /> {summary.totalSeaInvoices} Laut
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400">
                    <Plane size={13} /> {summary.totalAirInvoices} Udara
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-secondary)] mt-0.5">
                  Distribusi moda invoice
                </p>
              </div>

              {/* Periode Invoice */}
              <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Tagihan Terakhir
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs font-bold text-[var(--color-primary)]">
                  <Calendar size={13} className="text-blue-500 shrink-0" />
                  <span className="truncate">
                    {summary.latestInvoiceDate ? formatDate(summary.latestInvoiceDate) : '—'}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-secondary)] mt-0.5 truncate">
                  Awal: {summary.earliestInvoiceDate ? formatDate(summary.earliestInvoiceDate) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & SEARCH BAR */}
        <div className="p-3 sm:px-6 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari No Invoice, Marking, Keterangan, atau Nama Item (cth: BATTERY)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Filter Tahun */}
            {summary?.yearsAvailable && summary.yearsAvailable.length > 0 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Tahun</option>
                {summary.yearsAvailable.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            )}

            {/* Filter Moda */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)]">
              <button
                type="button"
                onClick={() => setSelectedModa('all')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                  selectedModa === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('sea')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedModa === 'sea'
                    ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Ship size={12} /> Laut
              </button>
              <button
                type="button"
                onClick={() => setSelectedModa('air')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedModa === 'air'
                    ? 'bg-[var(--color-surface)] text-violet-600 dark:text-violet-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Plane size={12} /> Udara
              </button>
            </div>

            {/* Filter Status */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)] flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                  selectedStatus === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('lunas')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedStatus === 'lunas'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <CheckCircle2 size={11} /> Lunas
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('partial')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedStatus === 'partial'
                    ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Clock size={11} /> Sebagian
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('issued')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedStatus === 'issued'
                    ? 'bg-[var(--color-surface)] text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Clock size={11} /> Baru Terbit
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('unpaid')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedStatus === 'unpaid'
                    ? 'bg-[var(--color-surface)] text-sky-600 dark:text-sky-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <Clock size={11} /> Belum Lunas
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('overdue')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedStatus === 'overdue'
                    ? 'bg-[var(--color-surface)] text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                <AlertTriangle size={11} /> Jatuh Tempo
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('draft')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                  selectedStatus === 'draft'
                    ? 'bg-[var(--color-surface)] text-slate-700 dark:text-slate-300 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
              >
                Draft
              </button>
            </div>
          </div>
        </div>

        {/* MODAL BODY (TABLE) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3 animate-fadeIn">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-36 rounded skeleton-shimmer" />
                    <div className="h-4 w-20 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="h-8 rounded-lg skeleton-shimmer" />
                    <div className="h-8 rounded-lg skeleton-shimmer" />
                    <div className="h-8 rounded-lg skeleton-shimmer" />
                    <div className="h-8 rounded-lg skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt className="w-10 h-10 text-[var(--color-secondary)]/50 mx-auto" />
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                Tidak ada data riwayat tagihan
              </p>
              <p className="text-xs text-[var(--color-secondary)] max-w-sm mx-auto">
                {search
                  ? `Tidak ada invoice yang cocok dengan pencarian "${search}".`
                  : 'Customer ini belum memiliki catatan invoice pada filter terpilih.'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs font-sans border-collapse">
                  <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)] tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3 w-10 text-center">#</th>
                      <th className="px-3.5 py-3">No Invoice & Keterangan</th>
                      <th className="px-3.5 py-3">Tgl Invoice</th>
                      <th className="px-3.5 py-3">Marking & List Code</th>
                      <th className="px-3.5 py-3 text-center">Moda</th>
                      <th className="px-3.5 py-3 text-right">Total Tagihan</th>
                      <th className="px-3.5 py-3 text-center">Status Bill</th>
                      <th className="px-3.5 py-3">Pembuat Bill</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {paginatedGroups.map((group, groupIdx) => {
                      const isGroupCollapsed = collapsedGroups.has(group.groupKey)

                      return (
                        <Fragment key={group.groupKey}>
                          {/* GROUP HEADER ROW (MIRIP DAFTAR RESI SHIPMENT) */}
                          <tr
                            onClick={() => toggleGroupCollapse(group.groupKey)}
                            className="bg-[var(--color-neutral)] hover:opacity-95 transition-colors cursor-pointer border-t-2 border-[var(--color-border)] select-none group"
                          >
                            <td colSpan={8} className="px-3.5 sm:px-5 py-2.5">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                {/* Left: Collapse toggle + Ref Induk info + Badges */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
                                  <button
                                    type="button"
                                    className="p-1 rounded-md text-[var(--color-secondary)] group-hover:text-[var(--color-text)] transition-colors cursor-pointer"
                                    title={isGroupCollapsed ? 'Buka grup' : 'Tutup grup'}
                                  >
                                    {isGroupCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                  </button>

                                  {/* Nomor Invoice Induk Pill */}
                                  <div className="inline-flex items-center gap-1.5 bg-[var(--color-surface)] px-2.5 py-0.5 rounded-lg border border-[var(--color-border)] shadow-2xs text-xs shrink-0 font-medium">
                                    <Receipt size={12} className="text-[var(--color-primary)] shrink-0" />
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)]">Ref Induk:</span>
                                    <Link
                                      to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(group.parentInvNo))}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                      title={`Buka Validasi Invoice ${group.parentInvNo} di Tab Baru`}
                                    >
                                      <span>{group.parentInvNo}</span>
                                      <ExternalLink size={10} className="opacity-70" />
                                    </Link>
                                  </div>

                                  {/* Tanggal Invoice */}
                                  {group.latestInvDate && (
                                    <span className="text-xs text-[var(--color-secondary)] font-medium">
                                      {formatDate(group.latestInvDate)}
                                    </span>
                                  )}

                                  {/* Combined Tag */}
                                  {group.isCombinedGroup ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                      <Layers size={11} /> {group.items.length} bill (gabungan)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-[var(--color-secondary)] bg-[var(--color-neutral)] border border-[var(--color-border)]/60 shrink-0">
                                      Single Bill
                                    </span>
                                  )}
                                </div>

                                {/* Right: Aggregate totals for this Invoice Group */}
                                <div className="flex items-center gap-3 sm:gap-4 text-xs text-[var(--color-secondary)] shrink-0 font-mono">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[var(--color-secondary)]">Total:</span>
                                    <strong className="text-[var(--color-primary)] font-semibold tabular-nums">
                                      {formatCurrency(group.totalAmount)}
                                    </strong>
                                  </div>
                                  {group.totalBayar > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[var(--color-secondary)]">Bayar:</span>
                                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                                        {formatCurrency(group.totalBayar)}
                                      </strong>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[var(--color-secondary)]">Sisa:</span>
                                    <strong className={group.totalSisa > 0 ? "text-rose-600 dark:text-rose-400 font-semibold tabular-nums" : "text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums"}>
                                      {formatCurrency(group.totalSisa)}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* CHILD INVOICE ROWS */}
                          {!isGroupCollapsed &&
                            group.items.map((item, itemIdx) => {
                              const isExpanded = Boolean(expandedRows[item.fdInvNo])
                              const rel = resolveInvoiceRelation(item.fdInvNo)

                              return (
                                <Fragment key={item.fdInvNo}>
                                  <tr
                                    className={cn(
                                      'hover:bg-[var(--color-neutral)]/50 transition-colors group bg-[var(--color-surface)]',
                                      isExpanded && 'bg-[var(--color-neutral)]/30',
                                      rel.isCombined && 'bg-purple-500/[0.02] border-l-2 border-l-purple-500'
                                    )}
                                  >
                                    {/* No / Indentasi */}
                                    <td className="px-3.5 py-3 text-center font-mono text-[var(--color-secondary)]">
                                      {group.isCombinedGroup ? (
                                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                          {itemIdx + 1}
                                        </span>
                                      ) : (
                                        (page - 1) * pageSize + groupIdx + 1
                                      )}
                                    </td>

                                    {/* No Invoice */}
                                    <td className="px-3.5 py-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <Link
                                            to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(rel.targetInvNo))}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cn(
                                              'font-mono font-bold hover:underline inline-flex items-center gap-1',
                                              rel.isCombined
                                                ? 'text-purple-600 dark:text-purple-400 hover:text-purple-700'
                                                : 'text-blue-600 dark:text-blue-400 hover:text-blue-700'
                                            )}
                                            title={
                                              rel.isCombined
                                                ? `Bill Gabungan ${item.fdInvNo} (Buka Validasi Invoice Induk ${rel.parentInvNo} di Tab Baru)`
                                                : `Buka Detail Validasi Invoice ${item.fdInvNo} di Tab Baru`
                                            }
                                          >
                                            <span>{item.fdInvNo}</span>
                                            <ExternalLink size={11} className="opacity-70" />
                                          </Link>

                                          {rel.isCombined ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded shadow-2xs">
                                              <Layers size={10} /> Gabungan ({rel.subCode})
                                            </span>
                                          ) : group.isCombinedGroup ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded shadow-2xs">
                                              <Receipt size={10} /> Bill Induk
                                            </span>
                                          ) : null}

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleCopy(item.fdInvNo, item.fdInvNo)
                                            }}
                                            className="p-1 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-all cursor-pointer inline-flex items-center justify-center"
                                            title="Salin No Invoice ke Clipboard"
                                          >
                                            {copiedInvNo === item.fdInvNo ? (
                                              <Check size={13} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                            ) : (
                                              <Copy size={13} />
                                            )}
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => toggleExpand(item.fdInvNo)}
                                            className="p-0.5 px-1.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px] font-medium border border-[var(--color-border)]/60"
                                            title={isExpanded ? 'Sembunyikan Rincian Item' : 'Lihat Rincian Item'}
                                          >
                                            {loadingDetails[item.fdInvNo] ? (
                                              <span className="w-2.5 h-2.5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                            ) : isExpanded ? (
                                              <ChevronUp size={11} />
                                            ) : (
                                              <ChevronDown size={11} />
                                            )}
                                            <span>{rowDetails[item.fdInvNo] ? `${rowDetails[item.fdInvNo].length} item` : 'Rincian'}</span>
                                          </button>
                                        </div>

                                        {item.fdDescr && (
                                          <p className="text-[11px] text-[var(--color-secondary)] truncate max-w-[240px]">
                                            {item.fdDescr}
                                          </p>
                                        )}

                                        {item.commodities && item.commodities.length > 0 && (
                                          <div className="flex items-center gap-1 flex-wrap mt-0.5 max-w-[320px]">
                                            {item.commodities.slice(0, 2).map((c, i) => (
                                              <span
                                                key={i}
                                                className={cn(
                                                  'text-[10px] px-1.5 py-0.2 rounded border truncate max-w-[220px]',
                                                  search && c.toLowerCase().includes(search.toLowerCase().trim())
                                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold'
                                                    : 'bg-[var(--color-neutral)] text-[var(--color-secondary)] border-[var(--color-border)]'
                                                )}
                                                title={c}
                                              >
                                                {c}
                                              </span>
                                            ))}
                                            {item.commodities.length > 2 && (
                                              <span className="text-[10px] text-[var(--color-secondary)] font-medium">
                                                +{item.commodities.length - 2} item
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Tgl Invoice */}
                                    <td className="px-3.5 py-3 text-[var(--color-secondary)] font-medium whitespace-nowrap">
                                      {item.fdInvDate ? formatDate(item.fdInvDate) : '—'}
                                    </td>

                                    {/* Marking & List Code */}
                                    <td className="px-3.5 py-3 font-mono">
                                      <div className="font-semibold text-[var(--color-primary)]">
                                        {item.fdMarkingCode || '—'}
                                        {item.fdMarkingNo ? ` (${item.fdMarkingNo})` : ''}
                                      </div>
                                      {item.fdListCode && (
                                        <span className="text-[10px] text-[var(--color-secondary)]">
                                          LC: {item.fdListCode}
                                        </span>
                                      )}
                                    </td>

                                    {/* Moda */}
                                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                      {item.moda === 'Udara' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                          <Plane size={11} /> UDARA
                                        </span>
                                      ) : item.moda === 'Laut' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                          <Ship size={11} /> LAUT
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Total Tagihan */}
                                    <td className="px-3.5 py-3 text-right font-mono">
                                      <div className="font-bold text-[var(--color-primary)] text-xs">
                                        {formatCurrency(item.totalAmount)}
                                      </div>
                                      {item.sisaBayar > 0 && item.totalBayar > 0 && (
                                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                          Sisa: {formatCurrency(item.sisaBayar)}
                                        </div>
                                      )}
                                    </td>

                                    {/* Status Bill (tbBillingTotal / fdGive) */}
                                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                                      <Badge
                                        variant={
                                          item.paymentStatus === 'LUNAS'
                                            ? 'success'
                                            : item.paymentStatus === 'PARTIAL'
                                            ? 'warning'
                                            : item.paymentStatus === 'OVERDUE'
                                            ? 'danger'
                                            : item.paymentStatus === 'DRAFT'
                                            ? 'default'
                                            : 'info'
                                        }
                                        className="text-[10px] px-1.5 py-0 font-bold inline-flex items-center gap-1"
                                      >
                                        {item.paymentStatus === 'LUNAS' && <CheckCircle2 size={10} />}
                                        {(item.paymentStatus === 'PARTIAL' || item.paymentStatus === 'ISSUED' || item.paymentStatus === 'UNPAID' || item.paymentStatus === 'DRAFT') && <Clock size={10} />}
                                        {item.paymentStatus === 'OVERDUE' && <AlertTriangle size={10} />}
                                        {item.paymentStatus === 'LUNAS'
                                          ? 'Lunas'
                                          : item.paymentStatus === 'PARTIAL'
                                          ? 'Sebagian'
                                          : item.paymentStatus === 'ISSUED'
                                          ? 'Baru Terbit'
                                          : item.paymentStatus === 'OVERDUE'
                                          ? 'Jatuh Tempo'
                                          : item.paymentStatus === 'DRAFT'
                                          ? 'Draft'
                                          : 'Belum Lunas'}
                                      </Badge>
                                    </td>

                                    {/* Pembuat Bill */}
                                    <td className="px-3.5 py-3 text-[var(--color-secondary)]">
                                      <div className="font-medium text-[var(--color-primary)] truncate max-w-[120px]">
                                        {item.empName || item.fdEmpCode || '—'}
                                      </div>
                                      {item.empName && item.fdEmpCode && (
                                        <div className="text-[10px] font-mono text-[var(--color-secondary)]">
                                          {item.fdEmpCode}
                                        </div>
                                      )}
                                    </td>
                                  </tr>

                                  {/* EXPANDED ITEM DETAILS ROW (ON-DEMAND LAZY LOADED) */}
                                  {isExpanded && (
                                    <tr className="bg-[var(--color-neutral)]/40">
                                      <td colSpan={8} className="p-3 sm:px-6 sm:py-3.5">
                                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2.5">
                                          {(() => {
                                            const details = rowDetails[item.fdInvNo] || []
                                            const adjustedItemsCount = details.filter((d) => d.hasAdjustment).length

                                            return (
                                              <>
                                                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-2 flex-wrap gap-2">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="flex items-center gap-1.5">
                                                      <Layers size={14} className="text-purple-600" />
                                                      Rincian Item Invoice {loadingDetails[item.fdInvNo] ? '(Memuat...)' : details.length ? `(${details.length} Baris)` : item.detailsCount ? `(${item.detailsCount} Baris)` : ''}
                                                    </span>
                                                    {!loadingDetails[item.fdInvNo] && details.length > 0 && (
                                                      adjustedItemsCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-2xs">
                                                          <History size={11} className="text-amber-600 dark:text-amber-400" />
                                                          {adjustedItemsCount} Item Terdeteksi Penyesuaian (Adjusted vs Prev)
                                                        </span>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full">
                                                          <Check size={11} className="text-emerald-500" />
                                                          Sesuai Data Original
                                                        </span>
                                                      )
                                                    )}
                                                  </div>
                                                  <span className="font-mono text-[var(--color-secondary)]">
                                                    Total: {formatCurrency(item.totalAmount)}
                                                  </span>
                                                </div>

                                                {/* Rincian Status Pembayaran tbBillingTotal */}
                                                {item.totals && item.totals.length > 0 && (
                                                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-[var(--color-neutral)]/60 px-3 py-2 rounded-lg border border-[var(--color-border)]/60">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Status Pembayaran:</span>
                                                      <Badge
                                                        variant={
                                                          item.paymentStatus === 'LUNAS'
                                                            ? 'success'
                                                            : item.paymentStatus === 'PARTIAL'
                                                            ? 'warning'
                                                            : item.paymentStatus === 'OVERDUE'
                                                            ? 'danger'
                                                            : item.paymentStatus === 'DRAFT'
                                                            ? 'default'
                                                            : 'info'
                                                        }
                                                        className="text-[10px] px-1.5 py-0 font-bold inline-flex items-center gap-1"
                                                      >
                                                        {item.paymentStatus === 'LUNAS' && <CheckCircle2 size={10} />}
                                                        {(item.paymentStatus === 'PARTIAL' || item.paymentStatus === 'ISSUED' || item.paymentStatus === 'UNPAID' || item.paymentStatus === 'DRAFT') && <Clock size={10} />}
                                                        {item.paymentStatus === 'OVERDUE' && <AlertTriangle size={10} />}
                                                        {item.paymentStatus === 'LUNAS'
                                                          ? 'Lunas'
                                                          : item.paymentStatus === 'PARTIAL'
                                                          ? 'Sebagian Lunas (Partial Paid)'
                                                          : item.paymentStatus === 'ISSUED'
                                                          ? `Baru Terbit (< 7 Hari - ${item.ageDays} Hari)`
                                                          : item.paymentStatus === 'OVERDUE'
                                                          ? `Jatuh Tempo (> 30 Hari - ${item.ageDays} Hari)`
                                                          : item.paymentStatus === 'DRAFT'
                                                          ? 'Draft (Konsep Invoice)'
                                                          : `Belum Lunas (${item.ageDays} Hari)`}
                                                      </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 font-mono text-xs">
                                                      <span>Total: <strong>{formatCurrency(item.totalAmount)}</strong></span>
                                                      <span>Terbayar: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(item.totalBayar)}</strong></span>
                                                      <span>Sisa: <strong className={item.sisaBayar > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{formatCurrency(item.sisaBayar)}</strong></span>
                                                    </div>
                                                  </div>
                                                )}

                                                {loadingDetails[item.fdInvNo] ? (
                                                  <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-[var(--color-secondary)]">
                                                    <span className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                                    <span className="animate-pulse">Memuat rincian item invoice & komparasi audit...</span>
                                                  </div>
                                                ) : details.length === 0 ? (
                                                  <p className="text-xs text-[var(--color-secondary)] italic py-2 text-center">
                                                    Tidak ada rincian baris item untuk invoice ini
                                                  </p>
                                                ) : (
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                      <thead className="text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]/60">
                                                        <tr>
                                                          <th className="py-1 px-1.5 text-center w-8">#</th>
                                                          <th className="py-1 text-left">Nama Item / Deskripsi</th>
                                                          <th className="py-1 text-center">List Code</th>
                                                          <th className="py-1 text-right">Qty</th>
                                                          <th className="py-1 text-right">Harga Satuan</th>
                                                          <th className="py-1 text-right">Jumlah Total</th>
                                                          <th className="py-1 text-center w-28">Status Audit</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-[var(--color-border)]/40 font-mono">
                                                        {details.map((d, dIdx) => {
                                                          const isItemNameChanged = Boolean(d.prevItemName && d.prevItemName.trim() !== (d.fdItemName || '').trim())
                                                          const isQtyChanged = Boolean(d.prevQty !== null && d.prevQty !== undefined && d.fdQty !== null && d.fdQty !== undefined && Number(d.prevQty) !== Number(d.fdQty))
                                                          const isPriceChanged = Boolean(d.prevItemPrice !== null && d.prevItemPrice !== undefined && d.fdItemPrice !== null && d.fdItemPrice !== undefined && Number(d.prevItemPrice) !== Number(d.fdItemPrice))
                                                          const isTotalChanged = Boolean(d.prevTotal !== null && d.prevTotal !== undefined && d.fdTotal !== null && d.fdTotal !== undefined && Number(d.prevTotal) !== Number(d.fdTotal))

                                                          return (
                                                            <tr
                                                              key={d.fdID || dIdx}
                                                              className={cn(
                                                                'hover:bg-[var(--color-neutral)]/50 transition-colors',
                                                                d.hasAdjustment && 'bg-amber-500/[0.04] dark:bg-amber-500/[0.06]'
                                                              )}
                                                            >
                                                              {/* Index / ID */}
                                                              <td className="py-2 px-1.5 text-center text-[10px] text-[var(--color-secondary)]">
                                                                {d.fdID || dIdx + 1}
                                                              </td>

                                                              {/* Nama Item / Deskripsi */}
                                                              <td className="py-2 font-sans">
                                                                {isItemNameChanged ? (
                                                                  <div className="space-y-0.5">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                      <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                                        {d.prevItemName}
                                                                      </span>
                                                                      <ArrowRight className="w-3 h-3 text-[var(--color-secondary)] shrink-0" />
                                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                                                                        {d.fdItemName}
                                                                      </span>
                                                                    </div>
                                                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider block">
                                                                      Deskripsi Diubah
                                                                    </span>
                                                                  </div>
                                                                ) : (
                                                                  <span className="font-medium text-[var(--color-primary)]">
                                                                    {d.fdItemName || d.fdComodity || 'Item Tagihan'}
                                                                  </span>
                                                                )}
                                                              </td>

                                                              {/* List Code */}
                                                              <td className="py-2 text-center text-[var(--color-secondary)]">
                                                                {d.fdListCode || '—'}
                                                              </td>

                                                              {/* Qty */}
                                                              <td className="py-2 text-right">
                                                                {isQtyChanged ? (
                                                                  <div className="flex flex-col items-end gap-0.5">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                      <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">{formatNumber(d.prevQty || 0)}</span>
                                                                      <ArrowRight className="w-2.5 h-2.5 text-[var(--color-secondary)]" />
                                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(d.fdQty || 0)}</span>
                                                                    </div>
                                                                    <span className="text-[8px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Qty Diubah</span>
                                                                  </div>
                                                                ) : (
                                                                  <span className="text-[var(--color-primary)]">
                                                                    {d.fdQty !== null ? formatNumber(d.fdQty) : '—'}
                                                                  </span>
                                                                )}
                                                              </td>

                                                              {/* Harga Satuan */}
                                                              <td className="py-2 text-right">
                                                                {isPriceChanged ? (
                                                                  <div className="flex flex-col items-end gap-0.5">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                      <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">{formatCurrency(d.prevItemPrice || 0)}</span>
                                                                      <ArrowRight className="w-2.5 h-2.5 text-[var(--color-secondary)]" />
                                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(d.fdItemPrice || 0)}</span>
                                                                    </div>
                                                                    <span className="text-[8px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Tarif Diadjust</span>
                                                                  </div>
                                                                ) : (
                                                                  <span className="text-[var(--color-secondary)]">
                                                                    {d.fdItemPrice !== null ? formatCurrency(d.fdItemPrice) : '—'}
                                                                  </span>
                                                                )}
                                                              </td>

                                                              {/* Jumlah Total */}
                                                              <td className="py-2 text-right">
                                                                {isTotalChanged ? (
                                                                  <div className="flex flex-col items-end gap-0.5">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                      <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">{formatCurrency(d.prevTotal || 0)}</span>
                                                                      <ArrowRight className="w-2.5 h-2.5 text-[var(--color-secondary)]" />
                                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{formatCurrency(d.fdTotal || 0)}</span>
                                                                    </div>
                                                                    {d.fdTotal !== null && d.prevTotal !== null && (
                                                                      <span className="text-[8px] font-semibold">
                                                                        {Number(d.fdTotal) > Number(d.prevTotal) ? (
                                                                          <span className="text-emerald-600 dark:text-emerald-400">+{formatCurrency(Number(d.fdTotal) - Number(d.prevTotal))}</span>
                                                                        ) : (
                                                                          <span className="text-rose-600 dark:text-rose-400">-{formatCurrency(Number(d.prevTotal) - Number(d.fdTotal))}</span>
                                                                        )}
                                                                     </span>
                                                                    )}
                                                                  </div>
                                                                ) : (
                                                                  <span className="font-bold text-[var(--color-primary)]">
                                                                    {d.fdTotal !== null ? formatCurrency(d.fdTotal) : '—'}
                                                                  </span>
                                                                )}
                                                              </td>

                                                              {/* Status Audit Badge */}
                                                              <td className="py-2 text-center">
                                                                {d.hasAdjustment ? (
                                                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-2xs">
                                                                    <History size={10} /> Adjusted
                                                                  </span>
                                                                ) : (
                                                                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 dark:text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded-full">
                                                                    Original
                                                                  </span>
                                                                )}
                                                              </td>
                                                            </tr>
                                                          )
                                                        })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                )}
                                              </>
                                            )
                                          })()}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER WITH PAGINATION */}
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-[var(--color-secondary)]">
              Menampilkan {totalGroupEntries > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalGroupEntries)} dari {totalGroupEntries} paket invoice ({totalEntries} total bill)
              {summary?.totalInvoices && summary.totalInvoices !== totalEntries ? ` (filter dari total ${summary.totalInvoices})` : ''}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-secondary)]">
              <span>Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              total={totalGroupEntries}
              limit={pageSize}
            />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-neutral)] hover:bg-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
