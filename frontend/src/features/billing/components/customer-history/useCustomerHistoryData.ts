import { useState, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { billingApi } from '../../services/billing.service'
import { resolveBranchCode } from '../../utils/billing.utils'
import { cleanFoxProString } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import type {
  CustomerBillingHistoryItem,
  CustomerBillingHistoryResponse,
  CustomerHistoryKpiSummary,
  DiffFilterStatus,
  FlatDetailTraceItem,
  HistoryViewMode,
  ModaFilter,
  PaymentFilter,
  CommodityAvgRate,
} from './types'

export function useCustomerHistoryData(
  isOpen: boolean,
  custCode: string | null,
  initialTypeComodity?: string | null
) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>('detail')
  const [search, setSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedTypeComodity, setSelectedTypeComodity] = useState<string>(initialTypeComodity || 'all')
  const [selectedDiffStatus, setSelectedDiffStatus] = useState<DiffFilterStatus>('all')
  const [selectedModa, setSelectedModa] = useState<ModaFilter>('all')
  const [selectedStatus, setSelectedStatus] = useState<PaymentFilter>('all')

  const debouncedSearch = useDebounce(search, 300)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      'customer-billing-history-infinite',
      custCode,
      selectedYear,
      selectedBranch,
      selectedTypeComodity,
      selectedDiffStatus,
      selectedModa,
      selectedStatus,
      debouncedSearch,
    ],
    queryFn: async ({ pageParam = { offset: 0, limit: 15 } }: { pageParam?: { offset: number; limit: number } }) => {
      if (!custCode) return null
      const res = await billingApi.customerBillingHistory(custCode, {
        offset: pageParam.offset,
        limit: pageParam.limit,
        year: selectedYear,
        branch: selectedBranch,
        typeComodity: selectedTypeComodity,
        diffStatus: selectedDiffStatus,
        moda: selectedModa,
        status: selectedStatus,
        search: debouncedSearch,
      })
      return (res.data as { data?: CustomerBillingHistoryResponse })?.data || null
    },
    initialPageParam: { offset: 0, limit: 15 },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.pagination) return undefined
      const totalLoaded = allPages.reduce((acc, p) => acc + (p?.items?.length || 0), 0)
      if (lastPage.pagination.hasNextPage && totalLoaded < (lastPage.pagination.totalItems || 0)) {
        return { offset: totalLoaded, limit: 10 }
      }
      return undefined
    },
    enabled: isOpen && Boolean(custCode),
    staleTime: 60_000,
  })

  // All accumulated invoices across loaded pages
  const invoices: CustomerBillingHistoryItem[] = useMemo(() => {
    if (!data?.pages) return []
    const list: CustomerBillingHistoryItem[] = []
    for (const page of data.pages) {
      if (page?.items) {
        list.push(...page.items)
      }
    }
    return list
  }, [data?.pages])

  // Branches from backend filter options or loaded items
  const availableBranches = useMemo(() => {
    const backendBranches = data?.pages[0]?.filterOptions?.branches
    if (backendBranches && backendBranches.length > 0) {
      return backendBranches
    }
    const map = new Map<string, string>()
    for (const item of invoices) {
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
  }, [data?.pages, invoices])

  // Commodity Types from backend filter options or loaded items
  const availableComodityTypes = useMemo(() => {
    const backendTc = data?.pages[0]?.filterOptions?.typeComodities
    if (backendTc && backendTc.length > 0) {
      return backendTc
    }
    const set = new Set<string>()
    for (const item of invoices) {
      if (item.fdTypeComodityName) set.add(item.fdTypeComodityName.trim())
      if (item.details) {
        for (const d of item.details) {
          if (d.typeComodityName) set.add(d.typeComodityName.trim())
          else if (d.fdComodity) set.add(d.fdComodity.trim())
        }
      }
    }
    return Array.from(set).filter(Boolean).sort()
  }, [data?.pages, invoices])

  // Flattened trace items for line-item view
  const flattenedItems: FlatDetailTraceItem[] = useMemo(() => {
    const res: FlatDetailTraceItem[] = []
    invoices.forEach((inv) => {
      const details = inv.details && inv.details.length > 0 ? inv.details : []
      if (details.length === 0) {
        res.push({
          id: `${inv.fdInvNo}-header`,
          invNo: inv.fdInvNo,
          invDate: inv.fdInvDate,
          branchCode: resolveBranchCode(inv.fdBranchCode, inv.fdInvNo, inv.fdMarkingCode),
          branchName: inv.fdBranchName,
          tglAgent: inv.fdTglAgent,
          typeComodityName: inv.fdTypeComodityName,
          markingCode: inv.fdMarkingCode,
          markingNo: inv.fdMarkingNo,
          listCode: null,
          itemName: cleanFoxProString(inv.fdDescr) || 'Tagihan Muatan',
          satuan: null,
          qty: 1,
          itemPrice: inv.totalAmount || inv.fdTotalInv || 0,
          total: inv.totalAmount || inv.fdTotalInv || 0,
          curr: inv.fdCurr1 || 'IDR',
          berat: inv.fdBerat || 0,
          m3: inv.fdM3 || 0,
        })
      } else {
        details.forEach((d, idx) => {
          res.push({
            id: `${inv.fdInvNo}-${d.fdID || idx}`,
            invNo: inv.fdInvNo,
            invDate: inv.fdInvDate,
            branchCode: resolveBranchCode(inv.fdBranchCode, inv.fdInvNo, inv.fdMarkingCode),
            branchName: inv.fdBranchName,
            tglAgent: inv.fdTglAgent,
            typeComodityName: d.typeComodityName || inv.fdTypeComodityName,
            markingCode: inv.fdMarkingCode,
            markingNo: inv.fdMarkingNo,
            listCode: d.fdListCode,
            itemName: cleanFoxProString(d.fdItemName),
            satuan: d.fdSatuan || null,
            qty: d.fdQty || 0,
            itemPrice: d.fdItemPrice || 0,
            total: d.fdTotal || 0,
            curr: d.fdCurr || inv.fdCurr1 || 'IDR',
            berat: d.fdBerat || 0,
            m3: d.fdM3 || 0,
          })
        })
      }
    })
    return res
  }, [invoices])

  const totalInvoices = data?.pages[0]?.pagination?.totalItems ?? invoices.length
  const firstPageSummary = data?.pages[0]?.summary

  // KPI summaries
  const kpis: CustomerHistoryKpiSummary = useMemo(() => {
    let totalM3 = 0
    let totalWeight = 0
    let diffInvoicesCount = 0

    invoices.forEach((inv) => {
      totalM3 += inv.fdM3 || 0
      totalWeight += inv.fdBerat || 0
      if (inv.hasPrevDiff) diffInvoicesCount++
    })

    const totalAmount =
      firstPageSummary?.totalAmountIdr ?? invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // Calculate / assemble commodity average rates
    const backendRates = firstPageSummary?.commodityAvgRates

    // Also calculate from flattenedItems as fallback or for dynamic local tracking
    const localRatesMap = new Map<
      string,
      { totalM3: number; totalAmount: number; invoiceSet: Set<string>; itemCount: number }
    >()

    flattenedItems.forEach((item) => {
      const isM3 =
        (item.listCode || '').toUpperCase() === 'M3' ||
        (item.satuan || '').toUpperCase() === 'M3' ||
        (item.itemName || '').toUpperCase().includes('(M3)') ||
        (Boolean(item.m3) && (item.m3 || 0) > 0)
      const tc = (item.typeComodityName || 'UMUM').trim().toUpperCase()
      const cur = localRatesMap.get(tc) || {
        totalM3: 0,
        totalAmount: 0,
        invoiceSet: new Set(),
        itemCount: 0,
      }
      if (isM3 && (item.qty > 0 || (Boolean(item.m3) && (item.m3 || 0) > 0))) {
        const vol =
          item.qty > 0 && (item.listCode || '').toUpperCase() === 'M3' ? item.qty : item.m3 || 0
        cur.totalM3 += vol
        cur.totalAmount += item.total || 0
        cur.itemCount += 1
        if (item.invNo) cur.invoiceSet.add(item.invNo)
      }
      localRatesMap.set(tc, cur)
    })

    let commodityAvgRates: CommodityAvgRate[] = []
    if (backendRates && backendRates.length > 0) {
      commodityAvgRates = backendRates.slice().sort((a, b) => b.totalM3 - a.totalM3)
    } else {
      localRatesMap.forEach((data, tc) => {
        if (data.totalM3 > 0 || data.totalAmount > 0) {
          commodityAvgRates.push({
            typeComodityName: tc,
            totalAmount: data.totalAmount,
            totalM3: data.totalM3,
            avgPricePerM3: data.totalM3 > 0 ? Math.round(data.totalAmount / data.totalM3) : 0,
            invoiceCount: data.invoiceSet.size,
            itemCount: data.itemCount,
          })
        }
      })
      commodityAvgRates.sort((a, b) => b.totalM3 - a.totalM3)
    }

    const activeCommodityRate =
      selectedTypeComodity !== 'all'
        ? commodityAvgRates.find(
            (c) => c.typeComodityName.toUpperCase() === selectedTypeComodity.trim().toUpperCase()
          ) || null
        : null

    const sumM3Amount = commodityAvgRates.reduce(
      (sum, c) => sum + (c.avgPricePerM3 > 0 ? c.totalAmount : 0),
      0
    )
    const sumM3Vol = commodityAvgRates.reduce((sum, c) => sum + c.totalM3, 0)
    const overallAvgPrice =
      sumM3Vol > 0
        ? Math.round(sumM3Amount / sumM3Vol)
        : totalM3 > 0
        ? Math.round(totalAmount / totalM3)
        : 0

    const avgPricePerM3 = activeCommodityRate
      ? activeCommodityRate.avgPricePerM3
      : overallAvgPrice

    return {
      totalInvoices,
      totalItems: flattenedItems.length,
      totalAmount,
      totalM3,
      totalWeight,
      avgPricePerM3,
      diffInvoicesCount,
      diffItemsCount: 0,
      commodityAvgRates,
      activeCommodityRate,
    }
  }, [firstPageSummary, totalInvoices, invoices, flattenedItems, selectedTypeComodity])

  const resetFilters = () => {
    setSearch('')
    setSelectedYear('all')
    setSelectedBranch('all')
    setSelectedTypeComodity('all')
    setSelectedDiffStatus('all')
    setSelectedModa('all')
    setSelectedStatus('all')
  }

  return {
    invoices,
    flattenedItems,
    kpis,
    availableBranches,
    availableComodityTypes,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    refetch,
    totalCount: totalInvoices,
    loadedCount: viewMode === 'invoice' ? invoices.length : flattenedItems.length,
    viewMode,
    setViewMode,
    search,
    setSearch,
    selectedYear,
    setSelectedYear,
    selectedBranch,
    setSelectedBranch,
    selectedTypeComodity,
    setSelectedTypeComodity,
    selectedDiffStatus,
    setSelectedDiffStatus,
    selectedModa,
    setSelectedModa,
    selectedStatus,
    setSelectedStatus,
    resetFilters,
  }
}
