import { describe, it, expect } from 'bun:test'
import { terbilang } from './terbilang'

describe('terbilang utility', () => {
  it('handles zero correctly', () => {
    expect(terbilang(0)).toBe('Nol Rp.')
  })

  it('handles single digits and tens', () => {
    expect(terbilang(5)).toBe('Lima Rp.')
    expect(terbilang(10)).toBe('Sepuluh Rp.')
    expect(terbilang(11)).toBe('Sebelas Rp.')
    expect(terbilang(15)).toBe('Lima Belas Rp.')
    expect(terbilang(20)).toBe('Dua Puluh Rp.')
    expect(terbilang(99)).toBe('Sembilan Puluh Sembilan Rp.')
  })

  it('handles hundreds and thousands', () => {
    expect(terbilang(100)).toBe('Seratus Rp.')
    expect(terbilang(150)).toBe('Seratus Lima Puluh Rp.')
    expect(terbilang(1000)).toBe('Seribu Rp.')
    expect(terbilang(2500)).toBe('Dua Ribu Lima Ratus Rp.')
  })

  it('handles millions, billions, and trillions', () => {
    expect(terbilang(1000000)).toBe('Satu Juta Rp.')
    expect(terbilang(1500000000)).toBe('Satu Milyar Lima Ratus Juta Rp.')
  })

  it('handles decimals and cents', () => {
    expect(terbilang(1500.5)).toBe('Seribu Lima Ratus Koma Lima Puluh Rp.')
    expect(terbilang(25.05)).toBe('Dua Puluh Lima Koma Nol Lima Rp.')
  })

  it('handles negative numbers and NaN', () => {
    expect(terbilang(-50000)).toBe('Minus Lima Puluh Ribu Rp.')
    expect(terbilang(NaN)).toBe('Nol Rp.')
  })
})
