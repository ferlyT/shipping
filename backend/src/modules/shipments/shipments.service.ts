import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'
import { buildPagination, parsePagination } from '../../utils/pagination'
import {
  MARKING_STATUS_SELECT,
  resolveShipmentStatus,
  getMarkingStatusMap,
  getDeliveryStatusMap,
  getBillingStatusMap,
  buildShipmentConditions,
} from './shipments-status.resolver'
import type { DeliveryInfo, BillingInfo, ShipmentCommodityMetric, ShipmentCommoditiesData } from './shipments.types'

// Re-export domain types and status resolver for 100% backwards compatibility
export * from './shipments.types'
export * from './shipments-status.resolver'

/**
 * Core Shipments Queries & Dimension Details
 */

export async function getShipments(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })

  const conditions = buildShipmentConditions(query)

  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  // Execute raw SQL for data and count to bypass parameter limits
  const [rawData, countRes] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT * FROM vwShipment 
      ${whereClause} 
      ORDER BY fdListCode DESC 
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `,
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM vwShipment 
      ${whereClause}
    `
  ])

  const data = rawData
  const total = Number(countRes[0]?.count || 0)

  // Ambil status kirim (loaddate, etd, eta, exit, gudang) dari tbMarking + status lanjutan dari tbDelivery + status billing
  const [markingMap, deliveryMap, billingMap] = await Promise.all([
    getMarkingStatusMap(data.map((d) => d.fdMarkingCode ?? '')),
    getDeliveryStatusMap(data.map((d) => d.fdListCode ?? '')),
    getBillingStatusMap(data.map((d) => d.fdListCode ?? '')),
  ])

  const dataWithStatus = data.map((row) => ({
    ...row,
    shipmentStatus: resolveShipmentStatus(
      row.fdMarkingCode ? markingMap.get(row.fdMarkingCode.trim()) : null,
      row.fdListCode ? deliveryMap.get(row.fdListCode.trim()) : null,
      row.fdListCode ? billingMap.get(row.fdListCode.trim()) : null,
      row.fdCancel
    ),
  }))

  return { data: dataWithStatus, meta: meta(total) }
}

export async function getShipmentById(id: string) {
  const shipment = await prisma.vwShipment.findUnique({
    where: { fdListCode: id },
  })

  if (!shipment) return null

  const marking = shipment.fdMarkingCode
    ? await prisma.tbMarking.findUnique({
      where: { fdMarkingCode: shipment.fdMarkingCode.trim() },
      select: MARKING_STATUS_SELECT,
    })
    : null

  let delivery: DeliveryInfo | null = null
  let billing: BillingInfo | null = null
  if (marking?.fdExitDate) {
    const deliveries = await prisma.tbDelivery.findMany({
      where: { fdListCode: shipment.fdListCode.trim() },
      select: { fdSent: true },
    })
    delivery = {
      hasDelivery: deliveries.length > 0,
      isSent: deliveries.some((d) => d.fdSent === 1),
    }

    const billings = await prisma.tbBilling.findMany({
      where: { fdListCode: shipment.fdListCode.trim(), fdGive: 1 },
      include: { totals: true },
    })
    
    if (billings.length > 0) {
      billing = { isBilled: true, isPartiallyPaid: false, isPaid: false }
      for (const b of billings) {
        const totals = b.totals || []
        if (totals.length > 0) {
          const isAllPaid = totals.every(t => Number(t.fdBayar || 0) >= Number(t.fdJumlah || 0))
          if (isAllPaid) {
            billing.isPaid = true
          } else {
            const hasSomePayment = totals.some(t => Number(t.fdBayar || 0) > 0)
            if (hasSomePayment) {
              billing.isPartiallyPaid = true
            }
          }
        }
      }
    }
  }

  return {
    ...shipment,
    shipmentStatus: resolveShipmentStatus(marking, delivery, billing, shipment.fdCancel),
  }
}

export async function getShipmentDimensions(id: string) {
  return prisma.vwShipmentDimensionWH.findMany({
    where: { fdListCode: id }
  })
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, description: string): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    const isConnError =
      error?.code === 'P1001' ||
      error?.code === 'P1002' ||
      error?.message?.includes("Can't reach database")

    if (isConnError) {
      logger.warn(`[ShipmentsService] Connection hiccup on ${description}. Retrying in 500ms...`)
      await new Promise((resolve) => setTimeout(resolve, 500))
      try {
        return await fn()
      } catch (retryError: any) {
        logger.error(`[ShipmentsService] Retry failed for ${description}: ${retryError?.message || retryError}`)
        return fallback
      }
    }

    logger.error(`[ShipmentsService] Query failed for ${description}: ${error?.message || error}`)
    return fallback
  }
}

