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
}

export interface UnifiedM3CheckResult {
  fdListCode: string
  fdListType: number | null
  defaultFdTypeComodity: number | null
  markingComodityType: number | null
  markingComodities: MarkingComodityItem[]
  fdTglAgent: string | null
  expectedMode: string | null
  expectedBranch: string | null
  priceValidation: {
    fdTglAgent: string | null
    effectiveDate: string | null
    masterEffectiveDate: string | null
    customerEffectiveDate: string | null
    hasCustomerPriceList: boolean
    isMarkingOverride?: boolean
    matchedMarkingCode?: string | null
    expectedMode: string | null
    expectedBranch: string | null
    items: any[]
  }
  customer: CustomerInfo
  isCodOrUrgent: boolean
  recommendedM3: number
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
  totalJmlBeratSJ: number | null
  totalBeratPerMarking: number | null
  markingDetails: MarkingDetailItem[]
  fdVFCGudang: number | null
  fdVFCPL: number | null
  fdVFCKomplain: number | null
  vfcGudangPerMarking: number | null
  vfcKomplainPerMarking: number | null
  minChargeKg: number
  profileHarga: ProfileHargaItem | null
  comodityTypes: ComodityTypeOption[]
  freightChargeSummary?: {
    totalFc: number
    listsWithFcCount: number
    currency: string
  } | null
}
