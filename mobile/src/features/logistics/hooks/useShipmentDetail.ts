import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { calcTotalVolume } from '@/lib/utils'

export function useShipmentDetail(listCode: string | undefined, selectedItem: any) {
  const { data: shipmentDetail, isLoading: isShipmentDetailLoading } = useQuery({
    queryKey: ['shipment-detail', listCode],
    queryFn: async () => {
      if (!listCode) return null
      const res = await apiClient.get(`/shipments/${encodeURIComponent(listCode)}`)
      return res.data.data
    },
    enabled: Boolean(listCode),
  })

  const { data: dimsGudang = [], isLoading: isDimsGudangLoading } = useQuery({
    queryKey: ['shipment-dims-gudang', listCode],
    queryFn: async () => {
      if (!listCode) return []
      const res = await apiClient.get(`/shipments/${encodeURIComponent(listCode)}/dimensions/gudang`)
      return res.data.data || []
    },
    enabled: Boolean(listCode),
  })

  const { data: dimsPackingList = [], isLoading: isDimsPackingListLoading } = useQuery({
    queryKey: ['shipment-dims-packinglist', listCode],
    queryFn: async () => {
      if (!listCode) return []
      const res = await apiClient.get(`/shipments/${encodeURIComponent(listCode)}/dimensions/packinglist`)
      return res.data.data || []
    },
    enabled: Boolean(listCode),
  })

  const { data: dimsKomplain = [], isLoading: isDimsKomplainLoading } = useQuery({
    queryKey: ['shipment-dims-komplain', listCode],
    queryFn: async () => {
      if (!listCode) return []
      const res = await apiClient.get(`/shipments/${encodeURIComponent(listCode)}/dimensions/komplain`)
      return res.data.data || []
    },
    enabled: Boolean(listCode),
  })

  const activeShipment = useMemo(() => {
    if (!selectedItem) return null
    return {
      ...selectedItem,
      ...(shipmentDetail || {}),
    }
  }, [selectedItem, shipmentDetail])

  const totalDimCount = (dimsPackingList?.length || 0) + (dimsGudang?.length || 0) + (dimsKomplain?.length || 0)

  const getSubTabVolume = (dimSubTab: 'packinglist' | 'gudang' | 'komplain') => {
    if (dimSubTab === 'packinglist') return calcTotalVolume(dimsPackingList)
    if (dimSubTab === 'gudang') return calcTotalVolume(dimsGudang)
    return calcTotalVolume(dimsKomplain)
  }

  return {
    shipmentDetail,
    isShipmentDetailLoading,
    dimsGudang,
    isDimsGudangLoading,
    dimsPackingList,
    isDimsPackingListLoading,
    dimsKomplain,
    isDimsKomplainLoading,
    activeShipment,
    totalDimCount,
    getSubTabVolume,
  }
}