function calculateTrend(thisMonth: number, lastMonth: number) {
  const diff = thisMonth - lastMonth
  if (lastMonth === 0) {
    return {
      diff,
      percentage: thisMonth > 0 ? 100 : 0,
      percentageText: thisMonth > 0 ? '+100%' : '0%',
      type: thisMonth > 0 ? ('up' as const) : ('neutral' as const),
    }
  }
  const percentage = (diff / lastMonth) * 100
  return {
    diff,
    percentage: Number(percentage.toFixed(1)),
    percentageText: `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`,
    type: percentage > 0 ? ('up' as const) : percentage < 0 ? ('down' as const) : ('neutral' as const),
  }
}

function extractPeriodData(row: any) {
  return {
    totalResi: Number(row?.totalResi || 0),
    totalPackages: Number(row?.totalPackages || 0),
    totalBerat: Number(row?.totalBerat || 0),
    totalVolume: Number(row?.totalVolume || 0),
    totalCust: Number(row?.totalCust || 0),
    resiByType: {
      udara: Number(row?.resiUdara || 0),
      laut: Number(row?.resiLaut || 0),
    },
    packagesByType: {
      udara: Number(row?.packagesUdara || 0),
      laut: Number(row?.packagesLaut || 0),
    },
    beratByType: {
      udara: Number(row?.beratUdara || 0),
      laut: Number(row?.beratLaut || 0),
    },
    volumeByType: {
      udara: Number(row?.volumeUdara || 0),
      laut: Number(row?.volumeLaut || 0),
    },
    custByType: {
      udara: Number(row?.custUdara || 0),
      laut: Number(row?.custLaut || 0),
    },
  }
}

