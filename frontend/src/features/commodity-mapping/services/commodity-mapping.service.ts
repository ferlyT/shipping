import apiClient from '@/api/client'
import type {
  CommodityMappingItem,
  CreateCommodityMappingPayload,
  UpdateCommodityMappingPayload,
  CommodityMappingFilters,
  ApplyMappingsToUploadPayload,
  PriceListOptionItem,
} from '../types/commodity-mapping.types'

export const commodityMappingApi = {
  // GET /api/commodity-mapping
  getCommodityMappings: (params?: CommodityMappingFilters) =>
    apiClient.get<{ data: CommodityMappingItem[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
      '/commodity-mapping',
      { params }
    ),

  // GET /api/commodity-mapping/suggestions
  getSuggestions: (q?: string, limit?: number) =>
    apiClient.get<string[]>('/commodity-mapping/suggestions', {
      params: { q, limit, _t: Date.now() },
    }),

  // GET /api/commodity-mapping/:id
  getById: (id: number) =>
    apiClient.get<CommodityMappingItem>(`/commodity-mapping/${id}`),

  // POST /api/commodity-mapping
  create: (payload: CreateCommodityMappingPayload) =>
    apiClient.post<CommodityMappingItem>('/commodity-mapping', payload),

  // PUT /api/commodity-mapping/:id
  update: (id: number, payload: UpdateCommodityMappingPayload) =>
    apiClient.put<CommodityMappingItem>(`/commodity-mapping/${id}`, payload),

  // DELETE /api/commodity-mapping/:id
  delete: (id: number) =>
    apiClient.delete<{ id: number; message: string }>(`/commodity-mapping/${id}`),

  // POST /api/commodity-mapping/apply-to-upload
  applyToUpload: (payload: ApplyMappingsToUploadPayload) =>
    apiClient.post<{
      uploadId: number
      effectiveDate: string
      appliedCount: number
      mappings: Array<{ id: number; commodityName: string; targetCommodity: string; scope: string }>
    }>('/commodity-mapping/apply-to-upload', payload),

  // GET /api/commodity-mapping/price-list-options
  getPriceListOptions: (params?: { scope?: 'global' | 'customer'; custCode?: string }) =>
    apiClient.get<PriceListOptionItem[]>('/commodity-mapping/price-list-options', { params }),
}
