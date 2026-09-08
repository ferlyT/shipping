import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'
import { calculateTier, getAnnualTierMap } from './customers-tier.service'
import { type CustomerTierKey, TIER_CONFIG } from './customers.types'

// Re-export domain types and tier service for 100% backwards compatibility
export * from './customers.types'
export * from './customers-tier.service'

const statsCache: Record<string, { timestamp: number; groupStats: number[]; salesStats: any[] }> = {}

export async function getCustomers(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim() || ''
  const sortBy = query.sortBy || 'fdCustName'
  const sortDir = query.sortDir === 'desc' ? 'desc' : 'asc'
  const status = query.status || 'active'
  const sales = query.sales?.trim() || ''
  const category = query.category || query.group || 'all'
  const isTierCategory = ['diamond', 'platinum', 'gold', 'silver', 'bronze'].includes(category.toLowerCase())
  const tierFilter = (isTierCategory ? category.toLowerCase() : (query.tier || 'all').toLowerCase()) as CustomerTierKey | 'all'
  const blockStatus = query.blockStatus
  const broker = query.broker
  const targetYear = parseInt(query.year || String(new Date().getFullYear()), 10) || 2026

  try {
    // 1. Get annual tier cache for target year
    const tierMap = await getAnnualTierMap(targetYear)

    // 2. Base status condition (for group counts scope)
    const baseWhere: any = {}
    if (status === 'active') {
      baseWhere.fdDiscontinued = { not: 1 }
    } else if (status === 'discontinued') {
      baseWhere.fdDiscontinued = 1
    }

    if (sales && sales !== 'all') {
      baseWhere.fdSalesNM = sales
    }

    // 3. Full query condition with search, category, broker, blockStatus, and tier
    const where: any = { ...baseWhere }

    if (search) {
      where.OR = [
        { fdCustName: { contains: search } },
        { fdCustCode: { contains: search } },
        { fdContact: { contains: search } },
        { fdHP: { contains: search } },
        { fdTelp: { contains: search } },
        { fdEmailPenagihan: { contains: search } },
        { fdCityName: { contains: search } },
        { fdSalesNM: { contains: search } },
      ]
    }

    // Tier Filter
    if (tierFilter && tierFilter !== 'all') {
      const allowedCodes = tierMap.tierCustCodes[tierFilter] || []
      where.fdCustCode = { in: allowedCodes }
    }

    // Category / Group Filter
    if (category && category !== 'all') {
      if (category === 'broker') {
        where.fdBroker = 1
      } else if (category === 'direct') {
        where.OR = [{ fdBroker: 0 }, { fdBroker: null }]
      } else if (category === 'cod') {
        where.fdBlocked = 2
      } else if (category === 'warning') {
        where.fdBlocked = 3
      } else if (category === 'blocked') {
        where.fdBlocked = 4
      } else if (category === 'urgent') {
        where.fdBlocked = 5
      } else if (category === 'ok') {
        where.fdBlocked = 1
      } else if (category === 'no_status') {
        where.OR = [{ fdBlocked: 0 }, { fdBlocked: null }]
      }
    } else {
      if (broker !== undefined && broker !== '' && broker !== 'all') {
        if (broker === '1' || broker === 'broker') {
          where.fdBroker = 1
        } else if (broker === '0' || broker === 'direct') {
          where.OR = [{ fdBroker: 0 }, { fdBroker: null }]
        }
      }

      if (blockStatus !== undefined && blockStatus !== '' && blockStatus !== 'all') {
        where.fdBlocked = parseInt(blockStatus, 10)
      }
    }

    // 4. Query customer page data and aggregations
    const cacheKey = `${status}_${sales}`
    const now = Date.now()
    let groupStats: number[]
    let salesStats: Array<{ fdSalesNM: string | null; _count: number }>

    const isStatsWarm = statsCache[cacheKey] && now - statsCache[cacheKey].timestamp < 60_000

    const pageQueries: Promise<any>[] = [
      prisma.tbCustomers.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortDir }
      }),
      prisma.tbCustomers.count({ where }),
    ]

    if (!isStatsWarm) {
      pageQueries.push(
        Promise.all([
          prisma.tbCustomers.count({ where: { ...baseWhere } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBroker: 1 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, OR: [{ fdBroker: 0 }, { fdBroker: null }] } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBlocked: 2 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBlocked: 3 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBlocked: 4 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBlocked: 5 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, fdBlocked: 1 } }),
          prisma.tbCustomers.count({ where: { ...baseWhere, OR: [{ fdBlocked: 0 }, { fdBlocked: null }] } }),
        ]),
        prisma.tbCustomers.groupBy({
          by: ['fdSalesNM'],
          where: status === 'active' ? { fdDiscontinued: { not: 1 } } : status === 'discontinued' ? { fdDiscontinued: 1 } : {},
          _count: true,
          orderBy: { _count: { fdSalesNM: 'desc' } },
          take: 30,
        })
      )
    }

    const results = await Promise.all(pageQueries)
    const rawCustomers = results[0]
    const total = results[1]

    if (!isStatsWarm) {
      groupStats = results[2]
      salesStats = results[3]
      statsCache[cacheKey] = { timestamp: now, groupStats, salesStats }
    } else {
      groupStats = statsCache[cacheKey].groupStats
      salesStats = statsCache[cacheKey].salesStats
    }

    // 5. Batch fetch annual revenue stats for the current page customers
    const custCodes = rawCustomers.map((c) => c.fdCustCode.trim())
    const revenueMap: Record<string, { totalRevenue: number; totalInvoices: number }> = {}

    if (custCodes.length > 0) {
      try {
        const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`)
        const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`)

        const billings = await prisma.$queryRaw<any[]>`
          SELECT 
            RTRIM(b.fdCustCode) AS fdCustCode,
            RTRIM(b.fdInvNo) AS fdInvNo,
            b.fdJumlah1
          FROM tbBilling b WITH (NOLOCK)
          WHERE RTRIM(b.fdCustCode) IN (${Prisma.join(custCodes)})
            AND b.fdInvDate >= ${startDate} AND b.fdInvDate <= ${endDate}
        `

        const zeroInvoices = billings
          .filter((b) => !b.fdJumlah1 || Number(b.fdJumlah1) === 0)
          .map((b) => String(b.fdInvNo).trim())
          .filter(Boolean)

        let prevMap: Record<string, number> = {}
        if (zeroInvoices.length > 0) {
          const prevs = await prisma.$queryRaw<any[]>`
            SELECT RTRIM(fdInvNo) AS fdInvNo, fdJumlah1 
            FROM tbBillingPrev WITH (NOLOCK) 
            WHERE RTRIM(fdInvNo) IN (${Prisma.join(zeroInvoices)})
          `
          for (const p of prevs) {
            prevMap[String(p.fdInvNo).trim()] = Number(p.fdJumlah1) || 0
          }
        }

        for (const b of billings) {
          const code = String(b.fdCustCode).trim()
          if (!revenueMap[code]) revenueMap[code] = { totalRevenue: 0, totalInvoices: 0 }
          revenueMap[code].totalInvoices++
          const amt = Number(b.fdJumlah1) || 0
          if (amt > 0) {
            revenueMap[code].totalRevenue += amt
          } else {
            const prevAmt = prevMap[String(b.fdInvNo).trim()] || 0
            revenueMap[code].totalRevenue += prevAmt
          }
        }
      } catch (err: any) {
        logger.warn('Failed to query batch customer revenue:', { error: err.message })
      }
    }

    // Attach Tier & Financial Stats to customers
    const data = rawCustomers.map((cust) => {
      const code = cust.fdCustCode.trim()
      const revInfo = revenueMap[code] || { totalRevenue: 0, totalInvoices: 0 }
      const tier = calculateTier(revInfo.totalRevenue)
      return {
        ...cust,
        annualRevenue: revInfo.totalRevenue,
        totalInvoices: revInfo.totalInvoices,
        tier,
      }
    })

    const groupCounts = {
      all: groupStats[0],
      broker: groupStats[1],
      direct: groupStats[2],
      cod: groupStats[3],
      warning: groupStats[4],
      blocked: groupStats[5],
      urgent: groupStats[6],
      ok: groupStats[7],
      no_status: groupStats[8],
      diamond: tierMap.tierCounts.diamond || 0,
      platinum: tierMap.tierCounts.platinum || 0,
      gold: tierMap.tierCounts.gold || 0,
      silver: tierMap.tierCounts.silver || 0,
      bronze: tierMap.tierCounts.bronze || 0,
    }

    const salesList = salesStats
      .filter((s) => s.fdSalesNM && s.fdSalesNM.trim() !== '')
      .map((s) => ({
        name: s.fdSalesNM!.trim(),
        count: s._count,
      }))

    return {
      data,
      meta: {
        ...meta(total),
        groupCounts,
        salesList,
        tierCounts: tierMap.tierCounts,
        targetYear,
      }
    }
  } catch (err: any) {
    logger.error('Database error on getCustomers', { error: err.message })
    throw new Error('Gagal mengambil data pelanggan dari database')
  }
}

