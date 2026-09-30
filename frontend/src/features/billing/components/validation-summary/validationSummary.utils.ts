import { formatCurrency, formatDecimal } from '@/lib/utils'
import type { Billing, BillingDetail } from '../../types/billing.types'

const TRANSPORT_ITEM_KEYWORDS = ['TRANSPORT', 'DELIVERY', 'ONGKIR', 'TRUCKING'] as const

/**
 * Memeriksa apakah nama item invoice mengandung kata kunci ekspedisi / transport lokal.
 */
export function isTransportItemName(itemName?: string | null): boolean {
  if (!itemName) return false
  const upper = itemName.toUpperCase()
  return TRANSPORT_ITEM_KEYWORDS.some((kw) => upper.includes(kw))
}

/**
 * Mencari item detail penagihan yang berupa biaya transport / ekspedisi lokal.
 */
export function findTransportDetailItem(details: BillingDetail[]): BillingDetail | undefined {
  return details.find((d) => isTransportItemName(d?.fdItemName))
}

/**
 * Menghitung nominal tagihan transport efektif dari baris item atau header invoice.
 */
export function getEffectiveTransportAmount(
  billingData: Billing,
  transportItem?: BillingDetail
): number {
  if (transportItem) {
    const total = Number(transportItem.fdTotal || 0)
    return total > 0 ? total : Number(transportItem.fdItemPrice || 0)
  }
  const jumlah2 = Number(billingData.fdJumlah2 || 0)
  return jumlah2 > 0 ? jumlah2 : Number(billingData.fdJumlah1 || 0)
}

/**
 * Menghitung total nilai invoice dan mata uang efektif (mendukung valas / foreign currency).
 */
export function getEffectiveInvoiceTotal(
  billingData: Billing,
  details: BillingDetail[]
): { total: number; currency: string } {
  const rawJumlah2 = Number(billingData.fdJumlah2 || 0)
  const foreignCurr = (billingData.fdCurr1 || '').trim().toUpperCase()
  const isForeignCandidate = rawJumlah2 > 0 && foreignCurr && !['RP', 'RP.', 'IDR'].includes(foreignCurr)

  // Cek apakah ada item yang menggunakan valas tersebut
  const hasMatchingForeignItem = isForeignCandidate && details.some((d) => {
    const listCode = (d.fdListCode || '').trim().toUpperCase()
    const curr = (d.fdCurr || '').trim().toUpperCase()
    if (listCode === foreignCurr || curr === foreignCurr) return true
    if (foreignCurr.includes('S$') && (listCode === 'SGD' || listCode === 'S$' || curr === 'S$' || curr === 'SGD')) return true
    if (foreignCurr.includes('HK$') && (listCode === 'HKD' || listCode === 'HK$' || curr === 'HK$' || curr === 'HKD')) return true
    if (foreignCurr.includes('US$') && (listCode === 'USD' || listCode === 'US$' || curr === 'US$' || curr === 'USD')) return true
    return false
  })

  // Jika ada fdJumlah2 valas namun tidak ada item yang bervalas -> ini kesalahan input, total riil dalam Rupiah
  if (isForeignCandidate && !hasMatchingForeignItem) {
    const sumAllItems = details.reduce(
      (sum, d) => sum + (Number(d.fdTotal) || Number(d.fdQty || 0) * Number(d.fdItemPrice || 0)),
      0
    )
    const total = sumAllItems > 0 ? sumAllItems : (Number(billingData.fdJumlah1 || 0) + rawJumlah2)
    return { total, currency: 'Rp.' }
  }

  const isForeign = rawJumlah2 > 0
  const currency = isForeign
    ? billingData.fdCurr1?.trim() || 'Rp.'
    : details.find((d) => d?.fdCurr?.trim())?.fdCurr?.trim() || 'Rp.'

  const total = isForeign
    ? Number(billingData.fdJumlah2)
    : Number(billingData.fdJumlah1 || 0) > 0
      ? Number(billingData.fdJumlah1)
      : details.reduce(
          (sum, d) => sum + (Number(d.fdTotal) || Number(d.fdQty || 0) * Number(d.fdItemPrice || 0)),
          0
        )

  return { total, currency }
}

