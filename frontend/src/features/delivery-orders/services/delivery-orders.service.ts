import apiClient from '@/api/client'

export const deliveryOrdersApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get('/delivery-orders', { params }),

  detail: (id: string) => {
    return apiClient.get(`/delivery-orders/${id}`)
  },
  getKPIs: (params: { search?: string }) => {
    return apiClient.get('/delivery-orders/kpi', { params })
  },
  getGrouped: (params?: Record<string, string | number>) => {
    return apiClient.get('/delivery-orders/grouped', { params })
  },
  getMarkingGroups: (params?: Record<string, string | number>) => {
    return apiClient.get('/delivery-orders/marking-groups', { params })
  },
  getBranchGroups: (params?: Record<string, string | number>) => {
    return apiClient.get('/delivery-orders/branch-groups', { params })
  }
}
