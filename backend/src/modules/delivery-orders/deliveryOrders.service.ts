import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'

export async function getDeliveryOrders(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const listCode = query.listCode?.trim()

  const where: Prisma.TbDeliveryWhereInput = {}

  if (listCode) {
    where.fdListCode = listCode
  }

  if (search) {
    where.OR = [
      { fdSJNo: { contains: search } },
      { fdDescr: { contains: search } },
      { fdCustCode: { contains: search } },
      { fdCustNameSJ: { contains: search } },
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
      }
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
  const where = search
    ? {
      OR: [
        { fdSJNo: { contains: search } },
        { fdDescr: { contains: search } },
        { fdCustCode: { contains: search } },
        { fdCustNameSJ: { contains: search } },
      ],
    }
    : {}

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    totalSJ,
    totalAgg,
    sjBulanIni
  ] = await Promise.all([
    prisma.tbDelivery.count({ where }),
    prisma.tbDelivery.aggregate({
      where,
      _sum: { fdJmlPackSJ: true, fdJmlBeratSJ: true }
    }),
    prisma.tbDelivery.count({
      where: {
        ...where,
        fdSJDate: { gte: startOfMonth, lt: endOfMonth }
      }
    })
  ])

  return {
    totalSJ,
    totalPackages: totalAgg._sum.fdJmlPackSJ || 0,
    totalWeight: totalAgg._sum.fdJmlBeratSJ || 0,
    sjBulanIni
  }
}

export async function getDeliveryGroupedByListCode(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim()
  const markingCode = query.markingCode?.trim()
  const branch = query.branch?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType}`
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
        FROM tbEntryList el
        LEFT JOIN tbCustomers c ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbDelivery d ON d.fdListCode = el.fdListCode
        LEFT JOIN tbMarking tm ON tm.fdMarkingCode = el.fdMarkingCode
        LEFT JOIN tbCabang cb ON cb.fdBranchCode = tm.fdBranchCode
        ${searchCondition}
        GROUP BY el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, c.fdCustName, el.fdTrackingNo, el.fdComodity, tm.fdBranchCode, cb.fdBranchName
        ${havingClause}
        ORDER BY el.fdListCode DESC
        OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      ) el
      LEFT JOIN tbDelivery d ON d.fdListCode = el.fdListCode
      GROUP BY el.fdListCode, el.fdMarkingCode, el.fdJmlPAck, el.fdCustName, el.fdTrackingNo, el.fdComodity, el.fdBranchCode, el.fdBranchName
      ORDER BY el.fdListCode DESC
    `,
    prisma.$queryRaw`
      SELECT COUNT(*) as count FROM (
        SELECT el.fdListCode
        FROM tbEntryList el
        LEFT JOIN tbCustomers c ON c.fdCustCode = el.fdCustCode
        LEFT JOIN tbDelivery d ON d.fdListCode = el.fdListCode
        LEFT JOIN tbMarking tm ON tm.fdMarkingCode = el.fdMarkingCode
        ${searchCondition}
        GROUP BY el.fdListCode
        ${havingClause}
      ) as t
    `
  ])

  const total = Number((totalResult as any[])[0]?.count || 0)

  // Fix BigInt serialization issues before returning JSON
  const serializedData = (data as any[]).map(row => {
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

// Returns each distinct marking code (for the given listType/sent/search filters)
// along with how many list codes belong to it. Used to render independent
// per-group pagination when the frontend groups rows by marking code.
export async function getDeliveryMarkingCodeGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType}`
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
      FROM tbEntryList el
      LEFT JOIN tbCustomers c ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d ON d.fdListCode = el.fdListCode
      ${searchCondition}
      GROUP BY el.fdMarkingCode, el.fdListCode
      ${havingClause}
    ) t
    GROUP BY t.markingCode
    ORDER BY t.markingCode ASC
  `

  // Fix BigInt serialization issues before returning JSON
  const data = (groups as any[]).map(row => ({
    markingCode: row.markingCode,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}

// Returns each distinct branch (cabang, via tbMarking -> tbCabang) for the
// given listType/sent/search filters, along with how many list codes belong
// to it. Used to render independent per-group pagination when the frontend
// groups rows by branch.
export async function getDeliveryBranchGroups(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType === '2' ? 2 : 1

  let searchCondition = Prisma.sql`WHERE el.fdListType = ${listType}`
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
      FROM tbEntryList el
      LEFT JOIN tbCustomers c ON c.fdCustCode = el.fdCustCode
      LEFT JOIN tbDelivery d ON d.fdListCode = el.fdListCode
      LEFT JOIN tbMarking tm ON tm.fdMarkingCode = el.fdMarkingCode
      LEFT JOIN tbCabang cb ON cb.fdBranchCode = tm.fdBranchCode
      ${searchCondition}
      GROUP BY el.fdListCode, tm.fdBranchCode, cb.fdBranchName
      ${havingClause}
    ) t
    GROUP BY t.branchCode
    ORDER BY t.branchCode ASC
  `

  // Fix BigInt serialization issues before returning JSON
  const data = (groups as any[]).map(row => ({
    branchCode: row.branchCode,
    branchName: row.branchName,
    total: typeof row.total === 'bigint' ? Number(row.total) : row.total,
  }))

  return { data }
}