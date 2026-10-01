import { describe, expect, it } from 'bun:test'
import {
  formatCustomerSince,
  formatCustomerTenure,
  statusConfig,
  tierBadgeConfig,
} from './master.utils'

describe('mobile master.utils', () => {
  describe('formatCustomerTenure', () => {
    it('returns empty string for null or invalid date', () => {
      expect(formatCustomerTenure(undefined)).toBe('')
      expect(formatCustomerTenure('invalid')).toBe('')
    })

    it('returns months if less than 12 months', () => {
      const fiveMonthsAgo = new Date()
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5)
      expect(formatCustomerTenure(fiveMonthsAgo)).toBe('5bln')
    })

    it('returns years if 12 months or more', () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
      expect(formatCustomerTenure(twoYearsAgo)).toBe('2thn')
    })
  })

  describe('formatCustomerSince', () => {
    it('returns empty string for empty input', () => {
      expect(formatCustomerSince(undefined)).toBe('')
      expect(formatCustomerSince('invalid')).toBe('')
    })

    it('formats year and month in id-ID', () => {
      const res = formatCustomerSince('2024-03-15')
      expect(res).toContain('2024')
    })
  })

  describe('statusConfig & tierBadgeConfig', () => {
    it('contains all required customer status mappings', () => {
      expect(statusConfig[0].label).toBe('NO STATUS')
      expect(statusConfig[1].label).toBe('OK')
      expect(statusConfig[2].label).toBe('COD')
      expect(statusConfig[3].label).toBe('WARNING')
      expect(statusConfig[4].label).toBe('BLOCKED')
      expect(statusConfig[5].label).toBe('URGENT')
    })

    it('contains all required tier mappings', () => {
      expect(tierBadgeConfig.diamond.label).toBe('DIAMOND')
      expect(tierBadgeConfig.platinum.label).toBe('PLATINUM')
      expect(tierBadgeConfig.gold.label).toBe('GOLD')
      expect(tierBadgeConfig.silver.label).toBe('SILVER')
      expect(tierBadgeConfig.bronze.label).toBe('BRONZE')
      expect(tierBadgeConfig.none.label).toBe('UNRANKED')
    })
  })
})
