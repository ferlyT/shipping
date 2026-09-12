export type PairingValidationStatus =
  | 'COCOK'
  | 'SELISIH'
  | 'BILL_BELUM_ADA'
  | 'BELUM_EXIT'
  | 'SUDAH_EXIT'
  | 'TIDAK_DITEMUKAN'

export interface OperationalStatus {
  statusLabel: string
  markingCode: string
  exitDate: string | null
  eta: string | null
  etd: string | null
  loadDate: string | null
  gudang: string | null
  batchStatus?: number | string | null
  sjNo?: string | null
  sjDate?: string | null
  sjStatus?: string | null
  sent?: number | null
  kembali?: string | null
  supir?: string | null
  penerima?: string | null
}

export interface ParsedShippingMark {
  markingCode: string
  markingNo: string
}

export interface PairingLocalChargeRow {
  rowIndex: number
  date: string
  receiptNo: string
  receiptNosParsed: string[]
  customer: string
  from: string
  ctn: string | number
  kg: string | number
  cbm: string | number
  charge: number
  chargeRaw: string
  shippingMark: string
  shippingMarksParsed: ParsedShippingMark[]
  matchedBy: 'SHIPPING_MARK' | 'RECEIPT_NO' | 'NONE'
  entryList?: {
    listCode: string
    markingCode: string
    markingCodeAsal: string
    markingNo: string
    terima: string
    fc: number
    invoiceNo: string
  } | null
  invNo: string | null
  invNos?: string[]
  chargeDb: number
  diffCharge: number
  chargeItemName: string | null
  chargeItemCurr: string | null
  validationStatus: PairingValidationStatus
  validationNote: string
  operationalInfo?: OperationalStatus | null
}

export interface PairingLocalChargeSummary {
  totalRows: number
  totalCocok: number
  totalSelisih: number
  totalBillBelumAda: number
  totalBelumExit: number
  totalSudahExit: number
  totalTidakDitemukan: number
  totalChargeExcel: number
  totalChargeDb: number
  totalDiffCharge: number
}

export interface PairingLocalChargeResult {
  fileName?: string
  uploadedAt: string
  summary: PairingLocalChargeSummary
  rows: PairingLocalChargeRow[]
}
