import { describe, expect, it } from 'bun:test'
import { terbilang } from './terbilang'

describe('mobile terbilang', () => {
  it('handles zero and non-numbers gracefully', () => {
    expect(terbilang(0)).toBe('Nol Rp.')
    expect(terbilang(NaN)).toBe('Nol Rp.')
    expect(terbilang(Infinity)).toBe('Nol Rp.')
  })

  it('converts basic single digit and teens', () => {
    expect(terbilang(1)).toBe('Satu Rp.')
    expect(terbilang(5)).toBe('Lima Rp.')
    expect(terbilang(10)).toBe('Sepuluh Rp.')
    expect(terbilang(11)).toBe('Sebelas Rp.')
    expect(terbilang(15)).toBe('Lima Belas Rp.')
    expect(terbilang(19)).toBe('Sembilan Belas Rp.')
  })

  it('converts tens, hundreds, and thousands', () => {
    expect(terbilang(25)).toBe('Dua Puluh Lima Rp.')
    expect(terbilang(100)).toBe('Seratus Rp.')
    expect(terbilang(150)).toBe('Seratus Lima Puluh Rp.')
    expect(terbilang(1000)).toBe('Seribu Rp.')
    expect(terbilang(2500)).toBe('Dua Ribu Lima Ratus Rp.')
    expect(terbilang(1500000)).toBe('Satu Juta Lima Ratus Ribu Rp.')
  })

  it('converts billions and trillions', () => {
    expect(terbilang(1000000000)).toBe('Satu Milyar Rp.')
    expect(terbilang(2000000000000)).toBe('Dua Trilyun Rp.')
  })

  it('handles negative numbers', () => {
    expect(terbilang(-5000)).toBe('Minus Lima Ribu Rp.')
  })

  it('handles decimal values', () => {
    expect(terbilang(100.5)).toBe('Seratus Koma Lima Puluh Rp.')
    expect(terbilang(100.05)).toBe('Seratus Koma Nol Lima Rp.')
  })
})
