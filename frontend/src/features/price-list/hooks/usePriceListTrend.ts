import { useState, useEffect, useMemo } from 'react'
import { priceListApi } from '../services/priceList.service'
import type { TrendPoint, TrendSeries } from '../types'

export function usePriceListTrend(
  sheetTypes: string[],
  mode: string,
  categories: string[],
  branch: string,
) {
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sheetTypesKey = sheetTypes.join('|')
  const categoriesKey = categories.join('|')

  useEffect(() => {
    if (!mode || categories.length === 0) return

    const isFirstLoad = trend.length === 0
    if (isFirstLoad) setLoading(true)
    else setIsRefetching(true)

    setError(null)

    const params: Record<string, string> = { mode }
    if (sheetTypes.length === 1) params.sheetType = sheetTypes[0]
    if (categories.length === 1) params.category = categories[0]
    if (branch) params.branch = branch

    priceListApi
      .getTrend(params)
      .then((res) => {
        const raw = res.data as any
        const data: TrendPoint[] = Array.isArray(raw) ? raw : (raw?.data ?? [])
        setTrend(data)
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Gagal memuat data tren')
      })
      .finally(() => {
        setLoading(false)
        setIsRefetching(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTypesKey, mode, categoriesKey, branch])

  // Computed chart data: aggregate by date+sheetType+category
  const chartData = useMemo(() => {
    if (trend.length === 0) return []

    // Filter client-side for multiple sheet types / categories
    const filtered = trend.filter(
      (t) =>
        (sheetTypes.length === 0 || sheetTypes.includes(t.sheetType)) &&
        (categories.length === 0 || categories.includes(t.category)) &&
        (!branch || t.branch === branch),
    )

    // Group by date
    const byDate = new Map<string, TrendPoint[]>()
    for (const t of filtered) {
      const arr = byDate.get(t.date) ?? []
      arr.push(t)
      byDate.set(t.date, arr)
    }

    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, points]) => {
        const entry: Record<string, string | number> = { date }
        for (const p of points) {
          const key = `${p.sheetType}__${p.category}`
          entry[key] = p.price
        }
        return entry
      })
  }, [trend, sheetTypesKey, categoriesKey, branch])

  // Unique series from trend data
  const series = useMemo<TrendSeries[]>(() => {
    const map = new Map<string, TrendSeries>()
    for (const t of trend) {
      if (
        (sheetTypes.length === 0 || sheetTypes.includes(t.sheetType)) &&
        (categories.length === 0 || categories.includes(t.category)) &&
        (!branch || t.branch === branch)
      ) {
        const key = `${t.sheetType}__${t.category}`
        if (!map.has(key)) {
          map.set(key, { key, sheetType: t.sheetType, category: t.category })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [trend, sheetTypesKey, categoriesKey, branch])

  const latestPrices = useMemo(() => {
    const map: Record<string, number> = {}
    if (chartData.length > 0) {
      const latest = chartData[chartData.length - 1]
      for (const s of series) {
        if (latest[s.key] != null) {
          map[s.key] = Number(latest[s.key])
        }
      }
    }
    return map
  }, [chartData, series])

  const seriesTrend = useMemo(() => {
    if (chartData.length < 2) return null
    const latest = chartData[chartData.length - 1]
    const oldest = chartData[0]
    const map: Record<string, { delta: number; pct: number } | null> = {}

    for (const s of series) {
      const current = latest[s.key] as number | undefined
      const past = oldest[s.key] as number | undefined
      if (current != null && past != null) {
        const delta = current - past
        const pct = past > 0 ? (delta / past) * 100 : 0
        map[s.key] = { delta, pct }
      } else {
        map[s.key] = null
      }
    }
    return map
  }, [chartData, series])

  // Filtered prices for yDomain and maxPrice calculation
  const filteredPrices = useMemo(() => {
    return trend
      .filter(
        (t) =>
          (sheetTypes.length === 0 || sheetTypes.includes(t.sheetType)) &&
          (categories.length === 0 || categories.includes(t.category)) &&
          (!branch || t.branch === branch),
      )
      .map((t) => t.price)
      .filter((p) => typeof p === 'number' && p > 0)
  }, [trend, sheetTypesKey, categoriesKey, branch])

  // Y axis domain with 10% padding
  const yDomain = useMemo<[number, number]>(() => {
    if (filteredPrices.length === 0) return [0, 1000000]
    const min = Math.min(...filteredPrices)
    const max = Math.max(...filteredPrices)
    const pad = (max - min) * 0.1 || max * 0.1
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)]
  }, [filteredPrices])

  const maxPrice = useMemo(() => (filteredPrices.length > 0 ? Math.max(...filteredPrices) : 0), [filteredPrices])

  return { trend, loading, isRefetching, error, chartData, series, yDomain, latestPrices, seriesTrend, maxPrice }
}
