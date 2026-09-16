import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

export function useBatchManifest(selectedBatch: any, setSelectedBatch: (v: any) => void) {
  const markingCode = selectedBatch?.fdMarkingCode

  const { data: manifestData, isLoading: isManifestLoading } = useQuery({
    queryKey: ['marking-manifest', markingCode],
    queryFn: async () => {
      if (!markingCode) return []
      const res = await apiClient.get(`/marking/${encodeURIComponent(markingCode)}/manifest`)
      return res.data.data || []
    },
    enabled: Boolean(markingCode),
  })

  // Enrich batch header if only markingCode is known
  useQuery({
    queryKey: ['marking-detail-header', markingCode],
    queryFn: async () => {
      if (!markingCode) return null
      const res = await apiClient.get(`/marking/${encodeURIComponent(markingCode.trim())}`)
      if (res.data?.data) {
        setSelectedBatch((prev: any) => ({ ...res.data.data, ...prev }))
      }
      return res.data.data
    },
    enabled: Boolean(markingCode && (!selectedBatch?.fdBranchCode || !selectedBatch?.fdContNo)),
  })

  const manifestSummary = useMemo(() => {
    if (!manifestData || manifestData.length === 0) {
      return { totalResi: 0, totalPack: 0, totalBerat: 0, totalM3: 0, totalCustomer: 0 }
    }
    let totalPack = 0
    let totalBerat = 0
    let totalM3 = 0
    const custSet = new Set<string>()

    manifestData.forEach((item: any) => {
      totalPack += Number(item.fdJmlPack) || 0
      totalBerat += Number(item.fdJmlBerat) || 0
      totalM3 += Number(item.fdM3) || 0
      const name = item.fdCustName?.trim()
      if (name) {
        custSet.add(name.toUpperCase())
      }
    })

    return {
      totalResi: manifestData.length,
      totalPack,
      totalBerat,
      totalM3,
      totalCustomer: custSet.size,
    }
  }, [manifestData])

  return {
    manifestData,
    isManifestLoading,
    manifestSummary,
  }
}
