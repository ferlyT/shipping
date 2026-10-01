import { describe, expect, it } from 'bun:test'
import {
  CreateCashierHeaderSchema,
  CreateTempCashierHeaderSchema,
  UpdateCashierHeaderSchema,
  AddCashierRcvSchema,
  BatchAllocateInvoiceSchema,
  AttachTempReceiptSchema,
  AllocateOverpaymentDepositSchema,
} from './cashier.types'

describe('Cashier Validation Schemas', () => {
  describe('CreateCashierHeaderSchema & CreateTempCashierHeaderSchema', () => {
    it('accepts valid official cashier header', () => {
      const payload = {
        custCode: 'CUST01',
        cashierDate: '2026-10-01',
        descr: 'Pelunasan tagihan September',
      }
      const result = CreateCashierHeaderSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects invalid date format', () => {
      const payload = {
        custCode: 'CUST01',
        cashierDate: '01/10/2026',
      }
      const result = CreateCashierHeaderSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('accepts valid temporary cashier header', () => {
      const payload = {
        custCode: 'CUST02',
        cashierDate: '2026-10-01',
      }
      const result = CreateTempCashierHeaderSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('UpdateCashierHeaderSchema', () => {
    it('allows partial header updates', () => {
      const payload = {
        descr: 'Koreksi keterangan kasir',
      }
      const result = UpdateCashierHeaderSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })
  })

  describe('AddCashierRcvSchema', () => {
    it('accepts valid money receipt entry', () => {
      const payload = {
        type: 'TRANSFER',
        amount: 15000000,
        bankId1: 'BCA',
      }
      const result = AddCashierRcvSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ccyCode).toBe('RP.')
        expect(result.data.currValue).toBe(1.0)
      }
    })

    it('rejects non-positive payment amount', () => {
      const payload = {
        type: 'CASH',
        amount: 0,
      }
      const result = AddCashierRcvSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('BatchAllocateInvoiceSchema', () => {
    it('accepts valid invoice allocation list', () => {
      const payload = {
        invoices: [
          { invNo: 'INV-2026-0001', amount: 5000000 },
          { invNo: 'INV-2026-0002', amount: 10000000 },
        ],
      }
      const result = BatchAllocateInvoiceSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty invoice allocation list', () => {
      const result = BatchAllocateInvoiceSchema.safeParse({ invoices: [] })
      expect(result.success).toBe(false)
    })
  })

  describe('AttachTempReceiptSchema', () => {
    it('accepts valid attach temporary cashier payload', () => {
      const payload = {
        tempCashierId: 'TR-000001-10-2026',
        officialDate: '2026-10-01',
        descr: 'Lampiran kasir resmi',
      }
      const result = AttachTempReceiptSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty tempCashierId', () => {
      const payload = {
        tempCashierId: '',
        officialDate: '2026-10-01',
      }
      const result = AttachTempReceiptSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('AllocateOverpaymentDepositSchema', () => {
    it('accepts valid positive overpayment amount or empty payload', () => {
      expect(AllocateOverpaymentDepositSchema.safeParse({ amount: 50000 }).success).toBe(true)
      expect(AllocateOverpaymentDepositSchema.safeParse({}).success).toBe(true)
    })

    it('rejects negative overpayment amount', () => {
      expect(AllocateOverpaymentDepositSchema.safeParse({ amount: -5000 }).success).toBe(false)
    })
  })
})
