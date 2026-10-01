import { describe, it, expect } from 'bun:test'
import {
  parseInvoiceFamily,
  is7DigitListCode,
  parseM3Val,
  parseQtyVal,
} from './m3-check.service'
import {
  EvaluateM3CheckSchema,
  M3CustMarkingDetailsQuerySchema,
} from './m3-check.types'

describe('M3-Check and Invoice Family Parsing', () => {
  it('identifies parent invoice correctly (prefix with 0)', () => {
    const parsed = parseInvoiceFamily('INV-000123-01-2024')
    expect(parsed).not.toBeNull()
    expect(parsed?.isParent).toBe(true)
    expect(parsed?.isChild).toBe(false)
    expect(parsed?.headChar).toBe('0')
    expect(parsed?.parentInvNo).toBe('INV-000123-01-2024')
  })

  it('identifies child split invoice correctly (prefix with A-Z)', () => {
    const parsed = parseInvoiceFamily('INV-A00123-01-2024')
    expect(parsed).not.toBeNull()
    expect(parsed?.isParent).toBe(false)
    expect(parsed?.isChild).toBe(true)
    expect(parsed?.headChar).toBe('A')
    expect(parsed?.parentInvNo).toBe('INV-000123-01-2024')
  })

  it('handles invalid invoice strings gracefully', () => {
    expect(parseInvoiceFamily('INVALID-INVOICE')).toBeNull()
    expect(parseInvoiceFamily('')).toBeNull()
  })

  it('validates 5 to 8 digit list codes', () => {
    expect(is7DigitListCode('1234567')).toBe(true)
    expect(is7DigitListCode('12345')).toBe(true)
    expect(is7DigitListCode('12345678')).toBe(true)
    expect(is7DigitListCode('ABC1234')).toBe(false)
    expect(is7DigitListCode(null)).toBe(false)
    expect(is7DigitListCode(undefined)).toBe(false)
  })

  describe('parseM3Val helper', () => {
    it('returns null for null, undefined, or invalid NaN', () => {
      expect(parseM3Val(null)).toBeNull()
      expect(parseM3Val(undefined)).toBeNull()
      expect(parseM3Val('not-a-number')).toBeNull()
    })

    it('parses numeric and string decimals to 4 decimal precision', () => {
      expect(parseM3Val(1.23456)).toBe(1.2346)
      expect(parseM3Val('0.054321')).toBe(0.0543)
      expect(parseM3Val(0)).toBe(0)
    })
  })

  describe('parseQtyVal helper', () => {
    it('returns null for empty strings, null, undefined, or NaN', () => {
      expect(parseQtyVal(null)).toBeNull()
      expect(parseQtyVal(undefined)).toBeNull()
      expect(parseQtyVal('')).toBeNull()
      expect(parseQtyVal('abc')).toBeNull()
    })

    it('parses integers correctly from numbers and strings', () => {
      expect(parseQtyVal(150)).toBe(150)
      expect(parseQtyVal('250')).toBe(250)
      expect(parseQtyVal(0)).toBe(0)
    })
  })

  describe('Validation Schemas', () => {
    it('accepts EvaluateM3CheckSchema with listCode', () => {
      const res = EvaluateM3CheckSchema.safeParse({ listCode: '123456' })
      expect(res.success).toBe(true)
    })

    it('accepts EvaluateM3CheckSchema with markingCode', () => {
      const res = EvaluateM3CheckSchema.safeParse({ markingCode: 'MARK-001' })
      expect(res.success).toBe(true)
    })

    it('rejects EvaluateM3CheckSchema when all fields are empty', () => {
      const res = EvaluateM3CheckSchema.safeParse({})
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain('Salah satu dari listCode')
      }
    })

    it('accepts valid M3CustMarkingDetailsQuerySchema', () => {
      const res = M3CustMarkingDetailsQuerySchema.safeParse({
        custCode: 'CUST-01',
        markingCode: 'MARK-01',
      })
      expect(res.success).toBe(true)
    })

    it('rejects M3CustMarkingDetailsQuerySchema with missing parameters', () => {
      const res = M3CustMarkingDetailsQuerySchema.safeParse({ custCode: '' })
      expect(res.success).toBe(false)
    })
  })
})
