import { describe, it, expect } from 'bun:test'
import {
  categorizeExitPrediction,
  calculateSizeSummaryMetrics,
  calculateVfc,
} from './marking.utils'
import {
  MarkingSizeAuditQuerySchema,
  MarkingListQuerySchema,
  MarkingSuggestionsQuerySchema,
} from './marking.types'

describe('Marking Module', () => {
  describe('categorizeExitPrediction', () => {
    it('categorizes negative days as terlambat (overdue)', () => {
      expect(categorizeExitPrediction(-1)).toBe('terlambat')
      expect(categorizeExitPrediction(-10)).toBe('terlambat')
    })

    it('categorizes 0 to 3 days as segera (imminent exit)', () => {
      expect(categorizeExitPrediction(0)).toBe('segera')
      expect(categorizeExitPrediction(1)).toBe('segera')
      expect(categorizeExitPrediction(2)).toBe('segera')
      expect(categorizeExitPrediction(3)).toBe('segera')
    })

    it('categorizes 4 to 7 days as dekat (approaching exit)', () => {
      expect(categorizeExitPrediction(4)).toBe('dekat')
      expect(categorizeExitPrediction(5)).toBe('dekat')
      expect(categorizeExitPrediction(7)).toBe('dekat')
    })

    it('categorizes > 7 days as normal scheduled', () => {
      expect(categorizeExitPrediction(8)).toBe('normal')
      expect(categorizeExitPrediction(14)).toBe('normal')
      expect(categorizeExitPrediction(30)).toBe('normal')
    })
  })

  describe('calculateSizeSummaryMetrics', () => {
    it('computes exact zero diff when packing list and warehouse matches', () => {
      const metrics = calculateSizeSummaryMetrics({
        totalPackPL: 100,
        totalPackGdg: 100,
        totalM3PL: 10.5,
        totalM3Gdg: 10.5,
        totalM3Komplain: 0,
        totalBeratList: 2000,
        totalBeratGdg: 2000,
        totalBeratKomplain: 0,
      })

      expect(metrics.selisihPack).toBe(0)
      expect(metrics.selisihM3).toBe(0)
      expect(metrics.persenSelisihM3).toBe(0)
      expect(metrics.totalM3Net).toBe(10.5)
      expect(metrics.totalBeratNet).toBe(2000)
    })

    it('calculates overage differences and percentage correctly', () => {
      const metrics = calculateSizeSummaryMetrics({
        totalPackPL: 50,
        totalPackGdg: 60,
        totalM3PL: 10.0,
        totalM3Gdg: 12.5,
        totalM3Komplain: 0.5,
        totalBeratList: 1000,
        totalBeratGdg: 1200,
        totalBeratKomplain: 50,
      })

      expect(metrics.selisihPack).toBe(-10) // 50 - 60
      expect(metrics.selisihM3).toBe(2.5) // 12.5 - 10.0
      expect(metrics.persenSelisihM3).toBe(25) // (2.5 / 10.0) * 100
      expect(metrics.totalM3Net).toBe(12.0) // 12.5 - 0.5
      expect(metrics.totalBeratNet).toBe(1150) // 1200 - 50
    })

    it('caps net volume and weight at zero when complaint exceeds total', () => {
      const metrics = calculateSizeSummaryMetrics({
        totalPackPL: 10,
        totalPackGdg: 10,
        totalM3PL: 2.0,
        totalM3Gdg: 2.0,
        totalM3Komplain: 5.0,
        totalBeratList: 500,
        totalBeratGdg: 500,
        totalBeratKomplain: 900,
      })

      expect(metrics.totalM3Net).toBe(0)
      expect(metrics.totalBeratNet).toBe(0)
    })

    it('falls back to totalBeratList when totalBeratGdg is 0', () => {
      const metrics = calculateSizeSummaryMetrics({
        totalPackPL: 10,
        totalPackGdg: 10,
        totalM3PL: 1.0,
        totalM3Gdg: 1.0,
        totalM3Komplain: 0,
        totalBeratList: 450,
        totalBeratGdg: 0,
        totalBeratKomplain: 50,
      })

      expect(metrics.totalBeratNet).toBe(400) // 450 - 50
    })
  })

  describe('calculateVfc (Volumetric Freight Calculation)', () => {
    it('calculates standard air volumetric weight (m3 * 1,000,000 / 6000)', () => {
      // 1 M3 = 166.67 Kg
      expect(calculateVfc(1)).toBe(166.67)
      // 6 M3 = 1,000.00 Kg
      expect(calculateVfc(6)).toBe(1000)
    })

    it('returns 0 for zero or negative values', () => {
      expect(calculateVfc(0)).toBe(0)
      expect(calculateVfc(-5)).toBe(0)
    })
  })

  describe('Validation Schemas', () => {
    it('parses MarkingSizeAuditQuerySchema with default sort = 1', () => {
      const defaultParsed = MarkingSizeAuditQuerySchema.safeParse({})
      expect(defaultParsed.success).toBe(true)
      if (defaultParsed.success) {
        expect(defaultParsed.data.sort).toBe(1)
      }

      const sortTwo = MarkingSizeAuditQuerySchema.safeParse({ sort: '2' })
      expect(sortTwo.success).toBe(true)
      if (sortTwo.success) {
        expect(sortTwo.data.sort).toBe(2)
      }
    })

    it('parses MarkingListQuerySchema with defaults', () => {
      const result = MarkingListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('parses MarkingSuggestionsQuerySchema with default empty string', () => {
      const result = MarkingSuggestionsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.q).toBe('')
      }
    })
  })
})
