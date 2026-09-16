import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function useShipmentsQuery(search: string, modeFilter: 'all' | '1' | '2', enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey: ['logistics-shipments', search, modeFilter],
    initialPageParam: { skip: 0, limit: 10 },
    queryFn: async ({ pageParam = { skip: 0, limit: 10 } }: { pageParam: { skip: number; limit: number } }) => {
      const params: any = { skip: pageParam.skip, limit: pageParam.limit }
      if (search.trim()) params.search = search.trim()
      if (modeFilter !== 'all') params.listType = modeFilter
      const res = await apiClient.get('/shipments', { params })
      return {
        data: res.data.data || [],
        meta: res.data.meta,
      }
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const totalLoaded = allPages.reduce((sum, p) => sum + (p.data?.length || 0), 0)
      const total = lastPage.meta?.total ?? 0
      if (totalLoaded < total && lastPage.data && lastPage.data.length > 0) {
        return { skip: totalLoaded, limit: 5 }
      }
      return undefined
    },
    enabled,
  })

  const data = useMemo(() => query.data?.pages.flatMap((p) => p.data) || [], [query.data])

  return { ...query, data }
}
