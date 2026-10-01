import { z } from 'zod'

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
  price?: number | null
  branch?: string | null
  startMarkingCode?: string | null
  startAgentDate?: string | null
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
  price?: number | null
  branch?: string | null
  startMarkingCode?: string | null
  startAgentDate?: string | Date | null
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
  price?: number | null
  branch?: string | null
  startMarkingCode?: string | null
  startAgentDate?: string | Date | null
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

export const CreateCommodityMappingSchema = z.object({
  commodityName: z.string().min(1, 'Nama komoditas wajib diisi'),
  targetCommodity: z.string().min(1, 'Tipe komoditi tujuan wajib diisi'),
  fdTypeComodity: z.number().nullable().optional(),
  fdCustCode: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  branch: z.string().nullable().optional(),
  startMarkingCode: z.string().nullable().optional(),
  startAgentDate: z.string().nullable().optional(),
  priceListUploadId: z.number().nullable().optional(),
  effectiveDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  mode: z.string().nullable().optional(),
  applyToNewUploads: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

export const UpdateCommodityMappingSchema = z.object({
  commodityName: z.string().optional(),
  targetCommodity: z.string().optional(),
  fdTypeComodity: z.number().nullable().optional(),
  fdCustCode: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  branch: z.string().nullable().optional(),
  startMarkingCode: z.string().nullable().optional(),
  startAgentDate: z.string().nullable().optional(),
  priceListUploadId: z.number().nullable().optional(),
  effectiveDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  mode: z.string().nullable().optional(),
  applyToNewUploads: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  scopeChangeOption: z.enum(['specific_effective_date', 'all_active_future', 'retroactive']).optional(),
})

export const ApplyMappingsToUploadSchema = z.object({
  uploadId: z.number().int().positive('uploadId wajib berupa angka bulat positif'),
  isCustomerUpload: z.boolean().optional(),
  fdCustCode: z.string().optional(),
  effectiveDate: z.string().min(1, 'effectiveDate wajib diisi'),
  selectedMappingIds: z.array(z.number()).optional(),
})

