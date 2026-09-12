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

  entryListDetails: (listCodes: string[]) =>
    apiClient.post<{
      data: Array<{
        fdListCode: string
        fdListDCode: string
        fdDescr: string
        fdPjg: number
        fdLbr: number
        fdTng: number
        fdQty: number
        fdM3: number
        fdLoad: string | null
      }>
    }>('/billing/entry-list-details', { listCodes }),

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

  type2CompareCheck: (params: { invNo?: string; listCode?: string; markingCode?: string }) =>
    apiClient.get('/billing/type2-compare-check', { params }),

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

  updateDetails: (
    id: string,
    items: import('../types/billing.types').BillingDetailInput[],
    saveToPrev: boolean = true
  ) =>
    apiClient.put(`/billing/${encodeURIComponent(id)}/details`, { items, saveToPrev }),

  getReportTemplate: () =>
    apiClient.get<{ data: { id: string; name: string; config: any; updatedBy?: string; updatedAt?: string } }>(
      '/billing/report-template'
    ),

  saveReportTemplate: (config: Record<string, any>) =>
    apiClient.put<{ data: { id: string; name: string; config: any; updatedBy?: string; updatedAt?: string } }>(
      '/billing/report-template',
      { config }
    ),

  pairingLocalCharge: (formData: FormData) =>
    apiClient.post<{ data: import('../types/billing.types').PairingLocalChargeResult }>(
      '/billing/pairing-local-charge',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }
    ),

  pairingLocalChargeByReceipts: (receiptNos: string) =>
    apiClient.post<{ data: import('../types/billing.types').PairingLocalChargeResult }>(
      '/billing/pairing-local-charge/by-receipts',
      { receiptNos },
      { timeout: 120000 }
    ),

  exportPairingLocalChargeExcel: (rows: import('../types/billing.types').PairingLocalChargeRow[]) =>
    apiClient.post(
      '/billing/pairing-local-charge/export-excel',
      { rows },
      {
        responseType: 'blob',
        timeout: 120000,
      }
    ),
}

