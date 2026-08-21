import { useState, useEffect, useMemo } from 'react'
import { priceListApi } from '../services/priceList.service'
import type { DiffRow, DiffResponse } from '../types'

export function useLatestPriceDiff() {
  const [data, setData] = useState<DiffResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    priceListApi
      .getLatestDiff()
      .then((res) => {
        const raw = res.data as any
        setData(raw?.data ?? raw)
      })
      .catch((err: any) => {
        // 404 = no uploads yet, not an error to show
        if (err?.response?.status !== 404) {
          setError(err?.response?.data?.message ?? err?.message ?? 'Gagal memuat data diff')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const naik = useMemo<DiffRow[]>(
    () => (data?.diff ?? []).filter((r) => r.delta !== null && r.delta > 0).sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0)),
    [data],
  )
  const turun = useMemo<DiffRow[]>(
    () => (data?.diff ?? []).filter((r) => r.delta !== null && r.delta < 0).sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0)),
    [data],
  )
  const tetapCount = useMemo(() => (data?.diff ?? []).filter((r) => r.delta !== null && r.delta === 0).length, [data])
  const baruCount = useMemo(() => (data?.diff ?? []).filter((r) => r.delta === null).length, [data])

  return {
    loading,
    error,
    data,
    currentEffectiveDate: data?.currentEffectiveDate ?? null,
    previousEffectiveDate: data?.previousEffectiveDate ?? null,
    naik,
    turun,
    tetapCount,
    baruCount,
  }
}
