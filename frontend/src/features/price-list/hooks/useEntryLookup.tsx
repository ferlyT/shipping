import { useState, useEffect, useMemo, useRef } from 'react'
import { Anchor, Plane, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { priceListApi } from '../services/priceList.service'
import { isCommodityMatch } from '../utils/commodityMatcher'
import type {
  EntrySearchResult,
  PriceByEntryResult,
  PriceListLookupItem,
  } from '../types'

export interface SheetTypePriceRange {
  sheetType: string
  minPrice: number
  maxPrice: number
  mode: string
  branch: string
  categories: string[]
}

export function useEntryLookup(isActive: boolean) {
  const [entrySearchQuery, setEntrySearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<EntrySearchResult[]>([])
  const [isSearchingEntries, setIsSearchingEntries] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const [selectedListCode, setSelectedListCode] = useState<string>('')
  const [, setSelectedEntryInfo] = useState<EntrySearchResult | null>(null)

  const [entryResult, setEntryResult] = useState<PriceByEntryResult | null>(null)
  const [isLoadingEntry, setIsLoadingEntry] = useState(false)

  // Selector fdTypeComodity (override option)
  const [selectedTypeComodity, setSelectedTypeComodity] = useState<number | null>(null)
  const [entryTableSearch, setEntryTableSearch] = useState('')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const [searchLimit, setSearchLimit] = useState(20)
  const [dropdownLocalSearch, setDropdownLocalSearch] = useState('')

  // Local filter for search results within combo dropdown
  const filteredSearchResults = useMemo(() => {
    if (!dropdownLocalSearch.trim()) return searchResults
    const term = dropdownLocalSearch.toLowerCase().trim()
    return searchResults.filter((item) => {
      const codeMatch = item.fdListCode.toLowerCase().includes(term)
      const custMatch = item.customer?.fdCustName?.toLowerCase().includes(term)
      const markCodeMatch = item.fdMarkingCode?.toLowerCase().includes(term)
      const markNoMatch = item.fdMarkingNo?.toLowerCase().includes(term)
      const terimaMatch = item.fdTerima?.toLowerCase().includes(term)
      return codeMatch || custMatch || markCodeMatch || markNoMatch || terimaMatch
    })
  }, [searchResults, dropdownLocalSearch])

  // Fetch entries helper
  const fetchEntries = (query: string, limit = 20) => {
    let cleanQuery = query.trim()
    if (/pilih|ketik|pengiriman|data pengiriman/i.test(cleanQuery) || cleanQuery.length > 50) {
      cleanQuery = ''
    }

    setIsSearchingEntries(true)
    priceListApi
      .searchEntries(cleanQuery, limit)
      .then((res) => {
        const raw = res.data as any
        const list: EntrySearchResult[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
        setSearchResults(list)
        setSearchLimit(limit)
      })
      .catch(() => {
        setSearchResults([])
      })
      .finally(() => setIsSearchingEntries(false))
  }

  // Fetch initial entries when switching to entry tab
  useEffect(() => {
    if (isActive) {
      fetchEntries(entrySearchQuery.trim(), 20)
    }
  }, [isActive])

  // Debounced search when typing (only when dropdown is active)
  useEffect(() => {
    if (!isActive || !isDropdownOpen) return

    const timer = setTimeout(() => {
      fetchEntries(entrySearchQuery.trim(), 20)
    }, 250)

    return () => clearTimeout(timer)
  }, [entrySearchQuery, isActive, isDropdownOpen])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Execute lookup by listCode
  const handlePerformEntryLookup = (listCodeToLookup?: string) => {
    const rawInput = (listCodeToLookup ?? entrySearchQuery).trim()
    if (!rawInput) return

    let cleanCode = rawInput
    if (cleanCode.includes('—')) {
      cleanCode = (cleanCode.split('—')[0] || '').trim()
    } else if (cleanCode.includes(' - ')) {
      cleanCode = (cleanCode.split(' - ')[0] || '').trim()
    }

    if (!cleanCode) return

    setSelectedListCode(cleanCode)
    setIsLoadingEntry(true)
    setIsDropdownOpen(false)

    priceListApi
      .lookupByEntry(cleanCode)
      .then((res) => {
        const raw = res.data as any
        const data: PriceByEntryResult | null = raw?.data ?? raw ?? null
        setEntryResult(data)
        if (data?.fdTypeComodity !== undefined) {
          setSelectedTypeComodity(data.fdTypeComodity)
        }
      })
      .catch(() => {
        setEntryResult(null)
      })
      .finally(() => {
        setIsLoadingEntry(false)
      })
  }

  // Clear search input and reset entry results
  const handleClearEntrySearch = () => {
    setEntrySearchQuery('')
    setSelectedListCode('')
    setSelectedEntryInfo(null)
    setEntryResult(null)
    setSelectedTypeComodity(null)
    setDropdownLocalSearch('')
    fetchEntries('', 20)
  }

  // Handle select item from autocomplete dropdown
  const handleSelectEntry = (entry: EntrySearchResult) => {
    setSelectedListCode(entry.fdListCode)
    setSelectedEntryInfo(entry)
    const formatted = `${entry.fdListCode}${entry.customer?.fdCustName ? ` — ${entry.customer.fdCustName}` : ''}`
    setEntrySearchQuery(formatted)
    setIsDropdownOpen(false)
    handlePerformEntryLookup(entry.fdListCode)
  }

  // Computed commodity name from selectedTypeComodity
  const selectedComodityName = useMemo(() => {
    if (!entryResult?.comodityTypes || !Array.isArray(entryResult.comodityTypes) || selectedTypeComodity === null) return null
    const match = entryResult.comodityTypes.find(
      (c) =>
        c.fdTypeComodity === selectedTypeComodity &&
        (entryResult.fdListType ? c.fdListType === entryResult.fdListType : true)
    )
    return match?.fdComodityName ?? null
  }, [entryResult, selectedTypeComodity])

  // Commodity options filtered by entry listType
  const availableComodities = useMemo(() => {
    if (!entryResult?.comodityTypes || !Array.isArray(entryResult.comodityTypes)) return []
    if (!entryResult.fdListType) return entryResult.comodityTypes
    return entryResult.comodityTypes.filter((c) => c.fdListType === null || c.fdListType === entryResult.fdListType)
  }, [entryResult])

  // Filter & match items for entry result table
  const entryTableItems = useMemo(() => {
    if (!entryResult?.priceValidation?.items || !Array.isArray(entryResult.priceValidation.items)) return []

    const comName = selectedComodityName || ''
    const search = entryTableSearch.toLowerCase().trim()
    const isAirMode = entryResult?.expectedMode === 'BY AIR' || entryResult?.fdListType === 1

    let items = entryResult.priceValidation.items.map((item) => {
      const isMatch = isCommodityMatch(comName, item.category, item.mode, isAirMode)
      return { ...item, isMatch }
    })

    if (search) {
      items = items.filter((item) => {
        return (
          item.sheetType.toLowerCase().includes(search) ||
          item.mode.toLowerCase().includes(search) ||
          item.branch.toLowerCase().includes(search) ||
          item.category.toLowerCase().includes(search) ||
          (item.transitTime && item.transitTime.toLowerCase().includes(search))
        )
      })
    }

    // Sort matching rows to top
    return items.sort((a, b) => (b.isMatch ? 1 : 0) - (a.isMatch ? 1 : 0))
  }, [entryResult, selectedComodityName, entryTableSearch])

  // Matched price item from commodity matrix
  const matchedPriceItem = useMemo(() => {
    return entryTableItems.find((item) => item.isMatch) || null
  }, [entryTableItems])

  // All unique matched categories list
  const matchedCategoriesList = useMemo(() => {
    const matching = entryTableItems.filter((item) => item.isMatch)
    const set = new Set(matching.map((item) => item.category))
    return Array.from(set)
  }, [entryTableItems])

  // All unique sheet type matching items grouped by price ranges
  const matchedSheetRanges = useMemo<SheetTypePriceRange[]>(() => {
    const matching = entryTableItems.filter((item) => item.isMatch)
    const map = new Map<string, SheetTypePriceRange>()

    matching.forEach((item) => {
      const st = item.sheetType.trim()
      if (!map.has(st)) {
        map.set(st, {
          sheetType: st,
          minPrice: item.price,
          maxPrice: item.price,
          mode: item.mode,
          branch: item.branch,
          categories: [item.category],
        })
      } else {
        const existing = map.get(st)!
        existing.minPrice = Math.min(existing.minPrice, item.price)
        existing.maxPrice = Math.max(existing.maxPrice, item.price)
        if (!existing.categories.includes(item.category)) {
          existing.categories.push(item.category)
        }
      }
    })

    return Array.from(map.values())
  }, [entryTableItems])

  // Columns definition for Mode 2 Table
  const entryColumns = useMemo(
    () => [
      {
        key: 'sheetType',
        header: 'TYPE',
        className: 'w-[80px]',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <Badge variant="default" className="font-mono text-[0.7rem]">
            {item.sheetType}
          </Badge>
        ),
      },
      {
        key: 'mode',
        header: 'MODE',
        className: 'w-[110px]',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
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
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <span className="font-semibold text-xs text-[var(--color-primary)]">{item.branch}</span>
        ),
      },
      {
        key: 'category',
        header: 'KATEGORI BARANG',
        className: 'w-auto',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${item.isMatch ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'text-[var(--color-primary)]'}`}>
              {item.category}
            </span>
            {item.isMatch && (
              <Badge variant="success" className="inline-flex items-center gap-1 text-[10px]">
                <CheckCircle2 size={11} />
                Match Kategori
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'price',
        header: 'HARGA (TARIF)',
        className: 'w-[160px] text-right',
        render: (item: PriceListLookupItem & { isMatch?: boolean }) => (
          <span className={`font-bold text-xs ${item.isMatch ? 'text-emerald-700 dark:text-emerald-300 text-sm' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {formatCurrency(item.price)}
          </span>
        ),
      },
    ],
    []
  )

  return {
    entrySearchQuery,
    setEntrySearchQuery,
    searchResults,
    isSearchingEntries,
    isDropdownOpen,
    setIsDropdownOpen,
    selectedListCode,
    entryResult,
    isLoadingEntry,
    selectedTypeComodity,
    setSelectedTypeComodity,
    entryTableSearch,
    setEntryTableSearch,
    dropdownRef,
    searchLimit,
    dropdownLocalSearch,
    setDropdownLocalSearch,
    filteredSearchResults,
    fetchEntries,
    handlePerformEntryLookup,
    handleSelectEntry,
    handleClearEntrySearch,
    selectedComodityName,
    availableComodities,
    entryTableItems,
    matchedPriceItem,
    allMatchedItemsList: matchedSheetRanges,
    matchedCategoriesList,
    matchedSheetRanges,
    entryColumns,
  }
}
