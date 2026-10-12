import apiClient from '@/api/client'

export interface UnissuedBillsAgingSummary {
  le7: { count: number; nominal: number }
  d8to14: { count: number; nominal: number }
  d15to30: { count: number; nominal: number }
  gt30: { count: number; nominal: number }
}

export interface UnissuedBillsSummary {
  totalCount: number
  totalNominal: number
  countUdara: number
  nominalUdara: number
  countLaut: number
  nominalLaut: number
  aging: UnissuedBillsAgingSummary
}

export interface UnissuedBillItem {
  invNo: string
  invDate: string | null
  custCode: string
  custName: string
  listType: number
  mode: 'udara' | 'laut'
  markingCode: string
  markingNo: string
  jumlah1: number
  jumlahTotal: number
  empCode: string
  empName: string
  branchCode: string
  agingDays: number
  agingGroup: 'le7' | '8to14' | '15to30' | 'gt30'
}

export interface UnissuedBillsResponse {
  summary: UnissuedBillsSummary
  filteredCount: number
  filteredNominal: number
  items: UnissuedBillItem[]
}

export interface BillingKPIs {
  totalInvoices: number
  totalTagihan: number
  invoicesBulanIni: number
  invoicesBulanIniBreakdown?: {
    udara: number
    laut: number
  }
  tagihanBulanIni: number
  tagihanBulanIniBreakdown?: {
    udara: number
    laut: number
  }
  targetBillUdara?: {
    total: number
    breakdown?: { kiki: number; yati: number }
    categories?: {
      sjSent: number
      codUrgent: number
      agingGt7: number
      fcl: number
    }
  }
  targetBillLaut?: {
    total: number
    breakdown?: { thara: number; rico: number; ferly: number }
    categories?: {
      sjSent: number
      codUrgent: number
      agingGt7: number
      fcl: number
    }
  }
  unissuedBills?: UnissuedBillsSummary
  trend?: {
    invoicesBulanIni: { value: number; direction: 'up' | 'down' | 'flat' }
    tagihanBulanIni: { value: number; direction: 'up' | 'down' | 'flat' }
  }
}

export interface BatchExitBranchMetric {
  branchCode: string
  branchName: string
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  airBatches: number
  airKargo: number
  airBilled: number
  airUnbilled: number
  seaBatches: number
  seaKargo: number
  seaBilled: number
  seaUnbilled: number
}

export interface CustomerStatusMetric {
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
}

export interface BatchCustomerStatusCounts {
  blocked: number
  warning: number
  urgent: number
  cod: number
  ok: number
  noStatus: number
  unbilledBlocked: number
  unbilledWarning: number
  unbilledUrgent: number
  unbilledCod: number
}

export interface BatchExitComparisonSummary {
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  air: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  sea: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  byBranch: BatchExitBranchMetric[]
  byCustomerStatus: {
    blocked: CustomerStatusMetric
    warning: CustomerStatusMetric
    urgent: CustomerStatusMetric
    cod: CustomerStatusMetric
    ok: CustomerStatusMetric
    noStatus: CustomerStatusMetric
  }
}

export interface BatchExitItem {
  markingCode: string
  exitDate: string | null
  listType: number
  branchCode: string
  branchName: string
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  isFullyBilled: boolean
  customerStatus: BatchCustomerStatusCounts
}

export interface BatchExitCargoItem {
  listCode: string
  markingCode: string
  custCode: string
  custName: string
  custStatus: number
  custStatusLabel: string
  isBroker: boolean
  coly: number
  satuan: string
  m3: number
  berat: number
  isBilled: boolean
  sjNo: string | null
}

export const operationBillingService = {
  getBillingKpis: async (year?: number, month?: number): Promise<BillingKPIs> => {
    const params: Record<string, any> = {}
    if (year) params.year = year
    if (month) params.month = month
    const res = await apiClient.get('/billing/kpi', { params })
    return res.data.data
  },

  getUnissuedBills: async (params?: {
    search?: string
    mode?: string
    aging?: string
    startDate?: string
    endDate?: string
  }): Promise<UnissuedBillsResponse> => {
    const res = await apiClient.get('/billing/unissued-bills', { params })
    return res.data.data
  },

  getBatchExitComparison: async (
    year?: number,
    month?: number,
    allTime?: boolean
  ): Promise<{ summary: BatchExitComparisonSummary; batches: BatchExitItem[] }> => {
    const params: Record<string, any> = {}
    if (year) params.year = year
    if (month) params.month = month
    if (allTime) params.allTime = 'true'
    const res = await apiClient.get('/billing/batch-exit-comparison', { params })
    return res.data.data
  },

  getBatchExitCargoDetails: async (markingCode: string): Promise<BatchExitCargoItem[]> => {
    const res = await apiClient.get('/billing/batch-exit-comparison/details', {
      params: { markingCode },
    })
    return res.data.data || []
  },
}
