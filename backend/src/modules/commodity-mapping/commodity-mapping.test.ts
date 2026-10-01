import { describe, expect, it } from 'bun:test'
import {
  CreateCommodityMappingSchema,
  UpdateCommodityMappingSchema,
  ApplyMappingsToUploadSchema,
} from './commodity-mapping.types'

describe('Commodity Mapping Validation Schemas', () => {
  describe('CreateCommodityMappingSchema', () => {
    it('accepts valid full payload', () => {
      const payload = {
        commodityName: 'Baju Kaos Katun',
        targetCommodity: 'GARMEN',
        fdTypeComodity: 1,
        fdCustCode: 'CUST-001',
        price: 1500000,
        branch: 'SUB',
        startMarkingCode: 'MARK-01',
        startAgentDate: '2026-01-01',
        priceListUploadId: 10,
        effectiveDate: '2026-01-01',
        endDate: '2026-12-31',
        mode: 'SEA',
        applyToNewUploads: true,
        notes: 'Mapping khusus customer 001',
      }
      const result = CreateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts valid minimal payload', () => {
      const payload = {
        commodityName: 'Elektronik Rumah Tangga',
        targetCommodity: 'ELEKTRONIK',
      }
      const result = CreateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects empty commodityName', () => {
      const payload = {
        commodityName: '',
        targetCommodity: 'ELEKTRONIK',
      }
      const result = CreateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Nama komoditas wajib diisi')
      }
    })

    it('rejects empty targetCommodity', () => {
      const payload = {
        commodityName: 'Spareparts',
        targetCommodity: '',
      }
      const result = CreateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Tipe komoditi tujuan wajib diisi')
      }
    })
  })

  describe('UpdateCommodityMappingSchema', () => {
    it('accepts partial update', () => {
      const payload = {
        targetCommodity: 'GENERAL_CARGO',
        price: 2000000,
        notes: 'Updated target category',
      }
      const result = UpdateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts valid scopeChangeOption', () => {
      const options = ['specific_effective_date', 'all_active_future', 'retroactive'] as const
      for (const opt of options) {
        const result = UpdateCommodityMappingSchema.safeParse({ scopeChangeOption: opt })
        expect(result.success).toBe(true)
      }
    })

    it('rejects invalid scopeChangeOption', () => {
      const payload = {
        scopeChangeOption: 'invalid_scope_choice',
      }
      const result = UpdateCommodityMappingSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })
  })

  describe('ApplyMappingsToUploadSchema', () => {
    it('accepts valid payload', () => {
      const payload = {
        uploadId: 42,
        effectiveDate: '2026-03-01',
        isCustomerUpload: true,
        fdCustCode: 'CUST-002',
        selectedMappingIds: [1, 2, 3],
      }
      const result = ApplyMappingsToUploadSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects non-positive uploadId', () => {
      const payload = {
        uploadId: 0,
        effectiveDate: '2026-03-01',
      }
      const result = ApplyMappingsToUploadSchema.safeParse(payload)
      expect(result.success).toBe(false)
    })

    it('rejects empty effectiveDate', () => {
      const payload = {
        uploadId: 10,
        effectiveDate: '',
      }
      const result = ApplyMappingsToUploadSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('effectiveDate wajib diisi')
      }
    })
  })
})
