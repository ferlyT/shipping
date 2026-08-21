import { useRef } from 'react'
import type { TouchEvent } from 'react'

/**
 * Hook untuk navigasi tab via swipe kiri/kanan di mobile.
 * @param tabs - Array tab (harus memiliki property `value`)
 * @param activeTab - Tab yang sedang aktif
 * @param setActiveTab - Setter untuk mengubah tab aktif
 * @param minDelta - Minimum pixel swipe sebelum dianggap sebagai swipe (default: 40)
 */
export function useSwipeTab<T extends string>(
  tabs: { value: T }[],
  activeTab: T,
  setActiveTab: (tab: T) => void,
  minDelta = 40
) {
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < minDelta) return
    const idx = tabs.findIndex((t) => t.value === activeTab)
    if (delta < 0 && idx < tabs.length - 1) setActiveTab(tabs[idx + 1].value)
    if (delta > 0 && idx > 0) setActiveTab(tabs[idx - 1].value)
  }

  return { handleTouchStart, handleTouchEnd }
}
