export interface CustomerWalletSummary {
  fdWalletID: string
  fdCustCode: string
  fdCustName: string
  fdBalance: number
  fdCurrency: string
  fdStatus: string
  fdLastUpdated: string
  recentLedgers: WalletLedgerItem[]
}

export interface CustomerWalletListItem {
  fdWalletID: string
  fdCustCode: string
  fdCustName: string
  fdBalance: number
  fdCurrency: string
  fdStatus: string
  fdLastUpdated: string
}

export interface WalletLedgerItem {
  fdLedgerID: string
  fdWalletID: string
  fdCustCode: string
  fdCustName?: string
  fdTxType: 'TOPUP' | 'PAYMENT' | 'WITHDRAWAL' | 'OVERPAYMENT' | 'REFUND' | 'ADJUSTMENT' | string
  fdDirection: 'CREDIT' | 'DEBIT'
  fdAmount: number
  fdBalanceBefore: number
  fdBalanceAfter: number
  fdRefType: string
  fdRefNo: string | null
  fdNotes: string | null
  fdCreatedDate: string
  fdCreatedBy: string
}

export interface WalletStats {
  totalBalance: number
  activeCustomerCount: number
  totalCreditToday: number
  totalDebitToday: number
}

export interface TopupWalletPayload {
  custCode: string
  amount: number
  paymentMethod: 'TRANSFER' | 'CASH' | 'GIRO'
  bankId?: string
  refNo?: string
  notes?: string
}

export interface WithdrawWalletPayload {
  custCode: string
  amount: number
  bankName: string
  accountNo: string
  accountName: string
  notes?: string
}

export interface AdjustWalletPayload {
  custCode: string
  direction: 'CREDIT' | 'DEBIT'
  amount: number
  reason: string
}
