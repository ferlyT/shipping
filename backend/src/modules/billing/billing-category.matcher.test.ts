import { describe, expect, it } from 'bun:test'
import {
  isGenuineBattery,
  isGenuineIpad,
  isGenuineLaptop,
  isAppleDevice,
  findBestCategoryMatch,
  normalizeCommodityString,
} from './billing-category.matcher'

describe('billing-category.matcher', () => {
  describe('normalizeCommodityString', () => {
    it('normalizes whitespace, hyphens, and casing', () => {
      expect(normalizeCommodityString('Semi-Garment')).toBe('SEMIGARMENT')
      expect(normalizeCommodityString('  LARTAS - S  ')).toBe('LARTASS')
      expect(normalizeCommodityString('GENERAL GOODS & NON-BRAND')).toBe('GENERALGOODSNONBRAND')
    })
  })

  describe('isGenuineBattery', () => {
    it('identifies genuine battery items', () => {
      expect(isGenuineBattery('LITHIUM BATTERY 18650')).toBe(true)
      expect(isGenuineBattery('POWERBANK 20000MAH')).toBe(true)
      expect(isGenuineBattery('BATERAI KANCING')).toBe(true)
      expect(isGenuineBattery('ACCU MOTOR')).toBe(true)
    })

    it('rejects battery accessories that do not contain actual batteries', () => {
      expect(isGenuineBattery('BATTERY CHARGER')).toBe(false)
      expect(isGenuineBattery('BATTERY CASE')).toBe(false)
      expect(isGenuineBattery('BATTERY HOLDER')).toBe(false)
      expect(isGenuineBattery('BATTERY TESTER')).toBe(false)
      expect(isGenuineBattery('CHARGER FOR BATTERY')).toBe(false)
    })

    it('returns false for unrelated text', () => {
      expect(isGenuineBattery('BAJU KAOS POLOS')).toBe(false)
      expect(isGenuineBattery('')).toBe(false)
    })
  })

  describe('isGenuineIpad', () => {
    it('detects genuine iPad and tablet devices', () => {
      expect(isGenuineIpad('IPAD PRO 11 INCH')).toBe(true)
      expect(isGenuineIpad('APPLE IPAD AIR')).toBe(true)
      expect(isGenuineIpad('SAMSUNG GALAXY TABLET')).toBe(true)
    })

    it('rejects iPad/tablet accessories', () => {
      expect(isGenuineIpad('IPAD CASE SILICONE')).toBe(false)
      expect(isGenuineIpad('TABLET SCREEN PROTECTOR')).toBe(false)
      expect(isGenuineIpad('IPAD CHARGER ADAPTER')).toBe(false)
      expect(isGenuineIpad('APPLE IPENCIL PEN FOR IPAD')).toBe(false)
      expect(isGenuineIpad('IPAD KEYBOARD COVER')).toBe(false)
    })
  })

  describe('isGenuineLaptop', () => {
    it('detects genuine laptops and macbooks', () => {
      expect(isGenuineLaptop('MACBOOK AIR M2')).toBe(true)
      expect(isGenuineLaptop('ASUS ROG LAPTOP')).toBe(true)
      expect(isGenuineLaptop('LENOVO THINKPAD NOTEBOOK')).toBe(true)
    })

    it('rejects laptop spareparts and accessories', () => {
      expect(isGenuineLaptop('LAPTOP BATTERY REPLACEMENT')).toBe(false)
      expect(isGenuineLaptop('MACBOOK SCREEN LCD')).toBe(false)
      expect(isGenuineLaptop('LAPTOP KEYBOARD REPLACEMENT')).toBe(false)
      expect(isGenuineLaptop('LAPTOP SLEEVE BAG')).toBe(false)
      expect(isGenuineLaptop('LAPTOP COOLING FAN')).toBe(false)
    })
  })

  describe('isAppleDevice', () => {
    it('identifies Apple products', () => {
      expect(isAppleDevice('APPLE IPAD 10TH GEN')).toBe(true)
      expect(isAppleDevice('MACBOOK PRO 14')).toBe(true)
      expect(isAppleDevice('IPAD MINI')).toBe(true)
    })

    it('returns false for non-Apple products', () => {
      expect(isAppleDevice('SAMSUNG GALAXY S24')).toBe(false)
      expect(isAppleDevice('DELL XPS 13')).toBe(false)
      expect(isAppleDevice('')).toBe(false)
    })
  })

  describe('findBestCategoryMatch', () => {
    const categories = [
      { category: 'UMUM', price: 10000 },
      { category: 'SEMI-GARMENT', price: 15000 },
      { category: 'LARTAS - S', price: 25000 },
      { category: 'LAPTOP/TABLET', price: 50000 },
    ]

    it('finds exact category match', () => {
      const match = findBestCategoryMatch(categories, 'UMUM')
      expect(match?.category).toBe('UMUM')
      expect(match?.price).toBe(10000)
    })

    it('matches normalized category string with different spacing/hyphens', () => {
      const match = findBestCategoryMatch(categories, 'SEMI GARMENT')
      expect(match?.category).toBe('SEMI-GARMENT')
    })

    it('matches category via synonym groups', () => {
      const match = findBestCategoryMatch(categories, 'LARTAS SUPER')
      expect(match?.category).toBe('LARTAS - S')
    })

    it('returns null when no candidate matches', () => {
      const match = findBestCategoryMatch(categories, 'UNKNOWN PRODUCT XYZ')
      expect(match).toBeNull()
    })
  })
})
