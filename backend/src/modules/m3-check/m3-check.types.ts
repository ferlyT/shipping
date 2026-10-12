import { z } from 'zod'

export interface CustomerInfo {
  fdListCode: string
  fdMarkingCode: string
  fdCustCode: string
  fdCustName: string
  fdBlocked: number
  fdSalesNM: string
  fdBroker: number
}

export interface MarkingComodityItem {
  fdTypeComodity: number | null
  fdComodity: string | null
  fdComodityName: string | null
}

export interface MarkingDetailItem {
  fdListCode: string
  fdMarkingNo: string
  fdQty: number | null
  fdM3PL: number | null
  fdM3Gudang: number | null
  fdM3Komplain: number | null
  fdBerat: number | null
  fdSatuan: string
}

export interface ComodityTypeOption {
  fdID: number
  fdTypeComodity: number | null
  fdComodityName: string
  fdListType: number | null
}

export interface ProfileHargaItem {
  fdListCode: string
  fdCustCode: string
  harga: number
  rasio: number
  typeTagihan: number
  kg: number
  taxReturnPrice: number
  taxReturnMinCharge: number
  minChargeM3: number
  minChargeKg: number
  fdUpdate?: string | null
  fdUpdateDate?: string | Date | null
  fdUpdateSource?: 'AUDIT' | 'CUSTOMER_HARGA' | null
  fdNoteAir?: string | null
  fdNote1Sea?: string | null
}

export interface UnifiedM3CheckResult {
  fdListCode: string
  fdListType: number | null
  defaultFdTypeComodity: number | null
  entryListTypeComodity?: number | null
  entryListComodityName?: string | null
  markingComodityType: number | null
  markingComodities: MarkingComodityItem[]
  commodityMappings?: Array<{
    id: number
    commodityName: string
    targetCommodity: string
    fdTypeComodity: number | null
    fdCustCode: string | null
    mode?: string | null
    price?: number | null
    branch?: string | null
    startMarkingCode?: string | null
    startAgentDate?: string | null
    effectiveDate?: string | null
    endDate?: string | null
  }>
  fdTglAgent: string | null
  expectedMode: string | null
  expectedBranch: string | null
  priceValidation: {
    fdTglAgent: string | null
    effectiveDate: string | null
    masterEffectiveDate: string | null
    customerEffectiveDate: string | null
    customerEndDate?: string | null
    isCustomerPriceExpired?: boolean
    isCustomerPriceExpiringSoon?: boolean
    hasCustomerPriceList: boolean
    isMarkingOverride?: boolean
    matchedMarkingCode?: string | null
    expectedMode: string | null
    expectedBranch: string | null
    items: any[]
    customerPriceListName?: string | null
  }
  customer: CustomerInfo
  isCodOrUrgent: boolean
  recommendedM3: number
  recommendedM3Source?: string
  hasApprovedKomplain?: boolean
  isFullKomplainQtyMatch?: boolean
  isKomplainRejected?: boolean
  komplainRejectedReason?: string | null
  m3PackingList: {
    raw: any[]
    values: number[]
    qty: number | null
  }
  m3Gudang: {
    raw: any[]
    values: number[]
    qty: number | null
  }
  m3CustPerMarking: {
    raw: any[]
    values: number[]
    totalEntryList: number | null
  }
  m3PLPerMarking: {
    raw: any[]
    values: number[]
    totalEntryList: number | null
  }
  m3Komplain: {
    raw: any[]
    values: number[]
    qty: number | null
  }
  m3KomplainPerMarking: {
    raw: any[]
    values: number[]
    totalEntryKomplain: number | null
  }
  m3ListBatch: {
    raw: any[]
    values: number[]
    qty: number | null
  }
  fdQtyList: number | null
  fdTotalQtyPL: number | null
  fdTotalQtyGudang: number | null
  fdTotalQtyKomplain: number | null
  totalEntryKomplain: number | null
  totalEntryList: number | null
  isPartialKomplain: boolean
  m3KomplainPlusGudang: number | null
  countKomplainLC: number
  countGudangLC: number
  fdSatuan: string | null
  fdBeratList: number | null
  fdJmlBeratGudang: number | null
  fdJmlBeratKomplain: number | null
  fdBeratSJ: number | null
  totalJmlBeratSJ: number | null
  totalBeratPerMarking: number | null
  markingDetails: MarkingDetailItem[]
  fdVFCGudang: number | null
  fdVFCPL: number | null
  fdVFCKomplain: number | null
  vfcGudangPerMarking: number | null
  vfcKomplainPerMarking: number | null
  minChargeKg: number
  minChargeM3: number
  profileHarga: ProfileHargaItem | null
  comodityTypes: ComodityTypeOption[]
  freightChargeSummary?: {
    totalFc: number
    listsWithFcCount: number
    currency: string
  } | null
  relatedBillsSummary?: RelatedBillsSummary | null
}

export interface RelatedInvoiceItem {
  invNo: string
  listCode: string
  isParent: boolean
  isCurrent?: boolean
  billedM3: number
  billedKg: number
  markingNo: string
  firstItemName?: string
  m3Gudang?: number
  m3PL?: number
  berat?: number
  qty?: number
}

export interface RelatedListCodeItem {
  listCode: string
  invNo?: string | null
  isParent?: boolean
  isCurrent?: boolean
  childLetter?: string | null
  fdMarkingNo?: string | null
  fdTypeComodity?: number | null
  typeComodityName?: string | null
  m3Gudang: number
  m3PL?: number
  m3Komplain?: number
  berat: number
  qty: number
  billedM3: number
  hasBill: boolean
  firstItemName?: string
}

export interface RelatedBillsSummary {
  hasRelatedBills: boolean
  isParent: boolean
  isChild: boolean
  parentInvNo: string
  childLetter?: string
  relatedInvoices: RelatedInvoiceItem[]
  relatedListCodes: string[]
  listCodeBreakdown?: RelatedListCodeItem[]
  allListCodesHaveBill?: boolean
  totalListCodesCount?: number
  missingBillsCount?: number
  sumM3Gudang: number
  sumM3PL: number
  sumM3Komplain: number
  sumQty: number
  sumBerat: number
  totalBilledM3: number
  totalBilledKg?: number
}

export const EvaluateM3CheckSchema = z
  .object({
    listCode: z.string().optional(),
    identifier: z.string().optional(),
    markingCode: z.string().optional(),
  })
  .refine(
    (data) => !!(data.listCode || data.identifier || data.markingCode),
    { message: 'Salah satu dari listCode, identifier, atau markingCode wajib diisi' }
  )

export const M3CustMarkingDetailsQuerySchema = z.object({
  custCode: z.string().min(1, 'Parameter custCode wajib diisi'),
  markingCode: z.string().min(1, 'Parameter markingCode wajib diisi'),
})

