import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import type {
  BillingKpis,
  BillingTrends,
  BillingByEmployeeDaily,
  SjVsBillPoint,
} from '../types/billing.types'

export interface BillingDashboardData {
  kpis: BillingKpis & {
    targetBillUdara?: { total: number; breakdown: { kiki: number; yati: number } }
    targetBillLaut?: { total: number; breakdown: { thara: number; rico: number; ferly: number } }
    invoicesBulanIniBreakdown?: { udara: number; laut: number }
    tagihanBulanIniBreakdown?: { udara: number; laut: number }
  } | undefined
  daily: BillingTrends['daily']
  monthly: BillingTrends['monthly']
  byEmployeeSeries: BillingByEmployeeDaily['series']
  byEmployeeData: BillingByEmployeeDaily['data']
  sjVsBillData: SjVsBillPoint[]
  isLoadingKpi: boolean
  isLoadingTrends: boolean
  isLoadingByEmployee: boolean
  isLoadingSjVsBill: boolean
}

export function useBillingDashboard(daysFilter: number = 30): BillingDashboardData {
  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['billingKpi'],
    queryFn: async () => {
      const res = await billingApi.getKPIs({})
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
    queryKey: ['billingByEmployeeDaily', daysFilter],
    queryFn: async () => {
      const res = await billingApi.byEmployeeDailyChart({ days: daysFilter })
      return res.data as { data: BillingByEmployeeDaily }
    },
    staleTime: 60_000,
  })

  const { data: sjVsBillRes, isLoading: isLoadingSjVsBill } = useQuery({
    queryKey: ['billingSjVsBill', daysFilter],
    queryFn: async () => {
      const res = await billingApi.sjVsBillChart({ days: daysFilter })
      return res.data as { data: { data: SjVsBillPoint[] } }
    },
    staleTime: 60_000,
  })

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

      return {
        ...row,
        sj_yatiKiki: sjYati + sjKiki,
        bill_yatiKiki: billYati + billKiki,
        unbilled_yatiKiki: unbilledYati + unbilledKiki,
        sj_all: sjYati + sjKiki + sjThara + sjFerly + sjRico,
        bill_all: billYati + billKiki + billThara + billFerly + billRico,
        unbilled_all: unbilledYati + unbilledKiki + unbilledThara + unbilledFerly + unbilledRico,
      }
    })
  }, [sjVsBillRaw])

  return {
    kpis: kpiData?.data,
    daily: trendsRes?.data.daily || [],
    monthly: trendsRes?.data.monthly || [],
    byEmployeeSeries,
    byEmployeeData,
    sjVsBillData,
    isLoadingKpi,
    isLoadingTrends,
    isLoadingByEmployee,
    isLoadingSjVsBill,
  }
}
