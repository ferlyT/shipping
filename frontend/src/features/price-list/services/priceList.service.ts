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

  // GET /api/price-list/items/:id/markings
  getItemMarkings: (itemId: number) =>
    apiClient.get<{ data: { id: number; itemId: number; markingCode: string; agentName: string | null }[] }>(
      `/price-list/items/${itemId}/markings`
    ),

  // PUT /api/price-list/items/:id/markings
  setItemMarkings: (itemId: number, markings: { markingCode: string; agentName?: string }[]) =>
    apiClient.put<{ data: { id: number; itemId: number; markingCode: string; agentName: string | null }[] }>(
      `/price-list/items/${itemId}/markings`,
      { markings }
    ),

  // DELETE /api/price-list/items/:id/markings/:markingCode
  deleteItemMarking: (itemId: number, markingCode: string) =>
    apiClient.delete(`/price-list/items/${itemId}/markings/${markingCode}`),

  // GET /api/price-list/entry-search
  searchEntries: (q: string, limit = 20) =>
    apiClient.get<EntrySearchResult[]>('/price-list/entry-search', { params: { q, limit } }),

  // GET /api/price-list/lookup-by-entry
  lookupByEntry: (listCode: string) =>
    apiClient.get<PriceByEntryResult>('/price-list/lookup-by-entry', { params: { listCode } }),
}


