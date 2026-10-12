import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function useMasterCustomersQuery(search: string) {
  const query = useInfiniteQuery({
    queryKey: ['master-customers', search],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const params: any = { page: pageParam, limit: 30 }
      if (search.trim()) params.search = search.trim()
      const res = await apiClient.get('/customers', { params })
      return {
        data: res.data.data || [],
        meta: res.data.meta,
      }
    },
    getNextPageParam: (lastPage: any, allPages: any[]) => {
      const currentPage = Number(lastPage?.meta?.page) || allPages.length
      const totalPages = Number(lastPage?.meta?.totalPages) || 0
      const items = lastPage?.data || []
      if (!items || items.length === 0) return undefined
      if (totalPages > 0 && currentPage >= totalPages) return undefined
      return currentPage + 1
    },
  })

  const data = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) || []
  }, [query.data])

  return { ...query, data }
}