export interface ValidationVerdictParams {
  isLoadingValidation: boolean
  isOverallValid: boolean
  isAir: boolean
  billedM3: number
  effectiveBilledKg: number
  actualWeightKg: number
  maxAllowedWeight: number
  overweightKg: number
  isOverweightUnbilled: boolean
  isBilledUnneededOverweight: boolean
  hasUnderchargePrice: boolean
  underchargedItems: Array<{ itemName: string }>
  hasUnbilledTransportActive: boolean
  unbilledExpedisiCount: number
  totalUnbilledTransportAmount: number
  isMatch: boolean
  isBilledBelowMinM3: boolean
  minChargeM3: number
  isCodUrgentShortfall: boolean
  recommendedM3: number
  hasQtyMismatch: boolean
  activeQtys: Array<{ label: string; val: number }>
  isBilledMismatchedApprovedKomplain: boolean
  targetKomplainM3?: number | null
  isType2Discrepancy: boolean
  validationIssues: string[]
  isCurrencyInputError?: boolean
  currencyInputErrorMessage?: string
}

export interface ValidationVerdictResult {
  title: string
  description: string
}

/**
 * Menghitung verdict title dan verdict description audit validasi secara terpusat,
 * menggantikan nested ternary yang berulang dan sulit dimaintain.
 */
