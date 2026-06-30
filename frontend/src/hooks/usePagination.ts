// ATURAN: Gunakan hook ini untuk SEMUA pagination
// DILARANG: useState page/limit manual di komponen manapun
import { useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants'

export function usePagination(initialLimit = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialLimit)

  const goToPage = (newPage: number) => setPage(newPage)
  const reset = () => setPage(1)

  return { page, limit, setLimit, goToPage, reset }
}
