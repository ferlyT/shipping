import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'
import { suggestionCache } from '../../utils/cache'

import { computeExitPrediction } from './marking-analytics.service'
import { calculateSizeSummaryMetrics, calculateVfc } from './marking.utils'

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
      const cleanSearch = search.replace(/[^A-Za-z0-9]/g, '').trim()
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
      if (cleanSearch && cleanSearch !== search) {
        where.OR.push(
          { fdMarkingCode: { contains: cleanSearch } },
          { fdContNo: { contains: cleanSearch } },
          { fdBLNo: { contains: cleanSearch } },
        )
      }
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

/**
 * Audit Ukuran & Tonase per Batch Marking (sp_tbEntryListDetail_permarking)
 */
export async function getMarkingSizeAudit(
  markingCode: string,
  sortById: 1 | 2 = 1
): Promise<import('./marking.types').MarkingSizeAuditResponse> {
  const cleanCode = markingCode.trim().replace(/'/g, "''")

  // 1. Fetch Header Info from tbMarking
  let headerRow: any = null
  try {
    const headerRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT TOP 1 
        RTRIM(fdMarkingCode) AS fdMarkingCode,
        fdListType,
        RTRIM(fdContSize) AS fdContSize,
        RTRIM(fdContNo) AS fdContNo,
        fdExitDate,
        fdLoadDate,
        fdETA AS fdEtaDate,
        ISNULL(fdM3, 0) AS fdM3,
        ISNULL(fdJmlPack, 0) AS fdJmlPack
      FROM tbMarking WITH (NOLOCK)
      WHERE RTRIM(fdMarkingCode) = '${cleanCode}'
    `)
    headerRow = headerRows[0] || null
  } catch (err) {
    logger.warn(`Failed to fetch tbMarking header for ${cleanCode}, continuing with defaults:`, err)
  }

  // 2. Fetch Details via Stored Procedure sp_tbEntryListDetail_permarking
  let rawRows: any[] = []
  try {
    rawRows = await prisma.$queryRawUnsafe(`
      EXEC sp_tbEntryListDetail_permarking @ID = ${sortById === 2 ? 2 : 1}, @fdMarkCode = '${cleanCode}'
    `)
  } catch (err) {
    logger.error(`Error executing sp_tbEntryListDetail_permarking for ${cleanCode}:`, err)
    // Retry once
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      rawRows = await prisma.$queryRawUnsafe(`
        EXEC sp_tbEntryListDetail_permarking @ID = ${sortById === 2 ? 2 : 1}, @fdMarkCode = '${cleanCode}'
      `)
    } catch (retryErr) {
      logger.error(`Retry failed for sp_tbEntryListDetail_permarking ${cleanCode}:`, retryErr)
      throw new Error(`Gagal memuat data ukuran batch ${markingCode}`)
    }
  }

  // 2b. Cek apakah ada record di tbEntryListDetailOri (menandakan ukuran fisik di-markup)
  let markupSet = new Set<string>()
  try {
    const markupRows = await prisma.$queryRawUnsafe<Array<{ fdListCode: string }>>(`
      SELECT DISTINCT RTRIM(o.fdListCode) AS fdListCode
      FROM tbEntryListDetailOri o WITH (NOLOCK)
      INNER JOIN tbEntryList e WITH (NOLOCK) ON o.fdListCode = e.fdListCode
      WHERE RTRIM(e.fdMarkingCode) = '${cleanCode}'
    `)
    markupSet = new Set((markupRows || []).map((r) => String(r.fdListCode || '').trim()))
  } catch (err) {
    logger.warn(`Failed to check markup status from tbEntryListDetailOri for ${cleanCode}:`, err)
  }

  // 3. Normalize Rows and verify Single Source of Truth for customer names
  let totalPackGdg = 0
  let totalM3Gdg = 0
  let totalM3Komplain = 0
  let totalBeratList = 0
  let totalBeratGdg = 0
  let totalBeratSJ = 0
  let totalBeratKomplain = 0

  const items: import('./marking.types').MarkingSizeDetailItem[] = rawRows.map((r: any) => {
    const fdListCode = String(r.fdListCode || '').trim()
    const fdJmlPack = Number(r.fdJmlPack) || 0
    const fdTotalQty = Number(r.fdTotalQty) || 0
    const fdM3List = Number(r.fdM3List) || 0
    const fdM3 = Number(r.fdM3) || 0
    const fdM3PL = Number(r.fdM3PL) || 0
    const fdm3Komplain = Number(r.fdm3Komplain) || 0
    const fdJmlBerat = Number(r.fdJmlBerat) || 0
    const fdJmlBeratGudang = Number(r.fdJmlBeratGudang) || 0
    const fdJmlBeratSJ = Number(r.fdJmlBeratSJ) || 0
    const fdJmlBeratKomplain = Number(r.fdJmlBeratKomplain) || 0
    const fdSelisihM3 = Number(r.fdSelisihM3) || 0
    const fdSelisihBerat = Number(r.fdSelisihBerat) || 0
    const hasMarkup = markupSet.has(fdListCode)

    totalPackGdg += fdTotalQty
    totalM3Gdg += fdM3
    totalM3Komplain += fdm3Komplain
    totalBeratList += fdJmlBerat
    totalBeratGdg += fdJmlBeratGudang
    totalBeratSJ += fdJmlBeratSJ
    totalBeratKomplain += fdJmlBeratKomplain

    return {
      fdCustName: String(r.fdCustName || '').trim(),
      fdListCode,
      fdJmlBerat,
      fdListType: Number(r.fdListType) || (headerRow?.fdListType ?? 2),
      fdMarkingCode: String(r.fdMarkingCode || '').trim(),
      fdMarkingNo: String(r.fdMarkingNo || '').trim(),
      fdJmlPack,
      fdM3List,
      fdComodity: String(r.fdComodity || '').trim(),
      fdDesc: String(r.fdDesc || '').trim(),
      fdTotalQty,
      fdM3,
      fdExitDate: r.fdExitDate ? new Date(r.fdExitDate).toISOString() : null,
      fdM3PL,
      fdJmlBeratSJ,
      fdm3Komplain,
      fdJmlBeratKomplain,
      fdJmlBeratGudang,
      fdKeterangan: String(r.fdKeterangan || '').trim(),
      fdSelisihM3,
      fdSelisihBerat,
      hasMarkup,
    }
  })

  // 4. Calculate Master Header & Summary Metrics
  const listType = Number(headerRow?.fdListType ?? (items[0]?.fdListType ?? 2))
  const totalPackPL = Number(headerRow?.fdJmlPack) || items.reduce((acc, it) => acc + it.fdJmlPack, 0)
  const totalM3PL = Number(headerRow?.fdM3) || (items[0]?.fdM3PL ?? items.reduce((acc, it) => acc + it.fdM3List, 0))
  const metrics = calculateSizeSummaryMetrics({
    totalPackPL,
    totalPackGdg,
    totalM3PL,
    totalM3Gdg,
    totalM3Komplain,
    totalBeratList,
    totalBeratGdg,
    totalBeratKomplain,
  })

  return {
    header: {
      fdMarkingCode: headerRow?.fdMarkingCode || cleanCode,
      fdListType: listType,
      fdContSize: headerRow?.fdContSize || null,
      fdContNo: headerRow?.fdContNo || null,
      fdExitDate: headerRow?.fdExitDate ? new Date(headerRow.fdExitDate).toISOString() : null,
      fdLoadDate: headerRow?.fdLoadDate ? new Date(headerRow.fdLoadDate).toISOString() : null,
      fdEtaDate: headerRow?.fdEtaDate ? new Date(headerRow.fdEtaDate).toISOString() : null,
      fdM3: Number(totalM3PL.toFixed(4)),
      fdJmlPack: totalPackPL,
    },
    summary: {
      markingCode: headerRow?.fdMarkingCode || cleanCode,
      listType,
      contSize: headerRow?.fdContSize || null,
      contNo: headerRow?.fdContNo || null,
      exitDate: headerRow?.fdExitDate ? new Date(headerRow.fdExitDate).toISOString() : null,
      loadDate: headerRow?.fdLoadDate ? new Date(headerRow.fdLoadDate).toISOString() : null,
      etaDate: headerRow?.fdEtaDate ? new Date(headerRow.fdEtaDate).toISOString() : null,
      totalPackPL,
      totalPackGdg,
      selisihPack: metrics.selisihPack,
      totalM3PL: Number(totalM3PL.toFixed(4)),
      totalM3Gdg: Number(totalM3Gdg.toFixed(4)),
      totalM3Komplain: Number(totalM3Komplain.toFixed(4)),
      totalM3Net: metrics.totalM3Net,
      selisihM3: metrics.selisihM3,
      persenSelisihM3: metrics.persenSelisihM3,
      totalBeratList: Number(totalBeratList.toFixed(2)),
      totalBeratGdg: Number(totalBeratGdg.toFixed(2)),
      totalBeratSJ: Number(totalBeratSJ.toFixed(2)),
      totalBeratKomplain: Number(totalBeratKomplain.toFixed(2)),
      totalBeratNet: metrics.totalBeratNet,
      totalVFC: calculateVfc(totalM3Gdg),
      totalRowCount: items.length,
      totalMarkupCount: markupSet.size,
    },
    items,
  }
}

/**
 * Drilldown Dimensi Fisik Koli:
 * - tbEntryListDetail (Gudang Fisik Aktif)
 * - tbEntryListDetailOri (Data Asli Gudang sebelum markup)
 * - tbEntryListDetail_PackingList (Data Packing List)
 * - tbEntryListDetail_Komplain (Data Komplain)
 */
export async function getMarkingBoxDimensions(
  listCode: string
): Promise<import('./marking.types').BoxDimensionDetailResponse> {
  const cleanListCode = listCode.trim().replace(/'/g, "''")

  try {
    const [gudangRows, asliRows, plRows, komplainRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(fdListDCode) AS fdListDCode, fdPjg, fdLbr, fdTng, fdQty, RTRIM(ISNULL(fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = '${cleanListCode}'
        ORDER BY fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(fdListDCode) AS fdListDCode, fdPjg, fdLbr, fdTng, fdQty, RTRIM(ISNULL(fdDescr, '')) AS fdDescr
        FROM tbEntryListDetailOri WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = '${cleanListCode}'
        ORDER BY fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(fdListDCode) AS fdListDCode, fdPjg, fdLbr, fdTng, fdQty, RTRIM(ISNULL(fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail_PackingList WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = '${cleanListCode}'
        ORDER BY fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(fdListDCode) AS fdListDCode, fdPjg, fdLbr, fdTng, fdQty, RTRIM(ISNULL(fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail_Komplain WITH (NOLOCK)
        WHERE RTRIM(fdListCode) = '${cleanListCode}'
        ORDER BY fdListDCode ASC
      `),
    ])

    const mapBoxItem = (r: any, idx: number): import('./marking.types').BoxDimensionItem => {
      const p = Number(r.fdPjg) || 0
      const l = Number(r.fdLbr) || 0
      const t = Number(r.fdTng) || 0
      const q = Number(r.fdQty) || 0
      const m3 = Number(((p * l * t * q) / 1000000).toFixed(4))
      const vfc = Number(((p * l * t * q) / 6000).toFixed(2))

      return {
        no: idx + 1,
        fdListDCode: r.fdListDCode ? String(r.fdListDCode).trim() : null,
        fdPjg: p,
        fdLbr: l,
        fdTng: t,
        fdQty: q,
        m3,
        vfc,
        fdDescr: r.fdDescr ? String(r.fdDescr).trim() : null,
      }
    }

    const asliGudang = (asliRows || []).map(mapBoxItem)
    const hasMarkup = asliGudang.length > 0

    return {
      listCode: cleanListCode,
      gudang: (gudangRows || []).map(mapBoxItem),
      asliGudang,
      packingList: (plRows || []).map(mapBoxItem),
      komplain: (komplainRows || []).map(mapBoxItem),
      hasMarkup,
      original: asliGudang, // alias untuk backward compatibility
    }
  } catch (error) {
    logger.error(`Error in getMarkingBoxDimensions for listCode ${listCode}:`, error)
    return {
      listCode: cleanListCode,
      gudang: [],
      asliGudang: [],
      packingList: [],
      komplain: [],
      hasMarkup: false,
      original: [],
    }
  }
}

