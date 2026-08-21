import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Anchor, Plane } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { priceListApi } from '../services/priceList.service'
import type { FilterOptions, PriceListLookupResult, PriceListLookupItem } from '../types'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

export function useDateLookup(isActive: boolean) {
  const { t } = useTranslation()

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sheetTypes: [],
    modes: [],
    branches: [],
    categories: [],
  })
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)

  const [targetDate, setTargetDate] = useState(getTodayString())
  const [sheetTypeFilter, setSheetTypeFilter] = useState<string>('CS')
  const [modeFilter, setModeFilter] = useState<string>('BY SEA')
  const [branchFilter, setBranchFilter] = useState<string>('GZ')
  // Multi-select: user boleh pilih lebih dari satu kategori barang sekaligus.
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [tableSearch, setTableSearch] = useState('')

  const [isLoadingDate, setIsLoadingDate] = useState(true)
  const [isRefreshingDate, setIsRefreshingDate] = useState(false)
  const [dateResult, setDateResult] = useState<PriceListLookupResult | null>(null)

  // Load Filter Options & Set Defaults (BY SEA, CS, GZ, General)
  useEffect(() => {
    setIsLoadingFilters(true)
    priceListApi
      .getFilterOptions()
      .then((res) => {
        const raw = res.data as any
        const data: FilterOptions = raw?.data ?? raw ?? {}
        const sheetTypes = Array.isArray(data?.sheetTypes) ? data.sheetTypes : []
        const modes = Array.isArray(data?.modes) ? data.modes : []
        const branches = Array.isArray(data?.branches) ? data.branches : []
        const categories = Array.isArray(data?.categories) ? data.categories : []

        setFilterOptions({ sheetTypes, modes, branches, categories })

        const defaultMode = modes.find((m) => m.toLowerCase().includes('sea')) ?? 'BY SEA'
        const defaultSheet = sheetTypes.find((s) => s.toLowerCase() === 'cs') ?? 'CS'
        const defaultBranch = branches.find((b) => b.toLowerCase() === 'gz') ?? 'GZ'
        const defaultCat = categories.find((c) => /general|good|umum/i.test(c)) ?? ''

        if (defaultMode) setModeFilter((prev) => (prev ? prev : defaultMode))
        if (defaultSheet) setSheetTypeFilter((prev) => (prev ? prev : defaultSheet))
        if (defaultBranch) setBranchFilter((prev) => (prev ? prev : defaultBranch))
        if (defaultCat) setCategoryFilter((prev) => (prev.length ? prev : [defaultCat]))
      })
      .catch(() => {
        setFilterOptions({
          sheetTypes: [],
          modes: [],
          branches: [],
          categories: [],
        })
      })
      .finally(() => setIsLoadingFilters(false))
  }, [])

  // Dynamic refetch & category adjustment when mode or sheetType changes
  useEffect(() => {
    if (!modeFilter && !sheetTypeFilter) return

    priceListApi
      .getFilterOptions({
        mode: modeFilter || undefined,
        sheetType: sheetTypeFilter || undefined,
      })
      .then((res) => {
        const raw = res.data as any
        const data: FilterOptions = raw?.data ?? raw ?? {}
        const newCats = Array.isArray(data?.categories) ? data.categories : []
        const newBranches = Array.isArray(data?.branches) ? data.branches : []

        if (newCats.length > 0) {
          setFilterOptions((prev) => ({
            ...prev,
            categories: newCats,
            branches: newBranches.length > 0 ? newBranches : prev.branches,
          }))

          // Buang kategori yang sudah dipilih tapi tidak valid lagi untuk mode/sheetType baru.
          // Kalau semua pilihan lama jadi tidak valid, jatuhkan ke default tunggal.
          setCategoryFilter((prev) => {
            const stillValid = prev.filter((c) => newCats.includes(c))
            if (stillValid.length > 0) return stillValid
            const preferred = newCats.find((c) => /general|good|cargo|umum/i.test(c)) ?? newCats[0] ?? ''
            return preferred ? [preferred] : []
          })
        }
      })
      .catch(() => {})
  }, [modeFilter, sheetTypeFilter])

  // Fetch Lookup Data for Mode 1
  const fetchDateLookup = (isInitial = false) => {
    if (isInitial) {
      setIsLoadingDate(true)
    } else {
      setIsRefreshingDate(true)
    }

    priceListApi
      .lookupPrice({
        date: targetDate,
        sheetType: sheetTypeFilter || undefined,
        mode: modeFilter || undefined,
        branch: branchFilter || undefined,
        // NOTE: backend/priceListApi perlu mendukung beberapa kategori sekaligus.
        // Dikirim sebagai string dipisah koma — sesuaikan di priceListApi.lookupPrice /
        // endpoint terkait kalau formatnya beda (mis. array asli lewat query[]).
        category: categoryFilter.length > 0 ? categoryFilter.join(',') : undefined,
      })
      .then((res) => {
        const raw = res.data as any
        const data: PriceListLookupResult | null = raw?.data ?? raw ?? null
        setDateResult(data)
      })
      .catch(() => {
        setDateResult(null)
      })
      .finally(() => {
        setIsLoadingDate(false)
        setIsRefreshingDate(false)
      })
  }

  useEffect(() => {
    if (isActive) {
      fetchDateLookup(dateResult === null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate, sheetTypeFilter, modeFilter, branchFilter, categoryFilter, isActive])

  const handleResetFilters = () => {
    setTargetDate(getTodayString())
    const defaultMode = filterOptions.modes.find((m) => m.toLowerCase().includes('sea')) ?? 'BY SEA'
    const defaultSheet = filterOptions.sheetTypes.find((s) => s.toLowerCase() === 'cs') ?? 'CS'
    const defaultBranch = filterOptions.branches.find((b) => b.toLowerCase() === 'gz') ?? 'GZ'
    const defaultCat = filterOptions.categories.find((c) => /general|good|umum/i.test(c)) ?? ''

    setModeFilter(defaultMode)
    setSheetTypeFilter(defaultSheet)
    setBranchFilter(defaultBranch)
    setCategoryFilter(defaultCat ? [defaultCat] : [])
    setTableSearch('')
  }

  const defaultModeName = filterOptions.modes.find((m) => m.toLowerCase().includes('sea')) ?? 'BY SEA'
  const defaultSheetName = filterOptions.sheetTypes.find((s) => s.toLowerCase() === 'cs') ?? 'CS'
  const defaultBranchName = filterOptions.branches.find((b) => b.toLowerCase() === 'gz') ?? 'GZ'
  const defaultCatName = filterOptions.categories.find((c) => /general|good|umum/i.test(c)) ?? ''

  const isFiltered = Boolean(
    (modeFilter && modeFilter.toLowerCase() !== defaultModeName.toLowerCase()) ||
      (sheetTypeFilter && sheetTypeFilter.toLowerCase() !== defaultSheetName.toLowerCase()) ||
      (branchFilter && branchFilter.toLowerCase() !== defaultBranchName.toLowerCase()) ||
      categoryFilter.length !== (defaultCatName ? 1 : 0) ||
      (categoryFilter.length === 1 && categoryFilter[0] !== defaultCatName) ||
      targetDate !== getTodayString() ||
      tableSearch
  )

  const filteredDateItems = useMemo(() => {
    if (!dateResult?.items) return []
    if (!tableSearch.trim()) return dateResult.items

    const q = tableSearch.toLowerCase()
    return dateResult.items.filter((item: PriceListLookupItem) => {
      const matchSheet = item.sheetType.toLowerCase().includes(q)
      const matchMode = item.mode.toLowerCase().includes(q)
      const matchBranch = item.branch.toLowerCase().includes(q)
      const matchCat = item.category.toLowerCase().includes(q)
      const matchTransit = item.transitTime ? item.transitTime.toLowerCase().includes(q) : false
      return matchSheet || matchMode || matchBranch || matchCat || matchTransit
    })
  }, [dateResult, tableSearch])

  const dateColumns = useMemo(
    () => [
      {
        key: 'sheetType',
        header: 'TYPE',
        className: 'w-[80px]',
        render: (item: PriceListLookupItem) => (
          <Badge variant="default" className="font-mono text-[0.7rem]">
            {item.sheetType}
          </Badge>
        ),
      },
      {
        key: 'mode',
        header: 'MODE',
        className: 'w-[110px]',
        render: (item: PriceListLookupItem) => (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)]">
            {item.mode.toUpperCase().includes('SEA') ? (
              <Anchor size={13} className="text-blue-500 shrink-0" />
            ) : (
              <Plane size={13} className="text-sky-500 shrink-0" />
            )}
            {item.mode}
          </span>
        ),
      },
      {
        key: 'branch',
        header: 'CABANG',
        className: 'w-[90px]',
        render: (item: PriceListLookupItem) => (
          <span className="font-semibold text-xs text-[var(--color-primary)]">{item.branch}</span>
        ),
      },
      {
        key: 'transitTime',
        header: 'ESTIMASI WAKTU',
        className: 'w-[170px] whitespace-nowrap',
        render: (item: PriceListLookupItem) => (
          <span className="text-xs text-[var(--color-secondary)]">{item.transitTime || '-'}</span>
        ),
      },
      {
        key: 'category',
        header: 'KATEGORI BARANG',
        className: 'w-auto',
        render: (item: PriceListLookupItem) => (
          <span className="text-xs font-medium text-[var(--color-primary)]">{item.category}</span>
        ),
      },
      {
        key: 'price',
        header: 'HARGA (TARIF)',
        className: 'w-[140px] text-right',
        render: (item: PriceListLookupItem) => (
          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
            {formatCurrency(item.price)}
          </span>
        ),
      },
    ],
    []
  )

  return {
    t,
    filterOptions,
    isLoadingFilters,
    targetDate,
    setTargetDate,
    sheetTypeFilter,
    setSheetTypeFilter,
    modeFilter,
    setModeFilter,
    branchFilter,
    setBranchFilter,
    categoryFilter,
    setCategoryFilter,
    tableSearch,
    setTableSearch,
    isLoadingDate,
    isRefreshingDate,
    dateResult,
    handleResetFilters,
    isFiltered,
    filteredDateItems,
    dateColumns,
  }
}

