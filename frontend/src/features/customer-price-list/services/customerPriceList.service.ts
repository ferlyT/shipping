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

  // GET /api/customer-price-list/items/:id/markings
  getItemMarkings: (itemId: number) =>
    apiClient.get<{ data: { id: number; itemId: number; markingCode: string; agentName: string | null }[] }>(
      `/customer-price-list/items/${itemId}/markings`
    ),

  // PUT /api/customer-price-list/items/:id/markings
  setItemMarkings: (itemId: number, markings: { markingCode: string; agentName?: string }[]) =>
    apiClient.put<{ data: { id: number; itemId: number; markingCode: string; agentName: string | null }[] }>(
      `/customer-price-list/items/${itemId}/markings`,
      { markings }
    ),

  // DELETE /api/customer-price-list/items/:id/markings/:markingCode
  deleteItemMarking: (itemId: number, markingCode: string) =>
    apiClient.delete(`/customer-price-list/items/${itemId}/markings/${markingCode}`),

  // POST /api/customer-price-list/:custCode/upload
  upload: (custCode: string, formData: FormData) =>
    apiClient.post<{ data: CustomerPriceListUploadResult }>(
      `/customer-price-list/${custCode}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ),
}

