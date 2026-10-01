import { describe, it, expect } from 'bun:test'
import { getLastNDays, getLastNMonths, calculateTrend } from './dateRange'

describe('DateRange Utilities', () => {
  describe('getLastNDays', () => {
    it('returns the requested number of days', () => {
      const days = getLastNDays(7)
      expect(days).toHaveLength(7)

      // Ensure each item has required properties
      for (const day of days) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(day.start).toBeInstanceOf(Date)
        expect(day.end).toBeInstanceOf(Date)
        expect(typeof day.label).toBe('string')
        expect(day.start.getTime()).toBeLessThanOrEqual(day.end.getTime())
      }

      // Verify the last item corresponds to today
      const today = new Date()
      const lastDay = days[days.length - 1]!
      expect(lastDay.start.getDate()).toBe(today.getDate())
      expect(lastDay.start.getMonth()).toBe(today.getMonth())
      expect(lastDay.start.getFullYear()).toBe(today.getFullYear())
    })

    it('respects custom labelFormat options', () => {
      const days = getLastNDays(3, { day: 'numeric', month: 'numeric' })
      expect(days).toHaveLength(3)
      for (const day of days) {
        expect(day.label).not.toContain('(')
      }
    })
  })

  describe('getLastNMonths', () => {
    it('returns the requested number of months', () => {
      const months = getLastNMonths(6)
      expect(months).toHaveLength(6)

      for (const m of months) {
        expect(m.start).toBeInstanceOf(Date)
        expect(m.end).toBeInstanceOf(Date)
        expect(typeof m.label).toBe('string')
        expect(m.start.getDate()).toBe(1)
        expect(m.start.getTime()).toBeLessThan(m.end.getTime())
      }

      // Last month should be current month
      const today = new Date()
      const currentMonth = months[months.length - 1]!
      expect(currentMonth.start.getMonth()).toBe(today.getMonth())
      expect(currentMonth.start.getFullYear()).toBe(today.getFullYear())
    })
  })

  describe('calculateTrend', () => {
    it('calculates positive growth correctly', () => {
      const trend = calculateTrend(120, 100)
      expect(trend.value).toBe(20)
      expect(trend.direction).toBe('up')
    })

    it('calculates negative decline correctly', () => {
      const trend = calculateTrend(80, 100)
      expect(trend.value).toBe(20)
      expect(trend.direction).toBe('down')
    })

    it('handles zero previous value safely without division by zero', () => {
      const trendPositive = calculateTrend(50, 0)
      expect(trendPositive.value).toBe(100)
      expect(trendPositive.direction).toBe('up')

      const trendZero = calculateTrend(0, 0)
      expect(trendZero.value).toBe(0)
      expect(trendZero.direction).toBe('flat')
    })

    it('handles identical current and previous as flat', () => {
      const trend = calculateTrend(100, 100)
      expect(trend.value).toBe(0)
      expect(trend.direction).toBe('flat')
    })
  })
})
