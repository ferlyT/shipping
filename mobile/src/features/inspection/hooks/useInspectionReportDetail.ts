import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { InspectionReport } from '../types/inspectionReport.types'

export function useInspectionReportDetail(id: number | null, enabled: boolean = true) {
  return useQuery<InspectionReport | null>({
    queryKey: ['inspection-report-detail', id],
    queryFn: async () => {
      if (!id) return null
      const res = await apiClient.get(`/inspection-reports/${id}`)
      return res.data.data || null
    },
    enabled: enabled && Boolean(id),
    staleTime: 30000,
  })
}
