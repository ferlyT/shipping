import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useToastStore } from '@/stores/toastStore'
import type { BapPhoto } from '../types/inspectionReport.types'

export function useBapPhotos(reportId?: number | null, enabled: boolean = true) {
  return useQuery<BapPhoto[]>({
    queryKey: ['bap-photos', reportId],
    queryFn: async () => {
      if (!reportId) return []
      const res = await apiClient.get(`/inspection-reports/${reportId}/photos`)
      return res.data.data || []
    },
    enabled: enabled && Boolean(reportId),
    staleTime: 10000,
  })
}

export function useUploadBapPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  return useMutation({
    mutationFn: async ({
      reportId,
      photoBase64,
      caption,
      annotationsSvg,
    }: {
      reportId: number
      photoBase64: string
      caption?: string
      annotationsSvg?: string
    }): Promise<BapPhoto> => {
      const res = await apiClient.post(`/inspection-reports/${reportId}/photos`, {
        photoBase64,
        caption,
        annotationsSvg,
      })
      return res.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bap-photos', variables.reportId] })
      queryClient.invalidateQueries({ queryKey: ['inspection-reports'] })
      queryClient.invalidateQueries({
        queryKey: ['inspection-report-detail', variables.reportId],
      })
      showToast('Foto berhasil diunggah', 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal mengunggah foto'
      showToast(msg, 'error')
    },
  })
}

export function useDeleteBapPhoto() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  return useMutation({
    mutationFn: async ({
      reportId,
      photoId,
    }: {
      reportId: number
      photoId: number
    }) => {
      const res = await apiClient.delete(`/inspection-reports/${reportId}/photos/${photoId}`)
      return res.data.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bap-photos', variables.reportId] })
      queryClient.invalidateQueries({ queryKey: ['inspection-reports'] })
      queryClient.invalidateQueries({
        queryKey: ['inspection-report-detail', variables.reportId],
      })
      showToast('Foto berhasil dihapus', 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal menghapus foto'
      showToast(msg, 'error')
    },
  })
}
