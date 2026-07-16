import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '@/api/endpoints'


interface UseShipmentsListParams {
  page: number
  limit: number
  search?: string
  listType?: '1' | '2'
}

export function useShipmentsList({ page, limit, search, listType }: UseShipmentsListParams) {
  return useQuery({
    queryKey: ['shipments', page, limit, search, listType],
    queryFn: async () => {
      const res = await shipmentsApi.getList({
        page,
        limit,
        ...(search && { search }),
        ...(listType && { listType }),
      })
      return res
    },
  })
}
