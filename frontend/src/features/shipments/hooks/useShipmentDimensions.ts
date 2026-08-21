import { useQuery } from '@tanstack/react-query'
import { shipmentsApi } from '../services/shipments.service'

/**
 * Hook untuk memuat 3 dimensi pengiriman sekaligus (Gudang, Packing List, Komplain)
 */
export function useShipmentMultiDimensions(listCode: string | undefined) {
  const gudangQuery = useQuery({
    queryKey: ['shipmentDimsGudang', listCode],
    queryFn: async () => {
      if (!listCode) return []
      return await shipmentsApi.getDimensionsGudang(listCode)
    },
    enabled: !!listCode,
  })

  const packingListQuery = useQuery({
    queryKey: ['shipmentDimsPackingList', listCode],
    queryFn: async () => {
      if (!listCode) return []
      return await shipmentsApi.getDimensionsPackingList(listCode)
    },
    enabled: !!listCode,
  })

  const komplainQuery = useQuery({
    queryKey: ['shipmentDimsKomplain', listCode],
    queryFn: async () => {
      if (!listCode) return []
      return await shipmentsApi.getDimensionsKomplain(listCode)
    },
    enabled: !!listCode,
  })

  return {
    dimsGudang: gudangQuery.data || [],
    isLoadingGudang: gudangQuery.isLoading,
    dimsPackingList: packingListQuery.data || [],
    isLoadingPackingList: packingListQuery.isLoading,
    dimsKomplain: komplainQuery.data || [],
    isLoadingKomplain: komplainQuery.isLoading,
    isLoadingAll: gudangQuery.isLoading || packingListQuery.isLoading || komplainQuery.isLoading,
  }
}

/**
 * Legacy hook untuk backward compatibility (dimensi umum)
 */
export function useShipmentDimensions(listCode: string | undefined) {
  return useQuery({
    queryKey: ['shipmentDimensions', listCode],
    queryFn: async () => {
      if (!listCode) return []
      const res = await shipmentsApi.getDimensions(listCode)
      return res || []
    },
    enabled: !!listCode,
  })
}
