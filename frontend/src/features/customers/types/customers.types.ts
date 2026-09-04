export interface CustomerAddress {
  fdID: string
  fdJenis: string
  fdContact: string
  fdHP: string
  fdTelp: string
  fdEmail: string
  fdAddr: string
  fdCity: string
  fdAktif: number
}

export type CustomerTierKey = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'none'

export interface CustomerYearlyFinancialStats {
  year: number
  totalRevenue: number
  totalInvoices: number
  adjustedInvoices: number
  tier: CustomerTierKey
  nextTier?: CustomerTierKey
  nextMin?: number
  remainingForNextTier?: number
  progressToNextTier?: number
}

export interface Customer {
  fdCustCode: string
  fdCustName: string
  fdContact: string
  fdAddr1: string
  fdCityName: string
  fdTelp: string
  fdHP: string
  fdFax: string
  fdEmail: string
  fdSalesNM: string
  fdCreatedDate: string | null
  fdBroker: number
  fdBlocked: number
  fdDiscontinued: number
  fdKeterangan: string
  fdNamaPengiriman: string
  fdHpPengiriman: string
  fdAlamatPengiriman: string
  fdKetPengiriman: string
  fdKotaPengiriman: string
  fdHpPenagihan: string
  fdEmailPenagihan: string
  fdNotifPenagihan: number
  fdKeteranganPenagihan: string
  addresses?: CustomerAddress[]
  // Tier & Financial metrics
  tier?: CustomerTierKey
  annualRevenue?: number
  totalInvoices?: number
  currentTier?: CustomerTierKey
  financialStats?: CustomerYearlyFinancialStats[]
}

export type CustomerStatusKey = 0 | 1 | 2 | 3 | 4 | 5

export type CustomerGroupKey =
  | 'all'
  | 'broker'
  | 'direct'
  | 'cod'
  | 'warning'
  | 'blocked'
  | 'urgent'
  | 'ok'
  | 'no_status'
  | 'diamond'
  | 'platinum'
  | 'gold'
  | 'silver'
  | 'bronze'

export interface CustomerGroupCounts {
  all: number
  broker: number
  direct: number
  cod: number
  warning: number
  blocked: number
  urgent: number
  ok: number
  no_status: number
  diamond?: number
  platinum?: number
  gold?: number
  silver?: number
  bronze?: number
}

export interface CustomerSalesItem {
  name: string
  count: number
}
