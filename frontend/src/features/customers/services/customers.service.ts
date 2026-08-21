import apiClient from '@/api/client'

export const customersApi = {
  list: (params: Record<string, string | number>) =>
    apiClient.get('/customers', { params }),
  
  detail: (id: string) => apiClient.get(`/customers/${id}`),
}
