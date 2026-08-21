import { useState, useEffect } from 'react'
import { priceListApi } from '../services/priceList.service'
import type { FilterOptions } from '../types'

export function usePriceListFilters() {
  const [options, setOptions] = useState<FilterOptions | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(true)

  // Active filter state
  const [sheetTypes, setSheetTypes] = useState<string[]>([])
  const [mode, setMode] = useState('')
  const [branch, setBranch] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  const [categoryOptions, setCategoryOptions] = useState<string[]>([])
  const [branchOptions, setBranchOptions] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

  // Initial load: fetch all options
  useEffect(() => {
    setOptionsLoading(true)
    priceListApi
      .getFilterOptions()
      .then((res) => {
        const raw = res.data as any
        const data: FilterOptions = raw?.data ?? raw ?? {}
        setOptions(data)
        setBranchOptions(data.branches ?? [])
        setCategoryOptions(data.categories ?? [])
        setSheetTypes(data.sheetTypes ?? [])

        // Default: Mode = BY SEA, Branch = GZ, Category = GENERAL CARGO / GENERAL GOODS
        const defaultMode = data.modes?.find((m) => m.toLowerCase().includes('sea')) ?? data.modes?.[0] ?? ''
        const defaultBranch = data.branches?.find((b) => b.toLowerCase() === 'gz') ?? 'GZ'
        const defaultCat = data.categories?.find((c) => /general|good|cargo|umum/i.test(c)) ?? data.categories?.[0]

        setMode(defaultMode)
        setBranch(defaultBranch)
        setCategories(defaultCat ? [defaultCat] : [])
      })
      .catch((err: any) => {
        setFilterError(err?.response?.data?.message ?? err?.message ?? 'Gagal memuat filter')
      })
      .finally(() => setOptionsLoading(false))
  }, [])

  // Re-fetch branches & categories when sheetType or mode changes
  const sheetTypesKey = sheetTypes.join('|')
  useEffect(() => {
    if (sheetTypes.length === 0 || !mode) return
    setCategoriesLoading(true)

    const params: Record<string, string | string[]> = { mode }
    if (sheetTypes.length > 0) params.sheetType = sheetTypes

    priceListApi
      .getFilterOptions(params as any)
      .then((res) => {
        const raw = res.data as any
        const data: FilterOptions = raw?.data ?? raw ?? {}
        const cats = data.categories ?? []
        const branches = data.branches ?? []
        setCategoryOptions(cats)
        setBranchOptions(branches)
        setCategories((prev) => {
          const stillValid = prev.filter((c) => cats.includes(c))
          if (stillValid.length > 0) return stillValid
          const preferred = cats.find((c) => /general|good|cargo|umum/i.test(c))
          return preferred ? [preferred] : (cats[0] ? [cats[0]] : [])
        })
        setBranch((prev) => {
          if (prev && branches.includes(prev)) return prev
          return branches.find((b) => b.toLowerCase() === 'gz') ?? 'GZ'
        })
      })
      .catch((err: any) => {
        setFilterError(err?.response?.data?.message ?? err?.message ?? 'Gagal memuat kategori')
      })
      .finally(() => setCategoriesLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetTypesKey, mode])

  return {
    options,
    optionsLoading,
    sheetTypes,
    setSheetTypes,
    mode,
    setMode,
    branch,
    setBranch,
    branchOptions,
    categories,
    setCategories,
    categoryOptions,
    categoriesLoading,
    filterError,
  }
}
