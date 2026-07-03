import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'

export async function getShipments(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })
  
  const search = query.search?.trim()
  const listType = query.listType
  const where: any = search
    ? {
        OR: [
          { fdListCode: { contains: search } },
          { fdCustName: { contains: search } },
          { fdMarkingCode: { contains: search } },
          { fdDesc: { contains: search } },
        ],
      }
    : {}

  if (listType !== undefined && listType !== '' && listType !== 'ALL') {
    where.fdListType = parseInt(listType, 10)
  }

  const [data, total] = await Promise.all([
    prisma.vwShipment.findMany({ 
      where, 
      skip, 
      take, 
      orderBy: { fdTglAgent: 'desc' },
    }),
    prisma.vwShipment.count({ where }),
  ])

  return { data, meta: meta(total) }
}

export async function getShipmentById(id: string) {
  return prisma.vwShipment.findUnique({
    where: { fdListCode: id },
  })
}

export async function getShipmentDimensions(id: string) {
  // list dimensions based on listcode
  // fdListCode in vwShipmentDimensionWH is Char(7), might need trimming or exact match
  return prisma.vwShipmentDimensionWH.findMany({
    where: { fdListCode: id }
  })
}

export async function getShipmentsKPIs(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const listType = query.listType
  const where: any = search
    ? {
        OR: [
          { fdListCode: { contains: search } },
          { fdCustName: { contains: search } },
          { fdMarkingCode: { contains: search } },
          { fdDesc: { contains: search } },
        ],
      }
    : {}

  if (listType !== undefined && listType !== '' && listType !== 'ALL') {
    where.fdListType = parseInt(listType, 10)
  }

  const [totalResi, aggregateData] = await Promise.all([
    prisma.vwShipment.count({ where }),
    prisma.vwShipment.aggregate({
      where,
      _sum: {
        fdJmlPack: true,
        fdJmlBerat: true,
        fdM3: true,
      },
    }),
  ])

  return {
    totalResi,
    totalPackages: aggregateData._sum.fdJmlPack || 0,
    totalBerat: aggregateData._sum.fdJmlBerat || 0,
    totalVolume: aggregateData._sum.fdM3 || 0,
  }
}
