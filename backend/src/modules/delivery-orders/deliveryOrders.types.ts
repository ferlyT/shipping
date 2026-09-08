/**
 * Delivery Orders Module Types
 */

export interface DeliveryOrdersQuery {
  page?: string
  limit?: string
  search?: string
  listCode?: string
  markingCode?: string
  branch?: string
  listType?: string
  sent?: string
  [key: string]: string | undefined
}

export interface DeliveryOrderKPIResponse {
  totalSJ: number
  totalPackages: number
  totalWeight: number
  sjBulanIni: number
}

export interface DeliveryGroupedItem {
  listCode: string
  markingCode: string
  totalQty: number
  customerName: string | null
  resiNo: string | null
  comodity: string | null
  branchCode: string | null
  branchName: string | null
  totalTerkirim: number
  sisa: number
  isSent: number
}
