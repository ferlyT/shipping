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
  averageTransitDays: number | null
  averageTransitDaysAir: number | null
  averageTransitDaysSea: number | null
  missedTargetCount: number
  missedTargetCountAir: number
  missedTargetCountSea: number
  missedTargetSummary: Array<{ name: string; count: number; codes: Array<{ code: string; transit: number; target: number }> }>
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
