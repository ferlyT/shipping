export interface BillingCustomer {
  fdCustName: string | null
  fdBlocked?: number | null
  fdContact?: string | null
  fdBillTo?: string | null
  fdBillAddr1?: string | null
  fdSalesNM?: string | null
  fdSalesCode?: string | null
  fdBroker?: number | null
  fdEmpName?: string | null
  fdEmpCode?: string | null
  fdCollector?: string | null
}

export interface BillingEmployee {
  fdEmpName: string | null
}

/**
 * Timeline siklus kargo — 8 milestone kronologis proses logistik
 */
export interface BillingTimeline {
  fdTglAgent: string | null    // Diterima Agen
  fdLoadDate: string | null    // Loading
  fdETD: string | null         // ETD
  fdETA: string | null         // ETA
  fdTgl_IN: string | null      // Masuk Gudang
  fdGudang: string | null      // Nama gudang masuk / sortir (tbMarking.fdGudang)
  fdSjDate: string | null      // Surat Jalan
  fdSndDate: string | null     // Dikirim (MAX)
  fdGiveDate: string | null    // Diserahkan
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
  fdBranchCode?: string | null
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
  fdBillTo?: string | null
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
  attachmentCount?: number
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
  isSjSent?: boolean
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
  billTo?: string
  consignee?: string
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

export interface CustomerHargaTariffItem {
  colName: string
  branchCode: string
  branchName: string
  mode: 'BY SEA' | 'BY AIR'
  serviceType: string
  commodityType: string
  displayName: string
  hargaAwal: number
  hargaAktif: number
  isEdited: boolean
  auditInfo?: {
    auditId: string
    oldValue: string | null
    newValue: string | null
    updatedBy: string
    updateDate: string
  } | null
}

export interface CustomerHargaMetadata {
  penawaran: string | null
  rasioLr: number | null
  rasioSp: number | null
  rasioPm: number | null
  typeTagihan: number | null
  typeTagihanLabel: string | null
  noteUdara: string | null
  noteLaut: string | null
  asuransi: number | null
  asuransi1: number | null
  lastUpdateBy: string | null
  lastUpdateDate: string | null
}

export interface CustomerHargaDetailResult {
  custCode: string
  custName: string
  metadata: CustomerHargaMetadata
  tariffs: CustomerHargaTariffItem[]
  branches: {
    code: string
    name: string
    count: number
  }[]
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
    fdUpdate?: string | null
    fdUpdateDate?: string | Date | null
    fdUpdateSource?: 'AUDIT' | 'CUSTOMER_HARGA' | null
    fdNoteAir?: string | null
    fdNote1Sea?: string | null
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

export type GroupKey = 'all' | 'sj_sent' | 'partial' | 'fcl' | 'cod' | 'urgent' | 'aging' | 'no_type'
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
  billUdara?: number
  tagihanUdara?: number
  billLaut?: number
  tagihanLaut?: number
  // YoY (Year-over-Year perbandingan tahun lalu)
  prevYearLabel?: string
  prevTotalBill?: number
  prevTotalTagihan?: number
  prevBillUdara?: number
  prevTagihanUdara?: number
  prevBillLaut?: number
  prevTagihanLaut?: number
  totalBillYoYPct?: number
  totalTagihanYoYPct?: number
  billUdaraYoYPct?: number
  tagihanUdaraYoYPct?: number
  billLautYoYPct?: number
  tagihanLautYoYPct?: number
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

export interface BranchBillingMetrics {
  branchCode: string
  branchName: string
  totalInvoices: number
  totalTagihan: number
  invoicesUdara: number
  tagihanUdara: number
  invoicesLaut: number
  tagihanLaut: number
  avgInvoiceValue: number
  uniqueCustomers: number
  shareOfTotal?: number
}

export interface BranchBillingComparison {
  branchCode: string
  branchName: string
  current: BranchBillingMetrics
  prev?: BranchBillingMetrics
  lastYear?: BranchBillingMetrics
  momTagihanDiff: number
  momTagihanPercent: number
  yoyTagihanDiff: number
  yoyTagihanPercent: number
  momInvoicesDiff: number
  momInvoicesPercent: number
  yoyInvoicesDiff: number
  yoyInvoicesPercent: number
  shareOfTotal: number
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
  branches?: BranchBillingMetrics[]
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
  byBranch?: BranchBillingComparison[]
}

export interface UnissuedBillsAgingSummary {
  le7: { count: number; nominal: number }
  d8to14: { count: number; nominal: number }
  d15to30: { count: number; nominal: number }
  gt30: { count: number; nominal: number }
}

export interface UnissuedBillsSummary {
  totalCount: number
  totalNominal: number
  countUdara: number
  nominalUdara: number
  countLaut: number
  nominalLaut: number
  aging: UnissuedBillsAgingSummary
}

export interface UnissuedBillItem {
  invNo: string
  invDate: string | null
  custCode: string
  custName: string
  listType: number
  mode: 'udara' | 'laut'
  markingCode: string
  markingNo: string
  jumlah1: number
  jumlahTotal: number
  empCode: string
  empName: string
  branchCode: string
  agingDays: number
  agingGroup: 'le7' | '8to14' | '15to30' | 'gt30'
}

export interface UnissuedBillsResponse {
  summary: UnissuedBillsSummary
  filteredCount: number
  filteredNominal: number
  items: UnissuedBillItem[]
}

export interface BillingKpis {
  totalInvoices: number
  totalTagihan: number
  invoicesBulanIni: number
  invoicesBulanIniBreakdown?: {
    udara: number
    laut: number
  }
  tagihanBulanIni: number
  tagihanBulanIniBreakdown?: {
    udara: number
    laut: number
  }
  trend: {
    invoicesBulanIni: Trend
    tagihanBulanIni: Trend
  }
  currentMonth?: PeriodBillingMetrics
  prevMonth?: PeriodBillingMetrics
  lastYearSameMonth?: PeriodBillingMetrics
  comparisons?: BillingComparisons
  targetBillUdara?: {
    total: number
    breakdown?: { kiki: number; yati: number }
    categories?: {
      sjSent: number
      codUrgent: number
      agingGt7: number
      fcl: number
    }
  }
  targetBillLaut?: {
    total: number
    breakdown?: { thara: number; rico: number; ferly: number }
    categories?: {
      sjSent: number
      codUrgent: number
      agingGt7: number
      fcl: number
    }
  }
  unissuedBills?: UnissuedBillsSummary
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
  pic?: string
  listType?: string
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

export interface BatchExitBranchMetric {
  branchCode: string
  branchName: string
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  airBatches: number
  airKargo: number
  airBilled: number
  airUnbilled: number
  seaBatches: number
  seaKargo: number
  seaBilled: number
  seaUnbilled: number
}

export interface CustomerStatusMetric {
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
}

export interface BatchCustomerStatusCounts {
  blocked: number
  warning: number
  urgent: number
  cod: number
  ok: number
  noStatus: number
  unbilledBlocked: number
  unbilledWarning: number
  unbilledUrgent: number
  unbilledCod: number
}

export interface BatchExitComparisonSummary {
  totalBatches: number
  fullyBilledBatches: number
  pendingBatches: number
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  air: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  sea: {
    totalBatches: number
    totalKargo: number
    totalBilled: number
    totalUnbilled: number
    billedPercentage: number
  }
  byBranch: BatchExitBranchMetric[]
  byCustomerStatus: {
    blocked: CustomerStatusMetric
    warning: CustomerStatusMetric
    urgent: CustomerStatusMetric
    cod: CustomerStatusMetric
    ok: CustomerStatusMetric
    noStatus: CustomerStatusMetric
  }
}

export interface BatchExitItem {
  markingCode: string
  exitDate: string | null
  listType: number // 1: Udara, 2: Laut
  branchCode: string
  branchName: string
  totalKargo: number
  totalBilled: number
  totalUnbilled: number
  billedPercentage: number
  isFullyBilled: boolean
  customerStatus: BatchCustomerStatusCounts
}

export interface BatchExitCargoItem {
  listCode: string
  markingCode: string
  custCode: string
  custName: string
  custStatus: number
  custStatusLabel: string
  isBroker: boolean
  coly: number
  satuan: string
  m3: number
  berat: number
  isBilled: boolean
  sjNo: string | null
  isSent: boolean
}

export interface BatchExitComparisonResponse {
  summary: BatchExitComparisonSummary
  batches: BatchExitItem[]
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
  fdTypeComodity?: number | null
  typeComodityName?: string | null
  changeStatus?: 'UNCHANGED' | 'UPDATE' | 'INSERT' | 'DELETE'
  hasAdjustment?: boolean
  fdBerat?: number | null
  fdM3?: number | null
  fdSatuan?: string | null
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
  fdBranchCode: string | null
  fdBranchName?: string | null
  fdMarkingCode: string | null
  fdMarkingNo: string | null
  fdListCode: string | null
  fdListType: number | null
  fdTglAgent: string | null
  fdTerima?: string | null
  fdTypeComodity: number | null
  fdTypeComodityName: string | null
  fdConsignee: string | null
  hasPrevDiff?: boolean
  prevDiffCount?: number
  prevItemCount?: number
  moda: 'Udara' | 'Laut' | 'Unknown'
  fdDescr: string
  commodities: string[]
  fdJumlah1: number
  fdJumlah2: number
  fdCurr1: string | null
  totalAmount: number
  fdTotalInv?: number | null
  fdBerat?: number | null
  fdM3?: number | null
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

export interface CommodityAvgRate {
  typeComodityName: string
  totalAmount: number
  totalM3: number
  avgPricePerM3: number
  invoiceCount: number
  itemCount: number
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
    commodityAvgRates?: CommodityAvgRate[]
  }
  pagination?: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
  }
  filterOptions?: {
    branches: Array<{ code: string; name: string }>
    typeComodities: string[]
    years: number[]
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

// ─── PAIRING LOCAL CHARGE MODULE ───────────────────────────────────

export type PairingValidationStatus =
  | 'COCOK'
  | 'SELISIH'
  | 'BILL_BELUM_ADA'
  | 'BELUM_EXIT'
  | 'SUDAH_EXIT'
  | 'TIDAK_DITEMUKAN'

export interface OperationalStatus {
  statusLabel: string
  markingCode: string
  exitDate: string | null
  eta: string | null
  etd: string | null
  loadDate: string | null
  gudang: string | null
  batchStatus?: number | string | null
  sjNo?: string | null
  sjDate?: string | null
  sjStatus?: string | null
  sent?: number | null
  kembali?: string | null
  supir?: string | null
  penerima?: string | null
}

export interface ParsedShippingMark {
  markingCode: string
  markingNo: string
}

export interface PairingLocalChargeRow {
  rowIndex: number
  date: string
  receiptNo: string
  receiptNosParsed: string[]
  customer: string
  from: string
  ctn: string | number
  kg: string | number
  cbm: string | number
  charge: number
  chargeRaw: string
  shippingMark: string
  shippingMarksParsed: ParsedShippingMark[]
  matchedBy: 'SHIPPING_MARK' | 'RECEIPT_NO' | 'NONE'
  entryList?: {
    listCode: string
    markingCode: string
    markingCodeAsal: string
    markingNo: string
    terima: string
    fc: number
    invoiceNo: string
  } | null
  invNo: string | null
  invNos?: string[]
  chargeDb: number
  diffCharge: number
  chargeItemName: string | null
  chargeItemCurr: string | null
  validationStatus: PairingValidationStatus
  validationNote: string
  operationalInfo?: OperationalStatus | null
}

export interface PairingLocalChargeSummary {
  totalRows: number
  totalCocok: number
  totalSelisih: number
  totalBillBelumAda: number
  totalBelumExit: number
  totalSudahExit: number
  totalTidakDitemukan: number
  totalChargeExcel: number
  totalChargeDb: number
  totalDiffCharge: number
}

export interface PairingLocalChargeResult {
  fileName?: string
  uploadedAt: string
  summary: PairingLocalChargeSummary
  rows: PairingLocalChargeRow[]
}

export interface ComodityType {
  fdID: number
  fdTypeComodity: number | null
  fdComodityName: string
  fdListType: number | null
}

export interface PriceItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  category: string
  price: number
  effectiveDate?: string | null
  endDate?: string | null
  isExpired?: boolean
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

export interface M3CheckResponse {
  fdListCode: string
  fdListType?: number | null
  defaultFdTypeComodity?: number | null
  entryListTypeComodity?: number | null
  entryListComodityName?: string | null
  markingComodityType?: number | null
  markingComodities?: { fdTypeComodity: number | null; fdComodity: string | null; fdComodityName?: string | null; directPrice?: number | null }[]
  commodityMappings?: {
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
  }[]
  fdTglAgent?: string | null
  expectedMode?: string | null
  expectedBranch?: string | null
  priceValidation?: {
    fdTglAgent: string | null
    effectiveDate: string | null
    masterEffectiveDate?: string | null
    customerEffectiveDate?: string | null
    customerEndDate?: string | null
    isCustomerPriceExpired?: boolean
    isCustomerPriceExpiringSoon?: boolean
    hasCustomerPriceList?: boolean
    isMarkingOverride?: boolean
    matchedMarkingCode?: string | null
    expectedMode?: string | null
    expectedBranch?: string | null
    items: PriceItem[]
  } | null
  customer?: {
    fdListCode: string
    fdMarkingCode: string | null
    fdCustCode: string | null
    fdCustName: string | null
    fdBlocked: number
    fdSalesNM?: string | null
    fdBroker?: number
  } | null
  isCodOrUrgent: boolean
  recommendedM3: number
  recommendedM3Source?: 'KOMPLAIN' | 'HYBRID' | 'MAX' | 'GUDANG' | 'PL'
  hasApprovedKomplain?: boolean
  isFullKomplainQtyMatch?: boolean
  isKomplainRejected?: boolean
  komplainRejectedReason?: string | null
  m3PackingList: { raw: any[]; values: number[]; qty?: number | null }
  m3Gudang: { raw: any[]; values: number[]; qty?: number | null }
  m3CustPerMarking: { raw: any[]; values: number[]; totalEntryList?: number | null }
  m3PLPerMarking?: { raw: any[]; values: number[]; totalEntryList?: number | null }
  m3Komplain: { raw: any[]; values: number[]; qty?: number | null }
  m3KomplainPerMarking: { raw: any[]; values: number[]; totalEntryKomplain?: number | null }
  m3ListBatch?: { raw: any[]; values: number[]; qty?: number | null }
  fdQtyList?: number | null
  fdTotalQtyPL?: number | null
  fdTotalQtyGudang?: number | null
  fdTotalQtyKomplain?: number | null
  totalEntryKomplain?: number | null
  totalEntryList?: number | null
  isPartialKomplain?: boolean
  m3KomplainPlusGudang?: number | null
  countKomplainLC?: number
  countGudangLC?: number
  fdSatuan?: string | null
  fdBeratList?: number | null
  fdJmlBeratGudang?: number | null
  fdJmlBeratKomplain?: number | null
  fdBeratSJ?: number | null
  totalJmlBeratSJ?: number | null
  totalBeratPerMarking?: number | null
  markingDetails?: MarkingDetailItem[]
  fdVFCGudang?: number | null
  fdVFCPL?: number | null
  fdVFCKomplain?: number | null
  vfcGudangPerMarking?: number | null
  vfcKomplainPerMarking?: number | null
  freightChargeSummary?: {
    totalFc: number
    listsWithFcCount: number
    currency: string
  } | null
  minChargeKg?: number | null
  minChargeM3?: number | null
  profileHarga?: {
    fdListCode: string
    fdCustCode: string
    harga: number
    rasio: number
    typeTagihan: number
    kg: number
    taxReturnPrice: number
    taxReturnMinCharge: number
    minChargeM3?: number
    minChargeKg?: number
    fdUpdate?: string | null
    fdUpdateDate?: string | Date | null
    fdUpdateSource?: 'AUDIT' | 'CUSTOMER_HARGA' | null
    fdNoteAir?: string | null
    fdNote1Sea?: string | null
  } | null
  comodityTypes?: ComodityType[]
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

export interface FlatDetailTraceItem {
  id: string
  invNo: string
  invDate: string
  branchCode: string | null
  branchName?: string | null
  tglAgent: string | null
  typeComodityName: string | null
  itemName: string | null
  satuan: string | null
  qty: number
  itemPrice: number
  total: number
  curr: string | null
  markingCode: string | null
  markingNo: string | null
  listCode: string | null
  berat: number
  m3: number
}

export interface DimensionItem {
  fdListCode: string
  fdListDCode: string
  fdDescr: string
  fdPjg: number
  fdLbr: number
  fdTng: number
  fdQty: number
  fdM3: number
  fdMarkingCode?: string
  fdComodity?: string
  fdLoad?: string | null
}

export interface DimensionGroup {
  items: DimensionItem[]
  totalQty: number
  totalM3: number
  count: number
}

export interface BillingDimensionsResponse {
  listCode: string
  entryList: DimensionGroup
  packingList: DimensionGroup
  komplain: DimensionGroup
}

export interface BillingAttachment {
  fdId: number
  fdInvNo: string
  fdFileName: string
  fdFileSavedName: string
  fdFileType: string
  fdFileSize: number
  fdFileUrl: string
  fdCaption?: string | null
  fdUploadedBy: string
  fdCreatedAt: string
}

export interface OmsetVolumeItem {
  fdCustCode: string
  fdCustName: string
  fdSalesNM: string
  metrics: Record<string, {
    m3: number
    kgLaut: number
    kgUdara: number
    totalFcl: number
    fdJumlah: number
  }>
  totalM3: number
  totalKgLaut: number
  totalKgUdara: number
  totalFcl: number
  totalOmset: number
}

export interface OmsetVolumeReportResponse {
  years: number[]
  data: OmsetVolumeItem[]
  summary: {
    totalCustomers: number
    metricsPerYear: Record<string, {
      m3: number
      kgLaut: number
      kgUdara: number
      totalFcl: number
      fdJumlah: number
    }>
    grandTotalM3: number
    grandTotalKgLaut: number
    grandTotalKgUdara: number
    grandTotalFcl: number
    grandTotalOmset: number
  }
}

export interface CargoResiDetail {
  fdListCode: string
  fdTerima?: string | null
  fdMarkingCode: string
  fdBranchCode: string
  fdTahun: number
  fdListType: number // 1: Udara, 2: Laut
  fdTypeComodity: number
  fdComodityName: string
  fdInvNo: string | null
  calculatedM3: number
  calculatedBeratUdara: number
  calculatedBeratLaut: number
  sourceM3: 'BILLING' | 'GUDANG' | 'PACKING_LIST' | 'ENTRY_LIST' | 'NONE'
}

export interface CargoCustomerSummary {
  fdCustCode: string
  fdCustName: string
  fdSalesNM: string
  totalResi: number
  totalM3: number
  totalBeratUdara: number
  totalBeratLaut: number
  resiDetails?: CargoResiDetail[]
}

export interface CargoVolumeFilterMeta {
  branches: Array<{ code: string; name: string }>
  commodities: Array<{ id: number; name: string; listType: number }>
  availableYears: number[]
}

export interface CargoVolumeReportResponse {
  meta: CargoVolumeFilterMeta
  years: number[]
  data: CargoCustomerSummary[]
  summary: {
    totalCustomers: number
    totalResi: number
    grandTotalM3: number
    grandTotalBeratUdara: number
    grandTotalBeratLaut: number
  }
}
