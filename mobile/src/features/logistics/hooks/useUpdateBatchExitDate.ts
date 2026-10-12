import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useToastStore } from '@/stores/toastStore'

export interface UpdateBatchExitDatePayload {
  exitDate: string
  notes?: string
}

export function useUpdateBatchExitDate() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  return useMutation({
    mutationFn: async ({
      markingCode,
      payload,
    }: {
      markingCode: string
      payload: UpdateBatchExitDatePayload
    }) => {
      const cleanCode = markingCode.trim()
      const res = await apiClient.patch(`/marking/${encodeURIComponent(cleanCode)}/exit-date`, payload)
      return res.data
    },
    onSuccess: (_, variables) => {
      showToast('Tanggal exit berhasil disimpan', 'success')
      queryClient.invalidateQueries({ queryKey: ['logistics-batches'] })
      queryClient.invalidateQueries({ queryKey: ['exit-batches'] })
      queryClient.invalidateQueries({ queryKey: ['marking-kpi-overview'] })
      queryClient.invalidateQueries({ queryKey: ['batch-manifest', variables.markingCode.trim()] })
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message || 'Gagal menyimpan tanggal exit'
      showToast(msg, 'error')
    },
  })
}
