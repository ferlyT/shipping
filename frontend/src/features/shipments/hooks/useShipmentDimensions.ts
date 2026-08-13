import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '../services/shipments.service'


export function useShipmentDimensions(listCode: string | undefined) {
  return useQuery({
    queryKey: ['shipmentDimensions', listCode],
    queryFn: async () => {
      if (!listCode) return []
      const res = await shipmentsApi.getDimensions(listCode)
      return (res || [])
    },
    enabled: !!listCode,
  })
}
