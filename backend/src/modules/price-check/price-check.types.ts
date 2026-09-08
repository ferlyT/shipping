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
  | 'CUSTOMER_COMMODITY'     // Tier 1: Harga Customer Commodity (Manual Entry / Mapping Customer)
  | 'CUSTOMER_MARKING'       // Tier 2: Customer Marking Override
  | 'CUSTOMER_DEFAULT'       // Tier 3: Customer Default Upload
  | 'GLOBAL_COMMODITY'       // Tier 4: Harga Commodity Global (Global Mapping / Special Commodity Master)
  | 'GLOBAL_MARKING'         // Tier 5: Master Marking Override
  | 'MASTER_MKT_OVERRIDE'    // Tier 5: Master Marking Override (Sheet MKT)
  | 'MASTER_CS_OVERRIDE'     // Tier 5: Master Marking Override (Sheet CS)
  | 'MASTER_MKT'             // Tier 6: Master Standar (Sheet MKT)
  | 'MASTER_CS'              // Tier 6: Master Standar (Sheet CS)
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
  matchedWith: 'CUSTOMER' | 'MASTER_CS' | 'MASTER_MKT' | 'NONE'
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
  isUndercharge?: boolean
  isOvercharge?: boolean
  validationVerdict?: 'MATCH' | 'UNDERCHARGE_WARNING' | 'OVERCHARGE_WARNING' | 'NO_RATE'
  currentType?: string
  currentComodityText?: string
  sales?: string
  branch?: string
  markingCode?: string
  customer?: string
  custCode?: string
  tglAgen?: string | null
}

export interface BatchPreloadedContext {
  allMasterUploads: any[]
  allCustUploads: any[]
  activeMappings: any[]
  markingInfoMap: Map<string, { branch: string | null; listType: number | null; loadDate: Date | null }>
  customerBrokerMap: Map<string, number>
}
