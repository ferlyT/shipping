import { z } from 'zod'

export const TopupWalletSchema = z.object({
  custCode: z.string().min(1, 'Kode customer wajib diisi'),
  amount: z.number().positive('Nominal top-up harus lebih dari 0'),
  paymentMethod: z.enum(['TRANSFER', 'CASH', 'GIRO']),
  bankId: z.string().optional(),
  refNo: z.string().optional(),
  notes: z.string().optional(),
})

export type TopupWalletDto = z.infer<typeof TopupWalletSchema>

export const WithdrawWalletSchema = z.object({
  custCode: z.string().min(1, 'Kode customer wajib diisi'),
  amount: z.number().positive('Nominal penarikan harus lebih dari 0'),
  bankName: z.string().min(1, 'Nama bank tujuan wajib diisi'),
  accountNo: z.string().min(1, 'Nomor rekening wajib diisi'),
  accountName: z.string().min(1, 'Nama pemilik rekening wajib diisi'),
  notes: z.string().optional(),
})

export type WithdrawWalletDto = z.infer<typeof WithdrawWalletSchema>

export const AdjustWalletSchema = z.object({
  custCode: z.string().min(1, 'Kode customer wajib diisi'),
  direction: z.enum(['CREDIT', 'DEBIT']),
  amount: z.number().positive('Nominal penyesuaian harus lebih dari 0'),
  reason: z.string().min(3, 'Alasan penyesuaian wajib diisi'),
})

export type AdjustWalletDto = z.infer<typeof AdjustWalletSchema>

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

export interface WalletLedgerItem {
  fdLedgerID: string
  fdWalletID: string
  fdCustCode: string
  fdCustName?: string
  fdTxType: string
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

export interface CustomerWalletListItem {
  fdWalletID: string
  fdCustCode: string
  fdCustName: string
  fdBalance: number
  fdCurrency: string
  fdStatus: string
  fdLastUpdated: string
}

export interface WalletStats {
  totalBalance: number
  activeCustomerCount: number
  totalCreditToday: number
  totalDebitToday: number
}
