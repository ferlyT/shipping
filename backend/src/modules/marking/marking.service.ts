import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'

export async function getMarkings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim() || ''
  const sortBy = query.sortBy || 'fdSysDate'
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc'
  const listType = query.listType // 1 for AIR, 2 for SEA

  try {
    const where: any = {}

    if (search) {
      where.OR = [
        { fdMarkingCode: { contains: search } },
        { fdBLNo: { contains: search } },
        { fdAWB: { contains: search } },
        { fdConsignee: { contains: search } },
        { fdContNo: { contains: search } },
      ]
    }

    if (listType !== undefined && listType !== '') {
      where.fdListType = parseInt(listType, 10)
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
      meta: {
        ...meta,
        total,
        totalPages: Math.ceil(total / take),
      },
    }
  } catch (error) {
    logger.error('Error fetching markings:', error)
    throw new Error('Gagal mengambil data marking')
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
