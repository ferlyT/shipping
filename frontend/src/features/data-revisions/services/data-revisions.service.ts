import apiClient from '@/api/client'
import type {
  DataRevision,
  DataRevisionsListParams,
  DataRevisionsResponse,
  RevisionLampiranItem,
} from '../types/data-revisions.types'

export const dataRevisionsApi = {
  getNextNumber: async (): Promise<{ nextNumber: string }> => {
    const res = await apiClient.get('/data-revisions/next-number')
    return res.data?.data || res.data
  },

  lookupListCode: async (q?: string): Promise<{ data: any[] }> => {
    const res = await apiClient.get('/data-revisions/lookup-listcode', {
      params: { q, limit: 25 },
    })
    return res.data
  },

  list: async (params?: DataRevisionsListParams): Promise<DataRevisionsResponse> => {
    const res = await apiClient.get('/data-revisions', { params })
    return res.data
  },

  detail: async (id: number | string): Promise<{ data: DataRevision }> => {
    const res = await apiClient.get(`/data-revisions/${id}`)
    return res.data
  },

  create: async (payload: any): Promise<{ data: DataRevision }> => {
    const res = await apiClient.post('/data-revisions', payload)
    return res.data
  },

  update: async (id: number | string, payload: any): Promise<{ data: DataRevision }> => {
    const res = await apiClient.put(`/data-revisions/${id}`, payload)
    return res.data
  },

  delete: async (id: number | string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete(`/data-revisions/${id}`)
    return res.data
  },

  executeCancel: async (id: number | string): Promise<{ data: DataRevision }> => {
    const res = await apiClient.post(`/data-revisions/${id}/execute-cancel`)
    return res.data
  },

  revertCancel: async (id: number | string): Promise<{ data: DataRevision }> => {
    const res = await apiClient.post(`/data-revisions/${id}/revert-cancel`)
    return res.data
  },

  uploadLampiran: async (
    id: number | string,
    file: File,
    keterangan?: string
  ): Promise<{ data: RevisionLampiranItem }> => {
    const formData = new FormData()
    formData.append('file', file)
    if (keterangan) formData.append('keterangan', keterangan)

    const res = await apiClient.post(`/data-revisions/${id}/lampiran`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },

  deleteLampiran: async (lampiranId: number | string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete(`/data-revisions/lampiran/${lampiranId}`)
    return res.data
  },

  cropLampiran: async (
    lampiranId: number | string,
    options: {
      rotate?: number
      crop?: { x: number; y: number; width: number; height: number }
      isRatio?: boolean
    }
  ): Promise<{ data: RevisionLampiranItem }> => {
    const res = await apiClient.post(`/data-revisions/lampiran/${lampiranId}/crop`, options)
    return res.data
  },

  exportExcel: async (): Promise<Blob> => {
    const res = await apiClient.get('/data-revisions/export/excel', {
      responseType: 'blob',
    })
    return res.data
  },
}
