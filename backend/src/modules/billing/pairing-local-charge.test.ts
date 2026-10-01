import { describe, expect, it } from 'bun:test'
import {
  normalizeGreekToLatin,
  sanitizeControlChars,
  parseShippingMarks,
  parseReceiptNos,
} from './pairing-local-charge.service'

describe('Pairing Local Charge Logic', () => {
  describe('normalizeGreekToLatin', () => {
    it('normalizes Greek homoglyphs to Latin uppercase and lowercase', () => {
      // 26ΗΚΑ21: Η (Eta U+0397), Κ (Kappa U+039A), Α (Alpha U+0391) -> 26HKA21
      const greekInput = '26\u0397\u039A\u039121'
      expect(normalizeGreekToLatin(greekInput)).toBe('26HKA21')
    })

    it('returns empty string for falsy input', () => {
      expect(normalizeGreekToLatin('')).toBe('')
    })

    it('leaves standard Latin characters untouched', () => {
      expect(normalizeGreekToLatin('JKT-2026-X')).toBe('JKT-2026-X')
    })
  })

  describe('sanitizeControlChars', () => {
    it('strips invisible ASCII control characters (STX, ETX, NULL)', () => {
      const input = '\u0002RESI-9988\u0003'
      expect(sanitizeControlChars(input)).toBe('RESI-9988')
    })

    it('trims leading and trailing whitespace', () => {
      const input = '   RESI-1234   '
      expect(sanitizeControlChars(input)).toBe('RESI-1234')
    })

    it('handles null and undefined gracefully', () => {
      expect(sanitizeControlChars(null)).toBe('')
      expect(sanitizeControlChars(undefined)).toBe('')
    })
  })

  describe('parseShippingMarks', () => {
    it('parses standard mark with "NO." keyword', () => {
      const marks = parseShippingMarks('26HKA NO. 101')
      expect(marks).toEqual([
        { markingCode: '26HKA', markingNo: '101' },
      ])
    })

    it('parses multiple marks separated by comma', () => {
      const marks = parseShippingMarks('26HKA NO. 101, 26HKB NO. 102')
      expect(marks).toEqual([
        { markingCode: '26HKA', markingNo: '101' },
        { markingCode: '26HKB', markingNo: '102' },
      ])
    })

    it('falls back to splitting by first space when "NO." is absent', () => {
      const marks = parseShippingMarks('26HKA 555')
      expect(marks).toEqual([
        { markingCode: '26HKA', markingNo: '555' },
      ])
    })

    it('handles mark without number', () => {
      const marks = parseShippingMarks('26HKA')
      expect(marks).toEqual([
        { markingCode: '26HKA', markingNo: '' },
      ])
    })

    it('normalizes Greek characters in marks automatically', () => {
      const marks = parseShippingMarks('26\u0397\u039A\u0391 NO. 88')
      expect(marks).toEqual([
        { markingCode: '26HKA', markingNo: '88' },
      ])
    })
  })

  describe('parseReceiptNos', () => {
    it('returns array with single receipt when no comma is present', () => {
      expect(parseReceiptNos('HK260703-014')).toEqual(['HK260703-014'])
    })

    it('expands shorthand comma-separated receipts correctly', () => {
      // 'HK260703-014,5' -> base 'HK260703-014', suffix '5' replaces last char '4' -> 'HK260703-015'
      expect(parseReceiptNos('HK260703-014,5')).toEqual([
        'HK260703-014',
        'HK260703-015',
      ])
    })

    it('handles multi-digit suffixes replacing suffix length', () => {
      // 'HK260703-014,16' -> suffix '16' replaces last 2 chars '14' -> 'HK260703-016'
      expect(parseReceiptNos('HK260703-014,16')).toEqual([
        'HK260703-014',
        'HK260703-016',
      ])
    })

    it('returns empty array on empty input', () => {
      expect(parseReceiptNos('')).toEqual([])
    })
  })
})
