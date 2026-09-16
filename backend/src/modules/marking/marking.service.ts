import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'
import { suggestionCache } from '../../utils/cache'

import { computeExitPrediction } from './marking-analytics.service'

// Re-export types & analytics
export * from './marking.types'
export * from './marking-analytics.service'

/**
 * Core Marking CRUD & Search
 */

export async function getMarkings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim() || ''
  const sortBy = query.sortBy || 'fdSysDate'
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc'
  const listType = query.listType // 1 for AIR, 2 for SEA
  const exitScope = query.exitScope // 'today' | 'yesterday' | 'tomorrow' | 'recent'
  const isClosed = query.isClosed
  const groupMode = query.groupMode
  const groupValue = query.groupValue
  const year = query.year?.trim()

  let effectiveSortBy = sortBy
  let effectiveSortDir = sortDir
  let tomorrowItems: any[] = []

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
        { fdKet: { contains: search } },
        { fdBranchCode: { contains: search } },
        { fdWilayah: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '' && listType !== 'ALL') {
      where.fdListType = parseInt(listType, 10)
    }

    if (year && year !== 'ALL') {
      const yearNum = parseInt(year, 10)
      if (!isNaN(yearNum)) {
        const startYear = new Date(`${yearNum}-01-01T00:00:00.000Z`)
        const endYear = new Date(`${yearNum + 1}-01-01T00:00:00.000Z`)
        const twoDigitYear = String(yearNum).slice(-2)

        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { fdETA: { gte: startYear, lt: endYear } },
              { fdLoadDate: { gte: startYear, lt: endYear } },
              { fdETD: { gte: startYear, lt: endYear } },
              { fdSysDate: { gte: startYear, lt: endYear } },
              { fdMarkingCode: { startsWith: twoDigitYear } },
            ],
          },
        ]
      }
    }

    if (exitScope) {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const tomorrowStart = new Date(todayStart)
      tomorrowStart.setDate(tomorrowStart.getDate() + 1)
      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      const dayAfterTomorrowStart = new Date(tomorrowStart)
      dayAfterTomorrowStart.setDate(dayAfterTomorrowStart.getDate() + 1)
      const sevenDaysAgoStart = new Date(todayStart)
      sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7)

      if (exitScope === 'today') {
        where.fdExitDate = {
          gte: todayStart,
          lt: tomorrowStart,
        }
        if (!query.sortBy) {
          effectiveSortBy = 'fdExitDate'
          effectiveSortDir = 'desc'
        }
      } else if (exitScope === 'yesterday') {
        where.fdExitDate = {
          gte: yesterdayStart,
          lt: todayStart,
        }
        if (!query.sortBy) {
          effectiveSortBy = 'fdExitDate'
          effectiveSortDir = 'desc'
        }
      } else if (exitScope === 'recent') {
        where.fdExitDate = {
          gte: sevenDaysAgoStart,
          lt: tomorrowStart,
        }
        if (!query.sortBy) {
          effectiveSortBy = 'fdExitDate'
          effectiveSortDir = 'desc'
        }
      } else if (exitScope === 'tomorrow') {
        const prediction = await computeExitPrediction(where)
        const expectedTomorrow = prediction.prediksiExitList.filter((p: any) => {
          const pDate = new Date(p.predictedExitDate)
          return pDate >= tomorrowStart && pDate < dayAfterTomorrowStart
        })
        const codes = expectedTomorrow.map((p: any) => p.fdMarkingCode.trim())
        if (codes.length === 0) {
          return {
            data: [],
            meta: meta(0),
          }
        }
        where.fdMarkingCode = { in: codes }
        tomorrowItems = expectedTomorrow
        if (!query.sortBy) {
          effectiveSortBy = 'fdETA'
          effectiveSortDir = 'asc'
        }
      } else if (exitScope === 'eta_not_exit' || exitScope === 'etaNotExit') {
        where.fdExitDate = null
        where.fdETA = { lt: today }
        if (!query.sortBy) {
          effectiveSortBy = 'fdETA'
          effectiveSortDir = 'asc'
        }
      } else if (exitScope === 'missed_sla' || exitScope === 'missedSla') {
        const batchesWithETD = await prisma.tbMarking.findMany({
          where: {
            ...where,
            fdETD: { not: null },
            fdETA: { not: null },
          },
          select: {
            fdMarkingCode: true,
            fdListType: true,
            fdETD: true,
            fdETA: true,
          },
        })

        const missedCodes: string[] = []
        for (const batch of batchesWithETD) {
          if (batch.fdETD && batch.fdETA) {
            const diffTime = Math.abs(batch.fdETA.getTime() - batch.fdETD.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            let maxTarget = 0
            const code = batch.fdMarkingCode.trim().toUpperCase()
            if (batch.fdListType === 1) { // AIR
              if (code.includes('SG')) maxTarget = 5
              else if (code.includes('HK')) maxTarget = 7
              else if (code.includes('GZ')) maxTarget = 10
            } else { // SEA
              if (code.includes('SG')) maxTarget = 20
              else if (code.includes('HK') || code.includes('GZ') || code.includes('SH')) maxTarget = 30
              else if (code.includes('YW')) maxTarget = 40
            }
            if (maxTarget > 0 && diffDays > maxTarget) {
              missedCodes.push(batch.fdMarkingCode.trim())
            }
          }
        }

        if (missedCodes.length === 0) {
          return {
            data: [],
            meta: meta(0),
          }
        }
        where.fdMarkingCode = { in: missedCodes }
        if (!query.sortBy) {
          effectiveSortBy = 'fdETA'
          effectiveSortDir = 'desc'
        }
      }
    } else {
      if (isClosed === 'true') {
        where.fdExitDate = { not: null }
      } else if (isClosed === 'false') {
        where.fdExitDate = null
      }
    }

    if (groupMode && groupValue && groupValue !== 'Tidak diketahui') {
      if (groupMode === 'branch') {
        where.fdBranchCode = groupValue
      } else if (groupMode === 'year') {
        const year = parseInt(groupValue, 10)
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`)
        const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`)
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { fdLoadDate: { gte: startDate, lt: endDate } },
              { fdLoadDate: null, fdSysDate: { gte: startDate, lt: endDate } },
            ],
          },
        ]
      } else if (['load', 'etd', 'eta'].includes(groupMode)) {
        const [yearStr, monthStr] = groupValue.split('-')
        if (yearStr && monthStr) {
          const year = parseInt(yearStr, 10)
          const month = parseInt(monthStr, 10)
          const startDate = new Date(year, month - 1, 1)
          const endDate = new Date(year, month, 1)

          if (groupMode === 'load') {
            where.AND = [
              ...(where.AND || []),
              {
                OR: [
                  { fdLoadDate: { gte: startDate, lt: endDate } },
                  { fdLoadDate: null, fdSysDate: { gte: startDate, lt: endDate } },
                ],
              },
            ]
          } else {
            const field = groupMode === 'etd' ? 'fdETD' : 'fdETA'
            where[field] = { gte: startDate, lt: endDate }
          }
        }
      }
    } else if (groupMode && groupValue === 'Tidak diketahui') {
      if (groupMode === 'branch') {
        where.fdBranchCode = { in: ['', null] }
      } else if (groupMode === 'year' || groupMode === 'load') {
        where.fdLoadDate = null
        where.fdSysDate = null
      } else {
        const field = groupMode === 'etd' ? 'fdETD' : 'fdETA'
        where[field] = null
      }
    }

    let [data, total] = await Promise.all([
      prisma.tbMarking.findMany({
        where,
        skip,
        take,
        orderBy: {
          [effectiveSortBy]: effectiveSortDir,
        },
      }),
      prisma.tbMarking.count({ where }),
    ])

    if (tomorrowItems.length > 0) {
      data = data.map((item: any) => {
        const match = tomorrowItems.find((p: any) => p.fdMarkingCode.trim() === item.fdMarkingCode.trim())
        return {
          ...item,
          predictedExitDate: match?.predictedExitDate || null,
        }
      })
    }

    return {
      data,
      meta: meta(total),
    }
  } catch (error) {
    logger.error('Error fetching markings:', error)
    throw new Error('Gagal mengambil data marking')
  }
}

