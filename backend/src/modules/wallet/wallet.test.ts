import { describe, expect, it } from 'bun:test'
import {
  TopupWalletSchema,
  WithdrawWalletSchema,
  AdjustWalletSchema,
  OverpaymentWalletSchema,
} from './wallet.types'

describe('Wallet Validation Schemas', () => {
  describe('TopupWalletSchema', () => {
    it('accepts valid topup data', () => {
      const payload = {
        custCode: 'CUST-1001',
        amount: 500000,
        paymentMethod: 'TRANSFER',
        bankId: 'BCA',
        refNo: 'TRX-99881',
      }
      const result = TopupWalletSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects zero or negative topup amounts', () => {
      const payload = {
        custCode: 'CUST-1001',
        amount: 0,
        paymentMethod: 'CASH',
      }
      const result = TopupWalletSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects unsupported payment methods', () => {
      const payload = {
        custCode: 'CUST-1001',
        amount: 100000,
        paymentMethod: 'CRYPTO',
      }
      const result = TopupWalletSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('WithdrawWalletSchema', () => {
    it('accepts valid withdraw data', () => {
      const payload = {
        custCode: 'CUST-1001',
        amount: 250000,
        bankName: 'Mandiri',
        accountNo: '1400012345678',
        accountName: 'PT Sampai Logistik',
      }
      const result = WithdrawWalletSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects missing bank account details', () => {
      const payload = {
        custCode: 'CUST-1001',
        amount: 250000,
        bankName: '',
        accountNo: '',
        accountName: '',
      }
      const result = WithdrawWalletSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('AdjustWalletSchema', () => {
    it('accepts CREDIT and DEBIT directions', () => {
      const credit = AdjustWalletSchema.safeParse({
        custCode: 'CUST-1001',
        direction: 'CREDIT',
        amount: 50000,
        reason: 'Refund selisih ongkir',
      })
      const debit = AdjustWalletSchema.safeParse({
        custCode: 'CUST-1001',
        direction: 'DEBIT',
        amount: 50000,
        reason: 'Penyesuaian biaya bongkar',
      })

      expect(credit.success).toBe(true)
      expect(debit.success).toBe(true)
    })

    it('rejects invalid reason lengths', () => {
      const payload = {
        custCode: 'CUST-1001',
        direction: 'CREDIT',
        amount: 50000,
        reason: 'x',
      }
      const result = AdjustWalletSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('OverpaymentWalletSchema', () => {
    it('accepts valid overpayment payload', () => {
      const payload = {
        custCode: 'CUST-2002',
        amount: 35000,
        cashierId: 'KASIR-JKT-01',
      }
      const result = OverpaymentWalletSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects missing cashier ID or negative amount', () => {
      const payload = {
        custCode: 'CUST-2002',
        amount: -1000,
        cashierId: '',
      }
      const result = OverpaymentWalletSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })
})
