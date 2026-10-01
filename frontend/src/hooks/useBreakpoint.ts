import { useEffect, useState } from 'react'

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BreakpointInfo {
  breakpoint: Breakpoint
  width: number
  isMobile: boolean // < 768px (xs or sm)
  isTablet: boolean // >= 768px and < 1024px (md)
  isDesktop: boolean // >= 1024px (lg, xl, 2xl)
}

export function getBreakpointFromWidth(width: number): Breakpoint {
  if (width < 640) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  if (width < 1536) return 'xl'
  return '2xl'
}

export function computeBreakpointInfo(width: number): BreakpointInfo {
  const bp = getBreakpointFromWidth(width)
  return {
    breakpoint: bp,
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  }
}

/**
 * Responsive breakpoint hook matching Tailwind CSS breakpoints.
 * Provides fine-grained device viewport information:
 * - isMobile: < 768px
 * - isTablet: 768px .. 1023px
 * - isDesktop: >= 1024px
 */
export function useBreakpoint(): BreakpointInfo {
  const [info, setInfo] = useState<BreakpointInfo>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    return computeBreakpointInfo(width)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setInfo(computeBreakpointInfo(window.innerWidth))
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return info
}
