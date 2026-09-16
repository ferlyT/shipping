import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function useBatchesQuery(search: string, modeFilter: 'all' | '1' | '2', enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ['logistics-batches', search, modeFilter],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const params: any = { page: pageParam, limit: 20 }
      if (search.trim()) params.search = search.trim()
      if (modeFilter !== 'all') params.listType = modeFilter
      const res = await apiClient.get('/marking', { params })
      return {
        data: res.data.data || [],
        meta: res.data.meta,
      }
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const currentPage = lastPage.meta?.page ?? allPages.length
      const totalPages = lastPage.meta?.totalPages
      if (totalPages !== undefined && currentPage < totalPages) {
        return currentPage + 1
      }
      if (lastPage.data && lastPage.data.length === 20) {
        return currentPage + 1
      }
      return undefined
    },
    enabled,
  })

  const data = useMemo(() => query.data?.pages.flatMap((p) => p.data) || [], [query.data])

  return { ...query, data }
}
