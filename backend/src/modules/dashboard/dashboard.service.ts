import { prisma } from '../../config/database'
import { logger } from '../../config/logger'
import { getMarkingKPIs } from '../marking/marking-analytics.service'
import type { DashboardStats, DashboardTrend } from './dashboard.types'
import { calculateTrend } from './dashboard.utils'

export * from './dashboard.types'
export * from './dashboard.utils'

/**
 * Helper to safely execute a Prisma query with automatic 1x retry on connection hiccup
 * and fallback default value if DB server is unreachable.
 */
async function safeQuery<T>(fn: () => Promise<T>, fallback: T, description: string): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    const isConnError =
      error?.code === 'P1001' ||
      error?.code === 'P1002' ||
      error?.message?.includes("Can't reach database")

    if (isConnError) {
      logger.warn(`[DashboardService] Connection hiccup on ${description}. Retrying in 500ms...`)
      await new Promise((resolve) => setTimeout(resolve, 500))
      try {
        return await fn()
      } catch (retryError: any) {
        logger.error(`[DashboardService] Retry failed for ${description}: ${retryError?.message || retryError}`)
        return fallback
      }
    }

    logger.error(`[DashboardService] Query failed for ${description}: ${error?.message || error}`)
    return fallback
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const threeDaysLater = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Generate 12 months ranges for chart
    const months: Array<{ start: Date; end: Date; name: string }> = []
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      const name = start.toLocaleString('id-ID', { month: 'short' })
      months.push({ start, end, name })
    }

    // Draft billing filter conditions
    const draftBillingWhere: any = {
      AND: [
        { OR: [{ fdGive: null }, { fdGive: { not: 1 } }] },
        { OR: [{ fdGive2: null }, { fdGive2: { not: 1 } }] },
        { fdCekDate: null },
        { fdInvDate: { gte: new Date('2023-01-01T00:00:00.000Z') } },
        { NOT: { totals: { some: { OR: [{ fdSLunas: 1 }, { fdBayar: { gt: 0 } }] } } } },
        { fdJumlah1: { gt: 0 } },
      ],
    }

    // Overdue billing filter conditions
    const overdueBillingWhere: any = {
      AND: [
        { fdInvDate: { lt: thirtyDaysAgo } },
        { fdJumlah1: { gt: 0 } },
        { NOT: { totals: { some: { fdSLunas: 1 } } } },
      ],
    }

    const [
      totalCustomers,
      totalInvoices,
      totalDeliveryOrders,
      totalShipments,
      recentInvoices,
      recentDeliveryOrders,
      customersThisMonth,
      invoicesThisMonth,
      deliveryOrdersThisMonth,
      shipmentsThisMonth,
      customersLastMonth,
      invoicesLastMonth,
      deliveryOrdersLastMonth,
      shipmentsLastMonth,
      invoiceAggregate,
      markingKpis,
      doScheduled,
      doOnDelivery,
      doDelivered,
      doOutstandingSJ,
      doAgg,
      draftCount,
      draftAgg,
      overdueCount,
      overdueAgg,
      monthlyRevAgg,
      monthlyInvCount,
      originRaw,
      upcomingBatches
    ] = await Promise.all([
      safeQuery(() => prisma.tbCustomers.count(), 0, 'totalCustomers'),
      safeQuery(() => prisma.tbBilling.count(), 0, 'totalInvoices'),
      safeQuery(() => prisma.tbDelivery.count(), 0, 'totalDeliveryOrders'),
      safeQuery(() => prisma.vwShipment.count(), 0, 'totalShipments'),
      // Get recent 5 invoices
      safeQuery(
        () =>
          prisma.tbBilling.findMany({
            take: 5,
            orderBy: { fdInvDate: 'desc' },
            select: {
              fdInvNo: true,
              fdInvDate: true,
              fdJumlah1: true,
              fdCustCode: true,
              customer: {
                select: {
                  fdCustName: true
                }
              }
            }
          }),
        [],
        'recentInvoices'
      ),
      // Get recent 5 delivery orders
      safeQuery(
        () =>
          prisma.tbDelivery.findMany({
            take: 5,
            orderBy: { fdSJDate: 'desc' },
            select: {
              fdSJNo: true,
              fdSJDate: true,
              fdCarID: true,
              fdCustNameSJ: true,
              fdCustCode: true,
              fdListCode: true,
              fdJmlPackSJ: true,
              fdJmlBeratSJ: true,
              entryList: {
                select: {
                  fdMarkingCode: true,
                  fdMarkingNo: true,
                  fdSatuan: true
                }
              }
            }
          }),
        [],
        'recentDeliveryOrders'
      ),
      // Count new records this month
      safeQuery(() => prisma.tbCustomers.count({ where: { fdCreatedDate: { gte: thisMonthStart } } }), 0, 'customersThisMonth'),
      safeQuery(() => prisma.tbBilling.count({ where: { fdInvDate: { gte: thisMonthStart } } }), 0, 'invoicesThisMonth'),
      safeQuery(() => prisma.tbDelivery.count({ where: { fdSJDate: { gte: thisMonthStart } } }), 0, 'deliveryOrdersThisMonth'),
      safeQuery(() => prisma.vwShipment.count({ where: { fdTglAgent: { gte: thisMonthStart } } }), 0, 'shipmentsThisMonth'),
      // Count new records last month
      safeQuery(() => prisma.tbCustomers.count({ where: { fdCreatedDate: { gte: lastMonthStart, lte: lastMonthEnd } } }), 0, 'customersLastMonth'),
      safeQuery(() => prisma.tbBilling.count({ where: { fdInvDate: { gte: lastMonthStart, lte: lastMonthEnd } } }), 0, 'invoicesLastMonth'),
      safeQuery(() => prisma.tbDelivery.count({ where: { fdSJDate: { gte: lastMonthStart, lte: lastMonthEnd } } }), 0, 'deliveryOrdersLastMonth'),
      safeQuery(() => prisma.vwShipment.count({ where: { fdTglAgent: { gte: lastMonthStart, lte: lastMonthEnd } } }), 0, 'shipmentsLastMonth'),
      // Aggregate invoice amount
      safeQuery(() => prisma.tbBilling.aggregate({ _sum: { fdJumlah1: true } }), { _sum: { fdJumlah1: null } }, 'invoiceAggregate'),
      // 1. Actionable Alerts (from Marking KPIs)
      safeQuery(() => getMarkingKPIs({}), null, 'markingKpis'),
      // 2. Delivery Orders Status
      safeQuery(
        () =>
          prisma.tbDelivery.count({
            where: {
              AND: [
                { OR: [{ fdSent: 0 }, { fdSent: null }] },
                { OR: [{ fdEstimasi: null }, { fdEstimasi: { gt: now } }] },
              ],
            },
          }),
        0,
        'doScheduled'
      ),
      safeQuery(
        () =>
          prisma.tbDelivery.count({
            where: {
              AND: [
                { OR: [{ fdSent: 0 }, { fdSent: null }] },
                { fdEstimasi: { lte: now } },
              ],
            },
          }),
        0,
        'doOnDelivery'
      ),
      safeQuery(() => prisma.tbDelivery.count({ where: { fdSent: 1 } }), 0, 'doDelivered'),
      safeQuery(() => prisma.tbDelivery.count({ where: { fdSent: 1, fdKembali: null } }), 0, 'doOutstandingSJ'),
      safeQuery(
        () => prisma.tbDelivery.aggregate({ _sum: { fdJmlPackSJ: true, fdJmlBeratSJ: true } }),
        { _sum: { fdJmlPackSJ: null, fdJmlBeratSJ: null } },
        'doAgg'
      ),
      // 3. Financial Overview
      safeQuery(() => prisma.tbBilling.count({ where: draftBillingWhere }), 0, 'draftCount'),
      safeQuery(() => prisma.tbBilling.aggregate({ where: draftBillingWhere, _sum: { fdJumlah1: true } }), { _sum: { fdJumlah1: null } }, 'draftAgg'),
      safeQuery(() => prisma.tbBilling.count({ where: overdueBillingWhere }), 0, 'overdueCount'),
      safeQuery(() => prisma.tbBilling.aggregate({ where: overdueBillingWhere, _sum: { fdJumlah1: true } }), { _sum: { fdJumlah1: null } }, 'overdueAgg'),
      safeQuery(() => prisma.tbBilling.aggregate({ where: { fdInvDate: { gte: thisMonthStart } }, _sum: { fdJumlah1: true } }), { _sum: { fdJumlah1: null } }, 'monthlyRevAgg'),
      safeQuery(() => prisma.tbBilling.count({ where: { fdInvDate: { gte: thisMonthStart } } }), 0, 'monthlyInvCount'),
      // 4. Origin Analytics & Upcoming Arrivals
      safeQuery(
        () =>
          prisma.$queryRaw<any[]>`
            SELECT 
              CASE WHEN s.fdBranchCode IS NULL OR RTRIM(s.fdBranchCode) IN ('', '--', '-') THEN 'SG' ELSE RTRIM(s.fdBranchCode) END as branchCode,
              COUNT(DISTINCT s.fdListCode) as totalShipments,
              COUNT(DISTINCT CASE WHEN s.fdListType = 1 THEN s.fdListCode END) as airShipments,
              COUNT(DISTINCT CASE WHEN s.fdListType = 2 THEN s.fdListCode END) as seaShipments,
              ROUND(COALESCE(SUM(CAST(ISNULL(s.fdM3, 0) AS FLOAT)), 0), 2) as totalVolume,
              ROUND(COALESCE(SUM(CAST(ISNULL(s.fdJmlBerat, 0) AS FLOAT)), 0), 1) as totalWeight,
              COALESCE(SUM(CAST(ISNULL(s.fdJmlPack, 0) AS BIGINT)), 0) as totalPackages
            FROM vwShipment s WITH (NOLOCK)
            WHERE s.fdTglAgent >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY CASE WHEN s.fdBranchCode IS NULL OR RTRIM(s.fdBranchCode) IN ('', '--', '-') THEN 'SG' ELSE RTRIM(s.fdBranchCode) END
            ORDER BY totalShipments DESC
          `,
        [],
        'originRaw'
      ),
      safeQuery(
        () =>
          prisma.tbMarking.findMany({
            where: {
              fdExitDate: null,
              fdETA: {
                gte: todayStart,
                lt: threeDaysLater,
              },
            },
            take: 12,
            orderBy: { fdETA: 'asc' },
            select: {
              fdMarkingCode: true,
              fdBranchCode: true,
              fdListType: true,
              fdETA: true,
              fdConsignee: true,
              fdGudang: true,
              fdKet: true,
            },
          }),
        [],
        'upcomingBatches'
      ),
    ])

    const chartPromises = months.map(async ({ start, end, name }) => {
      const [invoices, deliveryOrders, shipments] = await Promise.all([
        safeQuery(() => prisma.tbBilling.count({ where: { fdInvDate: { gte: start, lte: end } } }), 0, 'chart invoices'),
        safeQuery(() => prisma.tbDelivery.count({ where: { fdSJDate: { gte: start, lte: end } } }), 0, 'chart deliveryOrders'),
        safeQuery(() => prisma.vwShipment.count({ where: { fdTglAgent: { gte: start, lte: end } } }), 0, 'chart shipments')
      ])

      return {
        name,
        invoices,
        deliveryOrders,
        shipments
      }
    })

    const chartData = await Promise.all(chartPromises)

    // Month-over-Month growth trends computed via calculateTrend utility

    const mappedRecentInvoices = (recentInvoices as any[]).map((r) => ({
      fdInvNo: r.fdInvNo?.trim() || '',
      fdInvDate: r.fdInvDate,
      fdJumlah1: Number(r.fdJumlah1 || 0),
      fdCustCode: r.fdCustCode?.trim() || '',
      customer: r.customer ? { fdCustName: r.customer.fdCustName?.trim() || null } : null,
    }))

    const mappedRecentDOs = (recentDeliveryOrders as any[]).map((r) => ({
      fdSJNo: r.fdSJNo?.trim() || '',
      fdSJDate: r.fdSJDate,
      fdCarID: r.fdCarID?.trim() || null,
      fdCustNameSJ: r.fdCustNameSJ?.trim() || null,
      fdCustCode: r.fdCustCode?.trim() || null,
      fdListCode: r.fdListCode?.trim() || null,
      fdJmlPackSJ: r.fdJmlPackSJ !== null && r.fdJmlPackSJ !== undefined ? Number(r.fdJmlPackSJ) : null,
      fdJmlBeratSJ: r.fdJmlBeratSJ !== null && r.fdJmlBeratSJ !== undefined ? Number(r.fdJmlBeratSJ) : null,
      entryList: r.entryList
        ? {
            fdMarkingCode: r.entryList.fdMarkingCode?.trim() || null,
            fdMarkingNo: r.entryList.fdMarkingNo?.trim() || null,
            fdSatuan: r.entryList.fdSatuan?.trim() || null,
          }
        : null,
    }))

    // Formatted Actionable Alerts
    const actionableAlerts = {
      etaNotExit: {
        total: markingKpis?.etaNotExitBatches || 0,
        air: markingKpis?.etaNotExitBatchesAir || 0,
        sea: markingKpis?.etaNotExitBatchesSea || 0,
        topConsignees: (markingKpis?.etaNotExitSummaryArray || []).slice(0, 10),
      },
      missedTargetSLA: {
        total: markingKpis?.missedTargetBatches || 0,
        air: markingKpis?.missedTargetBatchesAir || 0,
        sea: markingKpis?.missedTargetBatchesSea || 0,
        topConsignees: (markingKpis?.missedTargetSummaryArray || []).slice(0, 10),
      },
    }

    // Formatted Delivery Orders Status
    const deliveryStatus = {
      scheduled: Number(doScheduled || 0),
      onDelivery: Number(doOnDelivery || 0),
      delivered: Number(doDelivered || 0),
      outstandingSJ: Number(doOutstandingSJ || 0),
      totalPackages: Number(doAgg._sum.fdJmlPackSJ || 0),
      totalWeight: Number(doAgg._sum.fdJmlBeratSJ || 0),
    }

    // Formatted Financial Overview
    const financialOverview = {
      draftInvoicesCount: Number(draftCount || 0),
      draftInvoicesAmount: Number(draftAgg._sum.fdJumlah1 || 0),
      overdueInvoicesCount: Number(overdueCount || 0),
      overdueInvoicesAmount: Number(overdueAgg._sum.fdJumlah1 || 0),
      monthlyRevenue: Number(monthlyRevAgg._sum.fdJumlah1 || 0),
      monthlyInvoicesCount: Number(monthlyInvCount || 0),
    }

    // Formatted Origin Analytics & Upcoming Arrivals
    const branches = (originRaw as any[]).map((row) => ({
      branchCode: String(row.branchCode || 'SG').trim(),
      totalShipments: Number(row.totalShipments || 0),
      airShipments: Number(row.airShipments || 0),
      seaShipments: Number(row.seaShipments || 0),
      totalVolume: Number(row.totalVolume || 0),
      totalWeight: Number(row.totalWeight || 0),
      totalPackages: Number(row.totalPackages || 0),
    }))

    const upcomingArrivals = (upcomingBatches as any[]).map((b) => ({
      markingCode: b.fdMarkingCode?.trim() || '',
      branchCode: b.fdBranchCode?.trim() || 'SG',
      listType: Number(b.fdListType || 1),
      eta: b.fdETA,
      consignee: b.fdConsignee?.trim() || null,
      gudang: b.fdGudang?.trim() || null,
      ket: b.fdKet?.trim() || null,
    }))

    return {
      metrics: {
        totalCustomers,
        totalInvoices,
        totalDeliveryOrders,
        totalShipments,
        totalInvoiceAmount: Number(invoiceAggregate._sum.fdJumlah1 || 0)
      },
      trends: {
        customers: calculateTrend(customersThisMonth, customersLastMonth),
        invoices: calculateTrend(invoicesThisMonth, invoicesLastMonth),
        deliveryOrders: calculateTrend(deliveryOrdersThisMonth, deliveryOrdersLastMonth),
        shipments: calculateTrend(shipmentsThisMonth, shipmentsLastMonth)
      },
      recentActivity: {
        invoices: mappedRecentInvoices,
        deliveryOrders: mappedRecentDOs
      },
      chartData,
      actionableAlerts,
      deliveryStatus,
      financialOverview,
      originAnalytics: {
        branches,
        upcomingArrivals,
      },
    }
  } catch (error: any) {
    logger.error(`[DashboardService] Critical unexpected error in getDashboardStats: ${error?.message || error}`)
    return {
      metrics: { totalCustomers: 0, totalInvoices: 0, totalDeliveryOrders: 0, totalShipments: 0, totalInvoiceAmount: 0 },
      trends: { customers: null, invoices: null, deliveryOrders: null, shipments: null },
      recentActivity: { invoices: [], deliveryOrders: [] },
      chartData: [],
      actionableAlerts: {
        etaNotExit: { total: 0, air: 0, sea: 0, topConsignees: [] },
        missedTargetSLA: { total: 0, air: 0, sea: 0, topConsignees: [] },
      },
      deliveryStatus: { scheduled: 0, onDelivery: 0, delivered: 0, outstandingSJ: 0, totalPackages: 0, totalWeight: 0 },
      financialOverview: { draftInvoicesCount: 0, draftInvoicesAmount: 0, overdueInvoicesCount: 0, overdueInvoicesAmount: 0, monthlyRevenue: 0, monthlyInvoicesCount: 0 },
      originAnalytics: { branches: [], upcomingArrivals: [] },
    }
  }
}
