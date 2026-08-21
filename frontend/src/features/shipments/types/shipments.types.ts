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
  fdM3: number | null
  fdCancel?: number | null
  fdLocalTrackingNo?: string | null
  shipmentStatus?: ShipmentStatus
}

export interface ShipmentKpis {
  totalResi: number
  totalPackages: number
  totalBerat: number
  totalVolume: number
}
