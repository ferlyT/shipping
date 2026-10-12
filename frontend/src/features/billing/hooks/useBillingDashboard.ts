import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import type {
  BillingKpis,
  BillingTrends,
  BillingByEmployeeDaily,
  SjVsBillPoint,
  UnbilledSjDetailItem,
  BatchExitComparisonSummary,
  BatchExitItem,
} from '../types/billing.types'

export interface TargetCategories {
  sjSent: number
  codUrgent: number
  agingGt7: number
  fcl: number
}

export interface BillingDashboardData {
  kpis: BillingKpis & {
    targetBillUdara?: {
      total: number
      breakdown: { kiki: number; yati: number }
      categories?: TargetCategories
    }
    targetBillLaut?: {
      total: number
      breakdown: { thara: number; rico: number; ferly: number }
      categories?: TargetCategories
    }
    invoicesBulanIniBreakdown?: { udara: number; laut: number }
    tagihanBulanIniBreakdown?: { udara: number; laut: number }
  } | undefined
  daily: BillingTrends['daily']
  monthly: BillingTrends['monthly']
  byEmployeeSeries: BillingByEmployeeDaily['series']
  byEmployeeData: BillingByEmployeeDaily['data']
  sjVsBillData: SjVsBillPoint[]
  unbilledSjDetails: UnbilledSjDetailItem[]
  batchExitSummary?: BatchExitComparisonSummary
  batchExitBatches: BatchExitItem[]
  isLoadingKpi: boolean
  isLoadingTrends: boolean
  isLoadingByEmployee: boolean
  isLoadingSjVsBill: boolean
  isLoadingBatchExit: boolean
}

