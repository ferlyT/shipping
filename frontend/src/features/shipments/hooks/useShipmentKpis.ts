import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '../services/shipments.service'


interface UseShipmentKpisParams {
  search?: string
  listType?: '1' | '2'
}

export function useShipmentKpis({ search, listType }: UseShipmentKpisParams) {
  return useQuery({
    queryKey: ['shipmentsKpi', search, listType],
    queryFn: async () => {
      const res = await shipmentsApi.getKpis({
        ...(search && { search }),
        ...(listType && { listType }),
      })
      return res
    },
  })
}
