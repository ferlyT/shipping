export interface ShipmentDimension {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
}

export interface ShipmentDimensionGudang {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
  fdSJCreated?: number | null
  fdCetak?: number | null
  fdLoad?: string | null
}

export interface ShipmentDimensionPackingList {
  fdListCode: string
  fdListDCode: string
  fdMarkingCode?: string | null
  fdMarkingAndNo?: string | null
  fdComodity?: string | null
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
  fdSJCreated?: number | null
  fdCetak?: number | null
}

export interface ShipmentDimensionKomplain {
  fdListCode: string
  fdListDCode: string
  fdDescr: string | null
  fdPjg: number | null
  fdLbr: number | null
  fdTng: number | null
  fdQty: number | null
  fdSJCreated?: number | null
  fdCetak?: number | null
  fdLoad?: string | null
}

export interface ShipmentStatus {
  fdLoadDate: string | null
  fdETD: string | null
  fdETA: string | null
  fdExitDate: string | null
  fdTerimaDate: string | null
  fdGudang: string | null
  statusLabel: string
  statusStep: number
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
  fdFinish?: string | null
}

export interface ShipmentInvoice {
  fdInvNo: string
  fdInvDate: string | null
  fdCustCode?: string | null
  fdCustName?: string | null
  fdBillTo?: string | null
  fdGive?: number | null
  fdGiveDate?: string | null
  fdGive2?: number | null
  fdGiveDate2?: string | null
  fdCekDate?: string | null
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

export interface Shipment {
  fdListCode: string
  fdCustName: string | null
  fdTerima: string | null
  fdTglAgent: string | null
  fdMarkingCode: string | null
  fdMarkingNo?: string | null
  fdDesc: string | null
  fdComodity: string | null
  fdComodityName?: string | null
  fdBranchCode?: string | null
  fdJmlPack: number | null
  fdSatuan: string | null
  fdJmlBerat: number | null
  fdListType?: number | null
  fdM3: number | null
  fdCancel?: number | null
  fdLocalTrackingNo?: string | null
  fdEmp1?: string | null
  fdCreatedDate?: string | null
  fdEmp2?: string | null
  fdUpdate?: string | null
  shipmentStatus?: ShipmentStatus
  invoice?: ShipmentInvoice | null
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

export interface ShipmentKpis {
  year?: number
  totalResi: number
  totalPackages: number
  totalBerat: number
  totalVolume: number
  totalCust: number
  resiByType?: ShipmentTypeBreakdown
  packagesByType?: ShipmentTypeBreakdown
  beratByType?: ShipmentTypeBreakdown
  volumeByType?: ShipmentTypeBreakdown
  custByType?: ShipmentTypeBreakdown
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

