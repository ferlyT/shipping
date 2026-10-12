import { describe, expect, it } from 'bun:test'
import {
  calculateIso6346CheckDigit,
  isValidIso6346,
  extractContainerCandidates,
} from './container-ocr.service'

describe('Container ISO 6346 & OCR Parser', () => {
  describe('calculateIso6346CheckDigit', () => {
    it('calculates check digit correctly for known standard containers', () => {
      // Standar ISO 6346: CSQU 305438 3
      // C(13)*1 + S(30)*2 + Q(28)*4 + U(32)*8 + 3*16 + 0*32 + 5*64 + 4*128 + 3*256 + 8*512
      // 13 + 60 + 112 + 256 + 48 + 0 + 320 + 512 + 768 + 4096 = 6185
      // 6185 % 11 = 3 -> digit = 3
      const digit = calculateIso6346CheckDigit('CSQU', '305438')
      expect(digit).toBe(3)
    })

    it('returns null for invalid prefix length or invalid chars', () => {
      expect(calculateIso6346CheckDigit('CSQ', '305438')).toBeNull()
      expect(calculateIso6346CheckDigit('CSQU', '30543')).toBeNull()
      expect(calculateIso6346CheckDigit('CSQ!', '305438')).toBeNull()
    })
  })

  describe('isValidIso6346', () => {
    it('validates CSQU3054383 as true', () => {
      expect(isValidIso6346('CSQU3054383')).toBe(true)
      expect(isValidIso6346('CSQU 305438-3')).toBe(true)
    })

    it('rejects containers with mismatched check digit', () => {
      expect(isValidIso6346('CSQU3054389')).toBe(false)
    })
  })

  describe('extractContainerCandidates', () => {
    it('extracts horizontal ISO 6346 container number from messy text', () => {
      const text = `
        DEPO SEJ TANJUNG PRIOK
        CONTAINER ID: CSQU 305438-3
        MAX GROSS 30,480 KGS
        TARE 3,750 KGS
      `
      const candidates = extractContainerCandidates(text)
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0]!.containerNo).toBe('CSQU3054383')
      expect(candidates[0]!.isValidIso).toBe(true)
      expect(candidates[0]!.formatted).toBe('CSQU 305438-3')
    })

    it('extracts domestic container formats', () => {
      const text = `
        KAPAL SPIL RUTE SURABAYA
        KONT: SPIL1234567
        SEAL NO: 998822
      `
      const candidates = extractContainerCandidates(text)
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates[0]!.containerNo).toBe('SPIL1234567')
    })

    it('extracts vertical container layout from container doors', () => {
      const text = `
        TGHU
        765432
        1
        NET WT 28000
      `
      const candidates = extractContainerCandidates(text)
      expect(candidates.length).toBeGreaterThan(0)
      expect(candidates.some(c => c.containerNo === 'TGHU7654321')).toBe(true)
    })
  })
})
