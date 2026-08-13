export interface DashboardMetrics {
  totalCustomers: number
  totalInvoices: number
  totalDeliveryOrders: number
  totalShipments: number
  totalInvoiceAmount: number
}

export interface DashboardTrend {
  type: string
  value: string
  label: string
}

export interface DashboardTrends {
  customers: DashboardTrend | null
  invoices: DashboardTrend | null
  deliveryOrders: DashboardTrend | null
  shipments: DashboardTrend | null
}

export interface DashboardChartData {
  name: string
  invoices: number
  deliveryOrders: number
  shipments: number
}

export interface DashboardRecentInvoice {
  fdInvNo: string
  fdInvDate: string
  fdJumlah1: number
  fdCustCode: string
  customer: { fdCustName: string } | null
}

export interface DashboardRecentDO {
  fdSJNo: string
  fdSJDate: string
  fdCarID?: string | null
  fdCustNameSJ: string | null
  fdCustCode: string | null
  fdListCode?: string | null
  fdJmlPackSJ?: number | null
  fdJmlBeratSJ?: number | null
  fdSatuan?: string | null
  entryList?: {
    fdMarkingCode?: string | null
    fdMarkingNo?: string | null
    fdSatuan?: string | null
  } | null
}

export interface DashboardStats {
  metrics: DashboardMetrics
  trends: DashboardTrends
  chartData: DashboardChartData[]
  recentActivity: {
    invoices: DashboardRecentInvoice[]
    deliveryOrders: DashboardRecentDO[]
  }
}
