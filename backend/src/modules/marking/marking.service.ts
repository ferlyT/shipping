import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'

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
  const isClosed = query.isClosed
  const groupMode = query.groupMode
  const groupValue = query.groupValue

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

    const [data, total] = await Promise.all([
      prisma.tbMarking.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortDir,
        },
      }),
      prisma.tbMarking.count({ where }),
    ])

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
    const manifest = await prisma.vwShipment.findMany({
      where: { fdMarkingCode },
      orderBy: { fdListCode: 'asc' }
    })
    return manifest
  } catch (error) {
    logger.error(`Error fetching manifest for ${fdMarkingCode}:`, error)
    throw new Error('Gagal mengambil data manifest')
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
