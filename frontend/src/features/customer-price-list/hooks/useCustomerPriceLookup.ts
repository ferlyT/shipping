import { useState, useEffect, useMemo } from 'react'
import { customerPriceListApi } from '../services/customerPriceList.service'
import type {
  CustomerPriceLookupResult,
  CustomerPriceListItem,
  CustomerPriceListUploadRow,
} from '../types'

function getTodayString() {
  return new Date().toISOString().slice(0, 10)
}

export function useCustomerPriceLookup() {
  // Master customer price list
  const [customerList, setCustomerList] = useState<CustomerPriceListUploadRow[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)

  // Global filters options
  const [globalBranches, setGlobalBranches] = useState<string[]>([])
  const [globalCategories, setGlobalCategories] = useState<string[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)

  // Form state
  const [custCode, setCustCode] = useState('')
  const [custName, setCustName] = useState('')
  const [targetDate, setTargetDate] = useState(getTodayString())
  const [modeFilter, setModeFilter] = useState<string>('BY SEA')
  const [branchFilter, setBranchFilter] = useState<string>('GZ')
  const [categoriesFilter, setCategoriesFilter] = useState<string[]>([])

  // Customer Autocomplete Search
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Lookup Result State
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [result, setResult] = useState<CustomerPriceLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // In-table search filter
  const [tableSearch, setTableSearch] = useState('')

  // Load customer list
  useEffect(() => {
    setIsLoadingCustomers(true)
    customerPriceListApi
      .listCustomers()
      .then((res) => {
        const data = res.data?.data || []
        setCustomerList(data)
      })
      .catch(() => setCustomerList([]))
      .finally(() => setIsLoadingCustomers(false))
  }, [])

  // Load customer price list branches & categories directly from tbCustomerPriceListItem
  useEffect(() => {
    setIsLoadingFilters(true)
    customerPriceListApi
      .getGlobalFilters()
      .then((res) => {
        const data = res.data?.data || {}
        if (Array.isArray(data.branches) && data.branches.length > 0) setGlobalBranches(data.branches)
        if (Array.isArray(data.categories) && data.categories.length > 0) setGlobalCategories(data.categories)
      })
      .catch(() => {})
      .finally(() => setIsLoadingFilters(false))
  }, [])

  // Refine branch and category options when customer is selected
  useEffect(() => {
    if (!custCode) return
    customerPriceListApi
      .getFilters(custCode)
      .then((res) => {
        const filters = res.data?.data
        if (filters?.branches && filters.branches.length > 0) {
          setGlobalBranches((prev) => Array.from(new Set([...filters.branches, ...prev])))
        }
        if (filters?.categories && filters.categories.length > 0) {
          setGlobalCategories((prev) => Array.from(new Set([...filters.categories, ...prev])))
        }
      })
      .catch(() => {})
  }, [custCode])

  // Compute available categories dynamically matched with selected mode & result items
  const availableCategories = useMemo(() => {
    if (result?.items && result.items.length > 0) {
      let filtered = result.items
      if (modeFilter) {
        filtered = filtered.filter((i) =>
          (i.mode || '').toUpperCase().includes(modeFilter.toUpperCase())
        )
      }
      const cats = Array.from(new Set(filtered.map((i) => i.category).filter(Boolean)))
      if (cats.length > 0) return cats.sort()
    }
    return globalCategories
  }, [result, modeFilter, globalCategories])

  // Automatically trim categoriesFilter if some selected categories are no longer valid for the selected mode
  useEffect(() => {
    if (categoriesFilter.length > 0 && availableCategories.length > 0) {
      const valid = categoriesFilter.filter((cat) =>
        availableCategories.some((c) => c.toLowerCase() === cat.toLowerCase())
      )
      if (valid.length !== categoriesFilter.length) {
        setCategoriesFilter(valid)
      }
    }
  }, [availableCategories])

  const filteredCustomers = useMemo(() => {
    if (!search) return customerList
    const q = search.toLowerCase()
    return customerList.filter(
      (c) =>
        c.fdCustCode.toLowerCase().includes(q) ||
        (c.custName && c.custName.toLowerCase().includes(q))
    )
  }, [customerList, search])

  const handleSelectCustomer = (c: CustomerPriceListUploadRow) => {
    setCustCode(c.fdCustCode)
    setCustName(c.custName || '-')
    setSearch('')
    setShowDropdown(false)
  }

  const isFiltered = modeFilter !== 'BY SEA' || branchFilter !== 'GZ' || categoriesFilter.length > 0

  const handleResetAll = () => {
    setModeFilter('BY SEA')
    setBranchFilter('GZ')
    setCategoriesFilter([])
  }

  const handleLookup = async () => {
    if (!custCode) return
    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const res = await customerPriceListApi.lookup({
        custCode,
        date: targetDate,
      })
      setResult(res.data.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Gagal mencari tarif harga')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter items in result by Mode, Branch, Multi-Categories, and Table Search
  const filteredItems: CustomerPriceListItem[] = useMemo(() => {
    if (!result?.items) return []
    return result.items.filter((item) => {
      // 1. Mode Filter
      if (modeFilter) {
        const itemMode = (item.mode || '').toUpperCase()
        if (!itemMode.includes(modeFilter.toUpperCase())) {
          return false
        }
      }

      // 2. Branch Filter
      if (branchFilter) {
        const itemBranch = (item.branch || '').trim().toUpperCase()
        const targetBranch = branchFilter.trim().toUpperCase()
        if (itemBranch !== targetBranch && !itemBranch.includes(targetBranch)) {
          return false
        }
      }

      // 3. Multi-Category Filter
      if (categoriesFilter.length > 0) {
        const itemCat = (item.category || '').toLowerCase()
        const match = categoriesFilter.some((cat) => itemCat.includes(cat.toLowerCase()))
        if (!match) return false
      }

      // 4. In-table search box
      if (tableSearch) {
        const q = tableSearch.toLowerCase()
        const matchBranch = item.branch.toLowerCase().includes(q)
        const matchCat = item.category.toLowerCase().includes(q)
        const matchTransit = item.transitTime ? item.transitTime.toLowerCase().includes(q) : false
        if (!matchBranch && !matchCat && !matchTransit) {
          return false
        }
      }

      return true
    })
  }, [result, modeFilter, branchFilter, categoriesFilter, tableSearch])

  return {
    customerList,
    isLoadingCustomers,
    globalBranches,
    globalCategories,
    isLoadingFilters,
    custCode,
    setCustCode,
    custName,
    setCustName,
    targetDate,
    setTargetDate,
    modeFilter,
    setModeFilter,
    branchFilter,
    setBranchFilter,
    categoriesFilter,
    setCategoriesFilter,
    search,
    setSearch,
    showDropdown,
    setShowDropdown,
    loading,
    hasSearched,
    result,
    error,
    tableSearch,
    setTableSearch,
    availableCategories,
    filteredCustomers,
    handleSelectCustomer,
    isFiltered,
    handleResetAll,
    handleLookup,
    filteredItems,
  }
}
