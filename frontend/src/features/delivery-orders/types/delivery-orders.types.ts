export type ListType = 'air' | 'sea'
export type GroupMode = 'marking' | 'branch' | 'none'
export type SentValue = '0' | '1'

export interface DeliveryOrder {
  fdSJNo: string
  fdSJDate: string
  fdCustCode: string | null
  fdCustNameSJ: string | null
  fdDescr: string
  fdSupir: string | null
  fdCarID: string | null
  fdJmlPackSJ: number | null
  fdJmlBeratSJ: number | null
  fdAddr: string | null
  fdCity: string | null
}

export interface GroupedDataRow {
  listCode: string
  markingCode: string
  customerName?: string
  resiNo?: string
  comodity?: string
  branchCode?: string
  branchName?: string
  totalQty: number
  totalTerkirim: number
  sisa: number
  isSent: number
}

export interface GroupMeta {
  code: string
  label: string
  total: number
}

export interface KpiData {
  totalSJ: number
  totalPackages: number
  totalWeight: number
  sjBulanIni: number
}
