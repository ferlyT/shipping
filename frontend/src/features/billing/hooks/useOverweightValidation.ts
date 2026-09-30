import { useMemo } from 'react'
import { calculateOverweight } from '@/lib/utils'
import type { RelatedBillsSummary } from '../types/billing.types'

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
  relatedBillsSummary?: RelatedBillsSummary | null
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
  /** True jika invoice anak pecahan yang digabung ke invoice induk */
  isChildBillMerged?: boolean
}

export interface WeightCandidate {
  sourceKey: string
  sourceName: string
  weightKg: number
  overweightKg: number
  isOverweight: boolean
}

export interface OverweightValidationResult {
  /** Berat KG yang efektif ditagihkan (dengan fallback scan nama item atau bill terkait) */
  effectiveBilledKg: number
  /** Berat aktual fisik (kg) dari operasional */
  actualWeightKg: number
  /** Sumber acuan berat fisik yang digunakan */
  weightSource: string
  /** Rasio berat/m3 dari profil harga */
  rasio: number
  /** M3 referensi yang digunakan untuk hitung batas berat */
  refM3: number
  /** Batas maksimal berat yang diperbolehkan tanpa overweight charge */
  maxAllowedWeight: number
  /** Kelebihan berat yang harus ditagih (kg) */
  overweightKg: number
  /** True jika batas M3 dinaikkan ke 0.1 m³ untuk validasi KG laut */
  isMinM3EnforcedForKg: boolean
  /** True jika ada overweight */
  isOverweight: boolean
  /** True jika tagihan KG persis cocok dengan overweight (< 0.01 kg) */
  isBilledOverweightExactMatch: boolean
  /** True jika tagihan KG dalam toleransi plus minus 1 kg dari overweight */
  isBilledOverweightTolerated: boolean
  /** True jika tagihan KG sudah menutup overweight (exact, toleransi, atau cocok kandidat fallback) */
  isBilledOverweightMatch: boolean
  /** True jika ada tagihan KG padahal fisik tidak overweight */
  isBilledUnneededOverweight: boolean
  /** Selisih tagihan KG vs overweight aktual */
  overweightDiff: number | null
  /** True jika invoice anak yang digabung ke induk (validasi terpusat di induk) */
  isChildBillMerged: boolean
  /** True jika kalkulasi overweight menggunakan fallback akumulasi bill terkait */
  isRelatedBillsOverweight: boolean
  /** Nomor invoice induk (jika ada relasi) */
  parentInvNo?: string
  /** Nama sumber kandidat berat fallback yang cocok dengan tagihan KG */
  matchedCandidateSource?: string | null
  /** Seluruh daftar kandidat berat fisik operasional */
  candidates: WeightCandidate[]
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
 * Mendukung fallback akumulasi bill terkait & per batch marking.
 */
export function useOverweightValidation({
  res,
  invoiceDetails,
  billedM3,
  billedKg = 0,
  isAir,
  isGabungan,
  refM3Fallback = 0,
  isChildBillMerged = false,
}: UseOverweightValidationParams): OverweightValidationResult {
  const relatedBills = res?.relatedBillsSummary
  const hasRelatedBills = Boolean(relatedBills?.hasRelatedBills && (relatedBills?.sumBerat ?? 0) > 0)
  const isRelatedBillsOverweight = !isAir && hasRelatedBills

  // 1. Hitung tagihan KG efektif (prioritas billedKg langsung -> scan item -> akumulasi keluarga bill)
  const directBilledKg = useMemo(
    () => computeEffectiveBilledKg(billedKg, isAir, invoiceDetails),
    [billedKg, isAir, invoiceDetails]
  )

  const effectiveBilledKg = useMemo(() => {
    if (directBilledKg > 0) return directBilledKg
    if (!isAir && hasRelatedBills && (relatedBills?.totalBilledKg ?? 0) > 0) {
      return relatedBills!.totalBilledKg!
    }
    return 0
  }, [directBilledKg, isAir, hasRelatedBills, relatedBills])

  // 2. Evaluasi berat aktual fisik dengan fallback berhirarki
  const { actualWeightKg, weightSource } = useMemo(() => {
    if (isChildBillMerged) {
      return {
        actualWeightKg: 0,
        weightSource: `Digabung ke ${relatedBills?.parentInvNo || 'Invoice Induk'}`,
      }
    }

    // Prioritas 1: Jika terdapat keluarga bill terkait, gunakan akumulasi fisik bill terkait (sumBerat)
    if (hasRelatedBills && relatedBills) {
      return {
        actualWeightKg: relatedBills.sumBerat,
        weightSource: `Bill Terkait (${relatedBills.relatedInvoices.map((i) => i.invNo).join(' + ')})`,
      }
    }

    const gudang = res?.fdJmlBeratGudang ? Number(res.fdJmlBeratGudang) : 0
    const list = res?.fdBeratList ? Number(res.fdBeratList) : 0
    const komplain = res?.fdJmlBeratKomplain ? Number(res.fdJmlBeratKomplain) : 0
    const sjList = res?.fdBeratSJ ? Number(res.fdBeratSJ) : 0
    const sj = res?.totalJmlBeratSJ ? Number(res.totalJmlBeratSJ) : 0
    const perMarking = res?.totalBeratPerMarking ? Number(res.totalBeratPerMarking) : 0

    if (isGabungan) {
      if (komplain > 0) return { actualWeightKg: komplain, weightSource: 'Komplain' }
      if (perMarking > 0) return { actualWeightKg: perMarking, weightSource: 'Per Batch Marking' }
      if (sj > 0) return { actualWeightKg: sj, weightSource: 'Surat Jalan (Batch)' }
    }

    // Hirarki KG untuk Bill Reguler: 1. Komplain -> 2. SJ (ListCode) -> 3. Gudang -> 4. List
    if (komplain > 0) return { actualWeightKg: komplain, weightSource: 'Komplain' }
    if (sjList > 0) return { actualWeightKg: sjList, weightSource: 'Surat Jalan' }
    if (gudang > 0) return { actualWeightKg: gudang, weightSource: 'Timbangan Gudang' }
    if (list > 0) return { actualWeightKg: list, weightSource: 'Entry List' }
    return { actualWeightKg: 0, weightSource: '—' }
  }, [res, isGabungan, isChildBillMerged, hasRelatedBills, relatedBills])

  // 3. Batas kuota rasio & perhitungan overweight
  const rasio = res?.profileHarga?.rasio ?? 0
  const rawRefM3 = billedM3 > 0
    ? billedM3
    : (isChildBillMerged && relatedBills
        ? (relatedBills.totalBilledM3 || relatedBills.sumM3Gudang || refM3Fallback)
        : refM3Fallback)

  // Semua tagihan laut yang di bawah 0.1 m³ wajib dinaikkan menjadi 0.1 m³ untuk validasi kg
  const isMinM3EnforcedForKg = !isAir && rawRefM3 > 0 && rawRefM3 < 0.1
  const refM3 = isMinM3EnforcedForKg ? 0.1 : rawRefM3

  const maxAllowedWeight = !isAir && rasio > 0 && refM3 > 0 ? refM3 * rasio : 0

  const rawOverweightKg = !isAir && !isChildBillMerged && rasio > 0 && refM3 > 0 && actualWeightKg > 0
    ? calculateOverweight(actualWeightKg, refM3, rasio)
    : 0

  const overweightKg = Math.max(0, rawOverweightKg)
  const isOverweight = overweightKg > 0

  // 4. Daftar kandidat berat fisik multi-sumber (Mirip seaCandidates pada M3)
  const candidates: WeightCandidate[] = useMemo(() => {
    if (isAir || rasio <= 0 || refM3 <= 0) return []
    const list: Array<{ key: string; name: string; weight: number }> = []

    if (hasRelatedBills && (relatedBills?.sumBerat ?? 0) > 0) {
      list.push({
        key: 'RelatedBills',
        name: `Bill Terkait (${relatedBills!.relatedInvoices.map((i) => i.invNo).join(' + ')})`,
        weight: relatedBills!.sumBerat,
      })
    }
    if ((res?.fdJmlBeratKomplain ?? 0) > 0) {
      list.push({ key: 'Komplain', name: 'Komplain', weight: Number(res!.fdJmlBeratKomplain!) })
    }
    if ((res?.fdJmlBeratGudang ?? 0) > 0) {
      list.push({ key: 'Gudang', name: 'Timbangan Gudang', weight: Number(res!.fdJmlBeratGudang!) })
    }
    if ((res?.fdBeratSJ ?? 0) > 0) {
      list.push({ key: 'SJ', name: 'Surat Jalan (List)', weight: Number(res!.fdBeratSJ!) })
    }
    if ((Number(res?.fdBeratList || 0)) > 0) {
      list.push({ key: 'List', name: 'Entry List', weight: Number(res!.fdBeratList!) })
    }
    if ((res?.totalBeratPerMarking ?? 0) > 0) {
      list.push({ key: 'Marking', name: 'Per Batch Marking', weight: Number(res!.totalBeratPerMarking!) })
    }
    if ((res?.totalJmlBeratSJ ?? 0) > 0 && res!.totalJmlBeratSJ! !== res?.totalBeratPerMarking) {
      list.push({ key: 'TotalSJBatch', name: 'Total SJ Batch', weight: Number(res!.totalJmlBeratSJ!) })
    }

    return list.map((item) => {
      const ow = calculateOverweight(item.weight, refM3, rasio)
      return {
        sourceKey: item.key,
        sourceName: item.name,
        weightKg: item.weight,
        overweightKg: Math.max(0, ow),
        isOverweight: ow > 0,
      }
    })
  }, [isAir, rasio, refM3, hasRelatedBills, relatedBills, res])

  // 5. Evaluasi kesesuaian penagihan KG vs Overweight
  const isBilledOverweightExactMatch = !isAir && !isChildBillMerged && isOverweight && effectiveBilledKg > 0
    && Math.abs(effectiveBilledKg - overweightKg) < 0.01

  const isBilledOverweightTolerated = !isAir && !isChildBillMerged && isOverweight && effectiveBilledKg > 0
    && !isBilledOverweightExactMatch && Math.abs(effectiveBilledKg - overweightKg) <= 1

  // Fallback pencocokan kandidat: jika tagihan KG cocok dengan salah satu kandidat berat fisik operasional
  const matchedCandidate = useMemo(() => {
    if (isAir || isChildBillMerged || effectiveBilledKg <= 0) return null
    if (isBilledOverweightExactMatch || isBilledOverweightTolerated) return null
    return candidates.find(
      (c) => c.isOverweight && (
        Math.abs(effectiveBilledKg - c.overweightKg) < 0.01 ||
        Math.abs(effectiveBilledKg - c.overweightKg) <= 1
      )
    ) || null
  }, [isAir, isChildBillMerged, effectiveBilledKg, isBilledOverweightExactMatch, isBilledOverweightTolerated, candidates])

  const isBilledOverweightMatch = Boolean(
    isChildBillMerged ||
    isBilledOverweightExactMatch ||
    isBilledOverweightTolerated ||
    Boolean(matchedCandidate)
  )

  const isBilledUnneededOverweight = !isAir && !isChildBillMerged && !isOverweight && !matchedCandidate && effectiveBilledKg > 0
  const overweightDiff = effectiveBilledKg > 0 ? effectiveBilledKg - (matchedCandidate?.overweightKg ?? overweightKg) : null

  return {
    effectiveBilledKg,
    actualWeightKg,
    weightSource,
    rasio,
    refM3,
    maxAllowedWeight,
    overweightKg: isChildBillMerged ? 0 : overweightKg,
    isMinM3EnforcedForKg,
    isOverweight: isChildBillMerged ? false : isOverweight,
    isBilledOverweightExactMatch: isChildBillMerged ? true : isBilledOverweightExactMatch,
    isBilledOverweightTolerated,
    isBilledOverweightMatch,
    isBilledUnneededOverweight: isChildBillMerged ? false : isBilledUnneededOverweight,
    overweightDiff,
    isChildBillMerged,
    isRelatedBillsOverweight,
    parentInvNo: relatedBills?.parentInvNo,
    matchedCandidateSource: matchedCandidate?.sourceName || null,
    candidates,
  }
}
