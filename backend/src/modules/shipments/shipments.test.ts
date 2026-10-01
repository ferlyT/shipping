import { describe, it, expect } from 'bun:test'
import {
  resolveShipmentStatus,
  EMPTY_MARKING,
  type BlockedFinanceInfo,
} from './shipments-status.resolver'
import type { MarkingDates, DeliveryInfo, BillingInfo } from './shipments.types'
import { ShipmentsQuerySchema, ShipmentSuggestionsQuerySchema } from './shipments.types'

describe('Shipments Status Resolver', () => {
  const dummyDate = new Date('2026-03-01T00:00:00Z')

  const baseMarking: MarkingDates = {
    fdLoadDate: dummyDate,
    fdETD: null,
    fdETA: null,
    fdExitDate: null,
    fdGudang: 'GUDANG-UTAMA',
  }

  const defaultDelivery: DeliveryInfo = {
    hasDelivery: false,
    isSent: false,
  }

  const defaultBilling: BillingInfo = {
    isBilled: false,
    isPartiallyPaid: false,
    isPaid: false,
  }

  describe('Cancellation and Finance Blocking Overrides', () => {
    it('returns Canceled (step -1) when fdCancel === 1 regardless of other states', () => {
      const blocked: BlockedFinanceInfo = {
        isBlocked: true,
        blockedBy: 'FINANCE_ADMIN',
        blockedReason: 'Piutang macet',
      }
      const paidBilling: BillingInfo = {
        isBilled: true,
        isPartiallyPaid: false,
        isPaid: true,
      }

      const status = resolveShipmentStatus(baseMarking, defaultDelivery, paidBilling, 1, blocked)
      expect(status.statusLabel).toBe('Canceled')
      expect(status.statusStep).toBe(-1)
    })

    it('returns Blocked (step 10) when blockedInfo.isBlocked === true and not canceled', () => {
      const blocked: BlockedFinanceInfo = {
        isBlocked: true,
        blockedBy: 'AUDITOR_FINANCE',
        blockedReason: 'Over credit limit',
      }

      const status = resolveShipmentStatus(baseMarking, defaultDelivery, defaultBilling, 0, blocked)
      expect(status.statusLabel).toBe('Blocked')
      expect(status.statusStep).toBe(10)
      expect(status.isBlocked).toBe(true)
      expect(status.blockedBy).toBe('AUDITOR_FINANCE')
      expect(status.blockedReason).toBe('Over credit limit')
    })
  })

  describe('Pre-warehouse lifecycle milestones', () => {
    it('returns Belum Ada Data Marking (step 0) when marking is null or undefined', () => {
      const statusNull = resolveShipmentStatus(null, defaultDelivery, defaultBilling)
      expect(statusNull.statusLabel).toBe('Belum Ada Data Marking')
      expect(statusNull.statusStep).toBe(0)

      const statusUndef = resolveShipmentStatus(undefined, defaultDelivery, defaultBilling)
      expect(statusUndef.statusLabel).toBe('Belum Ada Data Marking')
      expect(statusUndef.statusStep).toBe(0)
    })

    it('returns Waiting (step 0) when marking has no dates set', () => {
      const status = resolveShipmentStatus(EMPTY_MARKING, defaultDelivery, defaultBilling)
      expect(status.statusLabel).toBe('Waiting')
      expect(status.statusStep).toBe(0)
    })

    it('returns Loading (step 1) when fdLoadDate is present', () => {
      const marking: MarkingDates = {
        ...EMPTY_MARKING,
        fdLoadDate: dummyDate,
      }
      const status = resolveShipmentStatus(marking, defaultDelivery, defaultBilling)
      expect(status.statusLabel).toBe('Loading')
      expect(status.statusStep).toBe(1)
    })

    it('returns ETD (step 2) when fdETD is present', () => {
      const marking: MarkingDates = {
        ...EMPTY_MARKING,
        fdLoadDate: dummyDate,
        fdETD: dummyDate,
      }
      const status = resolveShipmentStatus(marking, defaultDelivery, defaultBilling)
      expect(status.statusLabel).toBe('ETD')
      expect(status.statusStep).toBe(2)
    })

    it('returns ETA (step 3) when fdETA is present', () => {
      const marking: MarkingDates = {
        ...EMPTY_MARKING,
        fdLoadDate: dummyDate,
        fdETD: dummyDate,
        fdETA: dummyDate,
      }
      const status = resolveShipmentStatus(marking, defaultDelivery, defaultBilling)
      expect(status.statusLabel).toBe('ETA')
      expect(status.statusStep).toBe(3)
    })
  })

  describe('Post-warehouse and delivery lifecycle steps (fdExitDate present)', () => {
    const exitMarking: MarkingDates = {
      fdLoadDate: dummyDate,
      fdETD: dummyDate,
      fdETA: dummyDate,
      fdExitDate: dummyDate,
      fdGudang: 'GUDANG-UTAMA',
    }

    it('returns Warehouse (step 4) when cargo has exited warehouse but has no delivery or bill', () => {
      const status = resolveShipmentStatus(exitMarking, defaultDelivery, defaultBilling)
      expect(status.statusLabel).toBe('Warehouse')
      expect(status.statusStep).toBe(4)
    })

    it('returns Delivery (step 5) when delivery order is initiated', () => {
      const delivery: DeliveryInfo = {
        hasDelivery: true,
        isSent: false,
      }
      const status = resolveShipmentStatus(exitMarking, delivery, defaultBilling)
      expect(status.statusLabel).toBe('Delivery')
      expect(status.statusStep).toBe(5)
    })

    it('returns Delivered (step 6) when cargo has been confirmed sent/delivered', () => {
      const delivery: DeliveryInfo = {
        hasDelivery: true,
        isSent: true,
      }
      const status = resolveShipmentStatus(exitMarking, delivery, defaultBilling)
      expect(status.statusLabel).toBe('Delivered')
      expect(status.statusStep).toBe(6)
    })

    it('returns Billed (step 7) when invoice has been generated', () => {
      const delivery: DeliveryInfo = {
        hasDelivery: true,
        isSent: true,
      }
      const billing: BillingInfo = {
        isBilled: true,
        isPartiallyPaid: false,
        isPaid: false,
      }
      const status = resolveShipmentStatus(exitMarking, delivery, billing)
      expect(status.statusLabel).toBe('Billed')
      expect(status.statusStep).toBe(7)
    })

    it('returns Partially Paid (step 8) when partial payment has been recorded', () => {
      const billing: BillingInfo = {
        isBilled: true,
        isPartiallyPaid: true,
        isPaid: false,
      }
      const status = resolveShipmentStatus(exitMarking, defaultDelivery, billing)
      expect(status.statusLabel).toBe('Partially Paid')
      expect(status.statusStep).toBe(8)
    })

    it('returns Paid (step 9) when invoice is completely settled', () => {
      const billing: BillingInfo = {
        isBilled: true,
        isPartiallyPaid: false,
        isPaid: true,
      }
      const status = resolveShipmentStatus(exitMarking, defaultDelivery, billing)
      expect(status.statusLabel).toBe('Paid')
      expect(status.statusStep).toBe(9)
    })
  })

  describe('Shipments Query Validation Schemas', () => {
    it('accepts valid ShipmentsQuery parameters', () => {
      const parsed = ShipmentsQuerySchema.safeParse({
        page: '1',
        limit: '50',
        search: 'JKT-001',
        branch: 'GZ',
        status: 'active',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-31',
      })
      expect(parsed.success).toBe(true)
    })

    it('validates ShipmentSuggestionsQuerySchema', () => {
      expect(ShipmentSuggestionsQuerySchema.safeParse({ q: 'JKT' }).success).toBe(true)
      expect(ShipmentSuggestionsQuerySchema.safeParse({}).success).toBe(true)
    })
  })
})
