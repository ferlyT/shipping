// ATURAN: Gunakan hook ini untuk SEMUA search input
// DILARANG: setTimeout manual untuk debounce di komponen
import { useEffect, useState } from 'react'
import { DEBOUNCE_DELAY } from '@/lib/constants'

export function useDebounce<T>(value: T, delay = DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}
