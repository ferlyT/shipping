import { describe, expect, it } from 'bun:test'
import {
  CreateCustomerCommodityPriceSchema,
  UpdateCustomerCommodityPriceSchema,
  SetEndDateSchema,
  SetCustomerUploadMarkingsSchema,
} from './customer-price-list.types'

describe('Customer Price List Validation Schemas', () => {
  describe('CreateCustomerCommodityPriceSchema', () => {
    it('accepts valid payload', () => {
      const payload = {
        fdCustCode: 'CUST-0099',
        category: 'General Cargo',
        mode: 'SEA',
        branch: 'SUB',
        price: 2500000,
        effectiveDate: '2026-01-01',
        endDate: '2026-12-31',
        notes: 'Kontrak tahunan',
        aliases: ['GC', 'Cargo Umum'],
      }
      const result = CreateCustomerCommodityPriceSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects missing mandatory fields', () => {
      const payload = {
        fdCustCode: '',
        category: '',
        mode: 'SEA',
        branch: 'SUB',
        price: 0,
        effectiveDate: '',
      }
      const result = CreateCustomerCommodityPriceSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('UpdateCustomerCommodityPriceSchema', () => {
    it('allows partial updates with valid numbers', () => {
      const payload = {
        price: 3200000,
        notes: 'Perubahan tarif BBM',
      }
      const result = UpdateCustomerCommodityPriceSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects negative prices', () => {
      const payload = {
        price: -500,
      }
      const result = UpdateCustomerCommodityPriceSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('SetEndDateSchema', () => {
    it('accepts valid date string or null', () => {
      expect(SetEndDateSchema.safeParse({ endDate: '2026-06-30' }).success).toBe(true)
      expect(SetEndDateSchema.safeParse({ endDate: null }).success).toBe(true)
    })
  })

  describe('SetCustomerUploadMarkingsSchema', () => {
    it('accepts valid markings array', () => {
      const payload = {
        markings: [
          { markingCode: '26HKA', agentName: 'Agent A' },
          { markingCode: '26HKB' },
        ],
      }
      const result = SetCustomerUploadMarkingsSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty markings array', () => {
      const result = SetCustomerUploadMarkingsSchema.safeParse({ markings: [] })
      expect(result.success).toBe(false)
    })
  })
})
