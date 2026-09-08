/**
 * Customers Module Type Definitions
 */

export type CustomerTierKey = 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'none'

export interface TierConfigItem {
  label: string
  min: number
  max: number
  nextTier?: CustomerTierKey
  nextMin?: number
}

export const TIER_CONFIG: Record<CustomerTierKey, TierConfigItem> = {
  diamond:  { label: 'DIAMOND',  min: 5_000_000_000, max: Infinity },
  platinum: { label: 'PLATINUM', min: 1_000_000_000, max: 4_999_999_999, nextTier: 'diamond', nextMin: 5_000_000_000 },
  gold:     { label: 'GOLD',     min: 250_000_000,   max: 999_999_999,   nextTier: 'platinum', nextMin: 1_000_000_000 },
  silver:   { label: 'SILVER',   min: 50_000_000,    max: 249_999_999,   nextTier: 'gold', nextMin: 250_000_000 },
  bronze:   { label: 'BRONZE',   min: 1,             max: 49_999_999,    nextTier: 'silver', nextMin: 50_000_000 },
  none:     { label: 'UNRANKED', min: 0,             max: 0,             nextTier: 'bronze', nextMin: 1 },
}

export interface CustomerQuery {
  page?: string
  limit?: string
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  status?: string
  sales?: string
  category?: string
  group?: string
  tier?: string
  blockStatus?: string
  broker?: string
  year?: string
  [key: string]: string | undefined
}

export interface CustomerFinancialStat {
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
