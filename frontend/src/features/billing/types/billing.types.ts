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

