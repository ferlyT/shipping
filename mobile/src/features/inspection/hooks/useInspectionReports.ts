import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { InspectionReport, InspectionReportsMeta } from '../types/inspectionReport.types'

interface FetchResponse {
  data: InspectionReport[]
  meta: InspectionReportsMeta
}

export function useInspectionReports(
  search: string,
  status: string,
  enabled: boolean = true
) {
  const query = useInfiniteQuery({
    queryKey: ['inspection-reports', search, status],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }): Promise<FetchResponse> => {
      const params: Record<string, any> = {
        page: pageParam,
        limit: 15,
      }
      if (search.trim()) params.search = search.trim()
      if (status && status !== 'all') params.status = status

      const res = await apiClient.get('/inspection-reports', { params })
      return {
        data: res.data.data || [],
        meta: res.data.meta || { page: 1, limit: 15, total: 0, totalPages: 1 },
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta && lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1
      }
      return undefined
    },
    enabled,
  })

  const data = useMemo(() => query.data?.pages.flatMap((p) => p.data) || [], [query.data])
  const total = query.data?.pages[0]?.meta?.total ?? 0

  return { ...query, data, total }
}
