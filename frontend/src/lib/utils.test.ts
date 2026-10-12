import { describe, it, expect } from 'bun:test'
import {
  cn,
  cleanFoxProString,
  displayCustName,
  calculateOverweight,
  calculateOverweightRaw,
  formatCurrency,
  formatCompactRupiah,
  formatM3,
  formatWeight,
  getInitials,
  truncate,
  formatDate,
  formatYearMonthKey,
  replaceDbCaret,
  cleanDbData,
} from './utils'


describe('Frontend utils test suite', () => {
  describe('cn (Tailwind class merger)', () => {
    it('merges class names and resolves conflicts', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2')
      expect(cn('text-red-500', true && 'font-bold')).toBe('text-red-500 font-bold')
      expect(cn('bg-white', false && 'hidden', null, undefined)).toBe('bg-white')
    })
  })

  describe('FoxPro unmasking and customer name display', () => {
    it('unmasks FoxPro caret quotes correctly', () => {
      expect(cleanFoxProString('MULTI TOY^S')).toBe("MULTI TOY'S")
      expect(cleanFoxProString('PT. ABC')).toBe('PT. ABC')
      expect(cleanFoxProString(null)).toBe('')
    })

    it('formats customer name from string or object', () => {
      expect(displayCustName('MULTI TOY^S')).toBe("MULTI TOY'S")
      expect(displayCustName({ fdCustName: 'CV. JAYA^S', fdCustCode: '001' })).toBe("CV. JAYA'S")
      expect(displayCustName({ fdCustName: null, fdCustCode: 'CUST99' })).toBe('CUST99')
      expect(displayCustName(null)).toBe('—')
    })
  })

  describe('calculateOverweight', () => {
    it('calculates overweight rounded up when weight exceeds ratio * m3', () => {
      // 1000 kg, 2 m3, ratio 400 -> limit is 800 kg -> overweight is 200 kg
      expect(calculateOverweight(1000, 2, 400)).toBe(200)
      // 800.4 kg, 2 m3, ratio 400 -> limit is 800 kg -> overweight is ceil(0.4) = 1 kg
      expect(calculateOverweight(800.4, 2, 400)).toBe(1)
    })

    it('returns 0 when within ratio limit or zero input', () => {
      expect(calculateOverweight(500, 2, 400)).toBe(0)
      expect(calculateOverweight(0, 0, 400)).toBe(0)
      expect(calculateOverweight(null, null, null)).toBe(0)
    })

    it('calculates raw overweight difference with sign', () => {
      // 500 kg - (2 * 400) = -300
      expect(calculateOverweightRaw(500, 2, 400)).toBe(-300)
      expect(calculateOverweightRaw(1000, 2, 400)).toBe(200)
      expect(calculateOverweightRaw(0, 0, 0)).toBeNull()
    })
  })

  describe('formatCurrency & formatCompactRupiah', () => {
    it('formats currency with Rp. prefix', () => {
      const formatted = formatCurrency(1500000)
      expect(formatted).toContain('Rp. 1,500,000.00')
      expect(formatCurrency(null)).toBe('—')
    })

    it('formats compact rupiah for KPI cards', () => {
      expect(formatCompactRupiah(1640000000)).toBe('Rp 1.64 M')
      expect(formatCompactRupiah(500000000)).toBe('Rp 500.0 Jt')
      expect(formatCompactRupiah(0)).toBe('Rp 0')
    })
  })

  describe('formatM3 & formatWeight', () => {
    it('formats volume to 4 decimal places', () => {
      expect(formatM3(0.02568)).toBe('0.0257')
      expect(formatM3(0.02568, true)).toBe('0.0257 m³')
      expect(formatM3(null)).toBe('—')
    })

    it('formats weight to 2 decimal places with Kg unit', () => {
      expect(formatWeight(12.5)).toBe('12.50 Kg')
      expect(formatWeight(null)).toBe('—')
    })
  })

  describe('getInitials', () => {
    it('derives 2-letter uppercase initials', () => {
      expect(getInitials('Budi Santoso')).toBe('BS')
      expect(getInitials('Administrator')).toBe('AD')
      expect(getInitials(null)).toBe('US')
    })
  })

  describe('truncate and string formatting', () => {
    it('truncates long strings with ellipsis', () => {
      expect(truncate('Surat Jalan Pengiriman Barang', 11)).toBe('Surat Jalan…')
      expect(truncate('Pendek', 10)).toBe('Pendek')
    })

    it('formats year-month key to English month name', () => {
      expect(formatYearMonthKey('2026-07')).toBe('July 2026')
      expect(formatYearMonthKey('2026-01')).toBe('January 2026')
      expect(formatYearMonthKey('Unknown')).toBe('Unknown')
    })

    it('formats dates consistently', () => {
      const formatted = formatDate('2026-08-17T00:00:00Z')
      expect(formatted).toContain('2026')
      expect(formatDate(null)).toBe('—')
    })

    it('replaces ^ caret with single quote in string and nested data', () => {
      expect(replaceDbCaret('ALAM RAYA TRANSPORT^S')).toBe("ALAM RAYA TRANSPORT'S")
      expect(replaceDbCaret('D^CLASSIC, PT')).toBe("D'CLASSIC, PT")
      expect(replaceDbCaret(null)).toBe('')

      const cleaned = cleanDbData({
        customer: 'BOB^S GOLF SHOP',
        branches: ['ASANG INT^L TAILOR', 'BERCA HARDAYAPERKASA^PT'],
        nested: { note: 'DON^T WORRY' },
        num: 42
      })
      expect(cleaned.customer).toBe("BOB'S GOLF SHOP")
      expect(cleaned.branches).toEqual(["ASANG INT'L TAILOR", "BERCA HARDAYAPERKASA'PT"])
      expect(cleaned.nested.note).toBe("DON'T WORRY")
      expect(cleaned.num).toBe(42)
    })
  })
})

