import apiClient from '../client'

export const billingApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get('/billing', { params }),
  
  detail: (id: string) => {
    return apiClient.get(`/billing/${id}`)
  },

  getKPIs: (params: { search?: string }) => {
    return apiClient.get('/billing/kpi', { params })
  },

  detailsLineItems: (id: string) => apiClient.get(`/billing/${id}/details`),
}