export async function getMarkingGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim() || ''
  const listType = query.listType
  const isClosed = query.isClosed
  const groupMode = query.groupMode

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
        { fdKet: { contains: search } },
        { fdBranchCode: { contains: search } },
        { fdWilayah: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '' && listType !== 'ALL') {
      where.fdListType = parseInt(listType, 10)
    }

    if (isClosed === 'true') {
      where.fdExitDate = { not: null }
    } else if (isClosed === 'false') {
      where.fdExitDate = null
    }

    if (!groupMode || groupMode === 'none') {
      const agg = await prisma.tbMarking.aggregate({
        where,
        _count: { _all: true },
        _sum: { fdJmlPack: true, fdJmlBerat: true },
      })

      return [{
        groupValue: 'Semua batch',
        count: agg._count._all,
        totalPkgs: Number(agg._sum.fdJmlPack || 0),
        totalWeight: Number(agg._sum.fdJmlBerat || 0),
      }]
    }

    const data = await prisma.tbMarking.findMany({
      where,
      select: {
        fdBranchCode: true,
        fdLoadDate: true,
        fdSysDate: true,
        fdETD: true,
        fdETA: true,
        fdJmlPack: true,
        fdJmlBerat: true,
      },
    })

    const groups: Record<string, { count: number; totalPkgs: number; totalWeight: number }> = {}

    data.forEach((row) => {
      let key = 'Tidak diketahui'
      if (groupMode === 'branch') {
        key = row.fdBranchCode ? row.fdBranchCode.trim() : 'Tidak diketahui'
        if (key === '') key = 'Tidak diketahui'
      } else if (groupMode === 'year') {
        const dateField = row.fdLoadDate || row.fdSysDate
        key = dateField ? String(dateField.getFullYear()) : 'Tidak diketahui'
      } else {
        const dateField = groupMode === 'load' ? (row.fdLoadDate || row.fdSysDate) : groupMode === 'etd' ? row.fdETD : row.fdETA
        if (dateField) {
          const m = String(dateField.getMonth() + 1).padStart(2, '0')
          key = `${dateField.getFullYear()}-${m}`
        }
      }

      const group = (groups[key] = groups[key] || { count: 0, totalPkgs: 0, totalWeight: 0 })
      group.count += 1
      group.totalPkgs += Number(row.fdJmlPack || 0)
      group.totalWeight += Number(row.fdJmlBerat || 0)
    })

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Tidak diketahui") return 1
      if (b === "Tidak diketahui") return -1
      if (groupMode === "branch") return a.localeCompare(b)
      return b.localeCompare(a)
    })

    return sortedKeys.map(k => ({
      groupValue: k,
      ...groups[k]
    }))
  } catch (error) {
    logger.error('Error fetching marking groups:', error)
    throw new Error('Gagal mengambil data grup marking')
  }
}

