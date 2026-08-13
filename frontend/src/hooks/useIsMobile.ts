import { useEffect, useState } from 'react'

/** True when viewport width is below `breakpointPx` (default 640, matches Tailwind `sm`). */
export function useIsMobile(breakpointPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpointPx
  )

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`)
    const handler = () => setIsMobile(mql.matches)
    handler()
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [breakpointPx])

  return isMobile
}
