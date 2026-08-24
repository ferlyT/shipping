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
  details?: BillingDetail[]
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
  listNo?: string
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

export type GroupKey = 'all' | 'partial' | 'fcl' | 'cod' | 'urgent' | 'aging'
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

