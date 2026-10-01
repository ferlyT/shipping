/**
 * Marking Module Utility and Calculation Functions
 */

export type ExitPredictionCategory = 'terlambat' | 'segera' | 'dekat' | 'normal'

/**
 * Categorize batches based on remaining days until predicted exit
 * - < 0: terlambat (overdue)
 * - 0..3: segera (urgent / imminent exit within 3 days)
 * - 4..7: dekat (approaching exit within a week)
 * - > 7: normal (scheduled)
 */
export function categorizeExitPrediction(daysUntil: number): ExitPredictionCategory {
  if (daysUntil < 0) return 'terlambat'
  if (daysUntil <= 3) return 'segera'
  if (daysUntil <= 7) return 'dekat'
  return 'normal'
}

export interface SizeSummaryInput {
  totalPackPL: number
  totalPackGdg: number
  totalM3PL: number
  totalM3Gdg: number
  totalM3Komplain: number
  totalBeratList: number
  totalBeratGdg: number
  totalBeratKomplain: number
}

export interface SizeSummaryMetrics {
  selisihPack: number
  totalM3Net: number
  selisihM3: number
  persenSelisihM3: number
  totalBeratNet: number
}

/**
 * Calculate volume, pack, and weight difference metrics between Packing List and Warehouse physical receipt
 */
export function calculateSizeSummaryMetrics(input: SizeSummaryInput): SizeSummaryMetrics {
  const selisihPack = input.totalPackPL - input.totalPackGdg
  const totalM3Net = Math.max(0, input.totalM3Gdg - input.totalM3Komplain)
  const selisihM3 = input.totalM3Gdg - input.totalM3PL
  const persenSelisihM3 = input.totalM3PL > 0 ? (selisihM3 / input.totalM3PL) * 100 : 0
  const totalBeratNet = Math.max(0, (input.totalBeratGdg || input.totalBeratList) - input.totalBeratKomplain)

  return {
    selisihPack,
    totalM3Net: Number(totalM3Net.toFixed(4)),
    selisihM3: Number(selisihM3.toFixed(4)),
    persenSelisihM3: Number(persenSelisihM3.toFixed(2)),
    totalBeratNet: Number(totalBeratNet.toFixed(2)),
  }
}

/**
 * Calculate Volumetric Freight Calculation (VFC) in Kg from M3 volume
 * Standard air formula: (m3 * 1,000,000 cm3) / 6000
 */
export function calculateVfc(totalM3: number): number {
  if (!totalM3 || totalM3 <= 0) return 0
  return Number(((totalM3 * 1_000_000) / 6000).toFixed(2))
}

