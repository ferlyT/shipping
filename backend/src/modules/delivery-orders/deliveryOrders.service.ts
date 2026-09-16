import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { suggestionCache } from '../../utils/cache'

// Re-export types
export * from './deliveryOrders.types'

const MIN_LOAD_DATE = new Date('2019-01-01T00:00:00.000Z')

export async function getDeliveryOrders(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const listCode = query.listCode?.trim()

  const where: Prisma.TbDeliveryWhereInput = {
    fdSJDate: { gte: MIN_LOAD_DATE },
  }

  if (listCode) {
    where.fdListCode = listCode
  }

  if (search) {
    where.AND = [
      { fdSJDate: { gte: MIN_LOAD_DATE } },
      {
        OR: [
          { fdSJNo: { contains: search } },
          { fdDescr: { contains: search } },
          { fdCustCode: { contains: search } },
          { fdCustNameSJ: { contains: search } },
          { fdSupir: { contains: search } },
          { fdCarID: { contains: search } },
        ],
      },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.tbDelivery.findMany({
      where,
      skip,
      take,
      orderBy: { fdSJDate: 'desc' },
      select: {
        fdSJNo: true,
        fdSJDate: true,
        fdCustCode: true,
        fdCustNameSJ: true,
        fdDescr: true,
        fdSupir: true,
        fdCarID: true,
        fdJmlPackSJ: true,
        fdJmlBeratSJ: true,
        fdEstimasi: true,
        fdSent: true,
        fdGiveDate: true,
      },
    }),
    prisma.tbDelivery.count({ where }),
  ])

  return { data, meta: meta(total) }
}

export async function getDeliveryOrderById(id: string) {
  return prisma.tbDelivery.findUnique({
    where: { fdSJNo: id },
  })
}

