// Types untuk Customer Price List feature

export interface CustomerPriceListItem {
  id: number
  mode: string
  branch: string
  transitTime: string | null
  category: string
  price: number
}

export interface ActiveCustomerPriceList {
  uploadId: number
  fdCustCode: string
  effectiveDate: string
  priceDate: string | null
  uploadedAt: string
  fileName: string
  items: CustomerPriceListItem[]
}

export interface CustomerPriceListUploadRow {
  id: number
  fdCustCode: string
  fileName: string
  uploadedBy: string | null
  uploadedAt: string
  priceDate: string | null
  effectiveDate: string
  status: 'PARSED' | 'PARTIAL' | 'FAILED'
  isSuperseded: boolean
  _count: { items: number }
  custName: string
  itemCount: number
}

export interface CustomerUploadHistory {
  id: number
  fdCustCode: string
  fileName: string
  uploadedBy: string | null
  uploadedAt: string
  priceDate: string | null
  effectiveDate: string
  status: 'PARSED' | 'PARTIAL' | 'FAILED'
  isSuperseded: boolean
  _count: { items: number }
}

export interface CustomerPriceListDiffRow {
  mode: string
  branch: string
  category: string
  currentPrice: number
  previousPrice: number | null
  delta: number | null
  deltaPct: number | null
}

export interface CustomerPriceListDiff {
  fdCustCode: string
  currentUploadId: number
  currentEffectiveDate: string
  previousUploadId: number | null
  previousEffectiveDate: string | null
  diff: CustomerPriceListDiffRow[]
}

export interface CustomerPriceListFilters {
  modes: string[]
  branches: string[]
  categories: string[]
}

export interface CustomerPriceListUploadResult {
  uploadId: number
  fdCustCode: string
  status: 'PARSED' | 'PARTIAL' | 'FAILED'
  effectiveDate: string
  priceDate: string | null
  itemCount: number
  warnings: string[]
}

export interface CustomerPriceLookupParams {
  custCode: string
  date?: string
  mode?: string
  branch?: string
  category?: string
}

export interface CustomerPriceLookupResult {
  found: boolean
  fdCustCode: string
  targetDate: string
  uploadInfo: {
    uploadId: number
    fileName: string
    effectiveDate: string
    priceDate: string | null
    uploadedAt: string
  } | null
  items: CustomerPriceListItem[]
}

