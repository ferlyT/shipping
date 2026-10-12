import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dataRevisionsApi } from '../services/data-revisions.service'
import type { DataRevisionsListParams } from '../types/data-revisions.types'
import { toast } from 'sonner'

export const DATA_REVISIONS_QUERY_KEY = 'data-revisions'

export function useDataRevisions(params: DataRevisionsListParams) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, params],
    queryFn: () => dataRevisionsApi.list(params),
    staleTime: 1000 * 30, // 30 detik
  })
}

export function useDataRevisionDetail(id?: number | string) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, 'detail', id],
    queryFn: () => dataRevisionsApi.detail(id!),
    enabled: Boolean(id),
  })
}

export function useNextFormNumber(enabled: boolean = true) {
  return useQuery({
    queryKey: [DATA_REVISIONS_QUERY_KEY, 'next-number'],
    queryFn: () => dataRevisionsApi.getNextNumber(),
    enabled,
    staleTime: 0,
  })
}

export function useDataRevisionMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [DATA_REVISIONS_QUERY_KEY] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: any) => dataRevisionsApi.create(payload),
    onSuccess: (res) => {
      toast.success(`Form ${res.data.fdNomorForm} berhasil dibuat`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal membuat Form Revisi')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: any }) =>
      dataRevisionsApi.update(id, payload),
    onSuccess: (res) => {
      toast.success(`Form ${res.data.fdNomorForm} berhasil diperbarui`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui Form Revisi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => dataRevisionsApi.delete(id),
    onSuccess: () => {
      toast.success('Form Revisi Data berhasil dihapus')
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus form')
    },
  })

  const executeCancelMutation = useMutation({
    mutationFn: (id: number | string) => dataRevisionsApi.executeCancel(id),
    onSuccess: (res) => {
      toast.success(
        `Berhasil membatalkan data (fdCancel = 1) untuk Form ${res.data.fdNomorForm}`
      )
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengeksekusi pembatalan data')
    },
  })

  const revertCancelMutation = useMutation({
    mutationFn: (id: number | string) => dataRevisionsApi.revertCancel(id),
    onSuccess: (res) => {
      toast.success(`Status pembatalan dikembalikan untuk Form ${res.data.fdNomorForm}`)
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengembalikan pembatalan data')
    },
  })

  const uploadLampiranMutation = useMutation({
    mutationFn: ({
      id,
      file,
      keterangan,
    }: {
      id: number | string
      file: File
      keterangan?: string
    }) => dataRevisionsApi.uploadLampiran(id, file, keterangan),
    onSuccess: () => {
      toast.success('Lampiran berhasil diunggah')
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengunggah lampiran')
    },
  })

  const deleteLampiranMutation = useMutation({
    mutationFn: (lampiranId: number | string) => dataRevisionsApi.deleteLampiran(lampiranId),
    onSuccess: () => {
      toast.success('Lampiran berhasil dihapus')
      invalidate()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus lampiran')
    },
  })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    executeCancelMutation,
    revertCancelMutation,
    uploadLampiranMutation,
    deleteLampiranMutation,
  }
}
