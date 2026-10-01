import { describe, expect, it } from 'bun:test'
import {
  EvaluatePriceCheckSchema,
  BatchEvaluatePriceCheckSchema,
} from './price-check.types'
import {
  getNormalizedBranchCode,
  isMktCustomer,
  getHargaColumnName,
  resolveCommodityName,
  MKT_SALES_GROUP,
} from './price-check.service'

describe('Price Check Module', () => {
  describe('Validation Schemas', () => {
    it('accepts valid single price check params', () => {
      const payload = {
        listCode: 'L-123456',
        markingCode: 'MARK-01',
        custCode: 'CUST-001',
        branch: 'GZ',
        mode: 'SEA',
        comodity: 'Sparepart Mesin',
        harga: 4500000,
        targetDate: '2026-03-01',
      }
      const result = EvaluatePriceCheckSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('accepts empty object for evaluate as all fields are optional', () => {
      const result = EvaluatePriceCheckSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts valid batch evaluate params', () => {
      const payload = {
        items: [
          { listCode: 'L-001', harga: 1000000 },
          { listCode: 'L-002', harga: 2000000 },
        ],
      }
      const result = BatchEvaluatePriceCheckSchema.safeParse(payload)
      expect(result.success).toBe(true)
    })

    it('rejects batch evaluate with empty items array', () => {
      const payload = {
        items: [],
      }
      const result = BatchEvaluatePriceCheckSchema.safeParse(payload)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('Daftar item untuk evaluasi tidak boleh kosong')
      }
    })
  })

  describe('getNormalizedBranchCode', () => {
    it('normalizes Guangzhou aliases to GZ', () => {
      expect(getNormalizedBranchCode('Guangzhou')).toBe('GZ')
      expect(getNormalizedBranchCode('guangzhou')).toBe('GZ')
      expect(getNormalizedBranchCode('gz')).toBe('GZ')
      expect(getNormalizedBranchCode('GZ')).toBe('GZ')
    })

    it('normalizes Yiwu aliases to YW', () => {
      expect(getNormalizedBranchCode('Yiwu')).toBe('YW')
      expect(getNormalizedBranchCode('YW')).toBe('YW')
      expect(getNormalizedBranchCode('yiwu')).toBe('YW')
    })

    it('normalizes Shanghai to SH', () => {
      expect(getNormalizedBranchCode('Shanghai')).toBe('SH')
      expect(getNormalizedBranchCode('SH')).toBe('SH')
    })

    it('normalizes Shenzhen to SZ', () => {
      expect(getNormalizedBranchCode('Shenzhen')).toBe('SZ')
      expect(getNormalizedBranchCode('SZ')).toBe('SZ')
    })

    it('normalizes Hong Kong aliases to HK', () => {
      expect(getNormalizedBranchCode('Hongkong')).toBe('HK')
      expect(getNormalizedBranchCode('Hong Kong')).toBe('HK')
      expect(getNormalizedBranchCode('HK')).toBe('HK')
    })

    it('normalizes Singapore aliases to SG', () => {
      expect(getNormalizedBranchCode('Singapore')).toBe('SG')
      expect(getNormalizedBranchCode('Singapura')).toBe('SG')
      expect(getNormalizedBranchCode('SG')).toBe('SG')
    })

    it('handles falsy or custom codes gracefully', () => {
      expect(getNormalizedBranchCode('')).toBe('')
      expect(getNormalizedBranchCode(null)).toBe('')
      expect(getNormalizedBranchCode('JKT')).toBe('JKT')
    })
  })

  describe('isMktCustomer', () => {
    it('returns true when fdBroker === 1', () => {
      expect(isMktCustomer({ fdBroker: 1 })).toBe(true)
      expect(isMktCustomer({ fdBroker: 1, sales: 'BUDI' })).toBe(true)
    })

    it('returns true when sales contains BROKER', () => {
      expect(isMktCustomer(null, 'CUSTOMER BROKER')).toBe(true)
      expect(isMktCustomer({ sales: 'BROKER-XYZ' })).toBe(true)
    })

    it('returns true for sales within MKT_SALES_GROUP', () => {
      for (const mkt of MKT_SALES_GROUP) {
        expect(isMktCustomer(null, mkt)).toBe(true)
        expect(isMktCustomer({ sales: mkt })).toBe(true)
      }
    })

    it('returns false for non-MKT sales and non-broker', () => {
      expect(isMktCustomer(null, 'AHMAD')).toBe(false)
      expect(isMktCustomer({ fdBroker: 0, sales: 'JOKO' })).toBe(false)
      expect(isMktCustomer(null, null)).toBe(false)
    })
  })

  describe('getHargaColumnName', () => {
    it('maps valid location, mode, and category combinations', () => {
      expect(getHargaColumnName('Gz', 'Laut', 'Umum')).toBe('fdGzLautUmum')
      expect(getHargaColumnName('Yw', 'Udara', 'Tekstil')).toBe('fdYwUdaraTekstil')
      expect(getHargaColumnName('Sh', 'Laut', 'Lartas - N')).toBe('fdShLautLartasN')
      expect(getHargaColumnName('Sz', 'Laut', 'Lartas - S')).toBe('fdSzLautLartasS')
      expect(getHargaColumnName('Gz', 'Laut', 'Semi Garment')).toBe('fdGzLautSemi')
      expect(getHargaColumnName('Gz', 'Laut', 'Garment')).toBe('fdGzLautGarment')
      expect(getHargaColumnName('Gz', 'Laut', 'General')).toBe('fdGzLautGeneral')
      expect(getHargaColumnName('Gz', 'Laut', 'Branded')).toBe('fdGzLautBranded')
      expect(getHargaColumnName('Gz', 'Laut', 'Food')).toBe('fdGzLautFood')
      expect(getHargaColumnName('Gz', 'Laut', 'Shoes')).toBe('fdGzLautShoes')
    })

    it('returns null for unknown categories', () => {
      expect(getHargaColumnName('Gz', 'Laut', 'UNKNOWN_CAT')).toBeNull()
      expect(getHargaColumnName('Gz', 'Laut', '')).toBeNull()
    })
  })

  describe('resolveCommodityName', () => {
    const dummyMappings = [
      {
        commodityName: 'Baju Tidur',
        targetCommodity: 'GARMENT',
        fdCustCode: 'CUST-01',
        mode: 'SEA',
      },
      {
        commodityName: 'Kaos Polos',
        targetCommodity: 'TEKSTIL',
        fdCustCode: null,
        mode: 'ALL',
      },
    ]

    it('returns customer specific mapping when matched', () => {
      const res = resolveCommodityName('Baju Tidur', 'CUST-01', dummyMappings, 'SEA')
      expect(res).toBe('GARMENT')
    })

    it('falls back to global mapping when no customer mapping exists', () => {
      const res = resolveCommodityName('Kaos Polos', 'CUST-02', dummyMappings, 'SEA')
      expect(res).toBe('TEKSTIL')
    })

    it('overrides genuine battery to SEMI GARMENT in sea mode', () => {
      const res = resolveCommodityName('Baterai Lithium 18650', null, [], 'SEA')
      expect(res).toBe('SEMI GARMENT')
    })

    it('overrides iPad to KHUSUS IPAD in sea mode and TABLET in air mode', () => {
      const seaRes = resolveCommodityName('Apple iPad Pro 11', null, [], 'SEA')
      expect(seaRes).toBe('KHUSUS IPAD')

      const airRes = resolveCommodityName('Apple iPad Pro 11', null, [], 'AIR')
      expect(airRes).toBe('TABLET')
    })

    it('overrides Apple MacBook to APPLE LAPTOP in air mode', () => {
      const airRes = resolveCommodityName('Apple MacBook Pro M3', null, [], 'AIR')
      expect(airRes).toBe('APPLE LAPTOP')
    })

    it('returns original commodity name for unmapped general cargo', () => {
      const res = resolveCommodityName('Panci Stainless Steel', null, [], 'SEA')
      expect(res).toBe('PANCI STAINLESS STEEL')
    })

    it('returns empty string for empty input', () => {
      expect(resolveCommodityName('', null, [])).toBe('')
    })
  })
})
