import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { buildPagination, parsePagination } from '../../utils/pagination'
import {
  MARKING_STATUS_SELECT,
  resolveShipmentStatus,
  getMarkingStatusMap,
  getDeliveryStatusMap,
  getBillingStatusMap,
  buildShipmentConditions,
} from './shipments-status.resolver'
import type { DeliveryInfo, BillingInfo } from './shipments.types'

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

export async function getShipmentsKPIs(query: Record<string, string | undefined>) {
  const conditions = buildShipmentConditions(query)
  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  const [countRes, aggregateRes] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM vwShipment 
      ${whereClause}
    `,
    prisma.$queryRaw<any[]>`
      SELECT 
        SUM(CAST(ISNULL(fdJmlPack, 0) AS BIGINT)) as totalPackages,
        SUM(CAST(ISNULL(fdJmlBerat, 0) AS FLOAT)) as totalBerat,
        SUM(CAST(ISNULL(fdM3, 0) AS FLOAT)) as totalVolume
      FROM vwShipment 
      ${whereClause}
    `,
  ])

  return {
    totalResi: Number(countRes[0]?.count || 0),
    totalPackages: Number(aggregateRes[0]?.totalPackages || 0),
    totalBerat: Number(aggregateRes[0]?.totalBerat || 0),
    totalVolume: Number(aggregateRes[0]?.totalVolume || 0),
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