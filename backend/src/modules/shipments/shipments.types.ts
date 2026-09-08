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

export interface ShipmentsKPIResponse {
  totalResi: number
  totalPackages: number
  totalBerat: number
  totalVolume: number
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