export async function getShipmentsKPIs(query: Record<string, string | undefined>) {
  const conditions = buildShipmentConditions(query)
  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const thisMonthConditions = [...conditions, Prisma.sql`fdTglAgent >= ${thisMonthStart}`]
  const thisMonthWhere = Prisma.sql`WHERE ${Prisma.join(thisMonthConditions, ' AND ')}`

  const lastMonthConditions = [
    ...conditions,
    Prisma.sql`fdTglAgent >= ${lastMonthStart}`,
    Prisma.sql`fdTglAgent <= ${lastMonthEnd}`,
  ]
  const lastMonthWhere = Prisma.sql`WHERE ${Prisma.join(lastMonthConditions, ' AND ')}`

  const fallbackAgg = [{
    totalResi: 0, resiUdara: 0, resiLaut: 0,
    totalPackages: 0, packagesUdara: 0, packagesLaut: 0,
    totalBerat: 0, beratUdara: 0, beratLaut: 0,
    totalVolume: 0, volumeUdara: 0, volumeLaut: 0,
    totalCust: 0, custUdara: 0, custLaut: 0,
  }]

  const [totalAgg, thisMonthAgg, lastMonthAgg, commodityAgg] = await Promise.all([
    safeQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as totalResi,
          COUNT(CASE WHEN fdListType = 1 THEN 1 END) as resiUdara,
          COUNT(CASE WHEN fdListType = 2 THEN 1 END) as resiLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlPack, 0) AS BIGINT)), 0) as totalPackages,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlBerat, 0) AS FLOAT)), 0) as totalBerat,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratLaut,
          COALESCE(SUM(CAST(ISNULL(fdM3, 0) AS FLOAT)), 0) as totalVolume,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeLaut,
          COUNT(DISTINCT fdCustName) as totalCust,
          COUNT(DISTINCT CASE WHEN fdListType = 1 THEN fdCustName END) as custUdara,
          COUNT(DISTINCT CASE WHEN fdListType = 2 THEN fdCustName END) as custLaut
        FROM vwShipment 
        ${whereClause}
      `,
      fallbackAgg,
      'shipments all-time aggregate'
    ),
    safeQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as totalResi,
          COUNT(CASE WHEN fdListType = 1 THEN 1 END) as resiUdara,
          COUNT(CASE WHEN fdListType = 2 THEN 1 END) as resiLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlPack, 0) AS BIGINT)), 0) as totalPackages,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlBerat, 0) AS FLOAT)), 0) as totalBerat,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratLaut,
          COALESCE(SUM(CAST(ISNULL(fdM3, 0) AS FLOAT)), 0) as totalVolume,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeLaut,
          COUNT(DISTINCT fdCustName) as totalCust,
          COUNT(DISTINCT CASE WHEN fdListType = 1 THEN fdCustName END) as custUdara,
          COUNT(DISTINCT CASE WHEN fdListType = 2 THEN fdCustName END) as custLaut
        FROM vwShipment 
        ${thisMonthWhere}
      `,
      fallbackAgg,
      'shipments this-month aggregate'
    ),
    safeQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          COUNT(*) as totalResi,
          COUNT(CASE WHEN fdListType = 1 THEN 1 END) as resiUdara,
          COUNT(CASE WHEN fdListType = 2 THEN 1 END) as resiLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlPack, 0) AS BIGINT)), 0) as totalPackages,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlPack, 0) AS BIGINT) ELSE 0 END), 0) as packagesLaut,
          COALESCE(SUM(CAST(ISNULL(fdJmlBerat, 0) AS FLOAT)), 0) as totalBerat,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdJmlBerat, 0) AS FLOAT) ELSE 0 END), 0) as beratLaut,
          COALESCE(SUM(CAST(ISNULL(fdM3, 0) AS FLOAT)), 0) as totalVolume,
          COALESCE(SUM(CASE WHEN fdListType = 1 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeUdara,
          COALESCE(SUM(CASE WHEN fdListType = 2 THEN CAST(ISNULL(fdM3, 0) AS FLOAT) ELSE 0 END), 0) as volumeLaut,
          COUNT(DISTINCT fdCustName) as totalCust,
          COUNT(DISTINCT CASE WHEN fdListType = 1 THEN fdCustName END) as custUdara,
          COUNT(DISTINCT CASE WHEN fdListType = 2 THEN fdCustName END) as custLaut
        FROM vwShipment 
        ${lastMonthWhere}
      `,
      fallbackAgg,
      'shipments last-month aggregate'
    ),
    safeQuery(
      () => prisma.$queryRaw<any[]>`
        SELECT 
          ISNULL(NULLIF(RTRIM(tc.fdComodityName), ''), 'Other') as name,
          s.fdListType,
          COUNT(DISTINCT s.fdListCode) as shipments,
          COALESCE(SUM(CAST(ISNULL(s.fdJmlPack, 0) AS BIGINT)), 0) as packages,
          ROUND(COALESCE(SUM(CAST(ISNULL(s.fdJmlBerat, 0) AS FLOAT)), 0), 1) as weight,
          ROUND(COALESCE(SUM(CAST(ISNULL(s.fdM3, 0) AS FLOAT)), 0), 2) as volume
        FROM vwShipment s WITH (NOLOCK)
        LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
          ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType
        ${whereClause}
        GROUP BY ISNULL(NULLIF(RTRIM(tc.fdComodityName), ''), 'Other'), s.fdListType
        ORDER BY s.fdListType, shipments DESC
      `,
      [],
      'shipments commodity aggregate'
    ),
  ])

  const allTime = extractPeriodData(totalAgg[0])
  const thisMonthData = extractPeriodData(thisMonthAgg[0])
  const lastMonthData = extractPeriodData(lastMonthAgg[0])

  // Parse commodities
  const airCommodities: ShipmentCommodityMetric[] = []
  const seaCommodities: ShipmentCommodityMetric[] = []
  let totalAirShipments = 0
  let totalSeaShipments = 0

  for (const row of (commodityAgg || [])) {
    const metric: ShipmentCommodityMetric = {
      name: String(row.name || 'Other').trim(),
      shipments: Number(row.shipments || 0),
      packages: Number(row.packages || 0),
      weight: Number(row.weight || 0),
      volume: Number(row.volume || 0),
    }
    if (Number(row.fdListType) === 1) {
      airCommodities.push(metric)
      totalAirShipments += metric.shipments
    } else if (Number(row.fdListType) === 2) {
      seaCommodities.push(metric)
      totalSeaShipments += metric.shipments
    }
  }

  airCommodities.forEach((c) => {
    c.percentage = totalAirShipments > 0 ? Number(((c.shipments / totalAirShipments) * 100).toFixed(1)) : 0
  })
  seaCommodities.forEach((c) => {
    c.percentage = totalSeaShipments > 0 ? Number(((c.shipments / totalSeaShipments) * 100).toFixed(1)) : 0
  })

  return {
    ...allTime,
    thisMonth: thisMonthData,
    lastMonth: lastMonthData,
    comparison: {
      resi: calculateTrend(thisMonthData.totalResi, lastMonthData.totalResi),
      packages: calculateTrend(thisMonthData.totalPackages, lastMonthData.totalPackages),
      berat: calculateTrend(thisMonthData.totalBerat, lastMonthData.totalBerat),
      volume: calculateTrend(thisMonthData.totalVolume, lastMonthData.totalVolume),
      cust: calculateTrend(thisMonthData.totalCust, lastMonthData.totalCust),
    },
    commodities: {
      air: airCommodities,
      sea: seaCommodities,
    },
  }
}

export async function getShipmentBranches() {
  const branches = await prisma.vwShipment.findMany({
    select: { fdBranchCode: true },
    distinct: ['fdBranchCode']
  })
  return branches
    .map(b => b.fdBranchCode?.trim() || 'Unassigned')
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort()
}

export async function getDimensionsGudang(id: string) {
  return prisma.tbEntryListDetail.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}

export async function getDimensionsPackingList(id: string) {
  return prisma.tbEntryListDetailPackingList.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}

export async function getDimensionsKomplain(id: string) {
  return prisma.tbEntryListDetailKomplain.findMany({
    where: { fdListCode: id },
    orderBy: { fdListDCode: 'asc' },
  })
}