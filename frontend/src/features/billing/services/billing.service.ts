import apiClient from '@/api/client'

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

  byEmployeeDailyChart: (params?: { days?: number }) => apiClient.get('/billing/chart/by-employee-daily', { params }),

  trends: (params?: { days?: number }) => apiClient.get('/billing/chart/trends', { params }),

  sjVsBillChart: (params?: { days?: number }) => apiClient.get('/billing/chart/sj-vs-bill', { params }),

  sjVsBillDetails: (params: { pic: string; type: string }) =>
    apiClient.get('/billing/chart/sj-vs-bill/details', { params }),

  targetDetails: (params: { type: 'all' | 'udara' | 'laut'; pic?: string }) =>
    apiClient.get('/billing/target-details', { params }),

  m3Check: (listCode: string) => apiClient.get(`/billing/m3-check/${listCode}`),

  m3CustMarkingDetails: (custCode: string, markingCode: string) =>
    apiClient.get('/billing/m3-cust-marking-details', { params: { custCode, markingCode } }),

  partialDetails: (params: { markingCode: string; customer?: string; custCode?: string }) =>
    apiClient.get('/billing/partial-details', { params }),

  targetPriceCheck: (params: {
    markingCode: string
    markingNo?: string
    customer?: string
    branch?: string
    type?: string
    mode?: string
    harga?: number
  }) => apiClient.get('/billing/target-price-check', { params }),
}

