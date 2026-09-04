export interface PriceCheckParams {
  listCode?: string
  markingCode?: string
  markingNo?: string
  custCode?: string
  customer?: string
  branch?: string
  mode?: string // 'udara' | 'laut' | 'BY AIR' | 'BY SEA'
  type?: string
  comodity?: string
  sales?: string
  harga?: number
  targetDate?: Date | string
}

export type PriceStatus = 'MATCH' | 'DIFFERENT' | 'NOT_SET' | 'NO_RATE'

export type PriceSourceType =
  | 'CUSTOMER_MARKING'       // Level 1: Customer Marking Override
  | 'CUSTOMER_DEFAULT'       // Level 2: Customer Default Upload
  | 'CUSTOMER_TARIFF'        // Level 2: Customer Tariff dari vwCustomersHarga
  | 'MASTER_MKT_OVERRIDE'    // Level 3: Master Marking Override (Sheet MKT)
  | 'MASTER_CS_OVERRIDE'     // Level 3: Master Marking Override (Sheet CS)
  | 'MASTER_MKT'             // Level 4: Master Standar (Sheet MKT)
  | 'MASTER_CS'              // Level 4: Master Standar (Sheet CS)
  | 'PROFILE_SP'             // Fallback: SP Profile ERP
  | 'NONE'

export interface UnifiedPriceCheckResult {
  currentPrice: number
  dbPrice: number
  difference: number
  status: PriceStatus
  statusLabel: string
  statusDescription: string
  appliedTier: string
  appliedTierLabel: string
  priceSource: string
  priceSourceLabel: string
  matchedWith: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'PROFILE_SP' | 'NONE'
  isBroker: boolean
  isMarkingOverride: boolean
  matchedMarkingCode?: string
  priceCS: number | null
  priceMKT: number | null
  effectiveDate: string | null
  matchedCategory: string
  resolvedCommodity: string
  isCommodityOverride?: boolean
  commodityOverrideDetail?: string
  customerPriceList?: any
  masterPriceList?: any
  listCode?: string
  mode?: 'UDARA' | 'LAUT'
  customerTariffs?: any[]
  matchedTariff?: any
  profileTariff?: any
}

export interface BatchPreloadedContext {
  allMasterUploads: any[]
  allCustUploads: any[]
  activeMappings: any[]
  markingInfoMap: Map<string, { branch: string | null; listType: number | null; loadDate: Date | null }>
  customerBrokerMap: Map<string, number>
}
