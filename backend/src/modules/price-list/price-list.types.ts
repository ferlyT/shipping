/**
 * Price List Module Types
 */

export interface PriceListItem {
  id?: number
  sheetType: string
  mode: string
  branch: string
  transitTime?: string | null
  category: string
  price: number
  isCustomerPrice?: boolean
}

export interface PriceListUploadMarkingItem {
  id?: number
  uploadId?: number
  markingCode: string
  agentName?: string | null
  mode?: string | null
}

export interface PriceListDiffItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  category: string
  currentPrice: number
  previousPrice: number | null
  delta: number | null
  deltaPct: number | null
  markings?: PriceListUploadMarkingItem[]
}

export interface PriceTrendFilter {
  sheetType?: string
  mode?: string
  branch?: string
  category?: string
  startDate?: Date
  endDate?: Date
}

export interface PriceTrendPoint {
  effectiveDate: Date
  priceDate: Date | null
  price: number
  uploadId: number
  fileName: string
}

export type PriceLookupRule =
  | 'CUSTOMER_MARKING'
  | 'CUSTOMER_DEFAULT'
  | 'GENERAL_MARKING'
  | 'GENERAL_DEFAULT'
  | 'NONE'

export interface PriceLookupResponse {
  found: boolean
  fdListCode: string
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListType: number | null
  fdTypeComodity: number | null
  fdComodity?: string | null
  fdTglAgent: string | null
  expectedMode: string | null
  expectedBranch: string | null
  customer: {
    fdCustCode: string
    fdCustName: string | null
  } | null
  comodityTypes: Array<{
    fdID: number
    fdTypeComodity: number | null
    fdComodityName: string
    fdListType: number | null
  }>
  appliedRule?: PriceLookupRule
  priceValidation: any
}
