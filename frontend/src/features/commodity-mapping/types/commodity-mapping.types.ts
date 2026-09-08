/**
 * Commodity Mapping Frontend Types
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

export interface CreateCommodityMappingPayload {
  commodityName: string
  targetCommodity: string
  fdTypeComodity?: number | null
  fdCustCode?: string | null
  priceListUploadId?: number | null
  effectiveDate?: string
  endDate?: string | null
  mode?: string | null
  applyToNewUploads?: boolean
  notes?: string | null
}

export interface UpdateCommodityMappingPayload {
  commodityName?: string
  targetCommodity?: string
  fdTypeComodity?: number | null
  fdCustCode?: string | null
  priceListUploadId?: number | null
  effectiveDate?: string
  endDate?: string | null
  mode?: string | null
  applyToNewUploads?: boolean
  notes?: string | null
  scopeChangeOption?: 'specific_effective_date' | 'all_active_future' | 'retroactive'
}

export interface CommodityMappingFilters {
  search?: string
  scope?: 'all' | 'global' | 'customer'
  custCode?: string
  mode?: string
  activeOnly?: boolean
  page?: number
  limit?: number
}

export interface ApplyMappingsToUploadPayload {
  uploadId: number
  isCustomerUpload?: boolean
  fdCustCode?: string
  effectiveDate: string
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

