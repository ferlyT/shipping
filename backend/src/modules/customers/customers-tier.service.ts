import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { type CustomerTierKey, TIER_CONFIG } from './customers.types'

export function calculateTier(revenue: number): CustomerTierKey {
  if (revenue >= 5_000_000_000) return 'diamond'
  if (revenue >= 1_000_000_000) return 'platinum'
  if (revenue >= 250_000_000) return 'gold'
  if (revenue >= 50_000_000) return 'silver'
  if (revenue > 0) return 'bronze'
  return 'none'
}

export interface TierCacheItem {
  timestamp: number
  tierCustCodes: Record<CustomerTierKey, string[]>
  tierCounts: Record<CustomerTierKey | 'all', number>
}

const tierCache: Record<number, TierCacheItem> = {}

export async function getAnnualTierMap(year: number): Promise<TierCacheItem> {
  const now = Date.now()
  if (tierCache[year] && now - tierCache[year].timestamp < 300_000) {
    return tierCache[year]
  }

  try {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`)

    const rows = await prisma.$queryRaw<{ fdCustCode: string | null; totalSum: unknown }[]>`
      SELECT 
        b.fdCustCode,
        SUM(CASE WHEN ISNULL(b.fdJumlah1, 0) > 0 THEN b.fdJumlah1 ELSE ISNULL(p.fdJumlah1, 0) END) as totalSum
      FROM tbBilling b WITH (NOLOCK)
      LEFT JOIN tbBillingPrev p WITH (NOLOCK) ON b.fdInvNo = p.fdInvNo
      WHERE b.fdInvDate >= ${startDate} AND b.fdInvDate <= ${endDate}
        AND b.fdCustCode IS NOT NULL
      GROUP BY b.fdCustCode
    `

    const tierCustCodes: Record<CustomerTierKey, string[]> = {
      diamond: [],
      platinum: [],
      gold: [],
      silver: [],
      bronze: [],
      none: [],
    }

    const tierCounts: Record<CustomerTierKey | 'all', number> = {
      all: rows.length,
      diamond: 0,
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0,
      none: 0,
    }

    for (const r of rows) {
      const code = String(r.fdCustCode || '').trim()
      if (!code) continue
      const amt = Number(r.totalSum) || 0
      const tier = calculateTier(amt)
      tierCustCodes[tier].push(code)
      tierCounts[tier]++
    }

    const item: TierCacheItem = {
      timestamp: now,
      tierCustCodes,
      tierCounts,
    }

    tierCache[year] = item
    return item
  } catch (err: any) {
    logger.warn('Failed to build annual tier map:', { error: err.message })
    return {
      timestamp: now,
      tierCustCodes: { diamond: [], platinum: [], gold: [], silver: [], bronze: [], none: [] },
      tierCounts: { all: 0, diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0, none: 0 },
    }
  }
}
