import apiClient from '@/api/client'
import type {
  CustomerPriceListUploadRow,
  ActiveCustomerPriceList,
  CustomerUploadHistory,
  CustomerPriceListDiff,
  CustomerPriceListFilters,
  CustomerPriceListUploadResult,
  CustomerPriceLookupParams,
  CustomerPriceLookupResult,
} from '../types'

interface ListUploadsParams {
  page?: number
  pageSize?: number
}

export const customerPriceListApi = {
  // GET /api/customer-price-list/filters
  getGlobalFilters: () =>
    apiClient.get<{ data: CustomerPriceListFilters }>('/customer-price-list/filters'),

  // GET /api/customer-price-list
  // Daftar semua customer yang punya price list aktif
  listCustomers: () =>
    apiClient.get<{ data: CustomerPriceListUploadRow[] }>('/customer-price-list'),

  // GET /api/customer-price-list/lookup
  // Cari harga khusus customer pada tanggal tertentu
  lookup: (params: CustomerPriceLookupParams) =>
    apiClient.get<{ data: CustomerPriceLookupResult }>('/customer-price-list/lookup', { params }),

  // GET /api/customer-price-list/:custCode/active
  getActive: (custCode: string) =>
    apiClient.get<{ data: ActiveCustomerPriceList | null }>(`/customer-price-list/${custCode}/active`),

  // GET /api/customer-price-list/:custCode/uploads
  listUploads: (custCode: string, params?: ListUploadsParams) =>
    apiClient.get<{
      data: CustomerUploadHistory[]
      meta: { page: number; pageSize: number; total: number }
    }>(`/customer-price-list/${custCode}/uploads`, { params }),

  // GET /api/customer-price-list/:custCode/filters
  getFilters: (custCode: string) =>
    apiClient.get<{ data: CustomerPriceListFilters }>(`/customer-price-list/${custCode}/filters`),

  // GET /api/customer-price-list/uploads/:id/diff
  getUploadDiff: (id: number) =>
    apiClient.get<{ data: CustomerPriceListDiff }>(`/customer-price-list/uploads/${id}/diff`),

  // PATCH /api/customer-price-list/uploads/:id/effective-date
  updateEffectiveDate: (id: number, effectiveDate: string) =>
    apiClient.patch<{ data: CustomerUploadHistory }>(`/customer-price-list/uploads/${id}/effective-date`, { effectiveDate }),

  // DELETE /api/customer-price-list/uploads/:id
  deleteUpload: (id: number) =>
    apiClient.delete<{ data: CustomerUploadHistory }>(`/customer-price-list/uploads/${id}`),

  // GET /api/customer-price-list/uploads/:id/markings
  getUploadMarkings: (uploadId: number) =>
    apiClient.get<{ data: { id: number; uploadId: number; markingCode: string; agentName: string | null }[] }>(
      `/customer-price-list/uploads/${uploadId}/markings`
    ),

  // PUT /api/customer-price-list/uploads/:id/markings
  setUploadMarkings: (uploadId: number, markings: { markingCode: string; agentName?: string }[]) =>
    apiClient.put<{ data: { id: number; uploadId: number; markingCode: string; agentName: string | null }[] }>(
      `/customer-price-list/uploads/${uploadId}/markings`,
      { markings }
    ),

  // DELETE /api/customer-price-list/uploads/:id/markings/:markingCode
  deleteUploadMarking: (uploadId: number, markingCode: string) =>
    apiClient.delete(`/customer-price-list/uploads/${uploadId}/markings/${markingCode}`),

  // POST /api/customer-price-list/:custCode/upload
  upload: (custCode: string, formData: FormData) =>
    apiClient.post<{ data: CustomerPriceListUploadResult }>(
      `/customer-price-list/${custCode}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),

  // ─── SPECIAL COMMODITY PRICES ───────────────────────────────────────

  // GET /api/customer-price-list/items
  listSpecialPrices: (params?: {
    custCode?: string
    search?: string
    mode?: string
    branch?: string
    status?: 'ALL' | 'ACTIVE' | 'EXPIRED'
    page?: number
    limit?: number
  }) =>
    apiClient.get<{
      data: import('../types').CustomerSpecialPriceItem[]
      meta: { page: number; limit: number; total: number; totalPages: number }
    }>('/customer-price-list/items', { params }),

  // POST /api/customer-price-list/items
  createSpecialPrice: (data: import('../types').CreateCustomerSpecialPriceInput) =>
    apiClient.post<{ data: import('../types').CustomerSpecialPriceItem }>('/customer-price-list/items', data),

  // PUT /api/customer-price-list/items/:id
  updateSpecialPrice: (id: number, data: import('../types').UpdateCustomerSpecialPriceInput) =>
    apiClient.put<{ data: import('../types').CustomerSpecialPriceItem }>(`/customer-price-list/items/${id}`, data),

  // PUT /api/customer-price-list/items/:id/deactivate
  deactivateSpecialPrice: (id: number) =>
    apiClient.put<{ data: import('../types').CustomerSpecialPriceItem }>(`/customer-price-list/items/${id}/deactivate`),

  // DELETE /api/customer-price-list/items/:id
  deleteSpecialPrice: (id: number) =>
    apiClient.delete(`/customer-price-list/items/${id}`),
}


