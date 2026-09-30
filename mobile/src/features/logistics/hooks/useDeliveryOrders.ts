import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function useDeliveryOrdersQuery(search: string, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ['logistics-do', search],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const params: any = { page: pageParam, limit: 20 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/delivery-orders', { params })
      return {
        data: res.data.data || [],
        meta: res.data.meta,
      }
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const currentPage = lastPage.meta?.page ?? allPages.length
      const totalPages = lastPage.meta?.totalPages
      if (totalPages !== undefined) {
        return currentPage < totalPages ? currentPage + 1 : undefined
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
