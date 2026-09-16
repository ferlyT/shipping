import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'
import { suggestionCache } from '../../utils/cache'
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
      groupStats = statsCache[cacheKey]?.groupStats ?? []
      salesStats = statsCache[cacheKey]?.salesStats ?? []
    }

    // 5. Batch fetch annual revenue stats for the current page customers
    const custCodes = rawCustomers.map((c: any) => c.fdCustCode.trim()).filter(Boolean)
    const revenueMap: Record<string, { totalRevenue: number; totalInvoices: number }> = {}

    if (custCodes.length > 0) {
      try {
        const startDate = new Date(`${targetYear}-01-01T00:00:00.000Z`)
        const endDate = new Date(`${targetYear}-12-31T23:59:59.999Z`)

        const revenueRows = await prisma.$queryRaw<any[]>`
          SELECT 
            RTRIM(b.fdCustCode) AS fdCustCode,
            COUNT(b.fdInvNo) AS totalInvoices,
            SUM(CASE WHEN ISNULL(b.fdJumlah1, 0) > 0 THEN b.fdJumlah1 ELSE ISNULL(p.fdJumlah1, 0) END) AS totalRevenue
          FROM tbBilling b WITH (NOLOCK)
          LEFT JOIN tbBillingPrev p WITH (NOLOCK) ON b.fdInvNo = p.fdInvNo
          WHERE b.fdCustCode IN (${Prisma.join(custCodes)})
            AND b.fdInvDate >= ${startDate} AND b.fdInvDate <= ${endDate}
          GROUP BY b.fdCustCode
        `

        for (const row of revenueRows) {
          const code = String(row.fdCustCode || '').trim()
          revenueMap[code] = {
            totalRevenue: Number(row.totalRevenue) || 0,
            totalInvoices: Number(row.totalInvoices) || 0,
          }
        }
      } catch (err: any) {
        logger.warn('Failed to query batch customer revenue:', { error: err.message })
      }
    }

    // Attach Tier & Financial Stats to customers
    const data = rawCustomers.map((cust: any) => {
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
      const yearlyRows = await prisma.$queryRaw<any[]>`
        SELECT 
          YEAR(b.fdInvDate) AS invYear,
          COUNT(b.fdInvNo) AS totalInvoices,
          SUM(CASE WHEN ISNULL(b.fdJumlah1, 0) > 0 THEN b.fdJumlah1 ELSE ISNULL(p.fdJumlah1, 0) END) AS totalRevenue,
          SUM(CASE WHEN ISNULL(b.fdJumlah1, 0) = 0 AND ISNULL(p.fdJumlah1, 0) > 0 THEN 1 ELSE 0 END) AS adjustedInvoices
        FROM tbBilling b WITH (NOLOCK)
        LEFT JOIN tbBillingPrev p WITH (NOLOCK) ON b.fdInvNo = p.fdInvNo
        WHERE b.fdCustCode = ${id.trim()}
          AND b.fdInvDate >= ${minDate}
        GROUP BY YEAR(b.fdInvDate)
        ORDER BY invYear DESC
      `

      financialStats = yearlyRows.map((row) => {
        const year = Number(row.invYear)
        const totalRevenue = Number(row.totalRevenue) || 0
        const totalInvoices = Number(row.totalInvoices) || 0
        const adjustedInvoices = Number(row.adjustedInvoices) || 0

        const tier = calculateTier(totalRevenue)
        const tierCfg = TIER_CONFIG[tier]
        const nextTier = tierCfg.nextTier
        const nextMin = tierCfg.nextMin || 0
        const remainingForNextTier = nextMin > totalRevenue ? nextMin - totalRevenue : 0
        const progressToNextTier = nextMin > 0 ? Math.min(100, Math.round((totalRevenue / nextMin) * 100)) : 100

        return {
          year,
          totalRevenue,
          totalInvoices,
          adjustedInvoices,
          tier,
          nextTier,
          nextMin,
          remainingForNextTier,
          progressToNextTier,
        }
      })

      const currentYear = new Date().getFullYear()
      const currentYearStat = financialStats.find((s) => s.year === currentYear)
      const prevYearStat = financialStats.find((s) => s.year === currentYear - 1)
      currentTier = currentYearStat?.tier && currentYearStat.tier !== 'none'
        ? currentYearStat.tier
        : (prevYearStat?.tier || 'none')
    } catch (finErr: any) {
      logger.warn('Failed to query financial stats for customer:', { id, error: finErr.message })
    }

    // Query tbCustomerPenagihan & extra customer billing fields (fdFinCode, fdKodePenagih)
    let penagihanDetail: any = null
    try {
      const extraCustRows = await prisma.$queryRaw<any[]>`
        SELECT 
          RTRIM(ISNULL(fdFinCode, '')) AS fdFinCode,
          RTRIM(ISNULL(fdKodePenagih, '')) AS fdKodePenagih
        FROM tbCustomers WITH (NOLOCK)
        WHERE fdCustCode = ${id.trim()}
      `
      const finCode = extraCustRows[0]?.fdFinCode || ''
      const kodePenagih = extraCustRows[0]?.fdKodePenagih || ''

      const penagihanRows = await prisma.$queryRaw<any[]>`
        SELECT TOP 1 
          RTRIM(ISNULL(fdContact, '')) AS fdContact,
          RTRIM(ISNULL(fdHP, '')) AS fdHP,
          RTRIM(ISNULL(fdTelp, '')) AS fdTelp,
          RTRIM(ISNULL(fdEmail, '')) AS fdEmail,
          RTRIM(ISNULL(fdAddr, '')) AS fdAddr,
          RTRIM(ISNULL(fdCity, '')) AS fdCity,
          ISNULL(fdAktif, 1) AS fdAktif
        FROM tbCustomerPenagihan WITH (NOLOCK)
        WHERE fdCustCode = ${id.trim()}
        ORDER BY fdAktif DESC, fdID ASC
      `
      const pRow = penagihanRows[0] || null

      let finName = ''
      let kolektorName = ''
      const empCodes = [finCode, kodePenagih].filter(Boolean)
      if (empCodes.length > 0) {
        const empRows = await prisma.tbEmployees.findMany({
          where: { fdEmpCode: { in: empCodes } },
          select: { fdEmpCode: true, fdEmpName: true }
        })
        const empMap = new Map(empRows.map(e => [e.fdEmpCode.trim(), e.fdEmpName.trim()]))
        if (finCode) finName = empMap.get(finCode) || ''
        if (kodePenagih) kolektorName = empMap.get(kodePenagih) || ''
      }

      const emailVal = (pRow?.fdEmail && pRow.fdEmail !== '0' ? pRow.fdEmail : (customer.fdEmailPenagihan && customer.fdEmailPenagihan !== '0' ? customer.fdEmailPenagihan : '')).trim()

      penagihanDetail = {
        nama: (customer.fdBillTo || customer.fdCustName || '').trim(),
        pic: (pRow?.fdContact || customer.fdContact || '').trim(),
        alamat: (pRow?.fdAddr || customer.fdBillAddr1 || customer.fdAddr1 || '').trim(),
        kota: (pRow?.fdCity || customer.fdBillCityName || customer.fdCityName || '').trim(),
        hp: (pRow?.fdHP || customer.fdHpPenagihan || customer.fdHP || '').trim(),
        email: emailVal,
        finCode,
        finName,
        kolektorCode: kodePenagih,
        kolektorName,
        notif: customer.fdNotifPenagihan ?? 0,
        keterangan: (customer.fdKeteranganPenagihan || '').trim(),
      }
    } catch (penagihanErr: any) {
      logger.warn('Failed to query penagihan detail for customer:', { id, error: penagihanErr.message })
    }

    return {
      ...customer,
      currentTier,
      financialStats,
      penagihanDetail,
    }
  } catch (err: any) {
    logger.error('Database error on getCustomerById', { id, error: err.message })
    throw new Error('Gagal mengambil detail pelanggan')
  }
}

