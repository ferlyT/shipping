import { useQuery, keepPreviousData } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { LookupMarkingEntry } from '../types/inspectionReport.types'

export function useMarkingLookup(
  search: string,
  listType: number = 2,
  enabled: boolean = true
) {
  const cleanSearch = search.trim()

  return useQuery<LookupMarkingEntry[]>({
    queryKey: ['marking-lookup', listType, cleanSearch],
    queryFn: async () => {
      if (cleanSearch.length < 1) return []
      const res = await apiClient.get('/inspection-reports/lookup', {
        params: { search: cleanSearch, listType, limit: 20 },
      })
      return res.data.data || []
    },
    enabled: enabled && cleanSearch.length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 30000,
  })
}
