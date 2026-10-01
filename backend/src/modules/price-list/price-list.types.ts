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

import { z } from 'zod'

export function calculatePriceDelta(
  currentPrice: number,
  previousPrice?: number | null
): { delta: number | null; deltaPct: number | null } {
  if (previousPrice === undefined || previousPrice === null) {
    return { delta: null, deltaPct: null }
  }
  const delta = currentPrice - previousPrice
  const deltaPct = previousPrice !== 0 ? Number(((delta / previousPrice) * 100).toFixed(2)) : null
  return { delta, deltaPct }
}

export const UpdateEffectiveDateSchema = z.object({
  effectiveDate: z.string().min(1, 'Field effectiveDate wajib diisi').refine(
    (val) => !isNaN(new Date(val).getTime()),
    { message: 'Format tanggal tidak valid' }
  ),
})

export const SetUploadMarkingsSchema = z.object({
  markings: z.array(
    z.object({
      markingCode: z.string().min(1, 'Kode marking wajib diisi'),
      agentName: z.string().nullable().optional(),
      mode: z.string().nullable().optional(),
    })
  ).min(1, 'Daftar marking tidak boleh kosong'),
})

export const PriceLookupQuerySchema = z.object({
  date: z.string().optional(),
  sheetType: z.string().optional(),
  mode: z.string().optional(),
  branch: z.string().optional(),
  category: z.string().optional(),
  markingCode: z.string().optional(),
})

