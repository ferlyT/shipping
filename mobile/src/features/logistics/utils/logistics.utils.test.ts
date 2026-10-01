import { describe, expect, it } from 'bun:test'
import {
  getBatchDateDisplay,
  getDeliveryOrderStatus,
  getFinancialStatusBadge,
  getShipmentStatusBadge,
} from './logistics.utils'

describe('mobile logistics.utils', () => {
  describe('getBatchDateDisplay', () => {
    it('prioritizes ExitDate over ETA/ETD/LoadDate', () => {
      const item = {
        fdExitDate: '2026-06-01',
        fdETA: '2026-05-20',
        fdETD: '2026-05-10',
      }
      expect(getBatchDateDisplay(item)).toEqual({ label: 'Exit', date: '2026-06-01' })
    })

    it('falls back down the priority chain', () => {
      expect(getBatchDateDisplay({ fdETA: '2026-05-20' })).toEqual({ label: 'ETA', date: '2026-05-20' })
      expect(getBatchDateDisplay({ fdETD: '2026-05-10' })).toEqual({ label: 'ETD', date: '2026-05-10' })
      expect(getBatchDateDisplay({ fdLoadDate: '2026-05-01' })).toEqual({ label: 'Load', date: '2026-05-01' })
      expect(getBatchDateDisplay({ fdDate: '2026-04-20' })).toEqual({ label: 'Tgl', date: '2026-04-20' })
      expect(getBatchDateDisplay({})).toBeNull()
    })
  })

  describe('getDeliveryOrderStatus', () => {
    it('returns Delivered if fdSent is 1', () => {
      expect(getDeliveryOrderStatus({ fdSent: 1 })).toEqual({ label: 'Delivered', variant: 'success' })
    })

    it('returns On Delivery if past or equal estimasi date and not sent', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      expect(getDeliveryOrderStatus({ fdSent: 0, fdEstimasi: pastDate })).toEqual({
        label: 'On Delivery',
        variant: 'warning',
      })
    })

    it('returns Scheduled for future delivery', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      expect(getDeliveryOrderStatus({ fdSent: 0, fdEstimasi: futureDate })).toEqual({
        label: 'Scheduled',
        variant: 'info',
      })
    })
  })

  describe('getShipmentStatusBadge', () => {
    it('handles canceled step (-1)', () => {
      expect(getShipmentStatusBadge({ statusStep: -1 })).toEqual({ label: 'Canceled', variant: 'danger' })
    })

    it('handles blocked status', () => {
      expect(getShipmentStatusBadge({ statusStep: 10 })).toEqual({ label: 'Blocked', variant: 'danger' })
      expect(getShipmentStatusBadge({ isBlocked: true })).toEqual({ label: 'Blocked', variant: 'danger' })
    })

    it('handles normal shipment pipeline steps', () => {
      expect(getShipmentStatusBadge(null)).toEqual({ label: 'Waiting', variant: 'neutral' })
      expect(getShipmentStatusBadge({ statusStep: 0 })).toEqual({ label: 'Waiting', variant: 'neutral' })
      expect(getShipmentStatusBadge({ statusStep: 1, statusLabel: 'Loading' })).toEqual({ label: 'Loading', variant: 'info' })
      expect(getShipmentStatusBadge({ statusStep: 4, statusLabel: 'Warehouse' })).toEqual({ label: 'Warehouse', variant: 'success' })
      expect(getShipmentStatusBadge({ statusStep: 6, statusLabel: 'Delivered' })).toEqual({ label: 'Delivered', variant: 'success' })
      expect(getShipmentStatusBadge({ statusStep: 9, statusLabel: 'Paid' })).toEqual({ label: 'Paid', variant: 'success' })
    })
  })

  describe('getFinancialStatusBadge', () => {
    it('handles blocked flags', () => {
      expect(getFinancialStatusBadge('OK', 1)).toEqual({ label: 'BLOCKED', variant: 'danger' })
      expect(getFinancialStatusBadge('BLOCKED')).toEqual({ label: 'BLOCKED', variant: 'danger' })
    })

    it('handles standard financial statuses', () => {
      expect(getFinancialStatusBadge('OK')).toEqual({ label: 'OK', variant: 'neutral' })
      expect(getFinancialStatusBadge('COD')).toEqual({ label: 'COD', variant: 'success' })
      expect(getFinancialStatusBadge('WARNING')).toEqual({ label: 'WARNING', variant: 'warning' })
      expect(getFinancialStatusBadge('URGENT')).toEqual({ label: 'URGENT', variant: 'info' })
      expect(getFinancialStatusBadge('PAID')).toEqual({ label: 'LUNAS', variant: 'success' })
      expect(getFinancialStatusBadge('LUNAS')).toEqual({ label: 'LUNAS', variant: 'success' })
      expect(getFinancialStatusBadge(undefined)).toEqual({ label: 'NO STATUS', variant: 'neutral' })
    })
  })
})
