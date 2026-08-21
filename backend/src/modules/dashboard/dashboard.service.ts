import { prisma } from '../../config/database'
import { logger } from '../../config/logger'

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

export async function getDashboardStats() {
  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // Generate 12 months ranges for chart
    const months = []
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
      months.push({ start, end })
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
      invoiceAggregate
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
      safeQuery(() => prisma.tbBilling.aggregate({ _sum: { fdJumlah1: true } }), { _sum: { fdJumlah1: null } }, 'invoiceAggregate')
    ])

    const chartPromises = months.map(async ({ start, end }) => {
      const [invoices, deliveryOrders, shipments] = await Promise.all([
        safeQuery(() => prisma.tbBilling.count({ where: { fdInvDate: { gte: start, lte: end } } }), 0, 'chart invoices'),
        safeQuery(() => prisma.tbDelivery.count({ where: { fdSJDate: { gte: start, lte: end } } }), 0, 'chart deliveryOrders'),
        safeQuery(() => prisma.vwShipment.count({ where: { fdTglAgent: { gte: start, lte: end } } }), 0, 'chart shipments')
      ])

      // Format month name (e.g. "Jan", "Feb")
      const monthName = start.toLocaleString('id-ID', { month: 'short' })

      return {
        name: monthName,
        invoices,
        deliveryOrders,
        shipments
      }
    })

    const chartData = await Promise.all(chartPromises)

    // Helper to calculate Month-over-Month growth
    const calculateTrend = (thisMonth: number, lastMonth: number) => {
      if (lastMonth === 0) {
        return thisMonth > 0
          ? { type: 'up', value: '100%', label: 'vs bulan lalu' }
          : null
      }

      const percentage = ((thisMonth - lastMonth) / lastMonth) * 100
      return {
        type: percentage >= 0 ? 'up' : 'down',
        value: `${Math.abs(percentage).toFixed(1)}%`,
        label: 'vs bulan lalu'
      }
    }

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
        invoices: recentInvoices,
        deliveryOrders: recentDeliveryOrders
      },
      chartData
    }
  } catch (error: any) {
    logger.error(`[DashboardService] Critical unexpected error in getDashboardStats: ${error?.message || error}`)
    return {
      metrics: { totalCustomers: 0, totalInvoices: 0, totalDeliveryOrders: 0, totalShipments: 0, totalInvoiceAmount: 0 },
      trends: { customers: null, invoices: null, deliveryOrders: null, shipments: null },
      recentActivity: { invoices: [], deliveryOrders: [] },
      chartData: []
    }
  }
}

