import { describe, it, expect } from 'bun:test'
import { getBreakpointFromWidth, computeBreakpointInfo } from './useBreakpoint'

describe('useBreakpoint utility', () => {
  it('correctly maps pixel widths to Tailwind breakpoints', () => {
    expect(getBreakpointFromWidth(375)).toBe('xs')
    expect(getBreakpointFromWidth(639)).toBe('xs')
    expect(getBreakpointFromWidth(640)).toBe('sm')
    expect(getBreakpointFromWidth(767)).toBe('sm')
    expect(getBreakpointFromWidth(768)).toBe('md')
    expect(getBreakpointFromWidth(1023)).toBe('md')
    expect(getBreakpointFromWidth(1024)).toBe('lg')
    expect(getBreakpointFromWidth(1279)).toBe('lg')
    expect(getBreakpointFromWidth(1280)).toBe('xl')
    expect(getBreakpointFromWidth(1535)).toBe('xl')
    expect(getBreakpointFromWidth(1920)).toBe('2xl')
  })

  it('correctly identifies mobile viewports (< 768px)', () => {
    const mobile = computeBreakpointInfo(390)
    expect(mobile.isMobile).toBe(true)
    expect(mobile.isTablet).toBe(false)
    expect(mobile.isDesktop).toBe(false)
    expect(mobile.breakpoint).toBe('xs')

    const smPhone = computeBreakpointInfo(700)
    expect(smPhone.isMobile).toBe(true)
    expect(smPhone.isTablet).toBe(false)
    expect(smPhone.isDesktop).toBe(false)
    expect(smPhone.breakpoint).toBe('sm')
  })

  it('correctly identifies tablet viewports (768px - 1023px)', () => {
    const ipad = computeBreakpointInfo(768)
    expect(ipad.isMobile).toBe(false)
    expect(ipad.isTablet).toBe(true)
    expect(ipad.isDesktop).toBe(false)
    expect(ipad.breakpoint).toBe('md')

    const ipadPro = computeBreakpointInfo(1000)
    expect(ipadPro.isMobile).toBe(false)
    expect(ipadPro.isTablet).toBe(true)
    expect(ipadPro.isDesktop).toBe(false)
  })

  it('correctly identifies desktop viewports (>= 1024px)', () => {
    const laptop = computeBreakpointInfo(1024)
    expect(laptop.isMobile).toBe(false)
    expect(laptop.isTablet).toBe(false)
    expect(laptop.isDesktop).toBe(true)
    expect(laptop.breakpoint).toBe('lg')

    const widescreen = computeBreakpointInfo(1920)
    expect(widescreen.isMobile).toBe(false)
    expect(widescreen.isTablet).toBe(false)
    expect(widescreen.isDesktop).toBe(true)
    expect(widescreen.breakpoint).toBe('2xl')
  })
})
