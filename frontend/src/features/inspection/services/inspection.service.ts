import apiClient from '@/api/client'
import type {
  InspectionReport,
  InspectionReportsMeta,
  InspectionListParams,
  CreateInspectionPayload,
  UpdateInspectionPayload,
  LookupMarkingEntry,
  BapPhoto,
  InspectionStatsData,
} from '../types/inspection.types'

export const inspectionApi = {
  getStats: async (): Promise<{ data: InspectionStatsData }> => {
    const res = await apiClient.get('/inspection-reports/stats')
    return res.data
  },

  list: async (params?: InspectionListParams): Promise<{ data: InspectionReport[]; meta: InspectionReportsMeta }> => {
    const res = await apiClient.get('/inspection-reports', { params })
    return res.data
  },

  detail: async (id: number | string): Promise<{ data: InspectionReport }> => {
    const res = await apiClient.get(`/inspection-reports/${id}`)
    return res.data
  },

  create: async (payload: CreateInspectionPayload): Promise<{ data: InspectionReport }> => {
    const res = await apiClient.post('/inspection-reports', payload)
    return res.data
  },

  update: async (id: number | string, payload: UpdateInspectionPayload): Promise<{ data: InspectionReport }> => {
    const res = await apiClient.put(`/inspection-reports/${id}`, payload)
    return res.data
  },

  delete: async (id: number | string): Promise<{ data: { id: number; reportNumber: string } }> => {
    const res = await apiClient.delete(`/inspection-reports/${id}`)
    return res.data
  },

  lookupMarking: async (params: { search: string; listType?: number | string; limit?: number }): Promise<{ data: LookupMarkingEntry[] }> => {
    const res = await apiClient.get('/inspection-reports/lookup', { params })
    return res.data
  },

  uploadPhoto: async (reportId: number | string, photoBase64: string, caption?: string): Promise<{ data: BapPhoto }> => {
    const res = await apiClient.post(`/inspection-reports/${reportId}/photos`, {
      photoBase64,
      caption,
    })
    return res.data
  },

  getPhotos: async (reportId: number | string): Promise<{ data: BapPhoto[] }> => {
    const res = await apiClient.get(`/inspection-reports/${reportId}/photos`)
    return res.data
  },

  deletePhoto: async (reportId: number | string, photoId: number | string): Promise<{ data: { fdId: number } }> => {
    const res = await apiClient.delete(`/inspection-reports/${reportId}/photos/${photoId}`)
    return res.data
  },
}
