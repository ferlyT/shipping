import apiClient from '@/api/client'
import type {
  CustomerWalletSummary,
  CustomerWalletListItem,
  WalletLedgerItem,
  WalletStats,
  TopupWalletPayload,
  WithdrawWalletPayload,
  AdjustWalletPayload,
} from '../types/wallet.types'

export const walletApi = {
  getStats: () => apiClient.get<WalletStats>('/wallet/stats'),

  getCustomerWallets: (params?: Record<string, any>) =>
    apiClient.get<{ items: CustomerWalletListItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/wallet/customers',
      { params }
    ),

  getCustomerWallet: (custCode: string) =>
    apiClient.get<CustomerWalletSummary>(`/wallet/customer/${encodeURIComponent(custCode)}`),

  getLedgers: (params?: Record<string, any>) =>
    apiClient.get<{ items: WalletLedgerItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/wallet/ledger',
      { params }
    ),

  topup: (data: TopupWalletPayload) =>
    apiClient.post<{ newBalance: number; ledgerId: string }>('/wallet/topup', data),

  withdraw: (data: WithdrawWalletPayload) =>
    apiClient.post<{ newBalance: number }>('/wallet/withdraw', data),

  adjust: (data: AdjustWalletPayload) =>
    apiClient.post<{ newBalance: number }>('/wallet/adjust', data),

  overpayment: (data: { custCode: string; amount: number; cashierId: string }) =>
    apiClient.post<{ balanceAfter: number }>('/wallet/overpayment', data),
}
