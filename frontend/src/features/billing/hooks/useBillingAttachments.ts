import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import type { BillingAttachment } from '../types/billing.types'

export function useBillingAttachments(invNo?: string | null, enabled = true) {
  const cleanInv = (invNo || '').trim()

  return useQuery({
    queryKey: ['billingAttachments', cleanInv],
    queryFn: async (): Promise<BillingAttachment[]> => {
      if (!cleanInv) return []
      return await billingApi.getAttachments(cleanInv)
    },
    enabled: Boolean(cleanInv) && enabled,
    staleTime: 30000,
  })
}

export function useBillingAttachmentMutations(invNo?: string | null) {
  const queryClient = useQueryClient()
  const cleanInv = (invNo || '').trim()

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (payload: {
      fileBase64: string
      fileName: string
      fileType?: string
      caption?: string
    }) => {
      if (!cleanInv) throw new Error('Nomor invoice tidak valid')
      return await billingApi.uploadAttachment(cleanInv, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingAttachments', cleanInv] })
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['billing', cleanInv] })
    },
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      if (!cleanInv) throw new Error('Nomor invoice tidak valid')
      return await billingApi.deleteAttachment(cleanInv, attachmentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingAttachments', cleanInv] })
      queryClient.invalidateQueries({ queryKey: ['billings'] })
      queryClient.invalidateQueries({ queryKey: ['billing', cleanInv] })
    },
  })

  return {
    uploadAttachmentMutation,
    deleteAttachmentMutation,
  }
}
