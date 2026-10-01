import { z } from 'zod'

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

export interface PeriodBillingMetrics {
  year: number
  month: number
  monthName: string
  totalInvoices: number
  totalTagihan: number
  invoicesUdara: number
  tagihanUdara: number
  invoicesLaut: number
  tagihanLaut: number
  avgInvoiceValue: number
  uniqueCustomers: number
}

export interface MetricComparison {
  current: number
  prev: number
  momDiff: number
  momPercent: number
  lastYear: number
  yoyDiff: number
  yoyPercent: number
}

export interface BillingComparisons {
  totalInvoices: MetricComparison
  totalTagihan: MetricComparison
  invoicesUdara: MetricComparison
  tagihanUdara: MetricComparison
  invoicesLaut: MetricComparison
  tagihanLaut: MetricComparison
  avgInvoiceValue: MetricComparison
  uniqueCustomers: MetricComparison
}

export interface BillingKPIResult {
  totalInvoices: number
  totalAmountIDR: number
  totalAmountUSD: number
  totalM3: number
  totalKG: number
  billedVsUnbilledRatio?: number
  currentMonth?: PeriodBillingMetrics
  prevMonth?: PeriodBillingMetrics
  lastYearSameMonth?: PeriodBillingMetrics
  comparisons?: BillingComparisons
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

export interface BillingDetailUpdateItem {
  fdID?: string
  fdItemName: string
  fdQty: number
  fdItemPrice: number
  fdTotal?: number
  fdListCode?: string | null
  fdItemCode?: string | null
  fdCurr?: string | null
  fdSatuan?: string | null
  fdComodity?: string | null
  fdTypeComodity?: number | null
}

export const PairingByReceiptsSchema = z.object({
  receiptNos: z.string().min(1, 'Daftar nomor resi tidak boleh kosong'),
})

export const PairingExportExcelSchema = z.object({
  rows: z.array(z.record(z.string(), z.any())).min(1, 'Data baris tidak ditemukan untuk diekspor'),
})

export const BatchEntryListDetailsSchema = z.object({
  listCodes: z.array(z.string()).optional(),
  listCode: z.string().optional(),
})

export const IssueInvoiceSchema = z.object({
  fdEmpId: z.string().optional(),
})

export const UpdateBillingDetailsSchema = z.object({
  items: z.array(z.any()).min(1, 'Item billing wajib diisi'),
  saveToPrev: z.boolean().optional(),
})

/**
 * Timeline siklus kargo per invoice
 * Urutan kronologis proses logistik: Agen → Loading → ETD → ETA → Gudang → SJ → Kirim → Serah
 */
export interface BillingTimeline {
  fdTglAgent: string | null    // Diterima Agen (tbEntrylist.fdTglAgent)
  fdLoadDate: string | null    // Loading ke kapal/pesawat (tbMarking.fdLoadDate)
  fdETD: string | null         // Estimated Time of Departure (tbMarking.fdETD)
  fdETA: string | null         // Estimated Time of Arrival (tbMarking.fdETA)
  fdTgl_IN: string | null      // Masuk Gudang domestik (tbEntrylist.fdTgl_IN)
  fdSjDate: string | null      // Surat Jalan diterbitkan (tbDelivery.fdSJDate)
  fdSndDate: string | null     // Tanggal Kirim MAX per listCode (tbDelivery.fdSndDate)
  fdGiveDate: string | null    // Diserahkan ke customer (tbDelivery.fdGiveDate)
}

