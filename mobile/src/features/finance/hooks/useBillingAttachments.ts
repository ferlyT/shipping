import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { useToastStore } from '@/stores/toastStore'

export interface BillingAttachment {
  fdId: number
  fdInvNo: string
  fdFileName: string
  fdFileSavedName: string
  fdFileType: string
  fdFileSize: number
  fdFileUrl: string
  fdCaption?: string | null
  fdUploadedBy: string
  fdCreatedAt: string
}

export function useBillingAttachments(invNo?: string | null, enabled: boolean = true) {
  const cleanInv = (invNo || '').trim()

  return useQuery<BillingAttachment[]>({
    queryKey: ['billing-attachments', cleanInv],
    queryFn: async () => {
      if (!cleanInv) return []
      const res = await apiClient.get(`/billing/${encodeURIComponent(cleanInv)}/attachments`)
      return res.data.data || []
    },
    enabled: enabled && Boolean(cleanInv),
    staleTime: 15000,
  })
}

export function useUploadBillingAttachment() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  return useMutation({
    mutationFn: async ({
      invNo,
      fileBase64,
      fileName,
      fileType,
      caption,
    }: {
      invNo: string
      fileBase64: string
      fileName: string
      fileType?: string
      caption?: string
    }): Promise<BillingAttachment> => {
      const cleanInv = invNo.trim()
      const res = await apiClient.post(`/billing/${encodeURIComponent(cleanInv)}/attachments`, {
        fileBase64,
        fileName,
        fileType,
        caption,
      })
      return res.data.data
    },
    onSuccess: (_, variables) => {
      const cleanInv = variables.invNo.trim()
      queryClient.invalidateQueries({ queryKey: ['billing-attachments', cleanInv] })
      showToast('Lampiran berhasil diunggah', 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal mengunggah lampiran'
      showToast(msg, 'error')
    },
  })
}

export function useDeleteBillingAttachment() {
  const queryClient = useQueryClient()
  const { showToast } = useToastStore()

  return useMutation({
    mutationFn: async ({
      invNo,
      attachmentId,
    }: {
      invNo: string
      attachmentId: number
    }) => {
      const cleanInv = invNo.trim()
      const res = await apiClient.delete(`/billing/${encodeURIComponent(cleanInv)}/attachments/${attachmentId}`)
      return res.data.data
    },
    onSuccess: (_, variables) => {
      const cleanInv = variables.invNo.trim()
      queryClient.invalidateQueries({ queryKey: ['billing-attachments', cleanInv] })
      showToast('Lampiran berhasil dihapus', 'success')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Gagal menghapus lampiran'
      showToast(msg, 'error')
    },
  })
}
