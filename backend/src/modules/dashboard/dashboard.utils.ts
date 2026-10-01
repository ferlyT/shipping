import type { DashboardTrend } from './dashboard.types'

/**
 * Calculate Month-over-Month (MoM) growth trend between current month and previous month
 */
export function calculateTrend(thisMonth: number, lastMonth: number): DashboardTrend | null {
  if (lastMonth === 0) {
    return thisMonth > 0
      ? { type: 'up', value: '100%', label: 'vs bulan lalu' }
      : null
  }

  const percentage = ((thisMonth - lastMonth) / lastMonth) * 100
  return {
    type: percentage >= 0 ? 'up' : 'down',
    value: `${Math.abs(percentage).toFixed(1)}%`,
    label: 'vs bulan lalu',
  }
}
