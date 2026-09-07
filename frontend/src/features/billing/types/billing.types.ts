export interface BillingCustomer {
  fdCustName: string | null
  fdBlocked?: number | null
  fdContact?: string | null
  fdBillTo?: string | null
  fdBillAddr1?: string | null
  fdSalesNM?: string | null
  fdBroker?: number | null
}

export interface BillingEmployee {
  fdEmpName: string | null
}

export interface BillingDetail {
  fdInvNo: string
  fdID: string
  fdItemName: string
  fdQty: number
  fdListCode: string | null
  fdItemPrice: number
  fdTotal: number
  fdCurr: string | null
  fdTypeComodity?: number | null
  fdComodity?: string | null
  fdSatuan?: string | null
  fdItemCode?: string | null
}

export interface BillingDetailInput {
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

export interface Billing {
  fdInvNo: string
  fdInvDate: string
  fdListType?: number | null
  fdCustCode: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdDescr: string
  fdJumlah1: number | null
  fdJumlah2?: number | null
  fdCurr1: string | null
  fdTypeBilling?: number | null
  fdGive?: number | null
  fdGive2?: number | null
  fdGiveDate?: string | null
  fdCekDate?: string | null
  fdListCode?: string | null
  fdTypeComodity?: number | null
  customer?: BillingCustomer | null
  employee?: BillingEmployee | null
  giveEmployee?: { fdEmpId: string | null; fdEmpName: string | null } | null
  resiSummary?: {
    isPartial: boolean
    totalResi: number
    resiList: string[]
    primaryResi?: string | null
  } | null
  details?: BillingDetail[]
  fdTglAgent?: string | null
  fdConsignee?: string | null
  fdComodity?: string | null
  fdTypeComodityName?: string | null
  isPaid?: boolean
  paymentStatus?: 'LUNAS' | 'SEBAGIAN' | 'BELUM LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT'
  cashierID?: string | null
  cashierDate?: string | null
  totalPaid?: number
  cashierDetails?: {
    fdCashierID: string | null
    fdDate: string | null
    fdType: string | null
    fdCCYCode: string | null
    fdAmount: number
    fdTotal: number
  }[]
  totalJumlah?: number
  totalBayar?: number
  sisaBayar?: number
  totals?: {
    fdJumlah: number | null
    fdBayar: number | null
    fdSLunas: number | null
    fdFinish: string | null
  }[]
}

export interface TargetBillingItem {
  hari: number
  pic: string
  customer: string
  branch: string
  sales: string
  markingCode: string
  markingNo: string
  status: string
  jmlPack: number
  satuan: string
  berat: number
  m3List: number
  m3Gudang: number
  type: string
  taxReturn: number
  comodity: string
  tglAgen: string | null
  exitDate: string | null
  statusKirim: string
  harga: number
  hargaDb?: number
  diffAmount?: number
  priceSourceType?: string
  matchedTier?: string
  priceStatus?: 'MATCH' | 'DIFFERENT' | 'NOT_SET' | 'NO_RATE'
  comodityNameDb?: string
  updateBy: string
  updateDate: string | null
  isPartial?: boolean
  countTerima?: number
  fdLoad?: string | null
  m3Komplain?: number
  vfcKomplain?: number
  totalQtyKomplain?: number
  totalQtyGudang?: number
  jmlBeratKomplain?: number
  validasiMismatch?: boolean
  isBroker?: boolean
  isCommodityOverride?: boolean
  commodityOverrideDetail?: string
  matchedCategory?: string
  custCode?: string
  listNo?: string
  listCode?: string
  createdDate?: string | null
  qty?: number
  qtyPL?: number
  m3?: number
  m3PL?: number
  m3Real?: number
  hargaM3?: number
  totalBiaya?: number
}

export interface CustomerTariffItem {
  custCode: string
  custName: string
  branchName: string
  listType: number
  jenis: string
  typeComodity: number
  comodityName: string
  harga: number
  updateBy: string
  updateDate: string | null
}

export interface TargetPriceCheckData {
  listCode?: string
  markingCode: string
  markingNo: string
  customer: string
  custCode: string
  sales: string
  isBroker?: boolean
  matchedWith?: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'PROFILE_SP' | 'NONE'
  appliedTierLabel?: string
  branch: string
  mode: string
  listType: number
  currentType: string
  currentComodityText: string
  tglAgen: string | null
  effectiveDate: string | null
  priceSource: 'CUSTOMER_TARIFF' | 'PRICE_LIST_CS' | 'PRICE_LIST_MKT' | 'PROFILE_SP'
  priceSourceLabel: string
  priceCS: number | null
  priceMKT: number | null
  currentPrice: number
  dbPrice: number
  difference: number
  status: 'MATCH' | 'DIFFERENT' | 'NOT_SET' | 'NO_RATE'
  statusLabel: string
  statusDescription: string
  matchedCategory?: string
  isCommodityOverride?: boolean
  commodityOverrideDetail?: string
  matchedTariff: CustomerTariffItem | null
  profileHarga?: {
    harga: number
    rasio: number
    typeTagihan: number
    kg: number
    minChargeM3: number
    minChargeKg: number
    taxReturnPrice: number
    taxReturnMinCharge: number
  } | null
  customerTariffs: CustomerTariffItem[]
  customerPriceList?: {
    effectiveDate: string | null
    branch?: string | null
    mode?: string | null
    notes?: string | null
    items: { id: number; mode: string; branch: string; category: string; price: number }[]
  } | null
  masterPriceList?: {
    effectiveDate: string | null
    items: { id: number; mode: string; branch: string; category: string; price: number }[]
  } | null
}

export type GroupKey = 'all' | 'partial' | 'fcl' | 'cod' | 'urgent' | 'aging' | 'no_type'
export type PicKey = 'all' | 'yati' | 'kiki' | 'thara' | 'ferly' | 'rico'

export interface BillingByEmployeeDailySeries {
  key: string
  name: string
}

export interface BillingByEmployeeDailyPoint {
  date: string
  label: string
  [seriesKey: string]: string | number
}

export interface BillingByEmployeeDaily {
  data: BillingByEmployeeDailyPoint[]
  series: BillingByEmployeeDailySeries[]
}

export interface BillingTrendPoint {
  label: string
  totalBill: number
  totalTagihan: number
}

export interface BillingDailyPoint extends BillingTrendPoint {
  date: string
}

export interface BillingTrends {
  daily: BillingDailyPoint[]
  monthly: BillingTrendPoint[]
}

export interface Trend {
  value: number
  direction: 'up' | 'down' | 'flat'
}

export interface BillingKpis {
  totalInvoices: number
  totalTagihan: number
  invoicesBulanIni: number
  tagihanBulanIni: number
  trend: {
    invoicesBulanIni: Trend
    tagihanBulanIni: Trend
  }
}

export interface SjVsBillPoint {
  date: string
  label: string
  sj_thara: number
  bill_thara: number
  sj_yatiKiki: number
  bill_yatiKiki: number
  sj_ferly: number
  bill_ferly: number
  sj_rico: number
  bill_rico: number
  [key: string]: string | number
}

export interface UnbilledSjDetailItem {
  sjNo: string
  sjDate: string | null
  kembaliDate: string | null
  custCode: string
  custName: string
  listCode: string
  markingCode: string
  branchName: string
  descr: string
}

export interface SurplusBillDetailItem {
  invNo: string
  invDate: string | null
  custCode: string
  custName: string
  listCode: string
  markingCode: string
  totalAmount: number
  descr: string
}

export interface CustMarkingDetailItem {
  fdListCode: string
  fdMarkingCode: string
  fdCustCode: string
  custName?: string
  fdJmlPack?: number
  fdSatuan?: string
  fdJmlBerat?: number
  fdM3?: number
  fdM3Gudang?: number
  fdM3Komplain?: number
  fdM3List?: number
}

export interface PartialDetailItem {
  listCode: string
  markingCode: string
  markingNo: string
  custCode: string
  customer: string
  fdEmp1?: string
  fdLoad: string | null
  fdTerima: string
  invNo: string
  jmlPack: number
  satuan: string
  m3: number
  berat: number
  desc: string
}

export interface CustomerTariffAudit {
  fdAuditID: string | number
  fdCustCode: string
  fdAction: 'INSERT' | 'UPDATE' | 'DELETE' | string
  fdColumnName: string
  mapping?: {
    branchCode?: string | null
    branchName?: string | null
    mode?: 'BY SEA' | 'BY AIR' | null
    serviceType?: string | null
    commodityType?: string | null
    displayName: string
    isCurrency: boolean
  }
  fdOldValue: string | null
  fdNewValue: string | null
  fdUpdatedBy: string
  fdUpdateDate: string
  fdHostName?: string | null
  fdIPAddress?: string | null
  fdAppName?: string | null
  fdTransactionID?: string | null
}

export interface FreightChargeItem {
  fdListCode: string
  fdCustCode: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdInvoiceNo: string
  fdContainerNo: string
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdFc: number
  fdCurrFc: string
  fdFcCurr: number
  fdComodity: string
  fdTrackingNo: string
  fdKeteranganSJ: string
  fdListDate: string | null
  fdTgl_IN: string | null
  fdCreatedDate: string | null
}

export interface FreightChargeCurrencySummary {
  currency: string
  totalFc: number
  totalColly: number
  totalBerat: number
  totalM3: number
  count: number
}

export interface FreightChargeResponse {
  custCode: string
  markingCode: string
  totalLists: number
  listsWithFcCount: number
  totalColly: number
  totalBerat: number
  totalM3: number
  currencySummaries: FreightChargeCurrencySummary[]
  items: FreightChargeItem[]
}

export interface CustomerBillingHistoryDetail {
  fdID: string
  fdItemName: string | null
  prevItemName?: string | null
  fdQty: number | null
  prevQty?: number | null
  fdItemPrice: number | null
  prevItemPrice?: number | null
  fdTotal: number | null
  prevTotal?: number | null
  fdCurr: string | null
  prevCurr?: string | null
  fdListCode: string | null
  fdComodity?: string | null
  changeStatus?: 'UNCHANGED' | 'UPDATE' | 'INSERT' | 'DELETE'
  hasAdjustment?: boolean
  diffs?: {
    itemName?: { old: string | null; new: string | null }
    qty?: { old: number | null; new: number | null }
    price?: { old: number | null; new: number | null }
    total?: { old: number | null; new: number | null }
    curr?: { old: string | null; new: string | null }
  }
}

export interface CustomerBillingHistoryTotal {
  fdID: string
  fdCCYCode: string | null
  fdJumlah: number | null
  fdBayar: number | null
  fdSLunas: number | null
}

export interface CustomerBillingHistoryItem {
  fdInvNo: string
  fdInvDate: string
  fdCustCode: string
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListCode: string | null
  fdListType: number | null
  moda: 'Udara' | 'Laut' | 'Unknown'
  fdDescr: string
  commodities: string[]
  fdJumlah1: number
  fdJumlah2: number
  fdCurr1: string | null
  totalAmount: number
  fdEmpCode: string | null
  empName: string | null
  isIssued: boolean
  paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'ISSUED' | 'DRAFT'
  ageDays: number
  isOverdue: boolean
  totalBayar: number
  sisaBayar: number
  fdGive: number | null
  fdGive2: number | null
  fdGiveDate: string | null
  fdCekDate: string | null
  fdCekBy: string | null
  detailsCount: number
  details?: CustomerBillingHistoryDetail[]
  totals: CustomerBillingHistoryTotal[]
}

export interface CustomerBillingHistoryResponse {
  customer: {
    fdCustCode: string
    fdCustName: string | null
    fdSalesNM: string | null
    fdBroker: number | null
  } | null
  summary: {
    totalInvoices: number
    totalAmountIdr: number
    totalAirInvoices: number
    totalSeaInvoices: number
    issuedCount: number
    draftCount: number
    lunasCount: number
    partialCount: number
    overdueCount: number
    unpaidCount: number
    issuedRecentCount: number
    latestInvoiceDate: string | null
    earliestInvoiceDate: string | null
    yearsAvailable: number[]
  }
  items: CustomerBillingHistoryItem[]
}

export interface BillResiRecord {
  fdListCode: string
  fdCustCode: string
  fdCustName: string
  fdMarkingCode: string
  fdMarkingNo: string
  fdInvoiceNo: string
  isCurrentBill: boolean
  isCurrentMarking: boolean
  isSameCustomer: boolean
  fdListDate: string | null
  fdJmlPack: number
  fdSatuan: string
  fdJmlBerat: number
  fdM3: number
  fdComodity: string
  fdAWB?: string | null
  fdEtd?: string | null
  fdExitDate?: string | null
}

export interface BillResiItem {
  fdTerima: string
  isPartial: boolean
  isCrossMarking: boolean
  markingCodes: string[]
  totalRecords: number
  totalColly: number
  totalBerat: number
  totalM3: number
  records: BillResiRecord[]
}

export interface BillResiCheckResponse {
  invNo: string
  custCode: string
  custName: string
  markingCode: string
  markingNo: string
  summary: {
    totalResi: number
    isPartial: boolean
    partialCount: number
    crossMarkingCount: number
    totalColly: number
    totalBerat: number
    totalM3: number
  }
  resiList: BillResiItem[]
}
