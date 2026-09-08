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

  m3Check: (listCode: string) =>
    apiClient.get('/billing/m3-check', { params: { listCode } }),

  m3CustMarkingDetails: (custCode: string, markingCode: string) =>
    apiClient.get('/billing/m3-cust-marking-details', { params: { custCode, markingCode } }),

  partialDetails: (params: { markingCode: string; customer?: string; custCode?: string }) =>
    apiClient.get('/billing/partial-details', { params }),

  targetPriceCheck: (params: {
    listCode?: string
    markingCode?: string
    markingNo?: string
    customer?: string
    custCode?: string
    branch?: string
    sales?: string
    type?: string
    comodity?: string
    mode?: string
    harga?: number
  }) => apiClient.get('/billing/target-price-check', { params }),
  customerTariffAudit: (custCode: string) =>
    apiClient.get(`/billing/customer-tariff-audit/${encodeURIComponent(custCode)}`),

  freightCharge: (custCode: string, markingCode: string) =>
    apiClient.get('/billing/freight-charge', { params: { custCode, markingCode } }),

  customerBillingHistory: (custCode: string, params?: Record<string, string | number>) =>
    apiClient.get(`/billing/customer-history/${encodeURIComponent(custCode)}`, { params }),

  invoiceDetails: (invNo: string) =>
    apiClient.get(`/billing/invoice-details/${encodeURIComponent(invNo)}`),

  transportCheck: (params: { invNo?: string; custCode?: string; markingCode?: string; markingNo?: string; listCode?: string; amount?: number }) =>
    apiClient.get('/billing/transport-check', { params }),

  getEmployees: () =>
    apiClient.get<{ data: { fdEmpCode: string; fdEmpName: string }[] }>('/billing/employees'),

  issueInvoice: (id: string, payload?: { fdEmpId?: string }) =>
    apiClient.post<{ data: { fdInvNo: string; fdGive: number; fdGiveDate: string; fdEmpId: string; fdEmpName: string; message: string } }>(
      `/billing/${encodeURIComponent(id)}/issue`,
      payload || {}
    ),

  checkBillResiMarking: (invNo: string, resi?: string) =>
    apiClient.get<{ data: import('../types/billing.types').BillResiCheckResponse }>(
      `/billing/${encodeURIComponent(invNo)}/resi-marking-check`,
      { params: { resi } }
    ),

  updateDetails: (id: string, items: import('../types/billing.types').BillingDetailInput[]) =>
    apiClient.put(`/billing/${encodeURIComponent(id)}/details`, { items }),
}

