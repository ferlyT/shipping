import { describe, expect, it } from 'bun:test'
import {
  calcTotalVolume,
  cleanFoxProString,
  displayCustName,
  formatCompactRupiah,
  formatCurrency,
  formatCustomerSince,
  formatCustomerTenure,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatNumber,
  formatWeight,
  formatWithCurrency,
  getInitials,
  resolveAvatarUrl,
  replaceDbCaret,
  cleanDbData,
} from './utils'


describe('mobile utils', () => {
  describe('formatDate', () => {
    it('returns dash for null/undefined/empty', () => {
      expect(formatDate(null)).toBe('—')
      expect(formatDate(undefined)).toBe('—')
      expect(formatDate('')).toBe('—')
    })

    it('formats valid ISO date strings in id-ID format', () => {
      const result = formatDate('2026-05-15T00:00:00Z')
      expect(result).toContain('2026')
      expect(result).toContain('15')
    })
  })

  describe('formatDateTime', () => {
    it('returns dash for empty values', () => {
      expect(formatDateTime(null)).toBe('—')
    })

    it('appends WIB', () => {
      const res = formatDateTime('2026-05-15T10:30:00Z')
      expect(res).toContain('WIB')
      expect(res).toMatch(/10[:.]30/)
    })
  })

  describe('formatCurrency & formatWithCurrency', () => {
    it('formats IDR numbers with Rp. prefix', () => {
      expect(formatCurrency(1500000)).toMatch(/Rp\.\s*1,500,000\.00/)
      expect(formatCurrency(null)).toBe('—')
    })

    it('supports other currencies with formatWithCurrency', () => {
      expect(formatWithCurrency(150, 'USD')).toMatch(/USD\s*150\.00/)
      expect(formatWithCurrency(50000, 'IDR')).toMatch(/Rp\.\s*50,000\.00/)
    })
  })

  describe('formatCompactRupiah', () => {
    it('returns Rp 0 for zero or empty', () => {
      expect(formatCompactRupiah(0)).toBe('Rp 0')
      expect(formatCompactRupiah(null)).toBe('Rp 0')
    })

    it('formats millions and billions with suffixes', () => {
      expect(formatCompactRupiah(2500000)).toBe('Rp 2.5 Jt')
      expect(formatCompactRupiah(3500000000)).toBe('Rp 3.50 M')
      expect(formatCompactRupiah(50000)).toMatch(/Rp\.\s*50,000\.00/)
    })
  })

  describe('formatNumber, formatDecimal, formatWeight', () => {
    it('formats plain numbers and decimals', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
      expect(formatNumber(null)).toBe('—')
      expect(formatDecimal(12.3456, 3)).toBe('12.346')
      expect(formatWeight(45.67)).toBe('45.7 kg')
      expect(formatWeight(null)).toBe('—')
    })
  })

  describe('resolveAvatarUrl', () => {
    it('returns null if no url provided', () => {
      expect(resolveAvatarUrl(null)).toBeNull()
      expect(resolveAvatarUrl('')).toBeNull()
    })

    it('returns unchanged if absolute http/https', () => {
      expect(resolveAvatarUrl('https://example.com/avatar.png')).toBe('https://example.com/avatar.png')
    })

    it('prepends app.sampai.co if relative path', () => {
      expect(resolveAvatarUrl('/uploads/avatar.jpg')).toBe('https://app.sampai.co/uploads/avatar.jpg')
      expect(resolveAvatarUrl('uploads/avatar.jpg')).toBe('https://app.sampai.co/uploads/avatar.jpg')
    })
  })

  describe('getInitials', () => {
    it('returns initials for single or multiple names', () => {
      expect(getInitials('John')).toBe('JO')
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Budi Santoso Wijaya')).toBe('BW')
      expect(getInitials(null)).toBe('?')
    })
  })

  describe('cleanFoxProString & displayCustName', () => {
    it('replaces caret with single quote and trims', () => {
      expect(cleanFoxProString('PT ^MAJU JAYA^')).toBe("PT 'MAJU JAYA'")
      expect(cleanFoxProString(null)).toBe('')
    })

    it('displays fallback when customer name is empty', () => {
      expect(displayCustName('')).toBe('—')
      expect(displayCustName(null, 'N/A')).toBe('N/A')
      expect(displayCustName('^ABC^')).toBe("'ABC'")
    })
  })

  describe('calcTotalVolume', () => {
    it('calculates sum of dimensions in m3', () => {
      const dims = [
        { fdPjg: 100, fdLbr: 100, fdTng: 100, fdQty: 1 }, // 1 m3
        { fdPjg: 50, fdLbr: 50, fdTng: 50, fdQty: 2 }, // 0.25 m3
      ]
      expect(calcTotalVolume(dims)).toBeCloseTo(1.25, 2)
      expect(calcTotalVolume([])).toBe(0)
    })
  })

  describe('formatCustomerSince & formatCustomerTenure', () => {
    it('formats customer since date', () => {
      expect(formatCustomerSince(null)).toBe('—')
      expect(formatCustomerSince('invalid')).toBe('—')
      const formatted = formatCustomerSince('2023-01-15')
      expect(formatted).toContain('2023')
    })

    it('returns null for empty customer tenure', () => {
      expect(formatCustomerTenure(null)).toBeNull()
      expect(formatCustomerTenure('invalid')).toBeNull()
    })
  })

  describe('replaceDbCaret & cleanDbData', () => {
    it('replaces ^ caret with single quote', () => {
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

