import { useMemo } from 'react'
import { calculateOverweight } from '@/lib/utils'

// Interface minimal yang kompatibel dengan M3CheckResponse dari BillingValidationCard maupun BillingValidationSummaryModal
interface M3ResForOverweight {
  fdJmlBeratGudang?: number | null
  fdBeratList?: number | string | null
  fdJmlBeratKomplain?: number | null
  fdBeratSJ?: number | null
  totalJmlBeratSJ?: number | null
  totalBeratPerMarking?: number | null
  profileHarga?: { rasio?: number | null } | null
  recommendedM3?: number | null
}

interface InvoiceDetailMin {
  fdItemName?: string | null
  fdQty?: number | null
}

interface UseOverweightValidationParams {
  /** Data validasi dari API m3Check */
  res: M3ResForOverweight | null | undefined
  /** Detail item invoice */
  invoiceDetails: InvoiceDetailMin[]
  /** Kubikasi yang sudah ditagihkan (dari useInvoiceMetrics) */
  billedM3: number
  /** Berat KG yang sudah ditagihkan (dari useInvoiceMetrics) */
  billedKg?: number
  /** True jika pengiriman udara (BY AIR) */
  isAir: boolean
  /** True jika invoice gabungan (multi-marking) */
  isGabungan: boolean
  /**
   * Fallback M3 jika billedM3 = 0.
   * Umumnya: targetKomplainM3 ?? gudangValues[0] ?? plValues[0] ?? res?.recommendedM3
   */
  refM3Fallback?: number
}

export interface OverweightValidationResult {
  /** Berat KG yang efektif ditagihkan (dengan fallback scan nama item) */
  effectiveBilledKg: number
  /** Berat aktual fisik (kg) dari operasional */
  actualWeightKg: number
  /** Rasio berat/m3 dari profil harga */
  rasio: number
  /** M3 referensi yang digunakan untuk hitung batas berat */
  refM3: number
  /** Batas maksimal berat yang diperbolehkan tanpa overweight charge */
  maxAllowedWeight: number
  /** Kelebihan berat yang harus ditagih (kg) */
  overweightKg: number
  /** True jika ada overweight */
  isOverweight: boolean
  /** True jika tagihan KG persis cocok dengan overweight (< 0.01 kg) */
  isBilledOverweightExactMatch: boolean
  /** True jika tagihan KG dalam toleransi plus minus 1 kg dari overweight */
  isBilledOverweightTolerated: boolean
  /** True jika tagihan KG sudah menutup overweight (exact atau toleransi) */
  isBilledOverweightMatch: boolean
  /** True jika ada tagihan KG padahal fisik tidak overweight */
  isBilledUnneededOverweight: boolean
  /** Selisih tagihan KG vs overweight aktual */
  overweightDiff: number | null
}

/**
 * Hitung effectiveBilledKg dari billedKg prop atau fallback scan nama item.
 * Fungsi ini diekspor agar bisa dipanggil sebelum hook (misal untuk airPrimaryMatch).
 *
 * Aturan:
 * 1. Gunakan billedKg jika > 0
 * 2. Fallback: scan item invoice yang namanya mengandung 'kg', 'berat', atau 'overweight'
 */
export function computeEffectiveBilledKg(
  billedKg: number,
  isAir: boolean,
  invoiceDetails: InvoiceDetailMin[]
): number {
  if (billedKg > 0) return billedKg
  if (isAir || !invoiceDetails || invoiceDetails.length === 0) return 0
  const kgItem = invoiceDetails.find((d) => {
    const lower = (d.fdItemName || '').toLowerCase()
    return lower.includes('kg') || lower.includes('berat') || lower.includes('overweight')
  })
  return kgItem ? Number(kgItem.fdQty || 0) : 0
}

/**
 * Hook terpusat untuk kalkulasi validasi overweight/KG billing.
 * Single source of truth untuk BillingValidationCard dan BillingValidationSummaryModal.
 */
export function useOverweightValidation({
  res,
  invoiceDetails,
  billedM3,
  billedKg = 0,
  isAir,
  isGabungan,
  refM3Fallback = 0,
}: UseOverweightValidationParams): OverweightValidationResult {
  const effectiveBilledKg = useMemo(
    () => computeEffectiveBilledKg(billedKg, isAir, invoiceDetails),
    [billedKg, isAir, invoiceDetails]
  )

  const actualWeightKg = useMemo(() => {
    const gudang = res?.fdJmlBeratGudang ?? 0
    const list = res?.fdBeratList ? Number(res.fdBeratList) : 0
    const komplain = res?.fdJmlBeratKomplain ? Number(res.fdJmlBeratKomplain) : 0
    const sjList = res?.fdBeratSJ ? Number(res.fdBeratSJ) : 0
    const sj = res?.totalJmlBeratSJ ?? 0
    const perMarking = res?.totalBeratPerMarking ?? 0

    if (isGabungan) {
      if (komplain > 0) return komplain
      if (perMarking > 0) return perMarking
      if (sj > 0) return sj
    }

    // Hirarki KG untuk Bill Reguler: 1. Berat Komplain -> 2. Berat SJ (ListCode) -> 3. Berat Gudang -> 4. Berat List
    if (komplain > 0) return komplain
    if (sjList > 0) return sjList
    if (gudang > 0) return gudang
    if (list > 0) return list
    return 0
  }, [res, isGabungan])

  const rasio = res?.profileHarga?.rasio ?? 0
  const refM3 = billedM3 > 0 ? billedM3 : refM3Fallback
  const maxAllowedWeight = !isAir && rasio > 0 && refM3 > 0 ? refM3 * rasio : 0
  const overweightKg = !isAir && rasio > 0 && refM3 > 0 && actualWeightKg > 0
    ? calculateOverweight(actualWeightKg, refM3, rasio)
    : 0
  const isOverweight = overweightKg > 0

  const isBilledOverweightExactMatch = !isAir && isOverweight && effectiveBilledKg > 0
    && Math.abs(effectiveBilledKg - overweightKg) < 0.01
  const isBilledOverweightTolerated = !isAir && isOverweight && effectiveBilledKg > 0
    && !isBilledOverweightExactMatch && Math.abs(effectiveBilledKg - overweightKg) <= 1
  const isBilledOverweightMatch = !isAir && isOverweight && effectiveBilledKg > 0
    && (isBilledOverweightExactMatch || isBilledOverweightTolerated)
  const isBilledUnneededOverweight = !isAir && !isOverweight && effectiveBilledKg > 0
  const overweightDiff = effectiveBilledKg > 0 ? effectiveBilledKg - overweightKg : null

  return {
    effectiveBilledKg,
    actualWeightKg,
    rasio,
    refM3,
    maxAllowedWeight,
    overweightKg,
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledOverweightTolerated,
    isBilledOverweightMatch,
    isBilledUnneededOverweight,
    overweightDiff,
  }
}
