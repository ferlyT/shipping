import { describe, expect, it } from 'bun:test'
import {
  formatQtyDecimal,
  getAgingBadge,
  getAgingDays,
  isMktCustomer,
  isVfcItem,
} from './finance.utils'

describe('mobile finance.utils', () => {
  describe('getAgingDays', () => {
    it('returns 0 for empty or invalid date', () => {
      expect(getAgingDays(undefined)).toBe(0)
      expect(getAgingDays('invalid')).toBe(0)
    })

    it('calculates days difference correctly', () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      expect(getAgingDays(fiveDaysAgo)).toBe(5)
    })
  })

  describe('getAgingBadge', () => {
    it('returns appropriate badge based on aging brackets', () => {
      expect(getAgingBadge(5)).toEqual({ label: '5h (Baru)', variant: 'success' })
      expect(getAgingBadge(10)).toEqual({ label: '10h (Perhatian)', variant: 'warning' })
      expect(getAgingBadge(25)).toEqual({ label: '25h (Kritis)', variant: 'danger' })
      expect(getAgingBadge(45)).toEqual({ label: '45h (Macet)', variant: 'danger' })
    })
  })

  describe('formatQtyDecimal', () => {
    it('formats M2 and M3 with 4 decimal places', () => {
      expect(formatQtyDecimal(1.23456, 'M3')).toBe('1.2346')
      expect(formatQtyDecimal(2.5, 'M2')).toBe('2.5000')
      expect(formatQtyDecimal(0.0012, '', 'Item M3')).toBe('0.0012')
    })

    it('formats integers with thousands separator', () => {
      expect(formatQtyDecimal(1500, 'PCS')).toBe('1,500')
      expect(formatQtyDecimal(10, 'COLLI')).toBe('10')
    })

    it('formats general floats with 2 decimal places', () => {
      expect(formatQtyDecimal(12.3456, 'KG')).toBe('12.35')
    })
  })

  describe('isVfcItem', () => {
    it('identifies volume freight charge items', () => {
      expect(isVfcItem('Volume Freight Charge')).toBe(true)
      expect(isVfcItem('FREIGHT CHARGE AIR')).toBe(true)
      expect(isVfcItem('VFC Sea')).toBe(true)
      expect(isVfcItem('Regular Delivery')).toBe(false)
      expect(isVfcItem(null)).toBe(false)
    })
  })

  describe('isMktCustomer', () => {
    it('returns true if fdBroker === 1', () => {
      expect(isMktCustomer({ fdBroker: 1 })).toBe(true)
    })

    it('returns true if sales name contains marketing/broker keyword', () => {
      expect(isMktCustomer(null, 'MKT TEAM')).toBe(true)
      expect(isMktCustomer({ sales: 'BROKER SURABAYA' })).toBe(true)
      expect(isMktCustomer({ fdSalesNM: 'MARKETING 1' })).toBe(true)
    })

    it('returns false for regular sales', () => {
      expect(isMktCustomer({ sales: 'JOHN DOE' })).toBe(false)
      expect(isMktCustomer(null, null)).toBe(false)
    })
  })
})
