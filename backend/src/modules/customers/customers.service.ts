import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { logger } from '../../config/logger'



export async function getCustomers(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const search = query.search?.trim() || ''
  const sortBy = query.sortBy || 'fdCustName'
  const sortDir = query.sortDir === 'desc' ? 'desc' : 'asc'
  const status = query.status || 'active'
  const blockStatus = query.blockStatus

  try {
    const where = search
      ? {
        OR: [
          { fdCustName: { contains: search } },
          { fdCustCode: { contains: search } },
          { fdContact: { contains: search } },
          { fdHP: { contains: search } },
          { fdTelp: { contains: search } },
          { fdEmailPenagihan: { contains: search } },
          { fdCityName: { contains: search } },
        ],
      }
      : {}

    if (status === 'active') {
      (where as any).fdDiscontinued = { not: 1 } // Support 0 or null
    } else if (status === 'discontinued') {
      (where as any).fdDiscontinued = 1
    }

    if (blockStatus !== undefined && blockStatus !== '') {
      (where as any).fdBlocked = parseInt(blockStatus, 10)
    }

    const [data, total] = await Promise.all([
      prisma.tbCustomers.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortDir }
      }),
      prisma.tbCustomers.count({ where }),
    ])

    return { data, meta: meta(total) }
  } catch (err: any) {
    logger.error('Database error on getCustomers', { error: err.message })
    throw new Error('Gagal mengambil data pelanggan dari database')
  }
}

export async function getCustomerById(id: string) {
  try {
    return await prisma.tbCustomers.findUnique({
      where: { fdCustCode: id },
      include: {
        addresses: true
      }
    })
  } catch (err: any) {
    logger.error('Database error on getCustomerById', { id, error: err.message })
    throw new Error('Gagal mengambil detail pelanggan')
  }
}
