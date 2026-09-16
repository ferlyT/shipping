import { prisma } from '../../config/database'
import { Prisma } from '@prisma/client'
import { logger } from '../../config/logger'
import { buildPagination, parsePagination } from '../../utils/pagination'
import { suggestionCache } from '../../utils/cache'
import {
  MARKING_STATUS_SELECT,
  resolveShipmentStatus,
  getMarkingStatusMap,
  getDeliveryStatusMap,
  getBillingStatusMap,
  getBlockedFinanceStatusMap,
  buildShipmentConditions,
} from './shipments-status.resolver'
import type { DeliveryInfo, BillingInfo, ShipmentCommodityMetric, ShipmentCommoditiesData, ShipmentInvoice } from './shipments.types'

// Re-export domain types and status resolver for 100% backwards compatibility
export * from './shipments.types'
export * from './shipments-status.resolver'

/**
 * Core Shipments Queries & Dimension Details
 */

export async function getShipments(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  let { skip, take, meta } = buildPagination({ page, limit })

  if (query.skip !== undefined) {
    skip = Math.max(0, parseInt(query.skip) || 0)
    take = Math.max(1, parseInt(query.take || query.limit || '10'))
  }

  const conditions = await buildShipmentConditions(query)

  const whereClause = conditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}` 
    : Prisma.empty

  // Execute raw SQL for data and count to bypass parameter limits
  const [rawData, countRes] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT * FROM vwShipment WITH (NOLOCK)
      ${whereClause} 
      ORDER BY fdListCode DESC 
      OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
    `,
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM vwShipment WITH (NOLOCK)
      ${whereClause}
    `
  ])

  const data = rawData
  const total = Number(countRes[0]?.count || 0)

  // Ambil status kirim (loaddate, etd, eta, exit, gudang) dari tbMarking + status lanjutan dari tbDelivery + status billing + blocked status dari finance
  const [markingMap, deliveryMap, billingMap, blockedMap] = await Promise.all([
    getMarkingStatusMap(data.map((d) => d.fdMarkingCode ?? '')),
    getDeliveryStatusMap(data.map((d) => d.fdListCode ?? '')),
    getBillingStatusMap(data.map((d) => d.fdListCode ?? '')),
    getBlockedFinanceStatusMap(data.map((d) => d.fdListCode ?? '')),
  ])

  const dataWithStatus = data.map((row) => ({
    ...row,
    shipmentStatus: resolveShipmentStatus(
      row.fdMarkingCode ? markingMap.get(row.fdMarkingCode.trim()) : null,
      row.fdListCode ? deliveryMap.get(row.fdListCode.trim()) : null,
      row.fdListCode ? billingMap.get(row.fdListCode.trim()) : null,
      row.fdCancel,
      row.fdListCode ? blockedMap.get(row.fdListCode.trim()) : null
    ),
  }))

  const metaData = query.skip !== undefined 
    ? {
        page: Math.floor(skip / (take || 1)) + 1,
        limit: take,
        skip,
        take,
        total,
        totalPages: Math.ceil(total / (take || 1)),
        hasMore: (skip + data.length) < total,
      }
    : meta(total)

  return { data: dataWithStatus, meta: metaData }
}

export interface ShipmentSuggestion {
  type: 'resi' | 'customer' | 'marking'
  title: string
  subtitle: string
  value: string
}

export async function getShipmentSuggestions(keyword: string): Promise<ShipmentSuggestion[]> {
  const cleanQ = (keyword || '').trim()
  if (!cleanQ || cleanQ.length < 2) return []

  const cacheKey = `shipment:${cleanQ.toLowerCase()}`
  const cached = suggestionCache.get<ShipmentSuggestion[]>(cacheKey)
  if (cached) return cached

  const prefixLike = `${cleanQ}%`
  const searchLike = `%${cleanQ}%`

  // Jalankan lookup paralel indexed:
  // - tbCustomers (TOP 4) dengan filter ISNULL(fdDiscontinued, 0) <> 1
  // - tbEntryList (Stage 1 Prefix TOP 4) pada fdTerima
  // - tbMarking (TOP 4) langsung query tbMarking (14k rows) bukan tbEntryList (726k rows)
  const [custRows, stage1TerimaRows, markingRows] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT TOP 4 RTRIM(fdCustCode) AS fdCustCode, RTRIM(fdCustName) AS fdCustName 
      FROM tbCustomers WITH (NOLOCK) 
      WHERE fdCustName LIKE ${searchLike} AND ISNULL(fdDiscontinued, 0) <> 1
      ORDER BY fdCustName ASC
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT TOP 4 RTRIM(fdTerima) AS fdTerima, RTRIM(ISNULL(fdCustCode, '')) AS fdCustCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdTerima LIKE ${prefixLike}
      ORDER BY fdListCode DESC
    `.catch(() => []),
    prisma.$queryRaw<any[]>`
      SELECT TOP 4 RTRIM(fdMarkingCode) AS fdMarkingCode, RTRIM(ISNULL(fdConsignee, '')) AS fdConsignee
      FROM tbMarking WITH (NOLOCK)
      WHERE fdMarkingCode LIKE ${searchLike}
      ORDER BY fdSysDate DESC
    `.catch(() => []),
  ])

  // Stage 2: fallback bounded jika stage 1 resi kosong
  let terimaRows = stage1TerimaRows
  if (!terimaRows || terimaRows.length === 0) {
    terimaRows = await prisma.$queryRaw<any[]>`
      SELECT TOP 4 RTRIM(fdTerima) AS fdTerima, RTRIM(ISNULL(fdCustCode, '')) AS fdCustCode
      FROM tbEntryList WITH (NOLOCK)
      WHERE fdTerima LIKE ${searchLike} AND (fdTglAgent >= '2025-01-01' OR fdListCode >= '2500000')
      ORDER BY fdListCode DESC
    `.catch(() => [])
  }

  const suggestions: ShipmentSuggestion[] = []
  const seenValues = new Set<string>()

  // 1. Resi match (Prioritas 1)
  for (const r of terimaRows) {
    const val = (r.fdTerima || '').trim()
    if (val && !seenValues.has(`resi:${val}`)) {
      seenValues.add(`resi:${val}`)
      suggestions.push({
        type: 'resi',
        title: val,
        subtitle: 'Nomor Resi Terima',
        value: val,
      })
    }
  }

  // 2. Customer match
  for (const c of custRows) {
    const name = (c.fdCustName || '').trim()
    if (name && !seenValues.has(`cust:${name}`)) {
      seenValues.add(`cust:${name}`)
      suggestions.push({
        type: 'customer',
        title: name,
        subtitle: `Pelanggan (${(c.fdCustCode || '').trim()})`,
        value: name,
      })
    }
  }

  // 3. Marking match (langsung dari tbMarking)
  for (const m of markingRows) {
    const code = (m.fdMarkingCode || '').trim()
    const consignee = (m.fdConsignee || '').trim()
    if (code && !seenValues.has(`marking:${code}`)) {
      seenValues.add(`marking:${code}`)
      suggestions.push({
        type: 'marking',
        title: code,
        subtitle: consignee ? `Consignee: ${consignee}` : 'Kode Marking',
        value: code,
      })
    }
  }

  const result = suggestions.slice(0, 10)
  suggestionCache.set(cacheKey, result)
  return result
}

