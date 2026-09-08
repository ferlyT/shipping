/**
 * Commodity Mapping Module Types
 */

export interface CommodityMappingItem {
  id: number
  commodityName: string
  targetCommodity: string
  fdTypeComodity: number | null
  fdCustCode: string | null
  custName?: string | null
  priceListUploadId: number | null
  priceListFileName?: string | null
  effectiveDate: string
  endDate: string | null
  mode: string | null
  applyToNewUploads: boolean
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCommodityMappingInput {
  commodityName: string
  targetCommodity: string
  fdTypeComodity?: number | null
  fdCustCode?: string | null
  priceListUploadId?: number | null
  effectiveDate?: string | Date
  endDate?: string | Date | null
  mode?: string | null
  applyToNewUploads?: boolean
  notes?: string | null
  createdBy?: string | null
}

export interface UpdateCommodityMappingInput {
  commodityName?: string
  targetCommodity?: string
  fdTypeComodity?: number | null
  fdCustCode?: string | null
  priceListUploadId?: number | null
  effectiveDate?: string | Date
  endDate?: string | Date | null
  mode?: string | null
  applyToNewUploads?: boolean
  notes?: string | null
  scopeChangeOption?: 'specific_effective_date' | 'all_active_future' | 'retroactive'
}

export interface CommodityMappingQuery {
  page?: string
  limit?: string
  search?: string
  scope?: 'all' | 'global' | 'customer'
  custCode?: string
  mode?: string
  effectiveDate?: string
  activeOnly?: string
  [key: string]: string | undefined
}

export interface ResolvedCommodityResult {
  isMapped: boolean
  sourceScope: 'CUSTOMER' | 'GLOBAL' | 'STATIC' | 'NONE'
  originalCommodity: string
  targetCommodity: string
  fdTypeComodity: number | null
  mappingId?: number
  effectiveDate?: string
  notes?: string
}

export interface ApplyMappingsToUploadInput {
  uploadId: number
  isCustomerUpload?: boolean
  fdCustCode?: string
  effectiveDate: string | Date
  selectedMappingIds?: number[]
}

export interface PriceListOptionItem {
  id: number
  fileName: string
  effectiveDate: string
  priceDate: string | null
  uploadedAt: string
  status: string
  scope: 'GLOBAL' | 'CUSTOMER'
  fdCustCode?: string | null
}

