import { describe, expect, it } from 'bun:test'
import { isCommodityMatch } from './commodityMatcher'

describe('commodityMatcher utility', () => {
  it('returns false when commodity or category is empty', () => {
    expect(isCommodityMatch('', 'General Goods')).toBe(false)
    expect(isCommodityMatch('Laptop', '')).toBe(false)
  })

  describe('Air Mode matching', () => {
    it('matches general goods in air mode', () => {
      expect(isCommodityMatch('GENERAL CARGO', 'GENERAL GOODS', 'AIR')).toBe(true)
      expect(isCommodityMatch('GENERAL', 'GENERAL GOODS AIR', null, true)).toBe(true)
    })

    it('matches branded goods in air mode', () => {
      expect(isCommodityMatch('BRANDED SHIRT', 'BRANDED GOODS', 'AIR')).toBe(true)
    })

    it('matches garment and fabric in air mode', () => {
      expect(isCommodityMatch('GARMENT BAJU', 'GARMENT', 'AIR')).toBe(true)
      expect(isCommodityMatch('GARMENT', 'FABRIC', 'AIR')).toBe(true)
    })

    it('matches food and makanan in air mode', () => {
      expect(isCommodityMatch('FOOD SNACK', 'FOOD', 'AIR')).toBe(true)
      expect(isCommodityMatch('MAKANAN KERING', 'LS & FOOD', 'AIR')).toBe(true)
    })

    it('matches laptop and tablet in air mode', () => {
      expect(isCommodityMatch('LAPTOP ASUS', 'LAPTOP', 'AIR')).toBe(true)
      expect(isCommodityMatch('TABLET SAMSUNG', 'TABLET', 'AIR')).toBe(true)
    })
  })

  describe('Sea Mode matching', () => {
    it('matches UMUM with General Goods or UMUM', () => {
      expect(isCommodityMatch('BARANG UMUM', 'GENERAL GOODS', 'SEA')).toBe(true)
      expect(isCommodityMatch('UMUM', 'UMUM', 'SEA')).toBe(true)
    })

    it('matches TEKSTIL with FABRIC or TEKSTIL', () => {
      expect(isCommodityMatch('KAIN TEKSTIL', 'FABRIC', 'SEA')).toBe(true)
      expect(isCommodityMatch('TEKSTIL', 'TEKSTIL', 'SEA')).toBe(true)
    })

    it('matches Lartas Normal and Lartas Super in sea mode', () => {
      expect(isCommodityMatch('LARTAS NORMAL', 'LARTAS NORMAL', 'SEA')).toBe(true)
      expect(isCommodityMatch('KOSMETIK WAJAH', 'KOSMETIK', 'SEA')).toBe(true)
      expect(isCommodityMatch('ALKES MEDIS', 'ALKES & OBAT', 'SEA')).toBe(true)
      expect(isCommodityMatch('MAKANAN BASAH', 'MAKANAN', 'SEA')).toBe(true)
    })

    it('matches genuine battery with SEMI GARMENT in sea mode', () => {
      expect(isCommodityMatch('BATTERY PACK', 'SEMI GARMENT', 'SEA')).toBe(true)
      expect(isCommodityMatch('POWERBANK 10000MAH', 'POWERBANK', 'SEA')).toBe(true)
    })

    it('does not match SEMI GARMENT category for pure general goods', () => {
      expect(isCommodityMatch('PLASTIC BOTTLE', 'SEMI GARMENT', 'SEA')).toBe(false)
    })

    it('matches iPad and MacBook in sea mode', () => {
      expect(isCommodityMatch('IPAD AIR', 'IPAD', 'SEA')).toBe(true)
      expect(isCommodityMatch('MACBOOK PRO', 'LAPTOP', 'SEA')).toBe(true)
    })
  })

  describe('Exact Matches', () => {
    it('matches normalized exact strings', () => {
      expect(isCommodityMatch('SPARE_PARTS', 'SPARE PARTS')).toBe(true)
    })
  })
})
