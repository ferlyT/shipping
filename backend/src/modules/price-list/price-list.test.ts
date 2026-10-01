import { describe, it, expect } from 'bun:test'
import {
  calculatePriceDelta,
  UpdateEffectiveDateSchema,
  SetUploadMarkingsSchema,
} from './price-list.types'
import { normalizeMode } from './marking-matcher'

describe('Price List Module', () => {
  describe('normalizeMode helper', () => {
    it('normalizes air mode variants to BY AIR', () => {
      expect(normalizeMode('BY AIR')).toBe('BY AIR')
      expect(normalizeMode('AIR')).toBe('BY AIR')
      expect(normalizeMode('UDARA')).toBe('BY AIR')
      expect(normalizeMode('by air express')).toBe('BY AIR')
      expect(normalizeMode('Paket Udara')).toBe('BY AIR')
    })

    it('defaults and normalizes sea mode variants to BY SEA', () => {
      expect(normalizeMode('BY SEA')).toBe('BY SEA')
      expect(normalizeMode('SEA')).toBe('BY SEA')
      expect(normalizeMode('laut')).toBe('BY SEA')
      expect(normalizeMode(null)).toBe('BY SEA')
      expect(normalizeMode(undefined)).toBe('BY SEA')
      expect(normalizeMode('')).toBe('BY SEA')
    })
  })

  describe('calculatePriceDelta helper', () => {
    it('returns nulls when previousPrice is not provided or null', () => {
      expect(calculatePriceDelta(10000, null)).toEqual({ delta: null, deltaPct: null })
      expect(calculatePriceDelta(10000, undefined)).toEqual({ delta: null, deltaPct: null })
    })

    it('calculates price increase and delta percentage correctly', () => {
      const result = calculatePriceDelta(15000, 10000)
      expect(result.delta).toBe(5000)
      expect(result.deltaPct).toBe(50)
    })

    it('calculates price decrease and negative delta percentage correctly', () => {
      const result = calculatePriceDelta(8000, 10000)
      expect(result.delta).toBe(-2000)
      expect(result.deltaPct).toBe(-20)
    })

    it('calculates unchanged price as 0 delta and 0 percentage', () => {
      const result = calculatePriceDelta(12500, 12500)
      expect(result.delta).toBe(0)
      expect(result.deltaPct).toBe(0)
    })

    it('safely handles zero previous price without division by zero', () => {
      const result = calculatePriceDelta(5000, 0)
      expect(result.delta).toBe(5000)
      expect(result.deltaPct).toBeNull()
    })
  })

  describe('Validation Schemas', () => {
    it('validates UpdateEffectiveDateSchema with valid date strings', () => {
      const valid = UpdateEffectiveDateSchema.safeParse({ effectiveDate: '2026-10-01' })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.effectiveDate).toBe('2026-10-01')
      }
    })

    it('rejects invalid or empty dates in UpdateEffectiveDateSchema', () => {
      expect(UpdateEffectiveDateSchema.safeParse({ effectiveDate: 'invalid-date' }).success).toBe(false)
      expect(UpdateEffectiveDateSchema.safeParse({ effectiveDate: '' }).success).toBe(false)
      expect(UpdateEffectiveDateSchema.safeParse({}).success).toBe(false)
    })

    it('validates SetUploadMarkingsSchema with valid markings list', () => {
      const valid = SetUploadMarkingsSchema.safeParse({
        markings: [
          { markingCode: '26GZD01', agentName: 'GZ', mode: 'BY SEA' },
          { markingCode: '26YWD02', agentName: null, mode: null },
        ],
      })
      expect(valid.success).toBe(true)
      if (valid.success) {
        expect(valid.data.markings).toHaveLength(2)
      }
    })

    it('rejects empty markings array or missing markingCode', () => {
      const empty = SetUploadMarkingsSchema.safeParse({ markings: [] })
      expect(empty.success).toBe(false)

      const missingCode = SetUploadMarkingsSchema.safeParse({
        markings: [{ agentName: 'GZ' }],
      })
      expect(missingCode.success).toBe(false)
    })
  })
})