export async function getShipmentById(id: string) {
  const cleanId = (id || '').trim()
  const shipment = await prisma.vwShipment.findUnique({
    where: { fdListCode: cleanId },
  })

  if (!shipment) return null

  const markingPromise = shipment.fdMarkingCode
    ? prisma.tbMarking.findUnique({
        where: { fdMarkingCode: shipment.fdMarkingCode.trim() },
        select: MARKING_STATUS_SELECT,
      })
    : Promise.resolve(null)

  const deliveryPromise = prisma.tbDelivery.findMany({
    where: { fdListCode: cleanId },
    select: { fdSent: true },
  })

  // Cari invoice terkait shipment (tbBilling atau tbBillingDetail)
  const billingPromise = safeQuery(
    async () => {
      let b = await prisma.tbBilling.findFirst({
        where: { fdListCode: cleanId },
        include: {
          totals: true,
          details: true,
          customer: {
            select: {
              fdCustName: true,
              fdBillTo: true,
            },
          },
        },
        orderBy: { fdInvDate: 'desc' },
      })

      if (!b) {
        const detailMatch = await prisma.tbBillingDetail.findFirst({
          where: { fdListCode: cleanId },
          include: {
            billing: {
              include: {
                totals: true,
                details: true,
                customer: {
                  select: {
                    fdCustName: true,
                    fdBillTo: true,
                  },
                },
              },
            },
          },
        })
        if (detailMatch?.billing) {
          b = detailMatch.billing
        }
      }
      return b
    },
    null,
    `getShipmentInvoice for ${cleanId}`
  )

  const [marking, deliveries, billingRecord] = await Promise.all([
    markingPromise,
    deliveryPromise,
    billingPromise,
  ])

  const delivery: DeliveryInfo = {
    hasDelivery: deliveries.length > 0,
    isSent: deliveries.some((d) => d.fdSent === 1),
  }

  let billing: BillingInfo | null = null
  let invoice: ShipmentInvoice | null = null

  if (billingRecord) {
    const totals = billingRecord.totals || []
    const sumJumlah = totals.length > 0
      ? totals.reduce((sum, t) => sum + Number(t.fdJumlah || 0), 0)
      : Number(billingRecord.fdJumlah1 || 0)
    const sumBayar = totals.length > 0
      ? totals.reduce((sum, t) => sum + Number(t.fdBayar || 0), 0)
      : 0
    const isAllPaid = totals.length > 0
      ? totals.every((t) => Number(t.fdBayar || 0) >= Number(t.fdJumlah || 0))
      : false
    const hasSomePayment = totals.length > 0
      ? totals.some((t) => Number(t.fdBayar || 0) > 0)
      : false
    const hasSLunas = totals.some((t) => t.fdSLunas === 1)
    const isIssued = Number(billingRecord.fdGive) === 1
    const isCollected = Number(billingRecord.fdGive2) === 1

    let paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'ISSUED' | 'UNPAID' | 'DRAFT' = 'DRAFT'
    if (!isIssued) {
      paymentStatus = 'DRAFT'
    } else if (isCollected || hasSLunas || isAllPaid || (sumJumlah > 0 && Math.abs(sumJumlah - sumBayar) <= 0.01)) {
      paymentStatus = 'LUNAS'
    } else if (hasSomePayment) {
      paymentStatus = 'PARTIAL'
    } else {
      const now = new Date()
      const invDate = billingRecord.fdInvDate ? new Date(billingRecord.fdInvDate) : null
      const ageDays = invDate ? Math.floor((now.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      if (ageDays > 30) {
        paymentStatus = 'OVERDUE'
      } else if (ageDays < 7) {
        paymentStatus = 'ISSUED'
      } else {
        paymentStatus = 'UNPAID'
      }
    }

    invoice = {
      fdInvNo: billingRecord.fdInvNo.trim(),
      fdInvDate: billingRecord.fdInvDate,
      fdCustCode: billingRecord.fdCustCode?.trim() || null,
      fdCustName: billingRecord.customer?.fdCustName?.trim() || null,
      fdBillTo: billingRecord.customer?.fdBillTo?.trim() || null,
      fdGive: billingRecord.fdGive,
      fdGiveDate: billingRecord.fdGiveDate,
      fdGive2: billingRecord.fdGive2,
      fdGiveDate2: billingRecord.fdGiveDate2,
      fdCekDate: billingRecord.fdCekDate,
      fdCekBy: billingRecord.fdCekBy?.trim() || null,
      fdDescr: billingRecord.fdDescr?.trim() || null,
      totalAmount: sumJumlah,
      totalPaid: sumBayar,
      balance: Math.max(0, sumJumlah - sumBayar),
      paymentStatus,
      isIssued,
      isCollected,
      isPaid: paymentStatus === 'LUNAS',
      totals: totals.map((t) => ({
        fdID: t.fdID.trim(),
        fdCCYCode: t.fdCCYCode?.trim() || 'RP.',
        fdJumlah: Number(t.fdJumlah || 0),
        fdBayar: Number(t.fdBayar || 0),
        fdSLunas: t.fdSLunas,
        fdFinish: t.fdFinish,
      })),
      details: (billingRecord.details || []).map((d) => ({
        fdID: d.fdID.trim(),
        fdItemName: d.fdItemName?.trim() || '',
        fdQty: Number(d.fdQty || 0),
        fdSatuan: d.fdSatuan?.trim() || '',
        fdListCode: d.fdListCode?.trim() || billingRecord.fdListCode?.trim() || '',
        fdItemPrice: Number(d.fdItemPrice || 0),
        fdTotal: Number(d.fdTotal || 0),
        fdCurr: d.fdCurr?.trim() || 'RP.',
      })),
    }

    if (isIssued) {
      billing = {
        isBilled: true,
        isPartiallyPaid: paymentStatus === 'PARTIAL',
        isPaid: paymentStatus === 'LUNAS',
      }
    }
  }

  const blockedMap = shipment.fdListCode 
    ? await getBlockedFinanceStatusMap([shipment.fdListCode.trim()]) 
    : new Map()

  return {
    ...shipment,
    shipmentStatus: resolveShipmentStatus(
      marking, 
      delivery, 
      billing, 
      shipment.fdCancel,
      shipment.fdListCode ? blockedMap.get(shipment.fdListCode.trim()) : null
    ),
    invoice,
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
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearParam = query.year?.toString().trim()
  const targetYear = yearParam && yearParam !== 'ALL' && yearParam !== 'all'
    ? parseInt(yearParam, 10)
    : yearParam === 'ALL' || yearParam === 'all'
    ? null
    : currentYear

  // Ambil base conditions tanpa filter tahun agar bisa diaplikasikan secara presisi
  const baseQuery = { ...query, year: 'ALL' }
  const baseConditions = await buildShipmentConditions(baseQuery)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  // Query condition untuk tahun terpilih (default: tahun sekarang berdasarkan fdLoadDate -> tbMarking)
  const yearConditions = targetYear && !isNaN(targetYear)
    ? [
        ...baseConditions,
        Prisma.sql`fdMarkingCode IN (
          SELECT fdMarkingCode FROM tbMarking WITH (NOLOCK)
          WHERE fdLoadDate >= ${new Date(targetYear, 0, 1)} 
            AND fdLoadDate < ${new Date(targetYear + 1, 0, 1)}
        )`
      ]
    : baseConditions

  const whereClause = yearConditions.length > 0 
    ? Prisma.sql`WHERE ${Prisma.join(yearConditions, ' AND ')}` 
    : Prisma.empty

  // Monthly conditions berdasarkan fdLoadDate -> tbMarking
  const thisMonthConditions = [
    ...baseConditions,
    Prisma.sql`fdMarkingCode IN (
      SELECT fdMarkingCode FROM tbMarking WITH (NOLOCK)
      WHERE fdLoadDate >= ${thisMonthStart} AND fdLoadDate <= ${now}
    )`
  ]
  const thisMonthWhere = Prisma.sql`WHERE ${Prisma.join(thisMonthConditions, ' AND ')}`

  const lastMonthConditions = [
    ...baseConditions,
    Prisma.sql`fdMarkingCode IN (
      SELECT fdMarkingCode FROM tbMarking WITH (NOLOCK)
      WHERE fdLoadDate >= ${lastMonthStart} AND fdLoadDate <= ${lastMonthEnd}
    )`
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
          CASE WHEN s.fdBranchCode IS NULL OR RTRIM(s.fdBranchCode) IN ('', '--', '-') THEN 'SG' ELSE RTRIM(s.fdBranchCode) END as branchCode,
          COUNT(DISTINCT s.fdListCode) as shipments,
          COALESCE(SUM(CAST(ISNULL(s.fdJmlPack, 0) AS BIGINT)), 0) as packages,
          ROUND(COALESCE(SUM(CAST(ISNULL(s.fdJmlBerat, 0) AS FLOAT)), 0), 1) as weight,
          ROUND(COALESCE(SUM(CAST(ISNULL(s.fdM3, 0) AS FLOAT)), 0), 2) as volume
        FROM (
          SELECT fdListCode, fdListType, fdJmlPack, fdJmlBerat, fdM3, fdTypeComodity, fdBranchCode
          FROM vwShipment WITH (NOLOCK)
          ${whereClause}
        ) s
        LEFT JOIN tbTypeComodity tc WITH (NOLOCK) 
          ON tc.fdTypeComodity = s.fdTypeComodity AND tc.fdListType = s.fdListType
        GROUP BY 
          ISNULL(NULLIF(RTRIM(tc.fdComodityName), ''), 'Other'),
          s.fdListType,
          CASE WHEN s.fdBranchCode IS NULL OR RTRIM(s.fdBranchCode) IN ('', '--', '-') THEN 'SG' ELSE RTRIM(s.fdBranchCode) END
        ORDER BY s.fdListType, shipments DESC
      `,
      [],
      'shipments commodity aggregate'
    ),
  ])

  const allTime = extractPeriodData(totalAgg[0])
  const thisMonthData = extractPeriodData(thisMonthAgg[0])
  const lastMonthData = extractPeriodData(lastMonthAgg[0])

  // Lookup nama cabang resmi dari tbCabang
  const cabangList = await safeQuery(
    () => prisma.tbCabang.findMany({ select: { fdBranchCode: true, fdBranchName: true } }),
    [],
    'shipments tbCabang lookup'
  )
  const cabangMap = new Map<string, string>()
  for (const c of cabangList) {
    const code = c.fdBranchCode.trim()
    const rawName = (c.fdBranchName || '').trim()
    if (rawName) {
      const formatted = rawName
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
        .replace('Hongkong', 'Hong Kong')
        .replace('Yi Wu', 'Yiwu')
      cabangMap.set(code, formatted)
    } else {
      cabangMap.set(code, code)
    }
  }

  // Parse commodities with branch breakdown
  const airCommoditiesMap = new Map<string, ShipmentCommodityMetric>()
  const seaCommoditiesMap = new Map<string, ShipmentCommodityMetric>()
  const availableBranchesSet = new Set<string>()

  for (const row of (commodityAgg || [])) {
    const listType = Number(row.fdListType)
    const name = String(row.name || 'Other').trim()
    const branchCode = String(row.branchCode || 'SG').trim()
    availableBranchesSet.add(branchCode)

    const map = listType === 1 ? airCommoditiesMap : listType === 2 ? seaCommoditiesMap : null
    if (!map) continue

    const shipments = Number(row.shipments || 0)
    const packages = Number(row.packages || 0)
    const weight = Number(row.weight || 0)
    const volume = Number(row.volume || 0)

    if (!map.has(name)) {
      map.set(name, {
        name,
        shipments: 0,
        packages: 0,
        weight: 0,
        volume: 0,
        branches: [],
      })
    }

    const commodity = map.get(name)!
    commodity.shipments += shipments
    commodity.packages += packages
    commodity.weight = Number((commodity.weight + weight).toFixed(1))
    commodity.volume = Number((commodity.volume + volume).toFixed(2))

    commodity.branches!.push({
      branchCode,
      branchName: cabangMap.get(branchCode) || branchCode,
      shipments,
      packages,
      weight,
      volume,
    })
  }

  // Calculate percentages and sort
  const processCommodityList = (map: Map<string, ShipmentCommodityMetric>) => {
    const list = Array.from(map.values())
    const totalShipments = list.reduce((sum, c) => sum + c.shipments, 0)

    for (const c of list) {
      c.percentage = totalShipments > 0 ? Number(((c.shipments / totalShipments) * 100).toFixed(1)) : 0
      if (c.branches) {
        c.branches.sort((a, b) => b.shipments - a.shipments)
        for (const b of c.branches) {
          b.percentage = c.shipments > 0 ? Number(((b.shipments / c.shipments) * 100).toFixed(1)) : 0
        }
      }
    }

    list.sort((a, b) => b.shipments - a.shipments)
    return list
  }

  const airCommodities = processCommodityList(airCommoditiesMap)
  const seaCommodities = processCommodityList(seaCommoditiesMap)

  // Standardize branch order (SG, GZ, HK, YW, SH, SZ, EX, IM, LG, LM, etc.)
  const priorityBranches = ['SG', 'GZ', 'HK', 'YW', 'SH', 'SZ', 'EX', 'IM', 'LG', 'LM', 'TH', 'BT']
  const allBranches = Array.from(availableBranchesSet)
  const sortedBranches = allBranches.sort((a, b) => {
    const idxA = priorityBranches.indexOf(a)
    const idxB = priorityBranches.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  const availableBranchesInfo = sortedBranches.map((code) => ({
    code,
    name: cabangMap.get(code) || code,
  }))

  return {
    year: targetYear || undefined,
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
      availableBranches: availableBranchesInfo,
    },
  }
}

export async function getShipmentBranches() {
  const branches = await prisma.vwShipment.findMany({
    select: { fdBranchCode: true },
    distinct: ['fdBranchCode']
  })
  const normalized = branches.map(b => {
    const raw = b.fdBranchCode?.trim() || ''
    if (!raw || raw === '--' || raw === '-') return 'SG'
    return raw
  })
  const unique = Array.from(new Set(normalized))
  const priorityBranches = ['SG', 'GZ', 'HK', 'YW', 'SH', 'SZ']
  return unique.sort((a, b) => {
    const idxA = priorityBranches.indexOf(a)
    const idxB = priorityBranches.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })
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