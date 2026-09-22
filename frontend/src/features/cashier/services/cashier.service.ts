import apiClient from '@/api/client'
import type {
  CashierItem,
  CashierDetailResponse,
  MasterDataResponse,
  CashierStatsResponse,
  UnpaidInvoice,
  UnattachedTempCashier,
  CreateCashierDto,
  CreateTempCashierDto,
  AddPaymentRcvDto,
  BatchAllocateInvoicesDto,
} from '../types/cashier.types'

export const cashierApi = {
  // Master data
  getMasterData: () => apiClient.get<MasterDataResponse>('/cashier/master-data'),

  getNextNumber: (type: 'OFFICIAL' | 'TEMPORARY', date?: string) =>
    apiClient.get<{ nextNumber: string }>('/cashier/next-number', {
      params: { type, ...(date ? { date } : {}) },
    }),

  getStats: (startDate?: string, endDate?: string) =>
    apiClient.get<CashierStatsResponse>('/cashier/stats', {
      params: { startDate, endDate },
    }),

  getUnpaidInvoices: (custCode: string, search?: string) =>
    apiClient.get<UnpaidInvoice[]>(`/cashier/unpaid-invoices/${encodeURIComponent(custCode)}`, {
      params: { search },
    }),

  // List Official (RR-)
  getOfficialCashiers: (params?: Record<string, any>) =>
    apiClient.get<CashierItem[]>('/cashier', { params }),

  // List Temporary (TR-)
  getTempCashiers: (params?: Record<string, any>) =>
    apiClient.get<CashierItem[]>('/cashier/temp', { params }),

  getUnattachedTempCashiers: (custCode?: string, search?: string) =>
    apiClient.get<UnattachedTempCashier[]>('/cashier/temp/unattached', {
      params: { custCode, search },
    }),

  // Detail
  getDetail: (id: string) =>
    apiClient.get<CashierDetailResponse>(`/cashier/${encodeURIComponent(id)}`),

  // CRUD Header
  createOfficial: (data: CreateCashierDto) =>
    apiClient.post<{ fdCashierID: string }>('/cashier', data),

  createTemp: (data: CreateTempCashierDto) =>
    apiClient.post<{ fdCashierID: string }>('/cashier/temp', data),

  updateHeader: (id: string, data: { cashierDate?: string; descr?: string }) =>
    apiClient.put(`/cashier/${encodeURIComponent(id)}`, data),

  deleteCashier: (id: string) =>
    apiClient.delete(`/cashier/${encodeURIComponent(id)}`),

  // Sub-items: RCV
  addRcv: (cashierId: string, data: AddPaymentRcvDto) =>
    apiClient.post(`/cashier/${encodeURIComponent(cashierId)}/rcv`, data),

  deleteRcv: (cashierId: string, rcvId: string) =>
    apiClient.delete(`/cashier/${encodeURIComponent(cashierId)}/rcv/${encodeURIComponent(rcvId)}`),

  // Sub-items: DETAILS (Allocations)
  allocateInvoices: (cashierId: string, data: BatchAllocateInvoicesDto) =>
    apiClient.post(`/cashier/${encodeURIComponent(cashierId)}/allocate`, data),

  deleteDetail: (cashierId: string, detailId: string) =>
    apiClient.delete(`/cashier/${encodeURIComponent(cashierId)}/details/${encodeURIComponent(detailId)}`),

  // Attach
  attachTempReceipt: (data: { tempCashierId: string; officialDate: string; descr?: string }) =>
    apiClient.post<{ officialId: string; tempCashierId: string }>('/cashier/attach', data),

  // Overpayment -> Customer Wallet
  allocateOverpaymentToDeposit: (cashierId: string, amount?: number) =>
    apiClient.post(`/cashier/${encodeURIComponent(cashierId)}/overpayment-deposit`, { amount }),
}
