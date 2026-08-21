export interface DayRange {
  date: string
  start: Date
  end: Date
  label: string
}

export interface MonthRange {
  start: Date
  end: Date
  label: string
}

export interface Trend {
  value: number
  direction: 'up' | 'down' | 'flat'
}

/**
 * Returns the last `n` days (inclusive of today) as { date, start, end, label }.
 * `labelFormat` lets callers control how the label is rendered
 * (e.g. "22 Jul" for trend charts vs "Sel 22" for the per-employee chart).
 */
export function getLastNDays(
  n: number,
  labelFormat?: Intl.DateTimeFormatOptions
): DayRange[] {
  const now = new Date()
  const days: DayRange[] = []
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59, 999)
    
    let label: string
    if (labelFormat) {
      label = start.toLocaleDateString('id-ID', labelFormat)
    } else {
      const dateStr = start.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      const dayStr = start.toLocaleDateString('id-ID', { weekday: 'short' })
      label = `${dateStr} (${dayStr})`
    }

    days.push({
      date: start.toISOString().slice(0, 10),
      start,
      end,
      label,
    })
  }
  return days
}

/** Returns the last `n` months (inclusive of the current month) as { start, end, label }. */
export function getLastNMonths(n: number): MonthRange[] {
  const now = new Date()
  const months: MonthRange[] = []
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    months.push({
      start,
      end,
      label: start.toLocaleString('id-ID', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

/** Percentage change of `current` vs `previous`, with direction for up/down/flat badges. */
export function calculateTrend(current: number, previous: number): Trend {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' }
  }
  const pct = ((current - previous) / previous) * 100
  const rounded = Math.round(pct * 10) / 10
  return {
    value: Math.abs(rounded),
    direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
  }
}
