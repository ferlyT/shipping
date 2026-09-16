/**
 * Shipments Module Type Definitions
 */

export interface MarkingDates {
  fdLoadDate: Date | null
  fdETD: Date | null
  fdETA: Date | null
  fdExitDate: Date | null
  fdGudang: string | null
}

export interface DeliveryInfo {
  hasDelivery: boolean
  isSent: boolean
}

export interface BillingInfo {
  isBilled: boolean
  isPartiallyPaid: boolean
  isPaid: boolean
}

export type ShipmentStatus = MarkingDates & {
  statusLabel: string
  statusStep: number // -1=Canceled, 10=Blocked, 0=menunggu loading .. 4=keluar gudang, 5=dalam pengiriman, 6=terkirim, 7=billed, 8=partially paid, 9=paid
  isBlocked?: boolean
  blockedBy?: string | null
  blockedReason?: string | null
}

export interface ShipmentInvoiceDetailItem {
  fdID: string
  fdItemName: string
  fdQty: number
  fdSatuan: string
  fdListCode?: string | null
  fdItemPrice: number
  fdTotal: number
  fdCurr: string
}

export interface ShipmentInvoiceTotal {
  fdID: string
  fdCCYCode: string
  fdJumlah: number
  fdBayar: number
  fdSLunas?: number | null
  fdFinish?: Date | null
}

export interface ShipmentInvoice {
  fdInvNo: string
  fdInvDate: Date | null
  fdCustCode?: string | null
  fdCustName?: string | null
  fdBillTo?: string | null
  fdGive?: number | null
  fdGiveDate?: Date | null
  fdGive2?: number | null
  fdGiveDate2?: Date | null
  fdCekDate?: Date | null
  fdCekBy?: string | null
  fdDescr?: string | null
  totalAmount: number
  totalPaid: number
  balance: number
  paymentStatus: 'LUNAS' | 'PARTIAL' | 'OVERDUE' | 'ISSUED' | 'UNPAID' | 'DRAFT'
  isIssued: boolean
  isCollected: boolean
  isPaid: boolean
  totals: ShipmentInvoiceTotal[]
  details: ShipmentInvoiceDetailItem[]
}

export interface ShipmentTypeBreakdown {
  udara: number
  laut: number
}

export interface ShipmentTrendMetric {
  diff: number
  percentage: number | null
  percentageText: string
  type: 'up' | 'down' | 'neutral'
}

export interface ShipmentPeriodMetrics {
  totalResi: number
  totalPackages: number
  totalBerat: number
  totalVolume: number
  totalCust: number
  resiByType: ShipmentTypeBreakdown
  packagesByType: ShipmentTypeBreakdown
  beratByType: ShipmentTypeBreakdown
  volumeByType: ShipmentTypeBreakdown
  custByType: ShipmentTypeBreakdown
}

export interface BranchInfo {
  code: string
  name: string
}

export interface CommodityBranchMetric {
  branchCode: string
  branchName?: string
  shipments: number
  packages: number
  weight: number
  volume: number
  percentage?: number
}

export interface ShipmentCommodityMetric {
  name: string
  shipments: number
  packages: number
  weight: number
  volume: number
  percentage?: number
  branches?: CommodityBranchMetric[]
}

export interface ShipmentCommoditiesData {
  air: ShipmentCommodityMetric[]
  sea: ShipmentCommodityMetric[]
  availableBranches?: (BranchInfo | string)[]
}

export interface ShipmentsKPIResponse {
  year?: number
  totalResi: number
  totalPackages: number
  totalBerat: number
  totalVolume: number
  totalCust: number
  resiByType: ShipmentTypeBreakdown
  packagesByType: ShipmentTypeBreakdown
  beratByType: ShipmentTypeBreakdown
  volumeByType: ShipmentTypeBreakdown
  custByType: ShipmentTypeBreakdown
  thisMonth?: ShipmentPeriodMetrics
  lastMonth?: ShipmentPeriodMetrics
  comparison?: {
    resi: ShipmentTrendMetric
    packages: ShipmentTrendMetric
    berat: ShipmentTrendMetric
    volume: ShipmentTrendMetric
    cust: ShipmentTrendMetric
  }
  commodities?: ShipmentCommoditiesData
}

export interface ShipmentQuery {
  page?: string
  limit?: string
  search?: string
  searchField?: string
  customer?: string
  marking?: string
  listType?: string
  branch?: string
  status?: string
  year?: string
  [key: string]: string | undefined
}
