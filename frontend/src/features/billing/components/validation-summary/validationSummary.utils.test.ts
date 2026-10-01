import { describe, expect, it } from 'bun:test'
import {
  calculateValidationVerdict,
  findTransportDetailItem,
  getEffectiveInvoiceTotal,
  getEffectiveTransportAmount,
  isTransportItemName,
} from './validationSummary.utils'
import type { Billing, BillingDetail } from '../../types/billing.types'

describe('validationSummary.utils', () => {
  describe('isTransportItemName', () => {
    it('identifies transport and delivery keywords', () => {
      expect(isTransportItemName('BIAYA TRANSPORT LOKAL')).toBe(true)
      expect(isTransportItemName('DELIVERY CHARGE JKT')).toBe(true)
      expect(isTransportItemName('ONGKIR EXPEDISI')).toBe(true)
      expect(isTransportItemName('TRUCKING WAREHOUSE')).toBe(true)
    })

    it('returns false for non-transport items or empty input', () => {
      expect(isTransportItemName('FREIGHT CHARGE')).toBe(false)
      expect(isTransportItemName('BIAYA DOKUMEN')).toBe(false)
      expect(isTransportItemName('')).toBe(false)
      expect(isTransportItemName(null)).toBe(false)
    })
  })

  describe('findTransportDetailItem', () => {
    it('finds transport item in details list', () => {
      const details: BillingDetail[] = [
        { fdID: '1', fdItemName: 'General Cargo', fdQty: 1, fdSatuan: 'M3', fdItemPrice: 100000, fdTotal: 100000, fdCurr: 'IDR' },
        { fdID: '2', fdItemName: 'Biaya Ongkir Kurir', fdQty: 1, fdSatuan: 'LOT', fdItemPrice: 50000, fdTotal: 50000, fdCurr: 'IDR' },
      ]
      const found = findTransportDetailItem(details)
      expect(found?.fdID).toBe('2')
    })

    it('returns undefined if no transport item exists', () => {
      const details: BillingDetail[] = [
        { fdID: '1', fdItemName: 'General Cargo', fdQty: 1, fdSatuan: 'M3', fdItemPrice: 100000, fdTotal: 100000, fdCurr: 'IDR' },
      ]
      expect(findTransportDetailItem(details)).toBeUndefined()
    })
  })

  describe('getEffectiveTransportAmount', () => {
    const dummyBilling: Billing = {
      fdInvNo: 'INV-001',
      fdInvDate: new Date().toISOString(),
      fdJumlah1: 500000,
      fdJumlah2: 150000,
    } as any

    it('prefers transportItem total if present', () => {
      const transportItem: BillingDetail = {
        fdID: '2',
        fdItemName: 'Ongkir',
        fdQty: 1,
        fdSatuan: 'LOT',
        fdItemPrice: 75000,
        fdTotal: 75000,
        fdCurr: 'IDR',
      }
      expect(getEffectiveTransportAmount(dummyBilling, transportItem)).toBe(75000)
    })

    it('falls back to billingData fdJumlah2 or fdJumlah1 when transportItem is omitted', () => {
      expect(getEffectiveTransportAmount(dummyBilling)).toBe(150000)
      const noJumlah2 = { ...dummyBilling, fdJumlah2: 0 } as any
      expect(getEffectiveTransportAmount(noJumlah2)).toBe(500000)
    })
  })

  describe('getEffectiveInvoiceTotal', () => {
    it('calculates total in IDR when no foreign currency is involved', () => {
      const billing: Billing = {
        fdInvNo: 'INV-101',
        fdInvDate: new Date().toISOString(),
        fdJumlah1: 1250000,
        fdJumlah2: 0,
      } as any
      const details: BillingDetail[] = [
        { fdID: '1', fdItemName: 'General Cargo', fdQty: 1, fdSatuan: 'M3', fdItemPrice: 1250000, fdTotal: 1250000, fdCurr: 'IDR' },
      ]
      const result = getEffectiveInvoiceTotal(billing, details)
      expect(result.total).toBe(1250000)
      expect(result.currency).toBe('IDR')
    })

    it('detects foreign input anomaly when header has valas but all items are in Rupiah', () => {
      const billing: Billing = {
        fdInvNo: 'INV-102',
        fdInvDate: new Date().toISOString(),
        fdJumlah1: 1000000,
        fdJumlah2: 500, // Mis-typed USD in header
        fdCurr1: 'USD',
      } as any
      const details: BillingDetail[] = [
        { fdID: '1', fdItemName: 'Item Rp', fdQty: 1, fdSatuan: 'M3', fdItemPrice: 1000000, fdTotal: 1000000, fdCurr: 'IDR' },
      ]
      const result = getEffectiveInvoiceTotal(billing, details)
      expect(result.total).toBe(1000000)
      expect(result.currency).toBe('Rp.')
    })
  })

  describe('calculateValidationVerdict', () => {
    const baseParams = {
      isLoadingValidation: false,
      isOverallValid: false,
      isAir: false,
      billedM3: 1.5,
      effectiveBilledKg: 100,
      actualWeightKg: 100,
      maxAllowedWeight: 200,
      overweightKg: 0,
      isOverweightUnbilled: false,
      isBilledUnneededOverweight: false,
      hasUnderchargePrice: false,
      underchargedItems: [],
      hasUnbilledTransportActive: false,
      unbilledExpedisiCount: 0,
      totalUnbilledTransportAmount: 0,
      isMatch: true,
      isBilledBelowMinM3: false,
      minChargeM3: 0.1,
      isCodUrgentShortfall: false,
      recommendedM3: 1.5,
      hasQtyMismatch: false,
      activeQtys: [],
      isBilledMismatchedApprovedKomplain: false,
      isType2Discrepancy: false,
      validationIssues: [],
    }

    it('returns loading state when isLoadingValidation is true', () => {
      const verdict = calculateValidationVerdict({ ...baseParams, isLoadingValidation: true })
      expect(verdict.title).toContain('Memvalidasi Data')
    })

    it('returns currency error verdict when isCurrencyInputError is true', () => {
      const verdict = calculateValidationVerdict({
        ...baseParams,
        isCurrencyInputError: true,
        currencyInputErrorMessage: 'Header valas salah',
      })
      expect(verdict.title).toContain('Kesalahan Input')
    })

    it('returns all valid verdict when isOverallValid is true', () => {
      const verdict = calculateValidationVerdict({ ...baseParams, isOverallValid: true })
      expect(verdict.title).toContain('Tagihan Sesuai dengan Data Fisik')
    })

    it('returns undercharge warning when undercharged items exist', () => {
      const verdict = calculateValidationVerdict({
        ...baseParams,
        hasUnderchargePrice: true,
        underchargedItems: [{ itemName: 'Item Baju' }],
      })
      expect(verdict.title).toContain('Undercharge')
      expect(verdict.title).toContain('Item Baju')
    })

    it('returns unbilled transport warning when active', () => {
      const verdict = calculateValidationVerdict({
        ...baseParams,
        hasUnbilledTransportActive: true,
        unbilledExpedisiCount: 1,
        totalUnbilledTransportAmount: 150000,
      })
      expect(verdict.title).toContain('Biaya Ekspedisi')
    })

    it('returns mismatch warning when dimensions do not match', () => {
      const verdict = calculateValidationVerdict({ ...baseParams, isMatch: false })
      expect(verdict.title).toContain('Selisih Kubikasi (M3)')
    })
  })
})