/**
 * Ambil semua dimensi box untuk seluruh listcode dalam batch marking (untuk ekspor Excel)
 */
export async function getMarkingBatchAllDimensions(markingCode: string) {
  const cleanCode = markingCode.trim().replace(/'/g, "''")

  try {
    const [gudangRows, oriRows, plRows, komplainRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(d.fdListCode) AS fdListCode, RTRIM(d.fdListDCode) AS fdListDCode, d.fdPjg, d.fdLbr, d.fdTng, d.fdQty, RTRIM(ISNULL(d.fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail d WITH (NOLOCK)
        INNER JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
        WHERE RTRIM(e.fdMarkingCode) = '${cleanCode}'
        ORDER BY d.fdListCode, d.fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(d.fdListCode) AS fdListCode, RTRIM(d.fdListDCode) AS fdListDCode, d.fdPjg, d.fdLbr, d.fdTng, d.fdQty, RTRIM(ISNULL(d.fdDescr, '')) AS fdDescr
        FROM tbEntryListDetailOri d WITH (NOLOCK)
        INNER JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
        WHERE RTRIM(e.fdMarkingCode) = '${cleanCode}'
        ORDER BY d.fdListCode, d.fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(d.fdListCode) AS fdListCode, RTRIM(d.fdListDCode) AS fdListDCode, d.fdPjg, d.fdLbr, d.fdTng, d.fdQty, RTRIM(ISNULL(d.fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail_PackingList d WITH (NOLOCK)
        INNER JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
        WHERE RTRIM(e.fdMarkingCode) = '${cleanCode}'
        ORDER BY d.fdListCode, d.fdListDCode ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT RTRIM(d.fdListCode) AS fdListCode, RTRIM(d.fdListDCode) AS fdListDCode, d.fdPjg, d.fdLbr, d.fdTng, d.fdQty, RTRIM(ISNULL(d.fdDescr, '')) AS fdDescr
        FROM tbEntryListDetail_Komplain d WITH (NOLOCK)
        INNER JOIN tbEntryList e WITH (NOLOCK) ON d.fdListCode = e.fdListCode
        WHERE RTRIM(e.fdMarkingCode) = '${cleanCode}'
        ORDER BY d.fdListCode, d.fdListDCode ASC
      `),
    ])

    return {
      markingCode: cleanCode,
      gudang: gudangRows || [],
      original: oriRows || [],
      asliGudang: oriRows || [],
      packingList: plRows || [],
      komplain: komplainRows || [],
    }
  } catch (error) {
    return {
      markingCode: cleanCode,
      gudang: [],
      original: [],
      komplain: [],
    }
  }
}

/**
 * Update Exit Date pada tbMarking
 * - Validasi batch ada di database
 * - Validasi tanggal kronologis: newExitDate >= fdLoadDate & newExitDate >= fdETD
 * - Validasi future date: maksimal 3 hari ke depan dari hari ini
 * - Update fdExitDate, fdUpdate = NOW(), fdUpdateBy = user
 */
export async function updateMarkingExitDate(
  markingCode: string,
  payload: { exitDate: string; notes?: string },
  user: { username?: string; fullName?: string | null; role?: string }
) {
  const cleanCode = markingCode.trim()
  const exitDateObj = new Date(payload.exitDate)
  if (isNaN(exitDateObj.getTime())) {
    throw new Error('Format tanggal exit tidak valid')
  }

  const marking = await prisma.tbMarking.findUnique({
    where: { fdMarkingCode: cleanCode },
  })

  if (!marking) {
    throw new Error(`Data batch marking "${cleanCode}" tidak ditemukan`)
  }

  // 1. Validasi Batas Kronologis (Back Date guard)
  if (marking.fdLoadDate) {
    const loadDate = new Date(marking.fdLoadDate)
    loadDate.setHours(0, 0, 0, 0)
    const checkExit = new Date(exitDateObj)
    checkExit.setHours(0, 0, 0, 0)
    if (checkExit < loadDate) {
      const loadDateFormatted = loadDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      throw new Error(`Tanggal exit tidak boleh lebih awal dari tanggal muat (${loadDateFormatted})`)
    }
  }

  if (marking.fdETD) {
    const etdDate = new Date(marking.fdETD)
    etdDate.setHours(0, 0, 0, 0)
    const checkExit = new Date(exitDateObj)
    checkExit.setHours(0, 0, 0, 0)
    if (checkExit < etdDate) {
      const etdDateFormatted = etdDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      throw new Error(`Tanggal exit tidak boleh lebih awal dari tanggal keberangkatan / ETD (${etdDateFormatted})`)
    }
  }

  // 2. Validasi Future Date (Maksimal 3 hari ke depan)
  const now = new Date()
  const maxFutureDate = new Date(now)
  maxFutureDate.setDate(maxFutureDate.getDate() + 3)
  maxFutureDate.setHours(23, 59, 59, 999)

  if (exitDateObj > maxFutureDate) {
    throw new Error('Tanggal exit tidak boleh lebih dari 3 hari ke depan dari hari ini')
  }

  // 3. Update Database
  const updatedBy = (user.username || user.fullName || 'MOBILE').trim().slice(0, 30)
  const updated = await prisma.tbMarking.update({
    where: { fdMarkingCode: cleanCode },
    data: {
      fdExitDate: exitDateObj,
      fdUpdate: new Date(),
      fdUpdateBy: updatedBy,
    },
  })

  logger.info(`[Marking] Exit date updated for ${cleanCode} to ${exitDateObj.toISOString()} by ${updatedBy}`)

  return updated
}