export function useBillingDashboard(
  daysFilter: number = 30,
  selectedYear?: number,
  selectedMonth?: number,
  batchExitAllTime: boolean = false,
  employeeDaysFilter?: number,
  sjDaysFilter?: number
): BillingDashboardData {
  const actualEmployeeDays = employeeDaysFilter ?? daysFilter
  const actualSjDays = sjDaysFilter ?? daysFilter

  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['billingKpi', selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await billingApi.getKPIs({ year: selectedYear, month: selectedMonth })
      return res.data as { data: BillingDashboardData['kpis'] }
    },
    staleTime: 60_000,
  })

  const { data: trendsRes, isLoading: isLoadingTrends } = useQuery({
    queryKey: ['billingTrends', daysFilter],
    queryFn: async () => {
      const res = await billingApi.trends({ days: daysFilter })
      return res.data as { data: BillingTrends }
    },
    staleTime: 60_000,
  })

  const { data: byEmployeeRes, isLoading: isLoadingByEmployee } = useQuery({
    queryKey: ['billingByEmployeeDaily', actualEmployeeDays],
    queryFn: async () => {
      const res = await billingApi.byEmployeeDailyChart({ days: actualEmployeeDays })
      return res.data as { data: BillingByEmployeeDaily }
    },
    staleTime: 60_000,
  })

  const { data: sjVsBillRes, isLoading: isLoadingSjVsBill } = useQuery({
    queryKey: ['billingSjVsBill', actualSjDays],
    queryFn: async () => {
      const res = await billingApi.sjVsBillChart({ days: actualSjDays })
      return res.data as { data: { data: SjVsBillPoint[] } }
    },
    staleTime: 60_000,
  })

  const { data: unbilledSjDetailsRes } = useQuery({
    queryKey: ['billingSjVsBillUnbilledDetails'],
    queryFn: async () => {
      const res = await billingApi.sjVsBillDetails({ pic: 'all', type: 'unbilled' })
      return res.data as { data: UnbilledSjDetailItem[] }
    },
    staleTime: 60_000,
  })

  const rawUnbilledDetails = unbilledSjDetailsRes?.data
  const unbilledSjDetails: UnbilledSjDetailItem[] = Array.isArray(rawUnbilledDetails)
    ? rawUnbilledDetails
    : Array.isArray((rawUnbilledDetails as any)?.data)
    ? (rawUnbilledDetails as any).data
    : []

  const byEmployeeSeries = byEmployeeRes?.data.series || []

  const byEmployeeData = useMemo(() => {
    const rawData = byEmployeeRes?.data.data || []
    if (rawData.length === 0) return rawData
    const countKeys = byEmployeeSeries.map((s) => s.key)
    return rawData.filter((row) =>
      countKeys.some((k) => typeof row[k] === 'number' && (row[k] as number) > 0)
    )
  }, [byEmployeeRes, byEmployeeSeries])

  const rawSjVsBillData = sjVsBillRes?.data
  const sjVsBillRaw: SjVsBillPoint[] = Array.isArray(rawSjVsBillData)
    ? rawSjVsBillData
    : Array.isArray((rawSjVsBillData as any)?.data)
    ? (rawSjVsBillData as any).data
    : []

  const sjVsBillData = useMemo(() => {
    return sjVsBillRaw.map((row: any) => {
      const sjYati = Number(row['sj_yati']) || 0
      const sjKiki = Number(row['sj_kiki']) || 0
      const sjThara = Number(row['sj_thara']) || 0
      const sjFerly = Number(row['sj_ferly']) || 0
      const sjRico = Number(row['sj_rico']) || 0

      const billYati = Number(row['bill_yati']) || 0
      const billKiki = Number(row['bill_kiki']) || 0
      const billThara = Number(row['bill_thara']) || 0
      const billFerly = Number(row['bill_ferly']) || 0
      const billRico = Number(row['bill_rico']) || 0

      const unbilledYati = Number(row['unbilled_yati']) || 0
      const unbilledKiki = Number(row['unbilled_kiki']) || 0
      const unbilledThara = Number(row['unbilled_thara']) || 0
      const unbilledFerly = Number(row['unbilled_ferly']) || 0
      const unbilledRico = Number(row['unbilled_rico']) || 0

      const totalSjAll = sjYati + sjKiki + sjThara + sjFerly + sjRico
      const totalBillAll = billYati + billKiki + billThara + billFerly + billRico
      const totalUnbilledAll = unbilledYati + unbilledKiki + unbilledThara + unbilledFerly + unbilledRico

      const unbilledListYati = Number(row['unbilled_list_yati']) || 0
      const unbilledListKiki = Number(row['unbilled_list_kiki']) || 0
      const unbilledListThara = Number(row['unbilled_list_thara']) || 0
      const unbilledListFerly = Number(row['unbilled_list_ferly']) || 0
      const unbilledListRico = Number(row['unbilled_list_rico']) || 0
      const totalUnbilledListAll = unbilledListYati + unbilledListKiki + unbilledListThara + unbilledListFerly + unbilledListRico

      return {
        ...row,
        sj: totalSjAll,
        bill: totalBillAll,
        unbilled: totalUnbilledAll,
        unbilledList: totalUnbilledListAll,
        sj_yatiKiki: sjYati + sjKiki,
        bill_yatiKiki: billYati + billKiki,
        unbilled_yatiKiki: unbilledYati + unbilledKiki,
        sj_all: totalSjAll,
        bill_all: totalBillAll,
        unbilled_all: totalUnbilledAll,
        unbilled_list_all: totalUnbilledListAll,
      }
    })
  }, [sjVsBillRaw])

  const { data: batchExitRes, isLoading: isLoadingBatchExit } = useQuery({
    queryKey: ['billingBatchExitComparison', selectedYear, selectedMonth, batchExitAllTime],
    queryFn: async () => {
      const res = await billingApi.getBatchExitComparison({
        year: selectedYear,
        month: selectedMonth,
        allTime: batchExitAllTime,
      })
      return res.data as { data: import('../types/billing.types').BatchExitComparisonResponse }
    },
    staleTime: 60_000,
  })

  return {
    kpis: kpiData?.data,
    daily: trendsRes?.data.daily || [],
    monthly: trendsRes?.data.monthly || [],
    byEmployeeSeries,
    byEmployeeData,
    sjVsBillData,
    unbilledSjDetails,
    batchExitSummary: batchExitRes?.data.summary,
    batchExitBatches: batchExitRes?.data.batches || [],
    isLoadingKpi,
    isLoadingTrends,
    isLoadingByEmployee,
    isLoadingSjVsBill,
    isLoadingBatchExit,
  }
}
