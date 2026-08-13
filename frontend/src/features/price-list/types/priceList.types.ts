export interface TrendPoint {
  uploadId: number
  date: string
  sheetType: string
  mode: string
  branch: string
  category: string
  price: number
}

export interface FilterOptions {
  sheetTypes: string[]
  modes: string[]
  branches: string[]
  categories: string[]
}

export interface UploadRow {
  id: number
  fileName: string
  uploadedBy: string | null
  uploadedAt: string
  priceDate: string | null
  effectiveDate: string
  status: 'PARSED' | 'PARTIAL' | 'FAILED'
  isSuperseded: boolean
  _count: { items: number }
}

export interface DiffRow {
  sheetType: string
  mode: string
  branch: string
  category: string
  currentPrice: number
  previousPrice: number | null
  delta: number | null
  deltaPct: number | null
}

export interface DiffResponse {
  currentUploadId: number
  currentEffectiveDate: string
  previousUploadId: number | null
  previousEffectiveDate: string | null
  diff: DiffRow[]
}

export interface TrendSeries {
  key: string
  sheetType: string
  category: string
}

export interface UploadResult {
  uploadId: number
  status: 'PARSED' | 'PARTIAL' | 'FAILED'
  effectiveDate: string
  priceDate: string | null
  itemCount: number
  warnings: string[]
}

export interface PriceListLookupItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  transitTime: string | null
  category: string
  price: number
}

export interface PriceListLookupResult {
  found: boolean
  targetDate: string
  uploadInfo: {
    uploadId: number
    fileName: string
    effectiveDate: string
    priceDate: string | null
    uploadedAt: string
  } | null
  items: PriceListLookupItem[]
}

export interface EntrySearchResult {
  fdListCode: string
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListType: number | null
  fdTypeComodity: number | null
  fdTglAgent: string | null
  fdCustCode: string | null
  fdTerima: string | null
  customer: { fdCustCode: string; fdCustName: string | null } | null
}

export interface ComodityType {
  fdID: number
  fdTypeComodity: number | null
  fdComodityName: string
  fdListType: number | null
}

export interface PriceByEntryResult {
  found: boolean
  fdListCode: string
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListType: number | null
  fdTypeComodity: number | null
  fdTglAgent: string | null
  expectedMode: string | null
  expectedBranch: string | null
  customer: { fdCustCode: string; fdCustName: string | null } | null
  comodityTypes: ComodityType[]
  priceValidation: {
    effectiveDate: string | null
    items: PriceListLookupItem[]
  } | null
}


