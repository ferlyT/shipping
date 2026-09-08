import apiClient from '@/api/client'
import type { FilterOptions, TrendPoint, DiffResponse, UploadRow, UploadResult, PriceListLookupResult, EntrySearchResult, PriceByEntryResult } from '../types'

interface ListUploadsParams {
  page?: number
  pageSize?: number
}

interface TrendParams {
  sheetType?: string
  mode?: string
  branch?: string
  category?: string
  from?: string
  to?: string
}

export const priceListApi = {
  // GET /api/price-list/filters
  getFilterOptions: (params?: { sheetType?: string | string[]; mode?: string }) =>
    apiClient.get<FilterOptions>('/price-list/filters', { params }),

  // GET /api/price-list/trend
  getTrend: (params: TrendParams) =>
    apiClient.get<TrendPoint[]>('/price-list/trend', { params }),

  // GET /api/price-list/uploads/latest/diff
  getLatestDiff: () =>
    apiClient.get<DiffResponse>('/price-list/uploads/latest/diff'),

  // GET /api/price-list/uploads
  listUploads: (params?: ListUploadsParams) =>
    apiClient.get<{ data: UploadRow[]; meta: { page: number; pageSize: number; total: number } }>(
      '/price-list/uploads',
      { params },
    ),

  // GET /api/price-list/uploads/:id/diff
  getUploadDiff: (id: number) =>
    apiClient.get<DiffResponse>(`/price-list/uploads/${id}/diff`),

  // PATCH /api/price-list/uploads/:id/effective-date
  updateEffectiveDate: (id: number, effectiveDate: string) =>
    apiClient.patch<{ data: UploadRow }>(`/price-list/uploads/${id}/effective-date`, { effectiveDate }),

  // POST /api/price-list/upload
  upload: (formData: FormData) =>
    apiClient.post<{ data: UploadResult }>('/price-list/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // GET /api/price-list/lookup
  lookupPrice: (params: {
    date?: string
    sheetType?: string
    mode?: string
    branch?: string
    category?: string
    markingCode?: string
  }) => apiClient.get<PriceListLookupResult>('/price-list/lookup', { params }),

  // GET /api/price-list/uploads/:id/markings
  getUploadMarkings: (uploadId: number) =>
    apiClient.get<{ data: { id: number; uploadId: number; markingCode: string; agentName: string | null }[] }>(
      `/price-list/uploads/${uploadId}/markings`
    ),

  // PUT /api/price-list/uploads/:id/markings
  setUploadMarkings: (uploadId: number, markings: { markingCode: string; agentName?: string }[]) =>
    apiClient.put<{ data: { id: number; uploadId: number; markingCode: string; agentName: string | null }[] }>(
      `/price-list/uploads/${uploadId}/markings`,
      { markings }
    ),

  // DELETE /api/price-list/uploads/:id/markings/:markingCode
  deleteUploadMarking: (uploadId: number, markingCode: string) =>
    apiClient.delete(`/price-list/uploads/${uploadId}/markings/${markingCode}`),

  // GET /api/price-list/branches
  getBranches: () =>
    apiClient.get<{ data: string[] }>('/price-list/branches'),

  // GET /api/price-list/entry-search
  searchEntries: (q: string, limit = 20) =>
    apiClient.get<EntrySearchResult[]>('/price-list/entry-search', { params: { q, limit } }),

  // GET /api/price-list/lookup-by-entry
  lookupByEntry: (listCode: string) =>
    apiClient.get<PriceByEntryResult>('/price-list/lookup-by-entry', { params: { listCode } }),
}




