import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useToastStore } from '@/stores/toastStore'
import type {
  CreateInspectionPayload,
  UpdateInspectionPayload,
  InspectionReport,
} from '../types/inspectionReport.types'

export function useInspectionMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  const createMutation = useMutation({
    mutationFn: async (payload: CreateInspectionPayload): Promise<InspectionReport> => {
      const res = await apiClient.post('/inspection-reports', payload)
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-reports'] })
      showToast(`BAP ${data.fdReportNumber} berhasil dibuat`, 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal membuat BAP'
      showToast(msg, 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateInspectionPayload
    }): Promise<InspectionReport> => {
      const res = await apiClient.put(`/inspection-reports/${id}`, payload)
      return res.data.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-reports'] })
      queryClient.invalidateQueries({ queryKey: ['inspection-report-detail', data.fdId] })
      showToast(`BAP ${data.fdReportNumber} berhasil diperbarui`, 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal memperbarui BAP'
      showToast(msg, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/inspection-reports/${id}`)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-reports'] })
      showToast('BAP berhasil dihapus', 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal menghapus BAP'
      showToast(msg, 'error')
    },
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  }
}