export function calculateValidationVerdict(params: ValidationVerdictParams): ValidationVerdictResult {
  const {
    isLoadingValidation,
    isOverallValid,
    isAir,
    billedM3,
    effectiveBilledKg,
    actualWeightKg,
    maxAllowedWeight,
    overweightKg,
    isOverweightUnbilled,
    isBilledUnneededOverweight,
    hasUnderchargePrice,
    underchargedItems,
    hasUnbilledTransportActive,
    unbilledExpedisiCount,
    totalUnbilledTransportAmount,
    isMatch,
    isBilledBelowMinM3,
    minChargeM3,
    isCodUrgentShortfall,
    recommendedM3,
    hasQtyMismatch,
    activeQtys,
    isBilledMismatchedApprovedKomplain,
    targetKomplainM3,
    isType2Discrepancy,
    validationIssues,
    isCurrencyInputError,
    currencyInputErrorMessage,
  } = params

  if (isLoadingValidation) {
    return {
      title: 'Memvalidasi Data Fisik & Acuan Tarif...',
      description: 'Sedang memuat data operasional gudang, timbangan, dan acuan tarif master...',
    }
  }

  if (isCurrencyInputError) {
    return {
      title: 'Kesalahan Input: Anomali Mata Uang Header vs Rincian Item',
      description: currencyInputErrorMessage || 'Header invoice memiliki nilai valas yang keliru dimasukkan, padahal seluruh item dalam Rupiah (Rp.).',
    }
  }

  if (isOverallValid && !isBilledBelowMinM3) {
    return {
      title: 'Tagihan Sesuai dengan Data Fisik & Acuan Tarif',
      description: 'Seluruh kubikasi, berat timbangan, dan tarif item telah cocok dengan data operasional dan price list.',
    }
  }

  if (hasUnderchargePrice) {
    return {
      title: `Ditemukan Tarif di Bawah Acuan (Undercharge: ${underchargedItems.map((u) => u.itemName).join(', ')})`,
      description: `Terdapat ${underchargedItems.length} item dengan tarif lebih rendah dari acuan master price list.`,
    }
  }

  if (hasUnbilledTransportActive) {
    return {
      title: `Biaya Ekspedisi (${formatCurrency(totalUnbilledTransportAmount)}) Belum Ditagihkan`,
      description: `Terdapat ${unbilledExpedisiCount} catatan ekspedisi operasional di tbExpIndo yang berstatus Harus Tagih (${formatCurrency(totalUnbilledTransportAmount)}) namun belum dimasukkan ke invoice.`,
    }
  }

  if (!isMatch) {
    return {
      title: isAir
        ? 'Selisih Berat Tagihan dengan Data Timbangan'
        : 'Selisih Kubikasi (M3) Tagihan dengan Data Fisik',
      description: `Nilai yang ditagihkan (${isAir ? `${effectiveBilledKg} kg` : `${formatDecimal(billedM3, 4)} m³`}) tidak cocok dengan dokumen fisik gudang maupun packing list.`,
    }
  }

  if (isBilledBelowMinM3) {
    return {
      title: `Peringatan: Volume Ditagihkan (${formatDecimal(billedM3, 4)} m³) di Bawah Min. Charge (${formatDecimal(minChargeM3, 4)} m³)`,
      description: `Volume tagihan (${formatDecimal(billedM3, 4)} m³) lebih rendah dari batas minimum charge (${formatDecimal(minChargeM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja.`,
    }
  }

  if (isCodUrgentShortfall) {
    return {
      title: `Volume Tagihan M3 (${formatDecimal(billedM3, 4)} m³) di Bawah Rekomendasi COD/Urgent`,
      description: `Pelanggan berstatus COD / Urgent disarankan ditagihkan volume tertinggi (${formatDecimal(recommendedM3, 4)} m³ dari Packing List). Invoice saat ini menagihkan volume riil gudang (${formatDecimal(billedM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja sebelum menerbitkan invoice.`,
    }
  }

  if (hasQtyMismatch) {
    return {
      title: 'Ketidaksesuaian Jumlah Koli (Qty) Antar Dokumen Operasional',
      description: `Ditemukan perbedaan jumlah koli pada dokumen operasional (${activeQtys.map((q) => `${q.label}: ${q.val}`).join(' vs ')}). Pastikan koli yang ditagihkan sudah valid.`,
    }
  }

  if (isOverweightUnbilled) {
    return {
      title: `Muatan Melebihi Kuota Rasio (+${formatDecimal(overweightKg, 2)} kg Overweight Belum Ditagih)`,
      description: `Total berat fisik muatan (${actualWeightKg} kg) melebihi batas kuota rasio (${formatDecimal(maxAllowedWeight, 1)} kg), namun belum ditambahkan item biaya kelebihan berat pada invoice.`,
    }
  }

  if (isBilledUnneededOverweight) {
    return {
      title: 'Invoice Menagihkan Item KG Padahal Muatan Tidak Overweight',
      description: `Berat muatan fisik (${actualWeightKg} kg) masih dalam batas kuota rasio (${formatDecimal(maxAllowedWeight, 1)} kg). Periksa kembali item penagihan KG pada invoice.`,
    }
  }

  if (isBilledMismatchedApprovedKomplain) {
    return {
      title: 'Ukuran Tagihan Tidak Sesuai Hasil Komplain Yang Disetujui',
      description: `Terdapat komplain ukuran yang telah disetujui (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), namun volume yang ditagihkan (${formatDecimal(billedM3, 4)} m³) tidak mencocokinya.`,
    }
  }

  if (isType2Discrepancy) {
    return {
      title: 'Selisih Perhitungan Tagihan Type 2 (M3 vs KG)',
      description: 'Perhitungan tarif aktual tagihan berbeda dari acuan simulasi perbandingan M3 vs KG. Periksa tab Timbangan Fisik.',
    }
  }

  if (validationIssues.length > 0) {
    return {
      title: `Terdapat ${validationIssues.length} Catatan Validasi Pada Invoice Ini`,
      description: `${validationIssues.join('. ')}. Harap periksa rincian sebelum menerbitkan invoice.`,
    }
  }

  return {
    title: 'Terdapat Catatan Validasi Pada Invoice Ini',
    description: 'Harap periksa rincian pada tab audit di atas sebelum menerbitkan invoice.',
  }
}
