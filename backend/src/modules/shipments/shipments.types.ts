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
  statusStep: number // 0=menunggu loading .. 4=keluar gudang, 5=dalam pengiriman, 6=terkirim, 7=billed, 8=partially paid, 9=paid
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

export interface ShipmentCommodityMetric {
  name: string
  shipments: number
  packages: number
  weight: number
  volume: number
  percentage?: number
}

export interface ShipmentCommoditiesData {
  air: ShipmentCommodityMetric[]
  sea: ShipmentCommodityMetric[]
}

export interface ShipmentsKPIResponse {
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
  [key: string]: string | undefined
}
