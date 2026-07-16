import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '@/api/endpoints'


export function useShipmentDetail(listCode: string | undefined) {
  return useQuery({
    queryKey: ['shipmentDetail', listCode],
    queryFn: async () => {
      if (!listCode) return null
      const res = await shipmentsApi.getById(listCode)
      return res
    },
    enabled: !!listCode,
  })
}
