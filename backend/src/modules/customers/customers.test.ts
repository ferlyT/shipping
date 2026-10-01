import { describe, it, expect } from 'bun:test'
import { calculateTier } from './customers-tier.service'
import { TIER_CONFIG, CustomerQuerySchema, CustomerSuggestionsQuerySchema } from './customers.types'
import { enrichWithMasterCustomer } from './customer-resolver.service'

describe('Customers Module', () => {
  describe('calculateTier function', () => {
    it('categorizes revenue >= 5 Miliar as diamond', () => {
      expect(calculateTier(5_000_000_000)).toBe('diamond')
      expect(calculateTier(10_000_000_000)).toBe('diamond')
    })

    it('categorizes revenue between 1 Miliar and 4.99 Miliar as platinum', () => {
      expect(calculateTier(1_000_000_000)).toBe('platinum')
      expect(calculateTier(4_999_999_999)).toBe('platinum')
    })

    it('categorizes revenue between 250 Juta and 999 Juta as gold', () => {
      expect(calculateTier(250_000_000)).toBe('gold')
      expect(calculateTier(999_999_999)).toBe('gold')
    })

    it('categorizes revenue between 50 Juta and 249 Juta as silver', () => {
      expect(calculateTier(50_000_000)).toBe('silver')
      expect(calculateTier(249_999_999)).toBe('silver')
    })

    it('categorizes revenue between 1 Rupiah and 49.9 Juta as bronze', () => {
      expect(calculateTier(1)).toBe('bronze')
      expect(calculateTier(49_999_999)).toBe('bronze')
    })

    it('categorizes 0 or negative revenue as none (unranked)', () => {
      expect(calculateTier(0)).toBe('none')
      expect(calculateTier(-500_000)).toBe('none')
    })
  })

  describe('TIER_CONFIG hierarchy progression', () => {
    it('configures none -> bronze transition', () => {
      expect(TIER_CONFIG.none.nextTier).toBe('bronze')
      expect(TIER_CONFIG.none.nextMin).toBe(1)
    })

    it('configures bronze -> silver transition at 50M', () => {
      expect(TIER_CONFIG.bronze.nextTier).toBe('silver')
      expect(TIER_CONFIG.bronze.nextMin).toBe(50_000_000)
    })

    it('configures silver -> gold transition at 250M', () => {
      expect(TIER_CONFIG.silver.nextTier).toBe('gold')
      expect(TIER_CONFIG.silver.nextMin).toBe(250_000_000)
    })

    it('configures gold -> platinum transition at 1B', () => {
      expect(TIER_CONFIG.gold.nextTier).toBe('platinum')
      expect(TIER_CONFIG.gold.nextMin).toBe(1_000_000_000)
    })

    it('configures platinum -> diamond transition at 5B', () => {
      expect(TIER_CONFIG.platinum.nextTier).toBe('diamond')
      expect(TIER_CONFIG.platinum.nextMin).toBe(5_000_000_000)
    })

    it('configures diamond with no upper limit and no next tier', () => {
      expect(TIER_CONFIG.diamond.nextTier).toBeUndefined()
      expect(TIER_CONFIG.diamond.max).toBe(Infinity)
    })
  })

  describe('enrichWithMasterCustomer helper', () => {
    it('returns empty array when given empty rows', async () => {
      const result = await enrichWithMasterCustomer([])
      expect(result).toEqual([])
    })

    it('returns original rows without modifications when rows have empty custCodes', async () => {
      const rows = [{ fdCustCode: '', value: 100 }, { fdCustCode: '   ', value: 200 }]
      const result = await enrichWithMasterCustomer(rows)
      expect(result).toEqual(rows)
    })
  })

  describe('Validation Schemas', () => {
    it('accepts valid CustomerQuery parameters', () => {
      const res = CustomerQuerySchema.safeParse({
        page: '1',
        limit: '25',
        search: 'PT MAJU',
        sortBy: 'fdCustName',
        sortDir: 'desc',
        category: 'diamond',
      })
      expect(res.success).toBe(true)
    })

    it('rejects invalid sortDir in CustomerQuery', () => {
      const res = CustomerQuerySchema.safeParse({
        sortDir: 'diagonal',
      })
      expect(res.success).toBe(false)
    })

    it('validates CustomerSuggestionsQuerySchema', () => {
      expect(CustomerSuggestionsQuerySchema.safeParse({ q: 'test' }).success).toBe(true)
      expect(CustomerSuggestionsQuerySchema.safeParse({}).success).toBe(true)
    })
  })
})
