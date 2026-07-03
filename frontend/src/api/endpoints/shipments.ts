import apiClient from '../client'

export const shipmentsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get('/shipments', { params }),
  
  detail: (id: string) => apiClient.get(`/shipments/${id}`),

  dimensions: (id: string) => apiClient.get(`/shipments/${id}/dimensions`),

  getKPIs: (params?: Record<string, string | number>) =>
    apiClient.get('/shipments/kpi', { params }),
}