export async function getDeliveryOrdersKPIs(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  
  const now = new Date()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const baseWhere: Prisma.TbDeliveryWhereInput = {
    fdSJDate: { gte: startOfLastMonth },
  }

  const where: Prisma.TbDeliveryWhereInput = search
    ? {
        ...baseWhere,
        OR: [
          { fdSJNo: { contains: search } },
          { fdDescr: { contains: search } },
          { fdCustCode: { contains: search } },
          { fdCustNameSJ: { contains: search } },
          { fdSupir: { contains: search } },
          { fdCarID: { contains: search } },
        ],
      }
    : baseWhere

  const [totalSJ, totalAgg, sjBulanIni, onDelivery] = await Promise.all([
    prisma.tbDelivery.count({ where }),
    prisma.tbDelivery.aggregate({
      where,
      _sum: { fdJmlPackSJ: true, fdJmlBeratSJ: true },
    }),
    prisma.tbDelivery.count({
      where: {
        ...where,
        fdSJDate: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
    prisma.tbDelivery.count({
      where: {
        ...where,
        OR: [
          { fdSent: 0 },
          { fdSent: null },
        ],
      },
    }),
  ])

  return {
    totalSJ,
    totalPackages: totalAgg._sum.fdJmlPackSJ || 0,
    totalWeight: totalAgg._sum.fdJmlBeratSJ || 0,
    sjBulanIni,
    onDelivery,
  }
}

export async function getDeliveryGroupedByListCode(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const markingCode = query.markingCode?.trim()
  const branch = query.branch?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (markingCode) {
    searchCondition = Prisma.sql`${searchCondition} AND el.fdMarkingCode = ${markingCode}`
  }
  if (branch) {
    searchCondition = Prisma.sql`${searchCondition} AND tm.fdBranchCode = ${branch}`
  }
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (el.fdListCode LIKE ${'%' + search + '%'} OR el.fdMarkingCode LIKE ${'%' + search + '%'} OR c.fdCustName LIKE ${'%' + search + '%'})`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const [data, totalResult] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        el.fdListCode                         AS listCode,
        el.fdMarkingCode                      AS markingCode,
        el.fdJmlPAck                          AS totalQty,
        el.fdCustName                         AS customerName,
        el.fdTrackingNo                       AS resiNo,
        el.fdComodity                         AS comodity,
        el.fdBranchCode                       AS branchCode,
        el.fdBranchName                       AS branchName,
        ISNULL(SUM(d.fdJmlPackSJ), 0)         AS totalTerkirim,
        (el.fdJmlPAck - ISNULL(SUM(d.fdJmlPackSJ), 0)) AS sisa,
        ISNULL(MAX(d.fdSent), 0)              AS isSent
      FROM (
        SELECT el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, c.fdCustName, el.fdTrackingNo, el.fdComodity,
               tm.fdBranchCode AS fdBranchCode, cb.fdBranchName AS fdBranchName
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
        ${searchCondition}
        GROUP BY el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, c.fdCustName, el.fdTrackingNo, el.fdComodity, tm.fdBranchCode, cb.fdBranchName
        ${havingClause}
        ORDER BY el.fdListCode DESC
        OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      ) el
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      GROUP BY el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, el.fdCustName, el.fdTrackingNo, el.fdComodity, el.fdBranchCode, el.fdBranchName
      ORDER BY el.fdListCode DESC
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT el.fdListCode
        FROM tbEntryList el WITH (NOLOCK)
        LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
        LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
        ${searchCondition}
        GROUP BY el.fdListCode
        ${havingClause}
      ) as t
    `,
  ])

  const total = Number((totalResult as any[])[0]?.count || 0)

  // Fix BigInt serialization issues before returning JSON
  const serializedData = (data as any[]).map((row) => {
    const newRow: any = { ...row }
    for (const key in newRow) {
      if (typeof newRow[key] === 'bigint') {
        newRow[key] = Number(newRow[key])
      }
    }
    return newRow
  })

  return { data: serializedData, meta: meta(total) }
}

export async function getDeliveryMarkingCodeGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (el.fdListCode LIKE ${'%' + search + '%'} OR el.fdMarkingCode LIKE ${'%' + search + '%'} OR c.fdCustName LIKE ${'%' + search + '%'})`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const groups = await prisma.$queryRaw`
    SELECT t.markingCode AS markingCode, COUNT(*) AS total
    FROM (
      SELECT el.fdMarkingCode AS markingCode, el.fdListCode
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      ${searchCondition}
      GROUP BY el.fdMarkingCode, el.fdListCode
      ${havingClause}
    ) t
    GROUP BY t.markingCode
    ORDER BY t.markingCode ASC
  `

  const data = (groups as any[]).map((row) => ({
    markingCode: row.markingCode,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}

export async function getDeliveryBranchGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType} AND (ISNULL(tm.fdLoadDate, tm.fdSysDate) >= ${MIN_LOAD_DATE})`
  if (search) {
    searchCondition = Prisma.sql`${searchCondition} AND (el.fdListCode LIKE ${'%' + search + '%'} OR el.fdMarkingCode LIKE ${'%' + search + '%'} OR c.fdCustName LIKE ${'%' + search + '%'})`
  }

  let havingClause = Prisma.empty
  if (query.sent === '0' || query.sent === '1') {
    const sentNum = query.sent === '1' ? 1 : 0
    havingClause = Prisma.sql`HAVING ISNULL(MAX(d.fdSent), 0) = ${sentNum}`
  }

  const groups = await prisma.$queryRaw`
    SELECT t.branchCode AS branchCode, MAX(t.branchName) AS branchName, COUNT(*) AS total
    FROM (
      SELECT el.fdListCode, tm.fdBranchCode AS branchCode, cb.fdBranchName AS branchName
      FROM tbEntryList el WITH (NOLOCK)
      LEFT JOIN tbCustomers c WITH (NOLOCK) ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d WITH (NOLOCK) ON d.fdListCode = el.fdListCode
      LEFT JOIN tbMarking tm WITH (NOLOCK) ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb WITH (NOLOCK) ON cb.fdBranchCode = tm.fdBranchCode
      ${searchCondition}
      GROUP BY el.fdListCode, tm.fdBranchCode, cb.fdBranchName
      ${havingClause}
    ) t
    GROUP BY t.branchCode
    ORDER BY t.branchCode ASC
  `

  const data = (groups as any[]).map((row) => ({
    branchCode: row.branchCode,
    branchName: row.branchName,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}

export interface DeliveryOrderSuggestion {
  type: 'sj' | 'customer' | 'supir' | 'car'
  title: string
  subtitle: string
  value: string
}

export async function getDeliveryOrderSuggestions(keyword: string): Promise<DeliveryOrderSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `do:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<DeliveryOrderSuggestion[]>(cacheKey)
  if (cached) return cached

  const prefixLike = `${cleanQ}%`
  const searchLike = `%${cleanQ}%`

  try {
    // Stage 1: Fast prefix match on fdSJNo (PK) bounded by fdSJDate >= '2023-01-01'
    let rows: any[] = (await prisma.$queryRaw<any[]>`
      SELECT TOP 15 
        RTRIM(ISNULL(fdSJNo, '')) AS fdSJNo,
        RTRIM(ISNULL(fdCustNameSJ, '')) AS fdCustNameSJ,
        RTRIM(ISNULL(fdSupir, '')) AS fdSupir,
        RTRIM(ISNULL(fdCarID, '')) AS fdCarID
      FROM tbDelivery WITH (NOLOCK)
      WHERE fdSJDate >= '2023-01-01'
        AND fdSJNo LIKE ${prefixLike}
      ORDER BY fdSJDate DESC
    `.catch(() => [] as any[])) || []

    // Stage 2: If fewer than 5 rows, search across all relevant fields bounded by fdSJDate >= '2023-01-01'
    if (rows.length < 5) {
      const fallbackRows: any[] = (await prisma.$queryRaw<any[]>`
        SELECT TOP 15 
          RTRIM(ISNULL(fdSJNo, '')) AS fdSJNo,
          RTRIM(ISNULL(fdCustNameSJ, '')) AS fdCustNameSJ,
          RTRIM(ISNULL(fdSupir, '')) AS fdSupir,
          RTRIM(ISNULL(fdCarID, '')) AS fdCarID
        FROM tbDelivery WITH (NOLOCK)
        WHERE fdSJDate >= '2023-01-01'
          AND (
            fdSJNo LIKE ${searchLike} 
            OR fdCustNameSJ LIKE ${searchLike} 
            OR fdSupir LIKE ${searchLike} 
            OR fdCarID LIKE ${searchLike}
          )
        ORDER BY fdSJDate DESC
      `.catch(() => [] as any[])) || []

      const existingSJNos = new Set((rows || []).map((r: any) => r.fdSJNo))
      for (const r of fallbackRows) {
        if (!existingSJNos.has(r.fdSJNo)) {
          rows.push(r)
        }
      }
    }

    const suggestions: DeliveryOrderSuggestion[] = []
    const seen = new Set<string>()
    const qLower = cleanQ.toLowerCase()

    for (const row of rows) {
      if (row.fdSJNo && row.fdSJNo.toLowerCase().includes(qLower) && !seen.has(`sj:${row.fdSJNo}`)) {
        seen.add(`sj:${row.fdSJNo}`)
        suggestions.push({
          type: 'sj',
          title: row.fdSJNo,
          subtitle: row.fdCustNameSJ ? `Customer: ${row.fdCustNameSJ}` : 'Nomor Surat Jalan',
          value: row.fdSJNo,
        })
      }
      if (row.fdCustNameSJ && row.fdCustNameSJ.toLowerCase().includes(qLower) && !seen.has(`c:${row.fdCustNameSJ}`)) {
        seen.add(`c:${row.fdCustNameSJ}`)
        suggestions.push({
          type: 'customer',
          title: row.fdCustNameSJ,
          subtitle: 'Penerima / Customer',
          value: row.fdCustNameSJ,
        })
      }
      if (row.fdSupir && row.fdSupir.toLowerCase().includes(qLower) && !seen.has(`s:${row.fdSupir}`)) {
        seen.add(`s:${row.fdSupir}`)
        suggestions.push({
          type: 'supir',
          title: row.fdSupir,
          subtitle: row.fdCarID ? `Plat: ${row.fdCarID}` : 'Nama Pengemudi / Supir',
          value: row.fdSupir,
        })
      }
      if (row.fdCarID && row.fdCarID.toLowerCase().includes(qLower) && !seen.has(`car:${row.fdCarID}`)) {
        seen.add(`car:${row.fdCarID}`)
        suggestions.push({
          type: 'car',
          title: row.fdCarID,
          subtitle: row.fdSupir ? `Supir: ${row.fdSupir}` : 'Plat Nomor Kendaraan',
          value: row.fdCarID,
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