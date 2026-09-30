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
    const baseAnd: any[] = []
    if (status === 'active') {
      baseAnd.push({ fdDiscontinued: { not: 1 } })
    } else if (status === 'discontinued') {
      baseAnd.push({ fdDiscontinued: 1 })
    }

    if (sales && sales !== 'all') {
      baseAnd.push({ fdSalesNM: sales })
    }

    // 3. Full query conditions with multi-token search, category, broker, blockStatus, and tier
    const queryAnd: any[] = [...baseAnd]

    if (search) {
      const tokens = search.trim().split(/\s+/).filter((t) => t.length > 0)
      for (const token of tokens) {
        const digitsOnly = token.replace(/\D/g, '')
        const hasPhoneDigits = digitsOnly.length >= 4

        const orConditions: any[] = [
          { fdCustName: { contains: token } },
          { fdCustCode: { contains: token } },
          { fdContact: { contains: token } },
          { fdHP: { contains: token } },
          { fdTelp: { contains: token } },
          { fdCityName: { contains: token } },
          { fdBillTo: { contains: token } },
          { fdSalesNM: { contains: token } },
        ]

        // Hanya cari alamat jalan & keterangan jika token >= 4 karakter
        // untuk mencegah singkatan 2-3 huruf (misal: ash, pt, cv, jl) mencocokkan ratusan alamat jalan
        if (token.length >= 4) {
          orConditions.push(
            { fdAddr1: { contains: token } },
            { fdNamaPengiriman: { contains: token } },
            { fdKotaPengiriman: { contains: token } },
            { fdEmailPenagihan: { contains: token } },
            { fdKeterangan: { contains: token } }
          )
        }

        if (hasPhoneDigits && digitsOnly !== token) {
          orConditions.push(
            { fdHP: { contains: digitsOnly } },
            { fdTelp: { contains: digitsOnly } },
            { fdContact: { contains: digitsOnly } },
            { fdHpPengiriman: { contains: digitsOnly } },
            { fdHpPenagihan: { contains: digitsOnly } }
          )
        }

        queryAnd.push({ OR: orConditions })
      }
    }

    // Tier Filter
    if (tierFilter && tierFilter !== 'all') {
      const allowedCodes = tierMap.tierCustCodes[tierFilter] || []
      queryAnd.push({ fdCustCode: { in: allowedCodes } })
    }

    // Category / Group Filter
    if (category && category !== 'all') {
      if (category === 'broker') {
        queryAnd.push({ fdBroker: 1 })
      } else if (category === 'direct') {
        queryAnd.push({ OR: [{ fdBroker: 2 }, { fdBroker: 0 }, { fdBroker: null }] })
      } else if (category === 'cod') {
        queryAnd.push({ fdBlocked: 2 })
      } else if (category === 'warning') {
        queryAnd.push({ fdBlocked: 3 })
      } else if (category === 'blocked') {
        queryAnd.push({ fdBlocked: 4 })
      } else if (category === 'urgent') {
        queryAnd.push({ fdBlocked: 5 })
      } else if (category === 'ok') {
        queryAnd.push({ fdBlocked: 1 })
      } else if (category === 'no_status') {
        queryAnd.push({ OR: [{ fdBlocked: 0 }, { fdBlocked: null }] })
      }
    } else {
      if (broker !== undefined && broker !== '' && broker !== 'all') {
        if (broker === '1' || broker === 'broker') {
          queryAnd.push({ fdBroker: 1 })
        } else if (broker === '0' || broker === 'direct' || broker === '2') {
          queryAnd.push({ OR: [{ fdBroker: 2 }, { fdBroker: 0 }, { fdBroker: null }] })
        }
      }

      if (blockStatus !== undefined && blockStatus !== '' && blockStatus !== 'all') {
        queryAnd.push({ fdBlocked: parseInt(blockStatus, 10) })
      }
    }

    const where: any = queryAnd.length > 0 ? { AND: queryAnd } : {}
    const baseWhere: any = baseAnd.length > 0 ? { AND: baseAnd } : {}

    // 4. Query customer page data with relevance ranking
    const cacheKey = `${status}_${sales}`
    const now = Date.now()
    let groupStats: number[]
    let salesStats: Array<{ fdSalesNM: string | null; _count: number }>
    let rawCustomers: any[]
    let total: number

    const isStatsWarm = statsCache[cacheKey] && now - statsCache[cacheKey].timestamp < 60_000

    if (search && sortBy === 'fdCustName') {
      // Relevance scoring for search queries:
      // Exact match (1) > Prefix match (2) > Word match (3) > Substring in name (4) > Code (5) > Contact (6) > Other (7)
      const candidates = await prisma.tbCustomers.findMany({
        where,
        select: {
          fdCustCode: true,
          fdCustName: true,
          fdContact: true,
          fdBillTo: true,
        },
      })

      total = candidates.length
      const cleanQ = search.trim().toLowerCase()

      const scored = candidates.map((c) => {
        const code = (c.fdCustCode || '').trim().toLowerCase()
        const name = (c.fdCustName || '').trim().toLowerCase()
        const contact = (c.fdContact || '').trim().toLowerCase()
        const billTo = (c.fdBillTo || '').trim().toLowerCase()

        let score = 99
        if (name === cleanQ || code === cleanQ) {
          score = 1
        } else if (name.startsWith(cleanQ) || code.startsWith(cleanQ)) {
          score = 2
        } else if (name.includes(' ' + cleanQ) || name.includes('/' + cleanQ)) {
          score = 3
        } else if (name.includes(cleanQ)) {
          score = 4
        } else if (code.includes(cleanQ)) {
          score = 5
        } else if (contact.startsWith(cleanQ)) {
          score = 6
        } else if (contact.includes(cleanQ)) {
          score = 7
        } else if (billTo.includes(cleanQ)) {
          score = 8
        } else {
          score = 9
        }

        return { code: c.fdCustCode, score, name }
      })

      scored.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score
        return a.name.localeCompare(b.name)
      })

      const pageCodes = scored.slice(skip, skip + take).map((s) => s.code)

      if (pageCodes.length > 0) {
        const pageRecords = await prisma.tbCustomers.findMany({
          where: { fdCustCode: { in: pageCodes } },
        })
        const recordMap = new Map(pageRecords.map((r) => [r.fdCustCode.trim(), r]))
        rawCustomers = pageCodes.map((c) => recordMap.get(c.trim())).filter(Boolean)
      } else {
        rawCustomers = []
      }
    } else {
      const pageQueries: Promise<any>[] = [
        prisma.tbCustomers.findMany({
          where,
          skip,
          take,
          orderBy: { [sortBy]: sortDir },
        }),
        prisma.tbCustomers.count({ where }),
      ]
      const results = await Promise.all(pageQueries)
      rawCustomers = results[0]
      total = results[1]
    }

    if (!isStatsWarm) {
      const statsQueries = await Promise.all([
        Promise.all([
          prisma.tbCustomers.count({ where: baseWhere }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBroker: 1 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { OR: [{ fdBroker: 2 }, { fdBroker: 0 }, { fdBroker: null }] }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBlocked: 2 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBlocked: 3 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBlocked: 4 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBlocked: 5 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { fdBlocked: 1 }] } }),
          prisma.tbCustomers.count({ where: { AND: [...baseAnd, { OR: [{ fdBlocked: 0 }, { fdBlocked: null }] }] } }),
        ]),
        prisma.tbCustomers.groupBy({
          by: ['fdSalesNM'],
          where: status === 'active' ? { fdDiscontinued: { not: 1 } } : status === 'discontinued' ? { fdDiscontinued: 1 } : {},
          _count: true,
          orderBy: { _count: { fdSalesNM: 'desc' } },
          take: 30,
        }),
      ])
      groupStats = statsQueries[0]
      salesStats = statsQueries[1]
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
      SELECT TOP 20 
        RTRIM(ISNULL(fdCustCode, '')) AS fdCustCode,
        RTRIM(ISNULL(fdCustName, '')) AS fdCustName,
        RTRIM(ISNULL(fdContact, '')) AS fdContact,
        RTRIM(ISNULL(fdHP, '')) AS fdHP,
        RTRIM(ISNULL(fdTelp, '')) AS fdTelp,
        RTRIM(ISNULL(fdCityName, '')) AS fdCityName
      FROM tbCustomers WITH (NOLOCK)
      WHERE (
          fdCustName LIKE ${searchLike}
          OR fdCustCode LIKE ${searchLike}
          OR fdContact LIKE ${searchLike}
          OR fdHP LIKE ${searchLike}
          OR fdTelp LIKE ${searchLike}
          OR fdCityName LIKE ${searchLike}
        )
      ORDER BY 
        CASE 
          WHEN fdCustCode LIKE ${cleanQ + '%'} THEN 1
          WHEN fdCustName LIKE ${cleanQ + '%'} THEN 2
          ELSE 3
        END,
        fdCustName ASC
    `.catch(() => [])

    const suggestions: CustomerSuggestion[] = []
    const seen = new Set<string>()
    const qLower = cleanQ.toLowerCase()

    for (const row of rows) {
      const custCode = (row.fdCustCode || '').trim()
      const custName = (row.fdCustName || '').trim()

      if (custName && !seen.has(`c:${custName.toLowerCase()}`)) {
        seen.add(`c:${custName.toLowerCase()}`)
        suggestions.push({
          type: 'customer',
          title: custName,
          subtitle: `Kode: ${custCode}${row.fdCityName ? ` • ${row.fdCityName.trim()}` : ''}`,
          value: custName,
          custCode,
        })
      }
      if (custCode && custCode.toLowerCase().includes(qLower) && !seen.has(`code:${custCode.toLowerCase()}`)) {
        seen.add(`code:${custCode.toLowerCase()}`)
        suggestions.push({
          type: 'code',
          title: custCode,
          subtitle: `Pelanggan: ${custName}`,
          value: custCode,
          custCode,
        })
      }
      const contactVal = (row.fdContact || row.fdHP || row.fdTelp || '').trim()
      if (contactVal && contactVal.toLowerCase().includes(qLower) && !seen.has(`cnt:${contactVal.toLowerCase()}`)) {
        seen.add(`cnt:${contactVal.toLowerCase()}`)
        suggestions.push({
          type: 'contact',
          title: contactVal,
          subtitle: `Kontak: ${custName} (${custCode})`,
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
