import { describe, it, expect } from 'bun:test'
import { calculateTrend } from './dashboard.utils'

describe('Dashboard Module', () => {
  describe('calculateTrend utility', () => {
    it('returns null when both current and previous months are zero', () => {
      expect(calculateTrend(0, 0)).toBeNull()
    })

    it('returns 100% up trend when previous month is zero and current month has activity', () => {
      expect(calculateTrend(15, 0)).toEqual({
        type: 'up',
        value: '100%',
        label: 'vs bulan lalu',
      })
    })

    it('calculates positive growth when this month exceeds last month', () => {
      const trend = calculateTrend(120, 100)
      expect(trend).toEqual({
        type: 'up',
        value: '20.0%',
        label: 'vs bulan lalu',
      })
    })

    it('calculates negative growth when this month is less than last month', () => {
      const trend = calculateTrend(75, 100)
      expect(trend).toEqual({
        type: 'down',
        value: '25.0%',
        label: 'vs bulan lalu',
      })
    })

    it('calculates 0.0% up trend when current and previous month values are identical', () => {
      const trend = calculateTrend(50, 50)
      expect(trend).toEqual({
        type: 'up',
        value: '0.0%',
        label: 'vs bulan lalu',
      })
    })

    it('calculates 100.0% down trend when current month drops to 0 from previous month', () => {
      const trend = calculateTrend(0, 50)
      expect(trend).toEqual({
        type: 'down',
        value: '100.0%',
        label: 'vs bulan lalu',
      })
    })
  })
})
