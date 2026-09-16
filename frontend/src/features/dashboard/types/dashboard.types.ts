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

export interface ActionableAlertCodeItem {
  code: string
  aging?: number
  transit?: number
  target?: number
  eta?: string | null
  etd?: string | null
}

export interface ActionableAlertConsignee {
  name: string
  count: number
  codes: ActionableAlertCodeItem[]
}

export interface ActionableAlertsStats {
  etaNotExit: {
    total: number
    air: number
    sea: number
    topConsignees: ActionableAlertConsignee[]
  }
  missedTargetSLA: {
    total: number
    air: number
    sea: number
    topConsignees: ActionableAlertConsignee[]
  }
}

export interface DeliveryStatusStats {
  scheduled: number
  onDelivery: number
  delivered: number
  outstandingSJ: number
  totalPackages: number
  totalWeight: number
}

export interface FinancialOverviewStats {
  draftInvoicesCount: number
  draftInvoicesAmount: number
  overdueInvoicesCount: number
  overdueInvoicesAmount: number
  monthlyRevenue: number
  monthlyInvoicesCount: number
}

export interface OriginAnalyticsBranch {
  branchCode: string
  totalShipments: number
  airShipments: number
  seaShipments: number
  totalVolume: number
  totalWeight: number
  totalPackages: number
}

export interface UpcomingArrivalItem {
  markingCode: string
  branchCode: string
  listType: number
  eta: string | null
  consignee: string | null
  gudang: string | null
  ket: string | null
}

export interface OriginAnalyticsStats {
  branches: OriginAnalyticsBranch[]
  upcomingArrivals: UpcomingArrivalItem[]
}

export interface DashboardStats {
  metrics: DashboardMetrics
  trends: DashboardTrends
  chartData: DashboardChartData[]
  recentActivity: {
    invoices: DashboardRecentInvoice[]
    deliveryOrders: DashboardRecentDO[]
  }
  actionableAlerts: ActionableAlertsStats
  deliveryStatus: DeliveryStatusStats
  financialOverview: FinancialOverviewStats
  originAnalytics: OriginAnalyticsStats
}
