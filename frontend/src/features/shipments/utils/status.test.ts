import { describe, it, expect } from 'bun:test'
import { STATUS_STYLES, STATUS_ORDER } from './status'

describe('Shipment Status Styles & Ordering', () => {
  it('defines style configuration for every status in STATUS_ORDER', () => {
    for (const code of STATUS_ORDER) {
      const style = STATUS_STYLES[code]
      expect(style).toBeDefined()
      expect(typeof style.label).toBe('string')
      expect(typeof style.bg).toBe('string')
      expect(typeof style.text).toBe('string')
      expect(typeof style.dot).toBe('string')
    }
  })

  it('correctly maps Canceled status (-1)', () => {
    const canceled = STATUS_STYLES[-1]
    expect(canceled.label).toBe('Canceled')
    expect(canceled.dot).toContain('bg-rose-500')
    expect(canceled.text).toContain('text-rose-600')
  })

  it('correctly maps Blocked status (10) with pulse animation', () => {
    const blocked = STATUS_STYLES[10]
    expect(blocked.label).toBe('Blocked')
    expect(blocked.dot).toContain('animate-pulse')
    expect(blocked.text).toContain('text-rose-600')
  })

  it('correctly maps key operational lifecycle statuses', () => {
    expect(STATUS_STYLES[0].label).toBe('Waiting')
    expect(STATUS_STYLES[1].label).toBe('Loading')
    expect(STATUS_STYLES[2].label).toBe('ETD')
    expect(STATUS_STYLES[3].label).toBe('ETA')
    expect(STATUS_STYLES[4].label).toBe('Warehouse')
    expect(STATUS_STYLES[5].label).toBe('Delivery')
    expect(STATUS_STYLES[6].label).toBe('Delivered')
    expect(STATUS_STYLES[7].label).toBe('Billed')
    expect(STATUS_STYLES[8].label).toBe('Partially Paid')
    expect(STATUS_STYLES[9].label).toBe('Paid')
  })

  it('prioritizes exceptional statuses in STATUS_ORDER (-1 and 10 before 0..9)', () => {
    expect(STATUS_ORDER[0]).toBe(-1) // Canceled
    expect(STATUS_ORDER[1]).toBe(10) // Blocked
    expect(STATUS_ORDER.slice(2)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
