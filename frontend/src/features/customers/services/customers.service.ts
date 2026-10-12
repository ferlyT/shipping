import apiClient from '@/api/client'

export const customersApi = {
  list: (params: Record<string, string | number>) =>
    apiClient.get('/customers', { params }),
  
  detail: (id: string) => apiClient.get(`/customers/${id}`),

  commodityStats: (id: string, year?: number) =>
    apiClient.get(`/customers/${id}/commodity-stats`, { params: year ? { year } : undefined }),
}
