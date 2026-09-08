import { useState, useMemo, useEffect, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  X,
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
  ArrowRight,
  MapPin,
  Tag,
  Sparkles,
  DollarSign,
  TrendingDown,
  TrendingUp,
  BarChart3,
} from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import { billingApi } from '../services/billing.service'
import { formatDate, formatCurrency, formatNumber, copyToClipboard, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { useToastStore } from '@/stores/toastStore'
import { ROUTES } from '@/lib/constants'
import { resolveInvoiceRelation, resolveBranchCode } from '../utils/billing.utils'
import type {
  CustomerBillingHistoryResponse,
  CustomerBillingHistoryItem,
  CustomerBillingHistoryDetail,
} from '../types/billing.types'

interface CustomerBillingHistoryModalProps {
  isOpen: boolean
  custCode: string | null
  custName?: string | null
  onClose: () => void
}

export interface FlatDetailTraceItem {
  id: string
  invNo: string
  invDate: string
  branchCode: string | null
  branchName?: string | null
  tglAgent: string | null
  typeComodityName: string | null
  markingCode: string | null
  markingNo: string | null
  consignee: string | null
  listCode: string | null
  moda: 'Udara' | 'Laut' | 'Unknown'
  paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT'
  empName: string | null
  // Detail properties
  fdID: string
  itemName: string | null
  prevItemName?: string | null
  qty: number | null
  prevQty?: number | null
  price: number | null
  prevPrice?: number | null
  total: number | null
  prevTotal?: number | null
  curr: string | null
  changeStatus: 'UNCHANGED' | 'UPDATE' | 'INSERT' | 'DELETE'
  hasAdjustment: boolean
  diffs?: Record<string, { old: any; new: any }>
}

export function CustomerBillingHistoryModal({
  isOpen,
  custCode,
  custName,
  onClose,
}: CustomerBillingHistoryModalProps) {
  useModalEscape(isOpen, onClose)
  const { addToast } = useToastStore()

  const [viewMode, setViewMode] = useState<'detail' | 'invoice'>('detail')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedTypeComodity, setSelectedTypeComodity] = useState<string>('all')
  const [selectedDiffStatus, setSelectedDiffStatus] = useState<'all' | 'diff' | 'same'>('all')
  const [selectedModa, setSelectedModa] = useState<'all' | 'air' | 'sea'>('all')
  const [selectedStatus, setSelectedStatus] = useState<
    'all' | 'lunas' | 'partial' | 'issued' | 'unpaid' | 'overdue' | 'draft'
  >('all')
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [rowDetails, setRowDetails] = useState<Record<string, CustomerBillingHistoryDetail[]>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})
  const [copiedInvNo, setCopiedInvNo] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [isKpiOpen, setIsKpiOpen] = useState(false)

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

  // Extract unique branches (code & name from tbCabang) for filtering
  const availableBranches = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of rawList) {
      const brCode = resolveBranchCode(item.fdBranchCode, item.fdInvNo, item.fdMarkingCode)
      if (brCode) {
        const brName = item.fdBranchName?.trim() || ''
        if (!map.has(brCode) || (!map.get(brCode) && brName)) {
          map.set(brCode, brName)
        }
      }
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [rawList])

  const availableComodityTypes = useMemo(() => {
    const set = new Set<string>()
    for (const item of rawList) {
      if (item.fdTypeComodityName) set.add(item.fdTypeComodityName.trim())
      if (item.details) {
        for (const d of item.details) {
          if (d.typeComodityName) set.add(d.typeComodityName.trim())
          else if (d.fdComodity) set.add(d.fdComodity.trim())
        }
      }
    }
    return Array.from(set).filter(Boolean).sort()
  }, [rawList])

  // Count invoices & items with diffs vs original
  const diffMetrics = useMemo(() => {
    let diffBillCount = 0
    let sameBillCount = 0
    let totalItemsCount = 0
    let revisedItemsCount = 0

    for (const item of rawList) {
      if (item.hasPrevDiff) diffBillCount++
      else sameBillCount++

      if (item.details && item.details.length > 0) {
        totalItemsCount += item.details.length
        revisedItemsCount += item.details.filter((d) => d.hasAdjustment).length
      } else {
        totalItemsCount += 1
      }
    }
    return { diffBillCount, sameBillCount, totalItemsCount, revisedItemsCount }
  }, [rawList])

  // Client-side filtering (Branch, Type Comodity, Tgl Agent, Diff Status, Moda, Status, Search) - 0ms Instant response
  const filteredList = useMemo(() => {
    let list = rawList

    // 1. Filter Branch
    if (selectedBranch !== 'all') {
      list = list.filter((item) => {
        const br = resolveBranchCode(item.fdBranchCode, item.fdInvNo, item.fdMarkingCode)
        return (br || '').toUpperCase() === selectedBranch.toUpperCase()
      })
    }

    // 2. Filter Tipe Komoditi
    if (selectedTypeComodity !== 'all') {
      list = list.filter((item) => {
        const headerTc = (item.fdTypeComodityName || '').toUpperCase()
        if (headerTc === selectedTypeComodity.toUpperCase()) return true
        return (item.details || []).some((d) => {
          const dTc = (d.typeComodityName || d.fdComodity || '').toUpperCase()
          return dTc === selectedTypeComodity.toUpperCase()
        })
      })
    }

    // 3. Filter Status Perubahan Tarif / Diff Prev
    if (selectedDiffStatus === 'diff') {
      list = list.filter((item) => item.hasPrevDiff)
    } else if (selectedDiffStatus === 'same') {
      list = list.filter((item) => !item.hasPrevDiff)
    }

    // 4. Filter Moda
    if (selectedModa === 'air') {
      list = list.filter((item) => item.moda === 'Udara')
    } else if (selectedModa === 'sea') {
      list = list.filter((item) => item.moda === 'Laut')
    }

    // 5. Filter Status Pembayaran
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

    // 6. Search query: No Invoice, Marking Code, Marking No, Consignee, Branch, Tipe Komoditi, Tgl Agent, List Code, Keterangan, Nama Item
    if (!search.trim()) return list
    const q = search.toLowerCase().trim()
    return list.filter((item) => {
      const inv = (item.fdInvNo || '').toLowerCase()
      const mark = (item.fdMarkingCode || '').toLowerCase()
      const markNo = (item.fdMarkingNo || '').toLowerCase()
      const consignee = (item.fdConsignee || '').toLowerCase()
      const branch = (item.fdBranchCode || '').toLowerCase()
      const typeCom = (item.fdTypeComodityName || '').toLowerCase()
      const listCode = (item.fdListCode || '').toLowerCase()
      const desc = (item.fdDescr || '').toLowerCase()
      const tglAgent = item.fdTglAgent ? formatDate(item.fdTglAgent).toLowerCase() : ''
      const invDate = item.fdInvDate ? formatDate(item.fdInvDate).toLowerCase() : ''
      const comodities = (item.commodities || []).map((c) => c.toLowerCase())
      const comodityMatch = comodities.some((c) => c.includes(q))
      const detailsMatch = (item.details || []).some(
        (d) =>
          (d.fdItemName || '').toLowerCase().includes(q) ||
          (d.fdComodity || '').toLowerCase().includes(q) ||
          String(d.fdItemPrice || '').includes(q)
      )
      return (
        inv.includes(q) ||
        mark.includes(q) ||
        markNo.includes(q) ||
        consignee.includes(q) ||
        branch.includes(q) ||
        typeCom.includes(q) ||
        tglAgent.includes(q) ||
        invDate.includes(q) ||
        listCode.includes(q) ||
        desc.includes(q) ||
        comodityMatch ||
        detailsMatch
      )
    })
  }, [
    rawList,
    selectedBranch,
    selectedTypeComodity,
    selectedDiffStatus,
    selectedModa,
    selectedStatus,
    search,
  ])

  // Flatten detail items for direct Detail-Centric Price Tracing Table View
  const flatDetailItems = useMemo(() => {
    const flat: FlatDetailTraceItem[] = []

    for (const inv of filteredList) {
      const details = inv.details && inv.details.length > 0 ? inv.details : null
      const branchCode = resolveBranchCode(inv.fdBranchCode, inv.fdInvNo, inv.fdMarkingCode)
      const branchName = inv.fdBranchName || null

      if (details) {
        for (const d of details) {
          const itemTypeComodity = d.typeComodityName || d.fdComodity || inv.fdTypeComodityName || 'UMUM'

          flat.push({
            id: `${inv.fdInvNo}_${d.fdID}`,
            invNo: inv.fdInvNo,
            invDate: inv.fdInvDate,
            branchCode,
            branchName,
            tglAgent: inv.fdTglAgent,
            typeComodityName: itemTypeComodity,
            markingCode: inv.fdMarkingCode,
            markingNo: inv.fdMarkingNo,
            consignee: inv.fdConsignee,
            listCode: d.fdListCode || inv.fdListCode,
            moda: inv.moda,
            paymentStatus: inv.paymentStatus,
            empName: inv.empName || inv.fdEmpCode,
            fdID: d.fdID,
            itemName: d.fdItemName || d.fdComodity || inv.fdDescr || 'Item Tagihan',
            prevItemName: d.prevItemName,
            qty: d.fdQty,
            prevQty: d.prevQty,
            price: d.fdItemPrice,
            prevPrice: d.prevItemPrice,
            total: d.fdTotal,
            prevTotal: d.prevTotal,
            curr: d.fdCurr || inv.fdCurr1 || 'IDR',
            changeStatus: d.changeStatus || 'UNCHANGED',
            hasAdjustment: Boolean(d.hasAdjustment),
            diffs: d.diffs,
          })
        }
      } else {
        // Fallback if details array empty
        flat.push({
          id: `${inv.fdInvNo}_01`,
          invNo: inv.fdInvNo,
          invDate: inv.fdInvDate,
          branchCode,
          branchName,
          tglAgent: inv.fdTglAgent,
          typeComodityName: inv.fdTypeComodityName || 'UMUM',
          markingCode: inv.fdMarkingCode,
          markingNo: inv.fdMarkingNo,
          consignee: inv.fdConsignee,
          listCode: inv.fdListCode,
          moda: inv.moda,
          paymentStatus: inv.paymentStatus,
          empName: inv.empName || inv.fdEmpCode,
          fdID: '01',
          itemName: inv.fdDescr || (inv.commodities && inv.commodities[0]) || 'Item Tagihan',
          qty: null,
          price: inv.totalAmount,
          total: inv.totalAmount,
          curr: inv.fdCurr1 || 'IDR',
          changeStatus: 'UNCHANGED',
          hasAdjustment: Boolean(inv.hasPrevDiff),
        })
      }
    }

    return flat
  }, [filteredList])

  // Group collapse state (for invoice mode)
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

  // Pengelompokan Berdasarkan Invoice Induk / Bill Gabungan
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
      latestTglAgent: string | null
      primaryBranch: string | null
      primaryTypeComodity: string | null
      hasAnyDiff: boolean
      totalDiffCount: number
      totalAmount: number
      totalBayar: number
      totalSisa: number
      items: CustomerBillingHistoryItem[]
    }[] = []

    for (const [parentInvNo, items] of groupsMap.entries()) {
      const isCombinedGroup =
        items.length > 1 || items.some((it) => resolveInvoiceRelation(it.fdInvNo).isCombined)

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
      const latestTglAgent = items[0]?.fdTglAgent || null
      const primaryBranch = resolveBranchCode(items[0]?.fdBranchCode, items[0]?.fdInvNo, items[0]?.fdMarkingCode)
      const primaryTypeComodity =
        items[0]?.fdTypeComodityName ||
        items[0]?.details?.[0]?.typeComodityName ||
        items[0]?.details?.[0]?.fdComodity ||
        'UMUM'
      const hasAnyDiff = items.some((it) => it.hasPrevDiff)
      const totalDiffCount = items.reduce((sum, it) => sum + Number(it.prevDiffCount || 0), 0)

      groups.push({
        groupKey: parentInvNo,
        parentInvNo,
        isCombinedGroup,
        latestInvDate,
        latestTglAgent,
        primaryBranch,
        primaryTypeComodity,
        hasAnyDiff,
        totalDiffCount,
        totalAmount,
        totalBayar,
        totalSisa,
        items,
      })
    }

    return groups
  }, [filteredList])

  // Reset page to 1 when filters or view mode changes
  useEffect(() => {
    setPage(1)
  }, [
    viewMode,
    search,
    selectedYear,
    selectedBranch,
    selectedTypeComodity,
    selectedDiffStatus,
    selectedModa,
    selectedStatus,
  ])

  // Pagination calculation
  const totalCount = viewMode === 'detail' ? flatDetailItems.length : invoiceGroups.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const paginatedFlatItems = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return flatDetailItems.slice(startIndex, startIndex + pageSize)
  }, [flatDetailItems, page, pageSize])

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
        className="relative w-full h-[100dvh] sm:h-auto max-w-[96vw] 2xl:max-w-[1600px] sm:max-h-[94vh] flex flex-col rounded-none sm:rounded-3xl bg-[var(--color-surface)] sm:border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <DollarSign size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold font-[var(--font-display)] text-[var(--color-primary)] tracking-tight">
                  Riwayat & Analisis Harga Satuan Tagihan Customer
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

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Toggle: Detail vs Invoice (Desktop) */}
            <div className="hidden md:flex items-center rounded-xl border border-[var(--color-border)] p-0.5 bg-[var(--color-surface)] shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  viewMode === 'detail'
                    ? 'bg-[var(--color-neutral)] text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Tampilan Fokus Baris Detail & Tarif Satuan"
              >
                <DollarSign size={13} />
                <span>Trace Detail Harga</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('invoice')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  viewMode === 'invoice'
                    ? 'bg-[var(--color-neutral)] text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Tampilan Dikelompokkan Per Invoice Induk"
              >
                <Layers size={13} />
                <span>Paket Invoice</span>
              </button>
            </div>

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

        {/* MOBILE VIEW MODE & KPI TOGGLE BAR */}
        <div className="flex md:hidden px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] items-center gap-2 shrink-0">
          <div className="grid grid-cols-2 flex-1 rounded-xl border border-[var(--color-border)] p-1 bg-[var(--color-neutral)] text-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('detail')}
              className={cn(
                'py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                viewMode === 'detail'
                  ? 'bg-[var(--color-surface)] text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-[var(--color-secondary)]'
              )}
            >
              <DollarSign size={13} />
              <span>Trace Detail</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('invoice')}
              className={cn(
                'py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                viewMode === 'invoice'
                  ? 'bg-[var(--color-surface)] text-purple-600 dark:text-purple-400 shadow-2xs'
                  : 'text-[var(--color-secondary)]'
              )}
            >
              <Layers size={13} />
              <span>Paket Invoice</span>
            </button>
          </div>

          {/* Toggle KPI button for mobile */}
          {summary && (
            <button
              type="button"
              onClick={() => setIsKpiOpen(!isKpiOpen)}
              className={cn(
                'px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer',
                isKpiOpen
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400'
                  : 'bg-[var(--color-neutral)] border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
              )}
              title={isKpiOpen ? 'Sembunyikan Ringkasan Metrik' : 'Tampilkan Ringkasan Metrik KPI'}
            >
              <BarChart3 size={13} />
              <span>KPI</span>
              {isKpiOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        {/* SUMMARY KPI CARDS (COLLAPSIBLE ON MOBILE, ALWAYS VISIBLE ON DESKTOP) */}
        {summary && (
          <div
            className={cn(
              'border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30 shrink-0 transition-all duration-200',
              isKpiOpen ? 'block p-2.5 sm:p-5' : 'hidden md:block md:p-4 lg:p-5'
            )}
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {/* Total Invoices & Detail Baris */}
              <div className="p-2 sm:p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider truncate">
                  Total Detail Harga
                </p>
                <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
                  <span className="text-base sm:text-xl font-bold font-mono text-[var(--color-primary)]">
                    {diffMetrics.totalItemsCount}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[var(--color-secondary)]">
                    Item ({summary.totalInvoices} Bill)
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--color-secondary)] mt-0.5 truncate flex items-center gap-1 sm:gap-1.5 flex-wrap">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {summary.lunasCount ?? 0} Lunas
                  </span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {summary.partialCount ?? 0} Sebagian
                  </span>
                  <span>·</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">
                    {summary.unpaidCount ?? 0} Belum Lunas
                  </span>
                </p>
              </div>

              {/* Status Revisi / Audit Tarif (tbBillingDetail vs Prev) */}
              <div className="p-2 sm:p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider flex items-center gap-1 truncate">
                  <Sparkles size={11} className="text-amber-500 shrink-0" />
                  Status Revisi Tarif
                </p>
                <div className="flex items-baseline gap-1.5 mt-0.5 sm:mt-1">
                  <span className="text-base sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {diffMetrics.diffBillCount}
                  </span>
                  <span className="text-[11px] sm:text-xs text-[var(--color-secondary)]">
                    Bill ({diffMetrics.revisedItemsCount} Item)
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--color-secondary)] mt-0.5 truncate">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {diffMetrics.sameBillCount} Bill
                  </span>{' '}
                  sesuai tarif original
                </p>
              </div>

              {/* Total Akumulasi Nilai */}
              <div className="p-2 sm:p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider truncate">
                  Total Nominal Tagihan
                </p>
                <p className="text-xs sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(summary.totalAmountIdr)}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 text-[9px] sm:text-[10px] text-[var(--color-secondary)] font-semibold">
                  <span className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400">
                    <Ship size={10} /> {summary.totalSeaInvoices} Laut
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-400">
                    <Plane size={10} /> {summary.totalAirInvoices} Udara
                  </span>
                </div>
              </div>

              {/* Periode Tagihan */}
              <div className="p-2 sm:p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs">
                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider truncate">
                  Rentang Waktu
                </p>
                <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-bold text-[var(--color-primary)]">
                  <Calendar size={12} className="text-blue-500 shrink-0" />
                  <span className="truncate">
                    {summary.latestInvoiceDate ? formatDate(summary.latestInvoiceDate) : '—'}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--color-secondary)] mt-0.5 truncate">
                  Awal: {summary.earliestInvoiceDate ? formatDate(summary.earliestInvoiceDate) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & SEARCH TOOLBAR */}
        <div className="p-2.5 sm:px-6 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 shrink-0">
          {/* Keyword Search */}
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Branch, Komoditi, Tgl, Nama Barang, Harga..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] placeholder:text-[var(--color-secondary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full text-xs no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-0.5">
              Moda :
            </span>

            {/* 1. Filter Moda (Pills) */}
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

            {/* 2. Filter Cabang / Branch (Dropdown) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-0.5">
                <MapPin size={11} /> Cabang:
              </span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">Semua </option>
                {availableBranches.map((br) => (
                  <option key={br.code} value={br.code}>
                    {br.name ? `${br.code} - ${br.name}` : `Cabang ${br.code}`}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Filter Kategori / Tipe Komoditi (Dropdown) */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-0.5">
                <Tag size={11} /> Kategori:
              </span>
              <select
                value={selectedTypeComodity}
                onChange={(e) => setSelectedTypeComodity(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="all">Semua </option>
                {availableComodityTypes.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Filter Tahun (Dropdown) */}
            {summary?.yearsAvailable && summary.yearsAvailable.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] flex items-center gap-0.5">
                  <Calendar size={11} /> Tahun:
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua </option>
                  {summary.yearsAvailable.map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 5. Filter Status Penyesuaian Tarif (Prev) */}
            <div className="flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-neutral)]">
              <button
                type="button"
                onClick={() => setSelectedDiffStatus('all')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer',
                  selectedDiffStatus === 'all'
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Tampilkan semua data tarif"
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiffStatus('diff')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedDiffStatus === 'diff'
                    ? 'bg-[var(--color-surface)] text-amber-600 dark:text-amber-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Hanya tampilkan yang terdapat perubahan harga vs tbBillingDetailPrev"
              >
                <Sparkles size={11} /> Revisi ({diffMetrics.diffBillCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDiffStatus('same')}
                className={cn(
                  'px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1',
                  selectedDiffStatus === 'same'
                    ? 'bg-[var(--color-surface)] text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                )}
                title="Hanya tampilkan tarif original tanpa revisi"
              >
                <Check size={11} /> Original
              </button>
            </div>

            {/* 6. Filter Status Bayar */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">Semua</option>
              <option value="lunas">Lunas</option>
              <option value="partial">Sebagian (Partial)</option>
              <option value="unpaid">Belum Bayar</option>
              <option value="overdue">Jatuh Tempo</option>
              <option value="issued">Baru Terbit</option>
              <option value="draft">Draft (Konsep)</option>
            </select>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-3 animate-fadeIn">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 shadow-2xs"
                >
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
          ) : totalCount === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Receipt className="w-10 h-10 text-[var(--color-secondary)]/50 mx-auto" />
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                Tidak ada data riwayat harga tagihan
              </p>
              <p className="text-xs text-[var(--color-secondary)] max-w-sm mx-auto">
                {search ||
                  selectedBranch !== 'all' ||
                  selectedTypeComodity !== 'all' ||
                  selectedDiffStatus !== 'all'
                  ? 'Tidak ada baris tarif yang cocok dengan kriteria filter harga & komoditi yang dipilih.'
                  : 'Customer ini belum memiliki catatan riwayat tarif pada sistem.'}
              </p>
            </div>
          ) : viewMode === 'detail' ? (
            /* ========================================================================= */
            /* MODE 1: DETAIL-FIRST PRICE TRACE TABLE (FOKUS UTAMA DETAIL & HARGA SATUAN) */
            /* ========================================================================= */
            <>
              {/* MOBILE CARD VIEW (Resolusi Layar HP < 768px) */}
              <div className="block md:hidden space-y-3">
                {paginatedFlatItems.map((item, idx) => {
                  const isPriceChanged = Boolean(
                    item.prevPrice !== null &&
                    item.prevPrice !== undefined &&
                    item.price !== null &&
                    item.price !== undefined &&
                    Number(item.prevPrice) !== Number(item.price)
                  )
                  const isQtyChanged = Boolean(
                    item.prevQty !== null &&
                    item.prevQty !== undefined &&
                    item.qty !== null &&
                    item.qty !== undefined &&
                    Number(item.prevQty) !== Number(item.qty)
                  )
                  const isItemNameChanged = Boolean(
                    item.prevItemName &&
                    item.prevItemName.trim() !== (item.itemName || '').trim()
                  )
                  const priceDiff =
                    item.price !== null && item.prevPrice !== null
                      ? Number(item.price) - Number(item.prevPrice)
                      : 0

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs space-y-2.5 transition-all',
                        item.hasAdjustment && 'border-amber-500/40 bg-amber-500/[0.02]'
                      )}
                    >
                      {/* Baris 1: Index, Invoice, Action & Cabang/Moda */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-[var(--color-secondary)]">
                              #{(page - 1) * pageSize + idx + 1}
                            </span>
                            <Link
                              to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(item.invNo))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{item.invNo}</span>
                              <ExternalLink size={10} className="opacity-70" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.invNo, item.invNo)}
                              className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] cursor-pointer"
                              title="Salin No Invoice"
                            >
                              {copiedInvNo === item.invNo ? (
                                <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                          {/* Tanggal Agent & Bill */}
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[var(--color-secondary)]">
                            <span>Agent: <strong className="text-[var(--color-primary)]">{item.tglAgent ? formatDate(item.tglAgent) : '—'}</strong></span>
                            <span>•</span>
                            <span>Bill: {item.invDate ? formatDate(item.invDate) : '—'}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            <span
                              className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]"
                              title={item.branchName ? `${item.branchCode} - ${item.branchName}` : undefined}
                            >
                              {item.branchCode || '—'}
                            </span>
                            {item.moda === 'Udara' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                <Plane size={9} /> UDARA
                              </span>
                            ) : item.moda === 'Laut' ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                <Ship size={9} /> LAUT
                              </span>
                            ) : null}
                          </div>
                          {item.paymentStatus && (
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
                              className="text-[8.5px] px-1.5 py-0.2 font-bold inline-flex items-center gap-0.5 uppercase tracking-wider"
                            >
                              {item.paymentStatus}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Marking & Consignee */}
                      {(item.markingCode || item.consignee) && (
                        <div className="px-2.5 py-1.5 rounded-lg bg-[var(--color-neutral)]/60 border border-[var(--color-border)] text-xs flex items-center justify-between gap-2 flex-wrap font-mono">
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-[var(--color-secondary)] mr-1">Marking:</span>
                            <span className="font-bold text-[var(--color-primary)]">
                              {item.markingCode || '—'}{item.markingNo ? ` (${item.markingNo})` : ''}
                            </span>
                          </div>
                          {item.consignee && (
                            <div className="text-[10px] font-sans font-medium text-blue-700 dark:text-blue-300 truncate max-w-[180px]">
                              C/O: {item.consignee}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Komoditi & Nama Barang */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                            <Tag size={9} /> {item.typeComodityName || 'UMUM'}
                          </span>
                          {item.listCode && (
                            <span className="font-mono text-[9px] text-[var(--color-secondary)] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] shrink-0">
                              LC: {item.listCode}
                            </span>
                          )}
                        </div>
                        {isItemNameChanged ? (
                          <div className="flex items-center gap-1.5 text-xs flex-wrap">
                            <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1 rounded text-[10px]">
                              {item.prevItemName}
                            </span>
                            <ArrowRight size={10} className="text-[var(--color-secondary)] shrink-0" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                              {item.itemName}
                            </span>
                          </div>
                        ) : (
                          <p className="font-medium text-[var(--color-primary)] text-xs leading-snug">
                            {item.itemName || '—'}
                          </p>
                        )}
                      </div>

                      {/* Footer Kartu: Highlight Tarif Satuan, Qty & Status Revisi */}
                      <div className="pt-2.5 border-t border-[var(--color-border)] flex items-end justify-between gap-2">
                        {/* Qty */}
                        <div className="font-mono">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--color-secondary)] block">Volume / Qty</span>
                          {isQtyChanged ? (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">{formatNumber(item.prevQty || 0)}</span>
                              <ArrowRight size={10} className="text-[var(--color-secondary)]" />
                              <strong className="text-emerald-600 dark:text-emerald-400">{formatNumber(item.qty || 0)}</strong>
                            </div>
                          ) : (
                            <span className="font-bold text-xs text-[var(--color-primary)]">
                              {item.qty !== null ? formatNumber(item.qty) : '—'}
                            </span>
                          )}
                        </div>

                        {/* Tarif Satuan */}
                        <div className="text-right font-mono flex-1">
                          <span className="text-[9px] uppercase tracking-wider text-[var(--color-secondary)] block">Tarif Satuan</span>
                          {isPriceChanged ? (
                            <div>
                              <div className="flex items-center justify-end gap-1">
                                <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">{formatCurrency(item.prevPrice || 0)}</span>
                                <ArrowRight size={10} className="text-[var(--color-secondary)]" />
                                <strong className="text-base text-emerald-600 dark:text-emerald-400">{formatCurrency(item.price || 0)}</strong>
                              </div>
                              <div className="text-[9px] font-bold">
                                {priceDiff < 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">Diskon {formatCurrency(Math.abs(priceDiff))}</span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400">Naik +{formatCurrency(priceDiff)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="font-bold text-base text-[var(--color-primary)]">
                              {item.price !== null ? formatCurrency(item.price) : '—'}
                            </span>
                          )}
                        </div>

                        {/* Status Revisi Badge */}
                        <div className="shrink-0">
                          {item.hasAdjustment ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-transparent border border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-2xs">
                              <Sparkles size={10} className="shrink-0" />
                              <span>{isPriceChanged ? 'Tarif Direvisi' : isQtyChanged ? 'Qty Direvisi' : 'Diubah'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                              <Check size={10} className="shrink-0" />
                              <span>Original</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* DESKTOP TABLE VIEW (Resolusi Desktop / Tablet >= 768px) */}
              <div className="hidden md:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse">
                    <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-3 w-10 text-center">#</th>
                        <th className="px-3 py-3 w-[220px] whitespace-nowrap">No Invoice & Tanggal</th>
                        <th className="px-2.5 py-3 w-[95px] text-center">Cabang / Moda</th>
                        <th className="px-3 py-3 w-[180px]">Marking & Consignee</th>
                        <th className="px-3 py-3">Tipe & Nama Barang (Komoditi)</th>
                        <th className="px-3 py-3 w-[105px] text-right whitespace-nowrap">Volume / Qty</th>
                        <th className="px-3.5 py-3 w-[170px] text-right whitespace-nowrap">Tarif Satuan (Item Price)</th>
                        <th className="px-3 py-3 w-[120px] text-center whitespace-nowrap">Status Revisi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {paginatedFlatItems.map((item, idx) => {
                        const isPriceChanged = Boolean(
                          item.prevPrice !== null &&
                          item.prevPrice !== undefined &&
                          item.price !== null &&
                          item.price !== undefined &&
                          Number(item.prevPrice) !== Number(item.price)
                        )
                        const isQtyChanged = Boolean(
                          item.prevQty !== null &&
                          item.prevQty !== undefined &&
                          item.qty !== null &&
                          item.qty !== undefined &&
                          Number(item.prevQty) !== Number(item.qty)
                        )
                        const isItemNameChanged = Boolean(
                          item.prevItemName &&
                          item.prevItemName.trim() !== (item.itemName || '').trim()
                        )

                        const priceDiff =
                          item.price !== null && item.prevPrice !== null
                            ? Number(item.price) - Number(item.prevPrice)
                            : 0

                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              'hover:bg-[var(--color-neutral)]/60 transition-colors group',
                              item.hasAdjustment && 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]'
                            )}
                          >
                            {/* 1. Index */}
                            <td className="px-2.5 py-2.5 text-center font-mono text-[var(--color-secondary)]">
                              {(page - 1) * pageSize + idx + 1}
                            </td>

                            {/* 2. No Invoice & Tanggal */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Link
                                      to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(item.invNo))}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 truncate"
                                      title={`Buka Validasi Invoice ${item.invNo} di Tab Baru`}
                                    >
                                      <span>{item.invNo}</span>
                                      <ExternalLink size={10} className="opacity-70 shrink-0" />
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(item.invNo, item.invNo)}
                                      className="p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
                                      title="Salin No Invoice"
                                    >
                                      {copiedInvNo === item.invNo ? (
                                        <Check size={11} className="text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  </div>
                                  {item.paymentStatus && (
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
                                      className="text-[8px] px-1 py-0 font-bold inline-flex items-center gap-0.5 shrink-0"
                                    >
                                      {item.paymentStatus === 'LUNAS' && <CheckCircle2 size={8} />}
                                      {(item.paymentStatus === 'PARTIAL' ||
                                        item.paymentStatus === 'ISSUED' ||
                                        item.paymentStatus === 'UNPAID' ||
                                        item.paymentStatus === 'DRAFT') && <Clock size={8} />}
                                      {item.paymentStatus === 'OVERDUE' && <AlertTriangle size={8} />}
                                      {item.paymentStatus}
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-0.5 text-[10px] font-mono leading-tight">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8.5px] uppercase tracking-wider text-[var(--color-secondary)] w-10 shrink-0 font-semibold">
                                      Agent:
                                    </span>
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {item.tglAgent ? formatDate(item.tglAgent) : '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
                                    <span className="text-[8.5px] uppercase tracking-wider w-10 shrink-0 font-medium">
                                      Bill:
                                    </span>
                                    <span>{item.invDate ? formatDate(item.invDate) : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* 3. Branch & Moda */}
                            <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]"
                                  title={item.branchName ? `${item.branchCode} - ${item.branchName}` : undefined}
                                >
                                  {item.branchCode || '—'}
                                </span>
                                <div>
                                  {item.moda === 'Udara' ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                      <Plane size={9} /> UDARA
                                    </span>
                                  ) : item.moda === 'Laut' ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                      <Ship size={9} /> LAUT
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">—</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 4. Marking & Consignee */}
                            <td className="px-3 py-2.5">
                              <div className="space-y-0.5">
                                <div className="font-mono font-semibold text-[var(--color-primary)] text-xs truncate max-w-[170px]" title={`${item.markingCode || ''} ${item.markingNo || ''}`}>
                                  {item.markingCode || '—'}
                                  {item.markingNo ? ` (${item.markingNo})` : ''}
                                </div>
                                {item.consignee ? (
                                  <div className="text-[10px] font-sans font-medium text-blue-700 dark:text-blue-300 truncate max-w-[170px]" title={item.consignee}>
                                    C/O: {item.consignee}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-[var(--color-secondary)] font-mono">—</div>
                                )}
                              </div>
                            </td>

                            {/* 5. Tipe Komoditi & Nama Barang */}
                            <td className="px-3 py-2.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                    <Tag size={9} /> {item.typeComodityName || 'UMUM'}
                                  </span>
                                  {item.listCode && (
                                    <span className="font-mono text-[9px] text-[var(--color-secondary)] px-1 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] shrink-0">
                                      LC: {item.listCode}
                                    </span>
                                  )}
                                </div>
                                {isItemNameChanged ? (
                                  <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                    <span className="line-through text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1 rounded text-[10px]">
                                      {item.prevItemName}
                                    </span>
                                    <ArrowRight size={10} className="text-[var(--color-secondary)] shrink-0" />
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                                      {item.itemName}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    className="font-medium text-[var(--color-primary)] text-xs line-clamp-2 leading-snug"
                                    title={item.itemName || ''}
                                  >
                                    {item.itemName || '—'}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* 6. Volume / Qty */}
                            <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                              {isQtyChanged ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">
                                      {formatNumber(item.prevQty || 0)}
                                    </span>
                                    <ArrowRight size={10} className="text-[var(--color-secondary)]" />
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {formatNumber(item.qty || 0)}
                                    </span>
                                  </div>
                                  <span className="text-[8px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                                    Qty Diubah
                                  </span>
                                </div>
                              ) : (
                                <div className="font-semibold text-[var(--color-primary)]">
                                  {item.qty !== null ? formatNumber(item.qty) : '—'}
                                </div>
                              )}
                            </td>

                            {/* 7. Tarif Satuan (Item Price / History Harga) - SANGAT PROMINEN! */}
                            <td className="px-3.5 py-2.5 text-right font-mono whitespace-nowrap">
                              {isPriceChanged ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">
                                      {formatCurrency(item.prevPrice || 0)}
                                    </span>
                                    <ArrowRight size={10} className="text-[var(--color-secondary)]" />
                                    <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
                                      {formatCurrency(item.price || 0)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] font-bold">
                                    {priceDiff < 0 ? (
                                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                        <TrendingDown size={10} /> Diskon {formatCurrency(Math.abs(priceDiff))}
                                      </span>
                                    ) : (
                                      <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                        <TrendingUp size={10} /> Naik +{formatCurrency(priceDiff)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-sm text-[var(--color-primary)]">
                                    {item.price !== null ? formatCurrency(item.price) : '—'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* 8. Status Revisi (tbBillingDetail vs Prev) */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {item.hasAdjustment ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-transparent border border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-2xs">
                                  <Sparkles size={10} className="shrink-0" />
                                  <span>{isPriceChanged ? 'Tarif Direvisi' : isQtyChanged ? 'Qty Direvisi' : 'Detail Diubah'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-transparent border border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                  <Check size={10} className="shrink-0" />
                                  <span>Original</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            /* ========================================================================= */
            /* MODE 2: GROUPED INVOICE VIEW (DIKELOMPOKKAN PER INVOICE INDUK / GABUNGAN) */
            /* ========================================================================= */
            <>
              {/* MOBILE CARD VIEW (Resolusi Mobile < 768px) */}
              <div className="md:hidden space-y-3">
                {paginatedGroups.map((group) => {
                  const isGroupCollapsed = collapsedGroups.has(group.groupKey)

                  // Helper renderer for a single invoice card
                  const renderMobileInvoiceCard = (
                    item: CustomerBillingHistoryItem,
                    opts?: { isCombinedParent?: boolean; showIndex?: boolean; index?: number }
                  ) => {
                    const isExpanded = Boolean(expandedRows[item.fdInvNo])
                    const rel = resolveInvoiceRelation(item.fdInvNo)
                    const branchCode = resolveBranchCode(
                      item.fdBranchCode,
                      item.fdInvNo,
                      item.fdMarkingCode
                    )
                    const branchName = item.fdBranchName?.trim()
                    const details = rowDetails[item.fdInvNo] || item.details || []

                    return (
                      <div key={item.fdInvNo} className="p-3 bg-[var(--color-surface)] space-y-2.5">
                        {/* Row 1: Invoice Link, Badges, Copy */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            {opts?.showIndex && (
                              <span className="text-[10px] font-mono text-[var(--color-secondary)] font-bold shrink-0">
                                #{opts.index}
                              </span>
                            )}
                            <Link
                              to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(rel.targetInvNo))}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'font-mono font-bold text-xs hover:underline inline-flex items-center gap-1 shrink-0',
                                rel.isCombined
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              )}
                              title={`Buka Detail Validasi Invoice ${item.fdInvNo}`}
                            >
                              <span className="whitespace-nowrap">{item.fdInvNo}</span>
                              <ExternalLink size={10} className="opacity-70 shrink-0" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.fdInvNo, item.fdInvNo)}
                              className="p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
                              title="Salin No Invoice"
                            >
                              {copiedInvNo === item.fdInvNo ? (
                                <Check size={11} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                            {rel.isCombined ? (
                              <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 rounded shrink-0">
                                Gabungan ({rel.subCode})
                              </span>
                            ) : opts?.isCombinedParent ? (
                              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded shrink-0">
                                Bill Induk
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Row 2: Branch, Moda, Marking, Consignee */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-[var(--color-border)]/50">
                          <div>
                            <div className="text-[9px] uppercase font-bold text-[var(--color-secondary)]">
                              Cabang & Moda
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]"
                                title={branchName ? `${branchCode} - ${branchName}` : undefined}
                              >
                                {branchCode || '—'}
                              </span>
                              {item.moda === 'Udara' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                  <Plane size={9} /> UDARA
                                </span>
                              ) : item.moda === 'Laut' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                  <Ship size={9} /> LAUT
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div>
                            <div className="text-[9px] uppercase font-bold text-[var(--color-secondary)]">
                              Marking / Consignee
                            </div>
                            <div
                              className="font-mono font-semibold text-[11px] text-[var(--color-primary)] truncate mt-0.5"
                              title={`${item.fdMarkingCode || ''} ${item.fdMarkingNo || ''}`}
                            >
                              {item.fdMarkingCode || '—'}
                              {item.fdMarkingNo ? ` (${item.fdMarkingNo})` : ''}
                            </div>
                            {item.fdConsignee && (
                              <div className="text-[10px] text-blue-700 dark:text-blue-300 truncate" title={item.fdConsignee}>
                                C/O: {item.fdConsignee}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Tanggal & Komoditi */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[8.5px] uppercase tracking-wider text-[var(--color-secondary)] w-10 shrink-0">
                                Agent:
                              </span>
                              <span className="font-semibold text-[var(--color-primary)]">
                                {item.fdTglAgent ? formatDate(item.fdTglAgent) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[var(--color-secondary)]">
                              <span className="text-[8.5px] uppercase tracking-wider w-10 shrink-0">Bill:</span>
                              <span>{item.fdInvDate ? formatDate(item.fdInvDate) : '—'}</span>
                            </div>
                          </div>

                          <div className="font-sans">
                            {item.fdTypeComodityName ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <Tag size={9} /> {item.fdTypeComodityName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[var(--color-secondary)] italic">
                                UMUM
                              </span>
                            )}
                            {item.fdDescr && (
                              <div className="text-[10px] text-[var(--color-secondary)] truncate max-w-[160px] mt-0.5" title={item.fdDescr}>
                                {item.fdDescr}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 4: Total, Sisa, Toggle Expand */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--color-border)]/50">
                          <div className="font-mono">
                            <div className="flex items-baseline gap-1">
                              <span className="text-[9px] text-[var(--color-secondary)] uppercase">Total:</span>
                              <strong className="font-bold text-xs text-[var(--color-primary)] tabular-nums whitespace-nowrap">
                                {formatCurrency(item.totalAmount)}
                              </strong>
                            </div>
                            {item.sisaBayar > 0 && (
                              <div className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                Sisa: {formatCurrency(item.sisaBayar)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleExpand(item.fdInvNo)}
                              className={cn(
                                'px-2 py-1 rounded text-[10px] font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1',
                                isExpanded
                                  ? 'bg-[var(--color-neutral)] text-[var(--color-primary)] border-[var(--color-border)]'
                                  : 'bg-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)] border-[var(--color-border)]/70'
                              )}
                            >
                              {loadingDetails[item.fdInvNo] ? (
                                <span className="w-2.5 h-2.5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                              ) : isExpanded ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                              <span>
                                {rowDetails[item.fdInvNo]
                                  ? `${rowDetails[item.fdInvNo].length} item`
                                  : item.details
                                    ? `${item.details.length} item`
                                    : 'Item'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Mobile Detail Items */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-[var(--color-border)] space-y-1.5 bg-[var(--color-neutral)]/40 p-2.5 rounded-lg">
                            <div className="text-[10px] font-bold uppercase text-[var(--color-secondary)] flex items-center justify-between">
                              <span>Rincian Tarif ({details.length} item)</span>
                            </div>
                            {details.length === 0 ? (
                              <div className="text-[10px] text-[var(--color-secondary)] italic py-1">
                                Tidak ada rincian item
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {details.map((d, dIdx) => (
                                  <div
                                    key={d.fdID || dIdx}
                                    className="p-2 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs space-y-1"
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      <span className="font-sans font-medium text-[var(--color-primary)] text-[11px] leading-tight">
                                        {d.fdItemName || d.fdComodity || 'Item Tagihan'}
                                      </span>
                                      {d.hasAdjustment ? (
                                        <span className="text-[8.5px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                                          Diubah
                                        </span>
                                      ) : (
                                        <span className="text-[8.5px] text-slate-500 border border-slate-500/20 px-1 py-0.2 rounded shrink-0">
                                          Original
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--color-secondary)] pt-1 border-t border-[var(--color-border)]/40">
                                      <span>Qty: {d.fdQty !== null ? formatNumber(d.fdQty) : '—'}</span>
                                      <div className="text-right">
                                        {d.hasAdjustment &&
                                        d.prevItemPrice !== null &&
                                        d.prevItemPrice !== undefined &&
                                        Number(d.prevItemPrice) !== Number(d.fdItemPrice) ? (
                                          <div className="flex items-center gap-1 justify-end">
                                            <span className="line-through text-rose-500 text-[9px]">
                                              {formatCurrency(d.prevItemPrice)}
                                            </span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                              {formatCurrency(d.fdItemPrice || 0)}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="font-bold text-[var(--color-primary)]">
                                            {d.fdItemPrice !== null ? formatCurrency(d.fdItemPrice) : '—'}
                                          </span>
                                        )}
                                        <div className="font-bold text-[var(--color-primary)] text-[11px]">
                                          Total: {d.fdTotal !== null ? formatCurrency(d.fdTotal) : '—'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // 1. JIKA SINGLE BILL: Langsung render 1 kartu utuh tanpa header pembungkus accordion!
                  if (!group.isCombinedGroup && group.items.length === 1) {
                    return (
                      <div
                        key={group.groupKey}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-2xs"
                      >
                        {renderMobileInvoiceCard(group.items[0])}
                      </div>
                    )
                  }

                  // 2. JIKA PAKET GABUNGAN (COMBINED BILLS): Tampilkan Header Grup Gabungan 3-Baris yang lega
                  return (
                    <div
                      key={group.groupKey}
                      className="rounded-xl border border-purple-500/30 bg-[var(--color-surface)] overflow-hidden shadow-2xs"
                    >
                      {/* Header Paket Gabungan Mobile */}
                      <div
                        onClick={() => toggleGroupCollapse(group.groupKey)}
                        className="p-3 bg-[var(--color-neutral)] hover:bg-[var(--color-neutral)]/80 transition-colors cursor-pointer select-none space-y-2 border-b border-[var(--color-border)]"
                      >
                        {/* Baris 1: Status Paket Gabungan & Cabang */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="p-0.5 rounded text-[var(--color-secondary)] shrink-0">
                              {isGroupCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shrink-0">
                              <Layers size={11} /> {group.items.length} Bill Gabungan
                            </span>
                            {group.primaryBranch && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shrink-0">
                                {group.primaryBranch}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Baris 2: Ref Induk & Tanggal Agent */}
                        <div className="flex items-center justify-between gap-2 pt-0.5 pl-6">
                          <div className="flex items-center gap-1 text-xs font-mono min-w-0">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] shrink-0">
                              Ref Induk:
                            </span>
                            <Link
                              to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(group.parentInvNo))}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-blue-600 dark:text-blue-400 hover:underline truncate"
                            >
                              {group.parentInvNo}
                            </Link>
                          </div>
                          {group.latestTglAgent && (
                            <span className="text-[10px] text-[var(--color-secondary)] font-mono shrink-0">
                              Agent: {formatDate(group.latestTglAgent)}
                            </span>
                          )}
                        </div>

                        {/* Baris 3: Total Paket & Sisa */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--color-border)]/50 pl-6 font-mono text-xs">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[9px] uppercase text-[var(--color-secondary)]">Total Paket:</span>
                            <strong className="text-[var(--color-primary)] font-bold tabular-nums whitespace-nowrap">
                              {formatCurrency(group.totalAmount)}
                            </strong>
                          </div>
                          {group.totalSisa > 0 ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-[9px] uppercase text-[var(--color-secondary)]">Sisa:</span>
                              <strong className="text-rose-600 dark:text-rose-400 font-bold tabular-nums whitespace-nowrap">
                                {formatCurrency(group.totalSisa)}
                              </strong>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Lunas
                            </span>
                          )}
                        </div>
                      </div>

                      {/* List Bill Anak Gabungan */}
                      {!isGroupCollapsed && (
                        <div className="divide-y divide-[var(--color-border)]">
                          {group.items.map((item, itemIdx) =>
                            renderMobileInvoiceCard(item, {
                              isCombinedParent: !resolveInvoiceRelation(item.fdInvNo).isCombined,
                              showIndex: true,
                              index: itemIdx + 1,
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* DESKTOP TABLE VIEW (Resolusi Desktop / Tablet >= 768px) */}
              <div className="hidden md:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans border-collapse table-fixed min-w-[950px]">
                    <colgroup>
                      <col className="w-11" />
                      <col className="w-[230px]" />
                      <col className="w-[180px]" />
                      <col className="w-[110px]" />
                      <col className="w-[150px]" />
                      <col className="min-w-[190px]" />
                      <col className="w-[150px]" />
                    </colgroup>
                    <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)] tracking-wider">
                      <tr>
                        <th className="px-2.5 py-3 text-center">#</th>
                        <th className="px-3 py-3">No Invoice & Aksi</th>
                        <th className="px-3 py-3">Marking & Consignee</th>
                        <th className="px-2.5 py-3 text-center">Cabang / Moda</th>
                        <th className="px-3 py-3">Tgl Agent & Bill</th>
                        <th className="px-3 py-3">Komoditi & Deskripsi</th>
                        <th className="px-3 py-3 text-right">Total Tagihan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {paginatedGroups.map((group, groupIdx) => {
                        const isGroupCollapsed = collapsedGroups.has(group.groupKey)

                        return (
                          <Fragment key={group.groupKey}>
                            {/* GROUP HEADER ROW */}
                            <tr
                              onClick={() => toggleGroupCollapse(group.groupKey)}
                              className="bg-[var(--color-neutral)] hover:bg-[var(--color-neutral)]/80 transition-colors cursor-pointer border-t-2 border-[var(--color-border)] select-none group"
                            >
                              <td colSpan={7} className="px-3.5 sm:px-5 py-2.5">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                                    <button
                                      type="button"
                                      className="p-1 rounded text-[var(--color-secondary)] group-hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                                      title={isGroupCollapsed ? 'Buka grup' : 'Tutup grup'}
                                    >
                                      {isGroupCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                    </button>

                                    <div className="inline-flex items-center gap-1.5 bg-[var(--color-surface)] px-2.5 py-0.5 rounded-lg border border-[var(--color-border)] shadow-2xs text-xs shrink-0 font-medium">
                                      <Receipt size={12} className="text-[var(--color-primary)] shrink-0" />
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-secondary)]">
                                        Ref Induk:
                                      </span>
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

                                    {group.primaryBranch && (
                                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shrink-0">
                                        {group.primaryBranch}
                                      </span>
                                    )}

                                    {group.latestTglAgent && (
                                      <span className="text-xs text-[var(--color-secondary)] font-medium font-mono shrink-0">
                                        Agent: {formatDate(group.latestTglAgent)}
                                      </span>
                                    )}

                                    {group.isCombinedGroup ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
                                        <Layers size={11} /> {group.items.length} bill (gabungan)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium text-[var(--color-secondary)] bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
                                        Single Bill
                                      </span>
                                    )}
                                  </div>

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
                                      <strong
                                        className={
                                          group.totalSisa > 0
                                            ? 'text-rose-600 dark:text-rose-400 font-semibold tabular-nums'
                                            : 'text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums'
                                        }
                                      >
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
                                const branchCode = resolveBranchCode(
                                  item.fdBranchCode,
                                  item.fdInvNo,
                                  item.fdMarkingCode
                                )
                                const branchName = item.fdBranchName?.trim()

                                return (
                                  <Fragment key={item.fdInvNo}>
                                    <tr
                                      className={cn(
                                        'hover:bg-[var(--color-neutral)]/50 transition-colors group bg-[var(--color-surface)]',
                                        isExpanded && 'bg-[var(--color-neutral)]/30',
                                        rel.isCombined &&
                                        'bg-purple-500/[0.02] border-l-2 border-l-purple-500'
                                      )}
                                    >
                                      {/* 1. Indeks */}
                                      <td className="px-2.5 py-3 text-center font-mono text-[var(--color-secondary)]">
                                        {group.isCombinedGroup ? (
                                          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                                            {itemIdx + 1}
                                          </span>
                                        ) : (
                                          (page - 1) * pageSize + groupIdx + 1
                                        )}
                                      </td>

                                      {/* 2. No Invoice & Aksi */}
                                      <td className="px-3 py-3">
                                        <div className="space-y-1.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <Link
                                              to={ROUTES.BILLING_VALIDATION_DETAIL(encodeURIComponent(rel.targetInvNo))}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={cn(
                                                'font-mono font-bold hover:underline inline-flex items-center gap-1 text-xs truncate',
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
                                              <ExternalLink size={10} className="opacity-70 shrink-0" />
                                            </Link>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                handleCopy(item.fdInvNo, item.fdInvNo)
                                              }}
                                              className="p-0.5 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
                                              title="Salin No Invoice"
                                            >
                                              {copiedInvNo === item.fdInvNo ? (
                                                <Check
                                                  size={12}
                                                  className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]"
                                                />
                                              ) : (
                                                <Copy size={12} />
                                              )}
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {rel.isCombined ? (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 rounded shadow-2xs">
                                                <Layers size={9} /> Gabungan ({rel.subCode})
                                              </span>
                                            ) : group.isCombinedGroup ? (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.2 rounded shadow-2xs">
                                                <Receipt size={9} /> Bill Induk
                                              </span>
                                            ) : null}

                                            <button
                                              type="button"
                                              onClick={() => toggleExpand(item.fdInvNo)}
                                              className={cn(
                                                'px-1.5 py-0.5 rounded transition-colors cursor-pointer inline-flex items-center gap-1 text-[9px] font-semibold border',
                                                item.hasPrevDiff
                                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                                                  : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] border-[var(--color-border)]/60'
                                              )}
                                              title={
                                                isExpanded
                                                  ? 'Sembunyikan Rincian Item'
                                                  : 'Lihat Rincian Item & Riwayat Penyesuaian Tarif'
                                              }
                                            >
                                              {loadingDetails[item.fdInvNo] ? (
                                                <span className="w-2.5 h-2.5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                              ) : isExpanded ? (
                                                <ChevronUp size={10} />
                                              ) : (
                                                <ChevronDown size={10} />
                                              )}
                                              <span>
                                                {rowDetails[item.fdInvNo]
                                                  ? `${rowDetails[item.fdInvNo].length} item`
                                                  : item.details
                                                    ? `${item.details.length} item`
                                                    : 'Rincian'}
                                              </span>
                                            </button>
                                          </div>
                                        </div>
                                      </td>

                                      {/* 3. Marking & Consignee */}
                                      <td className="px-3 py-3">
                                        <div className="space-y-0.5">
                                          <div
                                            className="font-mono font-semibold text-[var(--color-primary)] text-xs truncate max-w-[150px]"
                                            title={`${item.fdMarkingCode || ''} ${item.fdMarkingNo || ''}`}
                                          >
                                            {item.fdMarkingCode || '—'}
                                            {item.fdMarkingNo ? ` (${item.fdMarkingNo})` : ''}
                                          </div>
                                          {item.fdConsignee ? (
                                            <div
                                              className="text-[10px] font-sans font-medium text-blue-700 dark:text-blue-300 truncate max-w-[150px]"
                                              title={item.fdConsignee}
                                            >
                                              C/O: {item.fdConsignee}
                                            </div>
                                          ) : (
                                            <div className="text-[10px] text-[var(--color-secondary)] font-mono">—</div>
                                          )}
                                        </div>
                                      </td>

                                      {/* 4. Cabang & Moda */}
                                      <td className="px-2.5 py-3 text-center whitespace-nowrap">
                                        <div className="inline-flex flex-col items-center gap-1">
                                          <span
                                            className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)]"
                                            title={branchName ? `${branchCode} - ${branchName}` : undefined}
                                          >
                                            {branchCode || '—'}
                                          </span>
                                          <div>
                                            {item.moda === 'Udara' ? (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                                                <Plane size={9} /> UDARA
                                              </span>
                                            ) : item.moda === 'Laut' ? (
                                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                                                <Ship size={9} /> LAUT
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 text-[10px]">—</span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* 5. Tgl Agent & Bill */}
                                      <td className="px-3 py-3 whitespace-nowrap font-mono">
                                        <div className="space-y-0.5 text-[10px] leading-tight">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[8.5px] uppercase tracking-wider text-[var(--color-secondary)] w-9 shrink-0 font-semibold">
                                              Agent:
                                            </span>
                                            <span className="font-semibold text-[var(--color-primary)]">
                                              {item.fdTglAgent ? formatDate(item.fdTglAgent) : '—'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[var(--color-secondary)]">
                                            <span className="text-[8.5px] uppercase tracking-wider w-9 shrink-0 font-medium">
                                              Bill:
                                            </span>
                                            <span>{item.fdInvDate ? formatDate(item.fdInvDate) : '—'}</span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* 6. Komoditi & Deskripsi */}
                                      <td className="px-3 py-3">
                                        <div className="space-y-1">
                                          {item.fdTypeComodityName ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                              <Tag size={9} /> {item.fdTypeComodityName}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-[var(--color-secondary)] italic">
                                              UMUM
                                            </span>
                                          )}

                                          {item.fdDescr && (
                                            <p
                                              className="text-[11px] text-[var(--color-secondary)] truncate max-w-[200px]"
                                              title={item.fdDescr}
                                            >
                                              {item.fdDescr}
                                            </p>
                                          )}
                                        </div>
                                      </td>

                                      {/* 7. Total Tagihan */}
                                      <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                                        <div className="font-bold text-[var(--color-primary)] text-xs tabular-nums">
                                          {formatCurrency(item.totalAmount)}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* EXPANDED ITEM DETAILS ROW */}
                                    {isExpanded && (
                                      <tr className="bg-[var(--color-neutral)]/40">
                                        <td colSpan={7} className="p-3 sm:px-5 sm:py-3">
                                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2 shadow-2xs">
                                            {(() => {
                                              const details =
                                                rowDetails[item.fdInvNo] || item.details || []

                                              return (
                                                <div className="space-y-2">
                                                  <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--color-border)]/60">
                                                    <div className="font-semibold text-[var(--color-primary)] flex items-center gap-1.5">
                                                      <span>Rincian Item & Riwayat Penyesuaian Tarif</span>
                                                      <span className="font-mono text-xs text-[var(--color-secondary)]">
                                                        ({item.fdInvNo})
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                                                      {details.length} item terdaftar
                                                    </span>
                                                  </div>

                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-xs">
                                                      <thead className="text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]/60">
                                                        <tr>
                                                          <th className="py-1 px-1.5 text-center w-8">#</th>
                                                          <th className="py-1 text-left">Nama Item / Deskripsi</th>
                                                          <th className="py-1 text-center w-20">List Code</th>
                                                          <th className="py-1 text-right w-24">Qty / Volume</th>
                                                          <th className="py-1 text-right w-44">Tarif Satuan (Item Price)</th>
                                                          <th className="py-1 text-right w-32">Jumlah Total</th>
                                                          <th className="py-1 text-center w-24">Status Audit</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-[var(--color-border)]/40 font-mono">
                                                        {details.map((d, dIdx) => {
                                                          const isPriceRev = Boolean(
                                                            d.hasAdjustment &&
                                                            d.prevItemPrice !== null &&
                                                            d.prevItemPrice !== undefined &&
                                                            Number(d.prevItemPrice) !== Number(d.fdItemPrice)
                                                          )
                                                          const priceDiff = isPriceRev
                                                            ? Number(d.fdItemPrice || 0) - Number(d.prevItemPrice || 0)
                                                            : 0

                                                          return (
                                                            <tr
                                                              key={d.fdID || dIdx}
                                                              className="hover:bg-[var(--color-neutral)]/50"
                                                            >
                                                              <td className="py-2 px-1.5 text-center text-[10px] text-[var(--color-secondary)]">
                                                                {d.fdID || dIdx + 1}
                                                              </td>
                                                              <td className="py-2 font-sans font-medium text-[var(--color-primary)]">
                                                                {d.fdItemName || d.fdComodity || 'Item Tagihan'}
                                                              </td>
                                                              <td className="py-2 text-center text-[var(--color-secondary)]">
                                                                {d.fdListCode || '—'}
                                                              </td>
                                                              <td className="py-2 text-right">
                                                                {d.fdQty !== null ? formatNumber(d.fdQty) : '—'}
                                                              </td>
                                                              <td className="py-2 text-right">
                                                                {isPriceRev ? (
                                                                  <div className="flex flex-col items-end gap-0.5">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                      <span className="line-through text-rose-600 dark:text-rose-400 text-[10px]">
                                                                        {formatCurrency(d.prevItemPrice || 0)}
                                                                      </span>
                                                                      <ArrowRight size={9} className="text-[var(--color-secondary)]" />
                                                                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                        {formatCurrency(d.fdItemPrice || 0)}
                                                                      </span>
                                                                    </div>
                                                                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-400">
                                                                      {priceDiff < 0
                                                                        ? `Diskon ${formatCurrency(Math.abs(priceDiff))}`
                                                                        : `+${formatCurrency(priceDiff)}`}
                                                                    </span>
                                                                  </div>
                                                                ) : (
                                                                  <span className="font-bold text-[var(--color-primary)]">
                                                                    {d.fdItemPrice !== null
                                                                      ? formatCurrency(d.fdItemPrice)
                                                                      : '—'}
                                                                  </span>
                                                                )}
                                                              </td>
                                                              <td className="py-2 text-right font-bold text-[var(--color-primary)]">
                                                                {d.fdTotal !== null ? formatCurrency(d.fdTotal) : '—'}
                                                              </td>
                                                              <td className="py-2 text-center">
                                                                {d.hasAdjustment ? (
                                                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                                                    Diubah
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
                                                </div>
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
            </>
          )}
        </div>

        {/* MODAL FOOTER WITH PAGINATION */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 text-xs">
            <span className="text-xs text-[var(--color-secondary)] truncate">
              {totalCount > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, totalCount)} dari {totalCount}{' '}
              <span className="hidden xs:inline">{viewMode === 'detail' ? 'tarif item' : 'paket invoice'}</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-secondary)] shrink-0">
              <span>Baris:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              total={totalCount}
              limit={pageSize}
            />
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-neutral)] hover:bg-[var(--color-border)] text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
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