export async function getCustomerById(id: string) {
  try {
    const customer = await prisma.tbCustomers.findUnique({
      where: { fdCustCode: id },
      include: {
        addresses: true
      }
    })

    if (!customer) return null

    // Query multi-year financial billing stats (e.g. 2026, 2025, 2024)
    let financialStats: any[] = []
    let currentTier: CustomerTierKey = 'none'

    try {
      const minDate = new Date('2024-01-01T00:00:00.000Z')
      const billings = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(b.fdInvNo) AS fdInvNo,
          b.fdInvDate,
          YEAR(b.fdInvDate) as invYear,
          b.fdJumlah1
        FROM tbBilling b WITH (NOLOCK)
        WHERE RTRIM(b.fdCustCode) = ${id.trim()}
          AND b.fdInvDate >= ${minDate}
        ORDER BY b.fdInvDate DESC
      `

      const zeroInvoices = billings
        .filter((b) => !b.fdJumlah1 || Number(b.fdJumlah1) === 0)
        .map((b) => String(b.fdInvNo).trim())
        .filter(Boolean)

      let prevMap: Record<string, number> = {}
      if (zeroInvoices.length > 0) {
        const prevs = await prisma.$queryRaw<any[]>`
          SELECT RTRIM(fdInvNo) AS fdInvNo, fdJumlah1 
          FROM tbBillingPrev WITH (NOLOCK) 
          WHERE RTRIM(fdInvNo) IN (${Prisma.join(zeroInvoices)})
        `
        for (const p of prevs) {
          prevMap[String(p.fdInvNo).trim()] = Number(p.fdJumlah1) || 0
        }
      }

      const yearlyMap: Record<number, { year: number; totalRevenue: number; totalInvoices: number; adjustedInvoices: number; tier: CustomerTierKey }> = {}
      for (const b of billings) {
        const y = Number(b.invYear)
        if (!yearlyMap[y]) yearlyMap[y] = { year: y, totalRevenue: 0, totalInvoices: 0, adjustedInvoices: 0, tier: 'none' }
        yearlyMap[y].totalInvoices++
        const amt = Number(b.fdJumlah1) || 0
        if (amt > 0) {
          yearlyMap[y].totalRevenue += amt
        } else {
          const prevAmt = prevMap[String(b.fdInvNo).trim()] || 0
          yearlyMap[y].totalRevenue += prevAmt
          if (prevAmt > 0) yearlyMap[y].adjustedInvoices++
        }
      }

      financialStats = Object.values(yearlyMap)
        .map((stat) => {
          const tier = calculateTier(stat.totalRevenue)
          const tierCfg = TIER_CONFIG[tier]
          const nextTier = tierCfg.nextTier
          const nextMin = tierCfg.nextMin || 0
          const remainingForNextTier = nextMin > stat.totalRevenue ? nextMin - stat.totalRevenue : 0
          const progressToNextTier = nextMin > 0 ? Math.min(100, Math.round((stat.totalRevenue / nextMin) * 100)) : 100

          return {
            ...stat,
            tier,
            nextTier,
            nextMin,
            remainingForNextTier,
            progressToNextTier,
          }
        })
        .sort((a, b) => b.year - a.year)

      const currentYearStat = financialStats.find((s) => s.year === new Date().getFullYear())
      const prevYearStat = financialStats.find((s) => s.year === new Date().getFullYear() - 1)
      currentTier = currentYearStat?.tier !== 'none' ? (currentYearStat?.tier || 'none') : (prevYearStat?.tier || 'none')
    } catch (finErr: any) {
      logger.warn('Failed to query financial stats for customer:', { id, error: finErr.message })
    }

    return {
      ...customer,
      currentTier,
      financialStats,
    }
  } catch (err: any) {
    logger.error('Database error on getCustomerById', { id, error: err.message })
    throw new Error('Gagal mengambil detail pelanggan')
  }
}
