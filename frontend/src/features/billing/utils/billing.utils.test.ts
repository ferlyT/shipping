import { describe, it, expect } from 'bun:test'
import {
  formatQtyDecimal,
  getAgingDays,
  getBillingStatus,
} from './billing.utils'

describe('Billing Utils Test Suite', () => {
  describe('formatQtyDecimal', () => {
    it('formats integer quantities with locale commas and no decimals', () => {
      expect(formatQtyDecimal(10)).toBe('10')
      expect(formatQtyDecimal(1500)).toBe('1,500')
    })

    it('formats standard decimal quantities to 2 decimal places', () => {
      expect(formatQtyDecimal(10.5)).toBe('10.50')
      expect(formatQtyDecimal(12.345)).toBe('12.35')
    })

    it('formats volume and area units (M3, M2) to 4 decimal places', () => {
      expect(formatQtyDecimal(2.1234, 'M3')).toBe('2.1234')
      expect(formatQtyDecimal(5.6789, 'm2')).toBe('5.6789')
      expect(formatQtyDecimal(1.5, 'BOX', 'CARGO VOLUME M3')).toBe('1.5000')
    })

    it('handles falsy or zero quantities gracefully', () => {
      expect(formatQtyDecimal(0)).toBe('0')
      expect(formatQtyDecimal(0, 'M3')).toBe('0.0000')
    })
  })

  describe('getAgingDays', () => {
    it('returns 0 for empty, null, or invalid date strings', () => {
      expect(getAgingDays(null)).toBe(0)
      expect(getAgingDays(undefined)).toBe(0)
      expect(getAgingDays('')).toBe(0)
      expect(getAgingDays('not-a-date')).toBe(0)
    })

    it('returns 0 for today or future dates', () => {
      const today = new Date().toISOString()
      expect(getAgingDays(today)).toBe(0)

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      expect(getAgingDays(tomorrow)).toBe(0)
    })

    it('calculates days difference correctly for past dates', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      expect(getAgingDays(fiveDaysAgo)).toBe(5)

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      expect(getAgingDays(thirtyDaysAgo)).toBe(30)
    })
  })

  describe('getBillingStatus', () => {
    it('returns draft when row is null or undefined', () => {
      expect(getBillingStatus(null)).toBe('draft')
      expect(getBillingStatus(undefined)).toBe('draft')
    })

    it('returns collected when fdGive2 === 1 regardless of other flags', () => {
      expect(getBillingStatus({ fdGive2: 1, fdGive: 1, fdCekDate: '2026-01-01' })).toBe('collected')
      expect(getBillingStatus({ fdGive2: 1, fdGive: 0, fdCekDate: null })).toBe('collected')
    })

    it('returns issued when fdGive === 1 and fdGive2 !== 1', () => {
      expect(getBillingStatus({ fdGive: 1, fdGive2: 0, fdCekDate: '2026-01-01' })).toBe('issued')
      expect(getBillingStatus({ fdGive: 1, fdGive2: null, fdCekDate: null })).toBe('issued')
    })

    it('returns draft when neither fdGive nor fdGive2 is 1', () => {
      expect(getBillingStatus({ fdGive: 0, fdGive2: 0, fdCekDate: '2026-01-01' })).toBe('draft')
      expect(getBillingStatus({ fdGive: null, fdGive2: null, fdCekDate: null })).toBe('draft')
    })
  })
})
