export interface CustMarkingDetailModalProps {
  isOpen: boolean
  onClose: () => void
  custCode?: string | null
  custName?: string | null
  markingCode?: string | null
}

export type ColumnPreset = 'all' | 'physical' | 'complaint' | 'finance'

export type SortField =
  | 'invoice'
  | 'branchCode'
  | 'date'
  | 'listCode'
  | 'terima'
  | 'marking'
  | 'markingNo'
  | 'comodity'
  | 'fdDesc'
  | 'currValue1'
  | 'qtyGdg'
  | 'qtySJ'
  | 'qtyPL'
  | 'qtyK'
  | 'weightGdg'
  | 'weightSJ'
  | 'weightK'
  | 'kgBill'
  | 'selisihKg'
  | 'm3Gdg'
  | 'm3PL'
  | 'm3K'
  | 'selisihM3'
  | 'm3Bill'
  | 'rasio'
  | 'vfcGdg'
  | 'vfcK'
  | 'vfcBill'
  | 'overWeight'
  | 'value2'
  | 'fc'
  | 'typeComodityText'
  | 'taxVal'

export type SortOrder = 'asc' | 'desc'

export interface NormalizedMarkingRow {
  raw: any
  originalIndex: number
  invoice: string
  dateStr: string
  date: number
  listCode: string
  terima: string
  marking: string
  markingNo: string
  fdDescr: string
  fdDesc: string
  fdComodity: string
  fdComodityName: string
  comodity: string
  typeComodityText: string
  bc: string
  branchCode: string
  listType: number | null
  modeText: string
  isTax: boolean
  taxVal: number
  qtySJ: number
  qtyGdg: number
  qtyPL: number
  qtyK: number
  activeQty: number
  weightSJ: number
  weightGdg: number
  weightK: number
  kgBill: number
  selisihKg: number
  weight: number
  m3PL: number
  m3Gdg: number
  m3K: number
  selisihM3: number
  m3Bill: number
  activeM3: number
  rasio: number
  vfcGdg: number
  vfcK: number
  vfcBill: number
  selisihVfc: number
  currValue1: string
  value2: number
  currFc: string
  fc: number
  status: number
  typeTagihan: number
  totalSJ: number
  hasKomplain: boolean
  hasSelisih: boolean
  isUnderbilledM3: boolean
  isPlEmpty: boolean
  isStatusNonStandard: boolean
  isInvoiceUtama: boolean
  isBillGabungan: boolean
  isBillTambahan: boolean
  isQtyKomplainMismatch: boolean
  owPL: number | null
  owGdg: number | null
  owSJ: number | null
  owK: number | null
  rawOwPL: number | null
  rawOwGdg: number | null
  rawOwSJ: number | null
  rawOwK: number | null
  rawOw: number | null
  overWeight: number | null
}

export interface CustMarkingAggregates {
  totalResi: number
  totalInvoices: number
  countInvoiceUtama: number
  countBillGabungan: number
  countBillTambahan: number
  countQtyKomplainMismatch: number
  totalQtyGdg: number
  totalQtySJ: number
  totalQtyPL: number
  totalQtyK: number
  totalWeightGdg: number
  totalWeightSJ: number
  totalWeightK: number
  totalKgBill: number
  totalWeight: number
  totalM3PL: number
  totalM3Gdg: number
  totalM3K: number
  totalM3Bill: number
  totalM3Active: number
  totalVfcGdg: number
  totalVfcK: number
  totalVfcBill: number
  totalValue2: number
  totalFc: number
  totalOw: number
  totalOwGdg: number
  totalOwSJ: number
  totalOwK: number
  countKomplain: number
  countSelisih: number
  commodityTypes: Array<{
    type: string
    count: number
    weight: number
    m3: number
  }>
}

export interface InvoiceGroup {
  invoice: string
  dateStr: string
  date: number
  branchCode: string
  isInvoiceUtama: boolean
  isBillGabungan: boolean
  isBillTambahan: boolean
  totalItems: number
  totalQtyGdg: number
  totalQtySJ: number
  totalQtyPL: number
  totalQtyK: number
  totalWeightGdg: number
  totalWeightSJ: number
  totalWeightK: number
  totalKgBill: number
  totalM3PL: number
  totalM3Gdg: number
  totalM3K: number
  totalM3Bill: number
  totalVfcGdg: number
  totalVfcK: number
  totalVfcBill: number
  totalValue2: number
  totalFc: number
  hasSelisih: boolean
  hasKomplain: boolean
  isQtyKomplainMismatch: boolean
  rows: NormalizedMarkingRow[]
}
