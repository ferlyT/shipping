/**
 * Marking Module Type Definitions
 */

export interface MarkingQuery {
  page?: string
  limit?: string
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  listType?: string
  isClosed?: string
  groupMode?: string
  groupValue?: string
  month?: string
  [key: string]: string | undefined
}

export interface PrediksiExitItem {
  fdMarkingCode: string
  fdConsignee: string | null
  fdBranchCode: string | null
  fdListType: number | null
  fdETA: Date
  predictedExitDate: Date
  daysUntil: number
  avgDelayDays: number
  sampleSize: number
  category: 'terlambat' | 'segera' | 'dekat' | 'normal'
  fdGudang?: string | null
  fdKet?: string | null
}

export interface MarkingGroupItem {
  key: string
  count: number
  label: string
}

export interface MarkingKPIResponse {
  totalBatches: number
  totalBatchesAir: number
  totalBatchesSea: number
  thisYearBatches: number
  thisYearBatchesAir: number
  thisYearBatchesSea: number
  lastYearBatchesYtd: number
  lastYearBatchesTotal: number
  growthYtd: number | null
  activeBatches: number
  activeBatchesAir: number
  activeBatchesSea: number
  etaNotExitBatches: number
  etaNotExitBatchesAir: number
  etaNotExitBatchesSea: number
  etaNotExitSummary: Array<{ name: string; count: number; codes: Array<{ code: string; aging: number }> }>
  etaNotExitSummaryArray?: Array<{ name: string; count: number; codes: Array<{ code: string; aging: number }> }>
  averageTransitDays: number | null
  averageTransitDaysAir: number | null
  averageTransitDaysSea: number | null
  missedTargetCount: number
  missedTargetCountAir: number
  missedTargetCountSea: number
  missedTargetBatches?: number
  missedTargetBatchesAir?: number
  missedTargetBatchesSea?: number
  missedTargetSummary: Array<{ name: string; count: number; codes: Array<{ code: string; transit: number; target: number }> }>
  missedTargetSummaryArray?: Array<{ name: string; count: number; codes: Array<{ code: string; transit: number; target: number }> }>
  prediksiTerlambatCount: number
  prediksiSegeraCount: number
  prediksiDekatCount: number
  prediksiAttentionAir: number
  prediksiAttentionSea: number
  prediksiExitList: PrediksiExitItem[]
  exitTodayCount: number
  exitTodayAir: number
  exitTodaySea: number
  exitYesterdayCount: number
  exitYesterdayAir: number
  exitYesterdaySea: number
  expectedExitTomorrowCount: number
  expectedExitTomorrowAir: number
  expectedExitTomorrowSea: number
  expectedExitTomorrowList: PrediksiExitItem[]
}

export interface MarkingSizeDetailItem {
  fdCustName: string
  fdListCode: string
  fdJmlBerat: number
  fdListType: number
  fdMarkingCode: string
  fdMarkingNo: string
  fdJmlPack: number
  fdM3List: number
  fdComodity: string
  fdDesc: string
  fdTotalQty: number
  fdM3: number
  fdExitDate: string | null
  fdM3PL: number
  fdJmlBeratSJ: number
  fdm3Komplain: number
  fdJmlBeratKomplain: number
  fdJmlBeratGudang: number
  fdKeterangan: string
  fdSelisihM3: number
  fdSelisihBerat: number
  hasMarkup?: boolean
}

export interface MarkingSizeSummary {
  markingCode: string
  listType: number // 1 = Udara, 2 = Laut
  contSize: string | null
  contNo: string | null
  exitDate: string | null
  loadDate: string | null
  etaDate: string | null
  totalPackPL: number
  totalPackGdg: number
  selisihPack: number
  totalM3PL: number
  totalM3Gdg: number
  totalM3Komplain: number
  totalM3Net: number
  selisihM3: number
  persenSelisihM3: number
  totalBeratList: number
  totalBeratGdg: number
  totalBeratSJ: number
  totalBeratKomplain: number
  totalBeratNet: number
  totalVFC: number
  totalRowCount: number
  totalMarkupCount?: number
}

export interface MarkingSizeAuditResponse {
  header: {
    fdMarkingCode: string
    fdListType: number
    fdContSize: string | null
    fdContNo: string | null
    fdExitDate: string | null
    fdLoadDate: string | null
    fdEtaDate: string | null
    fdM3: number
    fdJmlPack: number
  }
  summary: MarkingSizeSummary
  items: MarkingSizeDetailItem[]
}

export interface BoxDimensionItem {
  no: number
  fdListDCode?: string | null
  fdPjg: number
  fdLbr: number
  fdTng: number
  fdQty: number
  m3: number
  vfc: number
  fdDescr?: string | null
}

export interface BoxDimensionDetailResponse {
  listCode: string
  gudang: BoxDimensionItem[]
  asliGudang: BoxDimensionItem[]
  packingList: BoxDimensionItem[]
  komplain: BoxDimensionItem[]
  hasMarkup: boolean
  original?: BoxDimensionItem[]
}

