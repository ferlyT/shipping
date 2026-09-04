/**
 * Billing Module Type Definitions
 */

export interface BillingQuery {
  page?: string
  limit?: string
  search?: string
  hasAmount?: string
  validOnly?: string
  draftOnly?: string
  status?: string
  minYear?: string
  dateFrom?: string
  dateTo?: string
  branch?: string
  customer?: string
  salesPic?: string
  [key: string]: string | undefined
}

export interface MarkingDetailItem {
  listCode: string
  markingNo: string
  markingCode: string
  custCode: string
  custName?: string
  branchCode?: string
  comodity?: string
  comodityName?: string
  qtySJ: number
  qtyGdg: number
  qtyPL: number
  qtyK: number
  weightSJ: number
  weightGdg: number
  weightK: number
  m3PL: number
  m3Gdg: number
  m3K: number
  m3Bill: number
  rasio: number
  owPL: number
  owGdg: number
  owK: number
  isTax?: boolean
  dateStr?: string
}

export type BillTypeCategory = 'normal' | 'gabungan' | 'revisi' | 'transport' | 'air' | 'sea'

export interface M3CheckResponse {
  listCode: string
  invoiceNo: string
  customerCode: string
  customerName: string
  salesPIC: string
  markingCode: string
  markingNo?: string
  billCategory?: BillTypeCategory
  billTypeLabel?: string
  requiresValidation?: boolean
  skipReason?: string
  seaAirType?: 'sea' | 'air' | 'unknown'
  isGabungan?: boolean
  isRevisi?: boolean
  isTransport?: boolean
  totalColySJ: number
  totalColyGudang: number
  totalColyKomplain: number
  totalBeratSJ: number
  totalBeratGudang: number
  totalBeratKomplain: number
  m3PackingList: number
  m3Gudang: number
  m3Komplain: number
  m3Hybrid: number
  m3Difference: number
  m3DifferenceGudangVsPL: number
  m3DifferenceKomplainVsPL: number
  rasio: number
  batasBeratM3PL: number
  batasBeratM3Gudang: number
  batasBeratM3Komplain: number
  overweightPL: number
  overweightGudang: number
  overweightKomplain: number
  overweightHybrid: number
  isOverweight: boolean
  matchedVolumeSource?: 'm3Gudang' | 'm3Komplain' | 'm3PackingList' | 'm3Hybrid' | 'none'
  hasMatchedVolume?: boolean
  priceListValidation?: {
    status: 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'CUSTOM_PRICE'
    billedPrice: number
    expectedPrice: number
    currency: string
    category: string
    priceListSource: string
    effectiveDate?: string
    notes?: string
  }
  markingDetails?: MarkingDetailItem[]
  invoiceItems?: Array<{
    itemName: string
    quantity: number
    unit: string
    price: number
    amount: number
    currency: string
    status?: 'MATCH' | 'MISMATCH' | 'EXTRA' | 'NOT_CHECKED'
    statusNote?: string
  }>
}

export interface BillingKPIResult {
  totalInvoices: number
  totalAmountIDR: number
  totalAmountUSD: number
  totalM3: number
  totalKG: number
  billedVsUnbilledRatio?: number
  [key: string]: any
}

export interface BillingTrendItem {
  date: string
  amount: number
  count: number
  m3?: number
  kg?: number
}

export interface SjVsBillComparisonItem {
  period: string
  sjCount: number
  billCount: number
  sjM3: number
  billM3: number
  differenceM3: number
  status: 'balanced' | 'surplus_sj' | 'surplus_bill'
}
