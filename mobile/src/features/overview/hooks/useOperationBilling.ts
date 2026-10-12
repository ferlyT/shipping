import { useQuery } from '@tanstack/react-query'
import { operationBillingService } from '../services/operationBilling.service'

export function useBillingKpisQuery(year?: number, month?: number, enabled = true) {
  return useQuery({
    queryKey: ['operation-billing-kpis', year, month],
    queryFn: () => operationBillingService.getBillingKpis(year, month),
    enabled,
    staleTime: 60_000,
  })
}

export function useUnissuedBillsQuery(
  params?: { search?: string; mode?: string; aging?: string },
  enabled = true
) {
  return useQuery({
    queryKey: ['operation-unissued-bills', params?.search, params?.mode, params?.aging],
    queryFn: () => operationBillingService.getUnissuedBills(params),
    enabled,
    staleTime: 30_000,
  })
}

export function useBatchExitComparisonQuery(
  year?: number,
  month?: number,
  allTime?: boolean,
  enabled = true
) {
  return useQuery({
    queryKey: ['operation-batch-exit-comparison', year, month, allTime],
    queryFn: () => operationBillingService.getBatchExitComparison(year, month, allTime),
    enabled,
    staleTime: 60_000,
  })
}

export function useBatchExitCargoDetailsQuery(markingCode: string | null, enabled = true) {
  return useQuery({
    queryKey: ['operation-batch-exit-cargo-details', markingCode],
    queryFn: () => operationBillingService.getBatchExitCargoDetails(markingCode || ''),
    enabled: Boolean(markingCode && enabled),
    staleTime: 60_000,
  })
}
