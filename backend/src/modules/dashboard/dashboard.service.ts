import { prisma } from '../../config/database'

export async function getDashboardStats() {
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
    prisma.tbCustomers.count(),
    prisma.tbBilling.count(),
    prisma.tbDelivery.count(),
    prisma.vwShipment.count(),
    // Get recent 5 invoices
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
    // Get recent 5 delivery orders
    prisma.tbDelivery.findMany({
      take: 5,
      orderBy: { fdSJDate: 'desc' },
      select: {
        fdSJNo: true,
        fdSJDate: true,
        fdCustNameSJ: true,
        fdCustCode: true,
      }
    }),
    // Count new records this month
    prisma.tbCustomers.count({ where: { fdCreatedDate: { gte: thisMonthStart } } }),
    prisma.tbBilling.count({ where: { fdInvDate: { gte: thisMonthStart } } }),
    prisma.tbDelivery.count({ where: { fdSJDate: { gte: thisMonthStart } } }),
    prisma.vwShipment.count({ where: { fdTglAgent: { gte: thisMonthStart } } }),
    // Count new records last month
    prisma.tbCustomers.count({ where: { fdCreatedDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.tbBilling.count({ where: { fdInvDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.tbDelivery.count({ where: { fdSJDate: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    prisma.vwShipment.count({ where: { fdTglAgent: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    // Aggregate invoice amount
    prisma.tbBilling.aggregate({ _sum: { fdJumlah1: true } })
  ])

  const chartPromises = months.map(async ({ start, end }) => {
    const [invoices, deliveryOrders, shipments] = await Promise.all([
      prisma.tbBilling.count({ where: { fdInvDate: { gte: start, lte: end } } }),
      prisma.tbDelivery.count({ where: { fdSJDate: { gte: start, lte: end } } }),
      prisma.vwShipment.count({ where: { fdTglAgent: { gte: start, lte: end } } })
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
      shipments: calculateTrend(shipmentsThisMonth, shipmentsLastMonth),
    },
    recentActivity: {
      invoices: recentInvoices,
      deliveryOrders: recentDeliveryOrders,
    },
    chartData
  }
}