export async function getMarkingDetail(fdMarkingCode: string) {
  try {
    const marking = await prisma.tbMarking.findUnique({
      where: { fdMarkingCode },
    })

    if (!marking) {
      throw new Error('Data marking tidak ditemukan')
    }

    return marking
  } catch (error) {
    logger.error(`Error fetching marking detail for ${fdMarkingCode}:`, error)
    throw error
  }
}

export async function getManifestByMarkingCode(fdMarkingCode: string) {
  try {
    const cleanCode = fdMarkingCode.trim()
    const manifest = await prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(NULLIF(RTRIM(c.fdCustName), ''), RTRIM(s.fdCustName)) as fdCustName,
        RTRIM(s.fdListCode) as fdListCode,
        RTRIM(s.fdTerima) as fdTerima,
        s.fdTglAgent,
        RTRIM(s.fdMarkingCode) as fdMarkingCode,
        RTRIM(s.fdMarkingNo) as fdMarkingNo,
        RTRIM(s.fdBranchCode) as fdBranchCode,
        s.fdJmlPack,
        RTRIM(s.fdSatuan) as fdSatuan,
        s.fdJmlBerat,
        s.fdListType,
        RTRIM(s.fdDesc) as fdDesc,
        RTRIM(s.fdComodity) as fdComodity,
        RTRIM(tc.fdComodityName) as fdComodityName,
        RTRIM(tc.fdComodityName) as typeComodityName,
        s.fdTypeComodity,
        s.fdM3,
        s.fdCancel,
        RTRIM(s.fdMarkingCodeAsal) as fdMarkingCodeAsal,
        RTRIM(el.fdTrackingNo) as fdLocalTrackingNo,
        RTRIM(c.fdSalesNM) as fdSalesNM,
        -- Blocked Finance Info
        ISNULL(bf.isBlocked, 0) as isBlocked,
        bf.fdCreated as blockedBy,
        bf.fdKeterangan as blockedReason,
        ISNULL(c.fdBlocked, 0) as custBlocked,
        -- Financial status: ambil dari status customer tbCustomers.fdBlocked, override ke BLOCKED jika diblokir finance
        CASE 
          WHEN ISNULL(bf.isBlocked, 0) = 1 THEN 'BLOCKED'
          WHEN c.fdBlocked = 1 THEN 'OK'
          WHEN c.fdBlocked = 2 THEN 'COD'
          WHEN c.fdBlocked = 3 THEN 'WARNING'
          WHEN c.fdBlocked = 4 THEN 'BLOCKED'
          WHEN c.fdBlocked = 5 THEN 'URGENT'
          ELSE 'NO STATUS'
        END as financialStatus
      FROM vwShipment s WITH (NOLOCK)
      LEFT JOIN tbEntryList el WITH (NOLOCK) ON s.fdListCode = el.fdListCode
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON el.fdCustCode = c.fdCustCode
      LEFT JOIN tbTypeComodity tc WITH (NOLOCK) ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType
      LEFT JOIN (
        SELECT fdListCode, 
               fdBlocked as isBlocked,
               RTRIM(fdCreated) as fdCreated, 
               RTRIM(fdKeterangan) as fdKeterangan,
               ROW_NUMBER() OVER (PARTITION BY fdListCode ORDER BY fdID DESC) as rn
        FROM tbEntryList_Bloked_Finance WITH (NOLOCK)
      ) bf ON s.fdListCode = bf.fdListCode AND bf.rn = 1
      WHERE s.fdMarkingCode = ${cleanCode}
      ORDER BY s.fdListCode ASC
    `
    return manifest
  } catch (error) {
    logger.error(`Error fetching manifest for ${fdMarkingCode}:`, error)
    try {
      return await prisma.vwShipment.findMany({
        where: { fdMarkingCode },
        orderBy: { fdListCode: 'asc' }
      })
    } catch {
      throw new Error('Gagal mengambil data manifest')
    }
  }
}

export async function searchManifestSuggestions(fdMarkingCode: string, query: string): Promise<string[]> {
  try {
    const q = query.trim()
    if (!q || q.length < 2) return []

    const results = await prisma.vwShipment.findMany({
      where: {
        fdMarkingCode,
        OR: [
          { fdListCode: { contains: q } },
          { fdCustName: { contains: q } },
          { fdMarkingNo: { contains: q } },
          { fdComodity: { contains: q } },
        ],
      },
      select: {
        fdListCode: true,
        fdCustName: true,
        fdMarkingNo: true,
        fdComodity: true,
      },
      take: 30,
    })

    const seen = new Set<string>()
    const suggestions: string[] = []

    for (const row of results) {
      const candidates = [row.fdListCode, row.fdCustName, row.fdMarkingNo, row.fdComodity]
      for (const val of candidates) {
        if (val && val.toLowerCase().includes(q.toLowerCase()) && !seen.has(val)) {
          seen.add(val)
          suggestions.push(val)
          if (suggestions.length >= 10) break
        }
      }
      if (suggestions.length >= 10) break
    }

    return suggestions
  } catch (error) {
    logger.error(`Error searching manifest suggestions for ${fdMarkingCode}:`, error)
    throw new Error('Gagal mengambil suggestions manifest')
  }
}

export interface MarkingSuggestion {
  type: 'marking' | 'container' | 'bl_awb' | 'consignee'
  title: string
  subtitle: string
  value: string
}

export async function getMarkingSuggestions(keyword: string): Promise<MarkingSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `marking:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<MarkingSuggestion[]>(cacheKey)
  if (cached) return cached

  const searchLike = `%${cleanQ}%`

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT TOP 15 
        RTRIM(ISNULL(fdMarkingCode, '')) AS fdMarkingCode,
        RTRIM(ISNULL(fdContNo, '')) AS fdContNo,
        RTRIM(ISNULL(fdBLNo, '')) AS fdBLNo,
        RTRIM(ISNULL(fdAWB, '')) AS fdAWB,
        RTRIM(ISNULL(fdConsignee, '')) AS fdConsignee
      FROM tbMarking WITH (NOLOCK)
      WHERE fdMarkingCode LIKE ${searchLike} 
         OR fdContNo LIKE ${searchLike} 
         OR fdBLNo LIKE ${searchLike} 
         OR fdAWB LIKE ${searchLike} 
         OR fdConsignee LIKE ${searchLike}
      ORDER BY fdSysDate DESC
    `

    const suggestions: MarkingSuggestion[] = []
    const seen = new Set<string>()
    const qLower = cleanQ.toLowerCase()

    for (const row of rows) {
      if (row.fdMarkingCode && row.fdMarkingCode.toLowerCase().includes(qLower) && !seen.has(`m:${row.fdMarkingCode}`)) {
        seen.add(`m:${row.fdMarkingCode}`)
        suggestions.push({
          type: 'marking',
          title: row.fdMarkingCode,
          subtitle: row.fdContNo ? `Kontainer: ${row.fdContNo}` : 'Batch Marking',
          value: row.fdMarkingCode,
        })
      }
      if (row.fdContNo && row.fdContNo.toLowerCase().includes(qLower) && !seen.has(`c:${row.fdContNo}`)) {
        seen.add(`c:${row.fdContNo}`)
        suggestions.push({
          type: 'container',
          title: row.fdContNo,
          subtitle: `No. Kontainer (${row.fdMarkingCode})`,
          value: row.fdContNo,
        })
      }
      if (row.fdBLNo && row.fdBLNo.toLowerCase().includes(qLower) && !seen.has(`bl:${row.fdBLNo}`)) {
        seen.add(`bl:${row.fdBLNo}`)
        suggestions.push({
          type: 'bl_awb',
          title: row.fdBLNo,
          subtitle: `B/L (${row.fdMarkingCode})`,
          value: row.fdBLNo,
        })
      }
      if (row.fdAWB && row.fdAWB.toLowerCase().includes(qLower) && !seen.has(`awb:${row.fdAWB}`)) {
        seen.add(`awb:${row.fdAWB}`)
        suggestions.push({
          type: 'bl_awb',
          title: row.fdAWB,
          subtitle: `AWB Udara (${row.fdMarkingCode})`,
          value: row.fdAWB,
        })
      }
      if (row.fdConsignee && row.fdConsignee.toLowerCase().includes(qLower) && !seen.has(`cs:${row.fdConsignee}`)) {
        seen.add(`cs:${row.fdConsignee}`)
        suggestions.push({
          type: 'consignee',
          title: row.fdConsignee,
          subtitle: `Consignee (${row.fdMarkingCode})`,
          value: row.fdConsignee,
        })
      }
      if (suggestions.length >= 10) break
    }

    suggestionCache.set(cacheKey, suggestions)
    return suggestions
  } catch (error) {
    logger.error('Error in getMarkingSuggestions:', error)
    return []
  }
}
