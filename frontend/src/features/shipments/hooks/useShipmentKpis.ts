import { useQuery } from '@tanstack/react-query'
import { shipmentsApi, type SearchFieldType } from '../services/shipments.service'

interface UseShipmentKpisParams {
  search?: string
  searchField?: SearchFieldType
  listType?: '1' | '2'
}

export function useShipmentKpis({ search, searchField, listType }: UseShipmentKpisParams) {
  return useQuery({
    queryKey: ['shipmentsKpi', search, searchField, listType],
    queryFn: async () => {
      const res = await shipmentsApi.getKpis({
        ...(search && { search }),
        ...(searchField && searchField !== 'ALL' && { searchField }),
        ...(listType && { listType }),
      })
      return res
    },
  })
}