export interface CustomerSuggestion {
  type: 'customer' | 'code' | 'contact'
  title: string
  subtitle: string
  value: string
  custCode: string
}

export async function getCustomerSuggestions(keyword: string): Promise<CustomerSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `customer:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<CustomerSuggestion[]>(cacheKey)
  if (cached) return cached

  const searchLike = `%${cleanQ}%`

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 12 
        RTRIM(ISNULL(fdCustCode, '')) AS fdCustCode,
        RTRIM(ISNULL(fdCustName, '')) AS fdCustName,
        RTRIM(ISNULL(fdContact, '')) AS fdContact,
        RTRIM(ISNULL(fdHP, '')) AS fdHP,
        RTRIM(ISNULL(fdTelp, '')) AS fdTelp,
        RTRIM(ISNULL(fdCityName, '')) AS fdCityName
      FROM tbCustomers WITH (NOLOCK)
      WHERE ISNULL(fdDiscontinued, 0) <> 1
        AND (
          fdCustName LIKE ${searchLike}
          OR fdCustCode LIKE ${searchLike}
          OR fdContact LIKE ${searchLike}
          OR fdHP LIKE ${searchLike}
          OR fdTelp LIKE ${searchLike}
        )
      ORDER BY fdCustName ASC
    `.catch(() => [])

    const suggestions: CustomerSuggestion[] = []
    const seen = new Set<string>()
    const qLower = cleanQ.toLowerCase()

    for (const row of rows) {
      const custCode = (row.fdCustCode || '').trim()

      if (row.fdCustName && row.fdCustName.toLowerCase().includes(qLower) && !seen.has(`c:${row.fdCustName}`)) {
        seen.add(`c:${row.fdCustName}`)
        suggestions.push({
          type: 'customer',
          title: row.fdCustName,
          subtitle: `Kode: ${custCode}${row.fdCityName ? ` • ${row.fdCityName}` : ''}`,
          value: row.fdCustName,
          custCode,
        })
      }
      if (row.fdCustCode && row.fdCustCode.toLowerCase().includes(qLower) && !seen.has(`code:${row.fdCustCode}`)) {
        seen.add(`code:${row.fdCustCode}`)
        suggestions.push({
          type: 'code',
          title: row.fdCustCode,
          subtitle: `Pelanggan: ${row.fdCustName}`,
          value: row.fdCustCode,
          custCode,
        })
      }
      const contactVal = (row.fdContact || row.fdHP || row.fdTelp || '').trim()
      if (contactVal && contactVal.toLowerCase().includes(qLower) && !seen.has(`cnt:${contactVal}`)) {
        seen.add(`cnt:${contactVal}`)
        suggestions.push({
          type: 'contact',
          title: contactVal,
          subtitle: `Kontak: ${row.fdCustName}`,
          value: contactVal,
          custCode,
        })
      }
      if (suggestions.length >= 10) break
    }

    const result = suggestions.slice(0, 10)
    suggestionCache.set(cacheKey, result)
    return result
  } catch {
    return []
  }
}
