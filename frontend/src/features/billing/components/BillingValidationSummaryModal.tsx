import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plane,
  RefreshCw,
  Sparkles,
  Box,
  Scale,
  Truck,
  Send,
  Coins,
  Info,
  Layers,
  Calendar,
  TrendingUp,
  TrendingDown,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { billingApi } from '../services/billing.service'
import { formatDate, formatDecimal, formatNumber, formatCurrency } from '@/lib/utils'
import { formatWithCurrency } from '@/components/ui/CurrencyValue'
import { isMktCustomer } from '../utils/billing.utils'
import { useBillingValidation, type BillingValidationState } from '../hooks/useBillingValidation'
import { BillingPrintButtons } from './BillingPrintButtons'
import { Type2ComparisonPanel } from './Type2ComparisonPanel'
import { BILL_TYPES, BILL_TYPE_CONFIGS, getBillType, type BillType } from '../constants/billing.constants'
import type { Billing } from '../types/billing.types'

interface ComodityType {
  fdID: number
  fdTypeComodity: number | null
  fdComodityName: string
  fdListType: number | null
}

interface PriceItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  category: string
  price: number
}

export interface MarkingDetailItem {
  fdListCode: string
  fdMarkingNo: string
  fdQty: number | null
  fdM3PL: number | null
  fdM3Gudang: number | null
  fdM3Komplain: number | null
  fdBerat: number | null
  fdSatuan: string
}

export interface M3CheckResponse {
  fdListCode: string
  fdListType?: number | null
  defaultFdTypeComodity?: number | null
  markingComodityType?: number | null
  markingComodities?: { fdTypeComodity: number | null; fdComodity: string | null; fdComodityName?: string | null }[]
  commodityMappings?: { id: number; commodityName: string; targetCommodity: string; fdTypeComodity: number | null; fdCustCode: string | null }[]
  fdTglAgent?: string | null
  expectedMode?: string | null
  expectedBranch?: string | null
  priceValidation?: {
    fdTglAgent: string | null
    effectiveDate: string | null
    masterEffectiveDate?: string | null
    customerEffectiveDate?: string | null
    hasCustomerPriceList?: boolean
    isMarkingOverride?: boolean
    matchedMarkingCode?: string | null
    expectedMode?: string | null
    expectedBranch?: string | null
    items: PriceItem[]
  } | null
  customer?: {
    fdListCode: string
    fdMarkingCode: string | null
    fdCustCode: string | null
    fdCustName: string | null
    fdBlocked: number
    fdSalesNM?: string | null
    fdBroker?: number
  } | null
  isCodOrUrgent: boolean
  recommendedM3: number
  recommendedM3Source?: 'KOMPLAIN' | 'HYBRID' | 'MAX' | 'GUDANG' | 'PL'
  hasApprovedKomplain?: boolean
  isFullKomplainQtyMatch?: boolean
  isKomplainRejected?: boolean
  komplainRejectedReason?: string | null
  m3PackingList: { raw: any[]; values: number[]; qty?: number | null }
  m3Gudang: { raw: any[]; values: number[]; qty?: number | null }
  m3CustPerMarking: { raw: any[]; values: number[]; totalEntryList?: number | null }
  m3PLPerMarking?: { raw: any[]; values: number[]; totalEntryList?: number | null }
  m3Komplain: { raw: any[]; values: number[]; qty?: number | null }
  m3KomplainPerMarking: { raw: any[]; values: number[]; totalEntryKomplain?: number | null }
  m3ListBatch?: { raw: any[]; values: number[]; qty?: number | null }
  fdQtyList?: number | null
  fdTotalQtyPL?: number | null
  fdTotalQtyGudang?: number | null
  fdTotalQtyKomplain?: number | null
  totalEntryKomplain?: number | null
  totalEntryList?: number | null
  isPartialKomplain?: boolean
  m3KomplainPlusGudang?: number | null
  countKomplainLC?: number
  countGudangLC?: number
  fdSatuan?: string | null
  fdBeratList?: number | null
  fdJmlBeratGudang?: number | null
  fdJmlBeratKomplain?: number | null
  fdBeratSJ?: number | null
  totalJmlBeratSJ?: number | null
  totalBeratPerMarking?: number | null
  markingDetails?: MarkingDetailItem[]
  fdVFCGudang?: number | null
  fdVFCPL?: number | null
  fdVFCKomplain?: number | null
  vfcGudangPerMarking?: number | null
  vfcKomplainPerMarking?: number | null
  freightChargeSummary?: {
    totalFc: number
    listsWithFcCount: number
    currency: string
  } | null
  minChargeKg?: number | null
  profileHarga?: {
    fdListCode: string
    fdCustCode: string
    harga: number
    rasio: number
    typeTagihan: number
    kg: number
    taxReturnPrice: number
    taxReturnMinCharge: number
    minChargeM3?: number
    minChargeKg?: number
    fdUpdate?: string | null
    fdUpdateDate?: string | Date | null
    fdUpdateSource?: 'AUDIT' | 'CUSTOMER_HARGA' | null
  } | null
  comodityTypes?: ComodityType[]
}

export type ValidationModalTab = 'summary'

interface BillingValidationSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
  billingData: Billing
  validation?: BillingValidationState
  validationData?: M3CheckResponse | null
  isLoadingValidation?: boolean
  billedM3: number
  billedKg?: number
  billedVfc?: number
  unitTotals?: Record<string, number>
  billType?: BillType
  onOpenCustMarkingModal?: () => void
  onOpenIssueModal?: () => void
}

export type SummaryModalTab = 'items' | 'm3_weight' | 'overweight' | 'freight' | 'transport'

export function BillingValidationSummaryModal({
  isOpen,
  onClose,
  initialTab,
  billingData,
  validation: validationProp,
  validationData: res,
  isLoadingValidation = false,
  billedM3: _billedM3Prop,
  billedKg: _billedKg = 0,
  billType: billTypeProp,
  onOpenIssueModal,
}: BillingValidationSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<SummaryModalTab>(() => {
    const isInitialType2 = res?.profileHarga?.typeTagihan === 2 || !!validationProp?.isType2
    return isInitialType2 ? 'm3_weight' : 'items'
  })
  const [isDiscrepancyExpanded, setIsDiscrepancyExpanded] = useState<boolean>(false)
  const hasAutoSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])


  const billType = billTypeProp || getBillType(billingData)
  const billTypeConfig = BILL_TYPE_CONFIGS[billType]
  const isTransport = billType === BILL_TYPES.TRANSPORT
  const details = [...(billingData?.details || [])].sort((a, b) => String(a?.fdID ?? '').localeCompare(String(b?.fdID ?? '')))
  const hasTransportItem = isTransport || details.some((d) => {
    const name = (d?.fdItemName || '').toUpperCase()
    return name.includes('TRANSPORT') || name.includes('DELIVERY') || name.includes('ONGKIR') || name.includes('TRUCKING')
  })

  const transportDetailItem = details.find((d) => {
    const name = (d?.fdItemName || '').toUpperCase()
    return name.includes('TRANSPORT') || name.includes('DELIVERY') || name.includes('ONGKIR') || name.includes('TRUCKING')
  })
  const effectiveTransportAmount = transportDetailItem
    ? (Number(transportDetailItem.fdTotal || 0) > 0 ? Number(transportDetailItem.fdTotal) : Number(transportDetailItem.fdItemPrice || 0))
    : (Number(billingData.fdJumlah2 || 0) > 0 ? Number(billingData.fdJumlah2) : Number(billingData.fdJumlah1 || 0))
  const transportBillAmount = effectiveTransportAmount

  const allBillingListCodes = Array.from(
    new Set(
      [
        billingData.fdListCode,
        res?.fdListCode,
        ...(billingData?.details || []).map((d) => d.fdListCode),
      ]
        .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4)
        .map((lc) => lc.trim())
    )
  )
  const billingListCodeParam = allBillingListCodes.join(',') || (billingData.fdListCode ? String(billingData.fdListCode).trim() : '')

  const { data: transportValidation, isLoading: isLoadingTransport } = useQuery({
    queryKey: ['billingTransportCheck', billingData.fdInvNo, billingData.fdCustCode, billingData.fdMarkingCode, billingData.fdMarkingNo, billingListCodeParam, effectiveTransportAmount, hasTransportItem],
    queryFn: async () => {
      if (!billingListCodeParam && (!billingData.fdCustCode || !billingData.fdMarkingCode)) return null
      const response = await billingApi.transportCheck({
        invNo: billingData.fdInvNo,
        custCode: billingData.fdCustCode || '',
        markingCode: billingData.fdMarkingCode || '',
        markingNo: billingData.fdMarkingNo || '',
        listCode: billingListCodeParam,
        amount: hasTransportItem ? effectiveTransportAmount : 0,
      })
      return response.data?.data as {
        isValid: boolean
        hasDuplicate: boolean
        duplicates: Array<{
          fdInvNo: string
          fdInvDate: string | null
          fdCustCode: string
          fdMarkingCode: string
          fdMarkingNo: string
          fdJumlah1: number
          fdJumlah2: number | null
          fdCurr1: string | null
          fdEmpName: string | null
        }>
        expedisiList: Array<{
          fdId: number
          fdListCode: string | null
          fdExpID: string | null
          fdExpName: string | null
          fdResiExp: string | null
          fdCurrExp: string | null
          fdTotalExp: number
          fdPaid: number | null
          fdCreatedDate: string | null
          fdCreatedBy: string | null
          fdJmlBerat: number | null
          fdMarkingCode: string | null
          fdMarkingNo: string | null
        }>
        matchingExpedisi: {
          fdId: number
          fdListCode: string | null
          fdExpID: string | null
          fdExpName: string | null
          fdResiExp: string | null
          fdCurrExp: string | null
          fdTotalExp: number
          fdPaid: number | null
          fdCreatedDate: string | null
          fdCreatedBy: string | null
          fdJmlBerat: number | null
          fdMarkingCode: string | null
          fdMarkingNo: string | null
        } | null
        checkedAmount: number
      }
    },
    enabled: !validationProp && isOpen && (!!billingListCodeParam || (!!billingData.fdCustCode && !!billingData.fdMarkingCode)),
    staleTime: 60000,
  })

  // Single Source of Truth untuk seluruh validasi modal
  const internalValidation = useBillingValidation({
    billingData,
    validationData: res,
    transportValidation,
  })
  const v = validationProp ?? internalValidation

  const {
    isAir,
    isType2,
    isType2Discrepancy,
    isGabungan,
    billedM3,
    seaCandidates,
    isMatch,
    matchLabel,
    rawKomplainM3,
    targetKomplainM3,
    isApprovedKomplainActive,
    isHybridActive,
    isBilledMatchedApprovedKomplain,
    isBilledMismatchedApprovedKomplain,
    isBilledUsingRejectedKomplain,
    qtyList,
    qtyKomplain,
    hasQtyMismatch,
    activeQtys,
    beratList,
    beratSJ,
    beratKomplain,
    activeWeights,
    hasWeightMismatch,
    isWeightListDiff,
    isWeightSJDiff,
    isWeightKomplainDiff,
    overweight,
    evaluatedItems,
    underchargedItems,
    overchargedItems,
    hasPriceDiscrepancy,
    mustBillExpedisiList,
    codExpedisiList,
    unbilledExpedisiList,
    totalUnbilledTransportAmount,
    hasUnbilledTransport,
    isOverallValid: isAllValid,
    isCodUrgentShortfall,
  } = v

  const {
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
    effectiveBilledKg,
  } = overweight

  const normM3 = (val: number) => (val > 0 && val < 0.1 ? 0.1 : val)
  const gudangValues = res?.m3Gudang?.values || []
  const plValues = res?.m3PackingList?.values || []
  const custMarkingM3 = res?.m3CustPerMarking?.values?.length ? res.m3CustPerMarking.values[0] : null
  const plMarkingM3 = res?.m3PLPerMarking?.values?.length ? res.m3PLPerMarking.values[0] : null
  const komplainMarkingM3 = res?.m3KomplainPerMarking?.values?.length ? res.m3KomplainPerMarking.values[0] : null
  const beratMarking = res?.totalBeratPerMarking ?? null
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0 ? res.profileHarga.minChargeKg : (res?.minChargeKg ?? 3)
  const effectiveQtyKomplain = qtyKomplain
  const effectiveQtyList = qtyList

  const isGudangMatched = isAir
    ? (
      (res?.fdBeratList !== undefined && res.fdBeratList !== null && Math.abs(Number(res.fdBeratList) - effectiveBilledKg) < 0.01) ||
      (isGabungan && beratMarking !== null && Math.abs(beratMarking - effectiveBilledKg) < 0.01)
    )
    : (
      gudangValues.some((v) => Math.abs(normM3(v) - billedM3) < 0.001) ||
      (custMarkingM3 !== null && Math.abs(normM3(custMarkingM3) - billedM3) < 0.001)
    )

  const isPLMatched = !isAir && (
    plValues.some((v) => Math.abs(normM3(v) - billedM3) < 0.001) ||
    (plMarkingM3 !== null && Math.abs(normM3(plMarkingM3) - billedM3) < 0.001)
  )

  const isKomplainMatched = isAir
    ? (res?.fdJmlBeratKomplain && res.fdJmlBeratKomplain > 0 && Math.abs(Number(res.fdJmlBeratKomplain) - effectiveBilledKg) < 0.01)
    : (
      (targetKomplainM3 !== null && Math.abs(targetKomplainM3 - billedM3) < 0.001) ||
      (komplainMarkingM3 !== null && komplainMarkingM3 > 0 && Math.abs(normM3(komplainMarkingM3) - billedM3) < 0.001)
    )

  const hasUnderchargePrice = underchargedItems.length > 0
  const hasOverchargePrice = overchargedItems.length > 0
  const firstUndercharge = underchargedItems[0]
  const firstOvercharge = overchargedItems[0]

  const recommendedM3 = res?.recommendedM3 ?? 0

  const hasWarning = !isAllValid && (
    hasUnderchargePrice ||
    hasUnbilledTransport ||
    isCodUrgentShortfall ||
    isBilledMismatchedApprovedKomplain ||
    (!isType2 && isMatch && hasQtyMismatch) ||
    (!isType2 && isMatch && hasWeightMismatch) ||
    hasWeightMismatch ||
    (!isType2 && isBilledOverweightTolerated) ||
    (!isType2 && isBilledUnneededOverweight) ||
    (!isType2 && isOverweight && !isBilledOverweightMatch) ||
    (isType2 && isType2Discrepancy)
  )

  // Keterangan spesifik Undercharge & Overcharge
  const underchargeSummary = underchargedItems
    .map((u) => `${u.itemName} (${formatCurrency(u.billedPrice)} < Acuan ${formatCurrency(u.targetPrice || 0)})`)
    .join(', ')

  const overchargeSummary = overchargedItems
    .map((o) => `${o.itemName} (${formatCurrency(o.billedPrice)} > Acuan ${formatCurrency(o.targetPrice || 0)})`)
    .join(', ')

  // Evaluasi rincian selisih secara menyeluruh untuk breakdown detail
  const discrepancyDetails: {
    type: 'critical' | 'warning' | 'info'
    category: string
    title: string
    description: string
  }[] = []

  // 1. Selisih M3 / Kubikasi
  if (!isAir && !isType2) {
    if (!isMatch) {
      const candidatesSummary = seaCandidates
        .map((c) => `${c.sourceName}: ${formatDecimal(normM3(c.val), 4)} m³`)
        .join(' · ')
      discrepancyDetails.push({
        type: 'critical',
        category: 'Kubikasi (M3)',
        title: `M3 Tagihan ${formatDecimal(billedM3, 4)} m³ tidak cocok dengan acuan dokumen`,
        description: candidatesSummary ? `Acuan dokumen tersedia: ${candidatesSummary}.` : 'Tidak ditemukan acuan dokumen fisik yang cocok.',
      })
    } else if (isCodUrgentShortfall) {
      discrepancyDetails.push({
        type: 'warning',
        category: 'Aturan COD / Urgent',
        title: `Tagihan ${formatDecimal(billedM3, 4)} m³ lebih kecil dari rekomendasi COD/Urgent (${formatDecimal(recommendedM3, 4)} m³)`,
        description: `Customer memiliki flag COD/Urgent (${res?.recommendedM3Source || 'MAX'}). Direkomendasikan menggunakan ukuran tertinggi antara Gudang & PL (${formatDecimal(recommendedM3, 4)} m³). Terdapat potensi kekurangan tagih sebesar ${formatDecimal(recommendedM3 - billedM3, 4)} m³.`,
      })
    }
  } else if (isAir) {
    // Jalur Udara
    if (!isMatch) {
      discrepancyDetails.push({
        type: 'critical',
        category: 'Timbangan Fisik (Udara)',
        title: effectiveBilledKg === 0 ? 'Tagihan Berat Belum Diisi (0 kg)' : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) tidak cocok`,
        description: `Berat Real EntryList adalah ${formatDecimal(beratList, 2)} kg${minChargeKg > 0 ? ` (Aturan Minimum Charge: ${formatDecimal(minChargeKg, 2)} kg)` : ''}.`,
      })
    }
  }

  // 1b. Evaluasi Khusus Type 2 (Compare M3 vs KG)
  if (isType2 && isType2Discrepancy) {
    const status = v.type2CompareData?.validationStatus
    const diff = Math.abs(v.type2CompareData?.selisihVsAktual || 0)
    discrepancyDetails.push({
      type: 'warning',
      category: 'Perbandingan M3 vs KG (Type 2)',
      title: status === 'UNDERCHARGE'
        ? `Tagihan Type 2 terindikasi undercharge (Selisih Rp ${diff.toLocaleString('id-ID')})`
        : `Tagihan Type 2 terindikasi overcharge (Selisih Rp ${diff.toLocaleString('id-ID')})`,
      description: `Perhitungan sistem merekomendasikan penagihan berdasarkan ${v.type2CompareData?.overallWinner || 'M3'} senilai Rp ${(v.type2CompareData?.totalNilaiTagihanIdeal || 0).toLocaleString('id-ID')}, sedangkan total tagihan aktual adalah Rp ${(v.type2CompareData?.totalBilled || 0).toLocaleString('id-ID')}.`,
    })
  }

  // 2. Selisih Ukuran Komplain
  if (isBilledUsingRejectedKomplain) {
    discrepancyDetails.push({
      type: 'critical',
      category: 'Ukuran Komplain',
      title: 'Komplain tidak memenuhi syarat Qty koli',
      description: `Tagihan menggunakan M3 komplain (${formatDecimal(normM3(rawKomplainM3 ?? 0), 4)} m³), namun Qty komplain (${effectiveQtyKomplain ?? 0} coly) berbeda dengan Qty EntryList (${effectiveQtyList ?? 0} coly).`,
    })
  } else if (isBilledMismatchedApprovedKomplain) {
    discrepancyDetails.push({
      type: 'warning',
      category: 'Ukuran Komplain',
      title: `Komplain disetujui (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), tagihan masih menggunakan ${matchLabel}`,
      description: `Ukuran komplain telah disetujui (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), tetapi tagihan masih tercatat ${formatDecimal(billedM3, 4)} m³. Disarankan revisi tagihan ke ukuran komplain.`,
    })
  }

  // 3. Selisih Qty Koli
  if (hasQtyMismatch) {
    discrepancyDetails.push({
      type: 'critical',
      category: 'Jumlah Koli (Qty)',
      title: 'Perbedaan jumlah koli antar dokumen',
      description: `Ditemukan perbedaan koli antara: ${activeQtys.map((q) => `${q.label} (${formatNumber(q.val)} koli)`).join(' vs ')}.`,
    })
  }

  // 3b. Selisih Berat Fisik (List vs Surat Jalan vs Komplain)
  if (hasWeightMismatch) {
    discrepancyDetails.push({
      type: 'critical',
      category: 'Timbangan Fisik (Berat)',
      title: 'Perbedaan berat fisik antar dokumen (List vs Surat Jalan vs Komplain)',
      description: `Ditemukan perbedaan berat fisik antara: ${activeWeights.map((w) => `${w.label} (${formatDecimal(w.val, 2)} kg)`).join(' vs ')}. Harap pastikan kebenaran data timbangan operasional atau surat jalan.`,
    })
  }

  // 4. Selisih Overweight (Jalur Laut - Tidak Berlaku Untuk Type 2)
  if (!isAir && !isType2) {
    if (isOverweight && !isBilledOverweightMatch) {
      discrepancyDetails.push({
        type: 'critical',
        category: 'Overweight',
        title: `Kelebihan berat +${formatNumber(overweightKg)} kg belum ditagihkan`,
        description: `Muatan fisik ${formatNumber(actualWeightKg)} kg melebihi kapasitas rasio ${formatNumber(rasio)} kg/m³ (maksimal ${formatDecimal(maxAllowedWeight, 2)} kg untuk ${formatDecimal(billedM3, 4)} m³).`,
      })
    } else if (isBilledOverweightTolerated) {
      discrepancyDetails.push({
        type: 'info',
        category: 'Overweight',
        title: `Selisih pembulatan overweight ${Math.abs(overweightDiff ?? 0)} kg`,
        description: `Tagihan KG (${formatNumber(effectiveBilledKg)} kg) selisih ${Math.abs(overweightDiff ?? 0)} kg dari hitungan sistem (${formatNumber(overweightKg)} kg) dalam toleransi pembulatan.`,
      })
    } else if (isBilledUnneededOverweight) {
      discrepancyDetails.push({
        type: 'warning',
        category: 'Overweight',
        title: 'Penagihan overweight tidak diperlukan',
        description: `Tagihan memuat item penagihan KG (${formatNumber(effectiveBilledKg)} kg), padahal muatan fisik tidak melebihi kuota rasio berat.`,
      })
    }
  }

  // 5. Selisih Tarif / Harga Satuan
  if (hasUnderchargePrice) {
    underchargedItems.forEach((u) => {
      discrepancyDetails.push({
        type: 'critical',
        category: 'Undercharge',
        title: `${u.itemName}: ${formatCurrency(u.billedPrice)} < Acuan ${formatCurrency(u.targetPrice || 0)}`,
        description: `Harga satuan lebih rendah ${formatCurrency(Math.abs(u.difference))} dari acuan ${u.priceSource || 'Price List'} (${u.priceListDisplay || '—'}).`,
      })
    })
  }

  // 6. Item Tanpa Acuan / Price List Tidak Ditemukan
  const itemsWithoutTarget = evaluatedItems.filter(({ evaluation }) => !evaluation.hasTargetPrice && !evaluation.isTaxReturnItem && !evaluation.isKgOverweightItem)
  if (itemsWithoutTarget.length > 0 && !hasUnderchargePrice) {
    itemsWithoutTarget.forEach(({ item, evaluation }) => {
      const isTransport = evaluation.isTransportItem
      discrepancyDetails.push({
        type: 'warning',
        category: isTransport ? 'Ekspedisi tbExpIndo' : 'Acuan Tarif',
        title: isTransport
          ? `Biaya transport "${item.fdItemName || '—'}" belum tercatat di tbExpIndo`
          : `Item "${item.fdItemName || '—'}" belum terdaftar di Price List`,
        description: isTransport
          ? `Belum ditemukan data biaya ekspedisi lokal pada tbExpIndo untuk List Code (${billingData.fdListCode || '—'}) / Marking (${billingData.fdMarkingCode || '—'}).`
          : `Komoditi terdeteksi "${evaluation.comodityName}" namun belum terdaftar pada Master/Customer Price List untuk jalur ${isAir ? 'Udara' : 'Laut'}.`,
      })
    })
  }

  // 7. Peringatan Biaya Ekspedisi di tbExpIndo Ada Namun Belum Ditagihkan
  if (hasUnbilledTransport) {
    const firstExp = unbilledExpedisiList[0]
    discrepancyDetails.push({
      type: 'warning',
      category: 'Ekspedisi tbExpIndo',
      title: `Ditemukan data ekspedisi Harus Tagih di tbExpIndo (${unbilledExpedisiList.length} entri, total ${formatCurrency(totalUnbilledTransportAmount)}) belum ditagihkan`,
      description: `Tercatat biaya pengeluaran ekspedisi lokal berstatus Harus Tagih (${firstExp?.fdExpName || 'Ekspedisi'}${firstExp?.fdResiExp ? ` Resi: ${firstExp.fdResiExp}` : ''} senilai ${formatCurrency(firstExp?.fdTotalExp || 0)}) pada tbExpIndo untuk List Code ${firstExp?.fdListCode || billingListCodeParam || '—'}, namun belum ada item tagihan TRANSPORT / ONGKIR pada invoice ini.`,
    })
  }

  let verdictTitle = ''
  let verdictDescription = ''

  if (isAllValid) {
    if (isBilledMatchedApprovedKomplain) {
      verdictTitle = isHybridActive
        ? `Tagihan Sesuai dengan Komplain Parsial + Gudang (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³)`
        : `Tagihan Sesuai dengan Ukuran Komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³)`
      verdictDescription = isHybridActive
        ? `Tagihan telah divalidasi tepat menggunakan kombinasi Komplain Parsial yang disetujui (${res?.countKomplainLC ?? 1} LC) + Gudang (${res?.countGudangLC ?? 1} LC).`
        : `Tagihan telah divalidasi tepat menggunakan ukuran komplain fisik (Qty cocok ${effectiveQtyKomplain}/${effectiveQtyList} coly).`
    } else if (hasOverchargePrice) {
      verdictTitle = `Data Fisik Sesuai & Tarif Valid (Overcharge: ${overchargedItems.map((o) => o.itemName).join(', ')})`
      verdictDescription = `Seluruh data volume/berat valid. Ditemukan tarif di atas acuan ${firstOvercharge?.priceSource || 'Price List'} (${overchargeSummary}).`
    } else {
      verdictTitle = 'Tagihan Sesuai dengan Data Fisik & Acuan Price List'
      verdictDescription = 'Seluruh data kubikasi/timbangan dan tarif telah diverifikasi valid terhadap data operasional.'
    }
  } else if (hasUnderchargePrice) {
    verdictTitle = `Ditemukan Tarif di Bawah Acuan (Undercharge: ${underchargedItems.map((u) => u.itemName).join(', ')})`
    verdictDescription = `Ditemukan harga satuan di bawah acuan ${firstUndercharge?.priceSource || 'Price List'} pada: ${underchargeSummary}.`
  } else if (hasUnbilledTransport) {
    verdictTitle = `Biaya Ekspedisi Harus Tagih di tbExpIndo (${formatCurrency(totalUnbilledTransportAmount)}) Belum Ditagihkan`
    verdictDescription = `Ditemukan ${unbilledExpedisiList.length} data operasional ekspedisi lokal (Harus Tagih) di tbExpIndo senilai total ${formatCurrency(totalUnbilledTransportAmount)} (${unbilledExpedisiList[0]?.fdExpName || 'Ekspedisi'}${unbilledExpedisiList[0]?.fdResiExp ? ` Resi: ${unbilledExpedisiList[0].fdResiExp}` : ''}), namun belum tercatat item tagihan Transport / Ongkir pada invoice ini.`
  } else if (isCodUrgentShortfall) {
    verdictTitle = `Status COD/Urgent: Ukuran Tagihan (${formatDecimal(billedM3, 4)} m³) Lebih Kecil dari Rekomendasi (${formatDecimal(recommendedM3, 4)} m³)`
    verdictDescription = `Customer berstatus COD/Urgent. Disarankan menggunakan ukuran terbesar antara Gudang & Packing List (${formatDecimal(recommendedM3, 4)} m³), terdapat potensi selisih kurang tagih ${formatDecimal(recommendedM3 - billedM3, 4)} m³.`
  } else if (hasOverchargePrice) {
    verdictTitle = `Ditemukan Tarif di Atas Acuan (Overcharge: ${overchargedItems.map((o) => o.itemName).join(', ')})`
    verdictDescription = `Harga satuan berada di atas acuan ${firstOvercharge?.priceSource || 'Price List'} pada: ${overchargeSummary}.`
  } else if (isBilledUsingRejectedKomplain) {
    verdictTitle = `Ukuran Komplain Ditolak (Qty ${qtyKomplain ?? 0}/${qtyList ?? 0} Coly Tidak Cocok)`
    verdictDescription = `Ukuran komplain (${formatDecimal(normM3(rawKomplainM3 ?? 0), 4)} m³) tidak dapat diterima karena Qty komplain (${effectiveQtyKomplain ?? 0} coly) tidak sama dengan Qty EntryList (${effectiveQtyList ?? 0} coly). Tagihan harus menggunakan ukuran operasional (Gudang/PL).`
  } else if (isBilledMismatchedApprovedKomplain) {
    verdictTitle = isHybridActive
      ? `Terdapat Komplain Parsial (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), Tagihan Masih Menggunakan ${matchLabel}`
      : `Terdapat Ukuran Komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), Tagihan Masih Menggunakan ${matchLabel}`
    verdictDescription = `Ukuran komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³) telah disetujui. Tagihan saat ini masih ditagihkan ${formatDecimal(billedM3, 4)} m³ (${matchLabel}). Disarankan tagihan direvisi ke ukuran komplain.`
  } else if (!isMatch) {
    verdictTitle = isAir ? 'Selisih Berat Tagihan dengan Data Timbangan' : 'Selisih Kubikasi (M3) Tagihan dengan Data Operasional'
    verdictDescription = isAir
      ? effectiveBilledKg === 0
        ? `Tagihan berat belum diisi (0 kg). Berat Real EntryList adalah ${formatDecimal(beratList, 2)} kg${minChargeKg > 0 ? ` (Min. Charge: ${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
        : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) tidak cocok dengan Berat Real (${formatDecimal(beratList, 2)} kg)${minChargeKg > 0 ? ` maupun Min. Charge (${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
      : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) tidak cocok dengan data dokumen operasional mana pun (Gudang: ${formatDecimal(normM3(gudangValues[0] ?? 0), 4)} m³${plValues[0] ? `, PL: ${formatDecimal(normM3(plValues[0]), 4)} m³` : ''}).`
  } else if (hasQtyMismatch) {
    verdictTitle = 'Terdapat Selisih Jumlah Koli (Qty Mismatch)'
    verdictDescription = `Terdapat perbedaan jumlah Qty koli antara ${activeQtys.map((q) => `${q.label} (${formatNumber(q.val)})`).join(', ')}. Harap periksa dokumen operasional.`
  } else if (hasWeightMismatch) {
    verdictTitle = 'Terdapat Selisih Berat Fisik Antar Dokumen'
    verdictDescription = `Terdapat perbedaan berat antara ${activeWeights.map((w) => `${w.label} (${formatDecimal(w.val, 2)} kg)`).join(', ')}. Harap periksa data timbangan operasional.`
  } else if (isBilledOverweightTolerated) {
    verdictTitle = `Tagihan Sesuai dengan Catatan Selisih Pembulatan Overweight ${Math.abs(overweightDiff ?? 0)} kg`
    verdictDescription = `Tagihan memuat item penagihan KG (${formatNumber(effectiveBilledKg)} kg) dengan selisih pembulatan wajar ${Math.abs(overweightDiff ?? 0)} kg terhadap hitungan sistem (${formatNumber(overweightKg)} kg).`
  } else if (isOverweight && !isBilledOverweightMatch) {
    verdictTitle = `Muatan Melebihi Kuota Rasio (Overweight +${formatNumber(overweightKg)} kg Belum Ditagihkan)`
    verdictDescription = `Muatan fisik (${formatNumber(actualWeightKg)} kg) melebihi batas kuota rasio (${formatNumber(rasio)} kg/m³ untuk ${formatDecimal(billedM3, 4)} m³). Terdapat kelebihan berat +${formatNumber(overweightKg)} kg yang belum ditagihkan.`
  } else if (isBilledUnneededOverweight) {
    verdictTitle = 'Penagihan Overweight Tidak Diperlukan'
    verdictDescription = `Tagihan memuat item penagihan KG (${formatNumber(effectiveBilledKg)} kg), padahal muatan fisik tidak melebihi kuota rasio berat.`
  } else {
    // Fallback terinci jika ada indikator discrepancyDetails
    if (discrepancyDetails.length > 0) {
      verdictTitle = `Ditemukan ${discrepancyDetails.length} Poin Perbedaan Tagihan vs Operasional`
      verdictDescription = discrepancyDetails.map((d) => `[${d.category}] ${d.title}`).join(' · ')
    } else {
      verdictTitle = 'Ditemukan Selisih Antara Tagihan dan Data Operasional'
      verdictDescription = 'Terdapat ketidaksesuaian nilai tagihan dengan acuan operasional atau price list.'
    }
  }

  // Otomatis aktifkan tab saat modal dibuka / data validasi dimuat berdasarkan hirarki masalah
  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedRef.current = null
      return
    }

    if (initialTab && ['items', 'm3_weight', 'overweight', 'freight', 'transport'].includes(initialTab)) {
      setActiveTab(initialTab as SummaryModalTab)
      hasAutoSelectedRef.current = String(billingData.fdInvNo)
      return
    }

    // TYPE 2 (Compare M3 vs KG): Tab aktif WAJIB compare m3:kg (m3_weight)
    if (isType2) {
      setActiveTab('m3_weight')
      hasAutoSelectedRef.current = String(billingData.fdInvNo)
      return
    }

    if (res && hasAutoSelectedRef.current !== String(billingData.fdInvNo)) {
      const hasOverweightIssue = !isAir && !isType2 && (
        (isOverweight && !isBilledOverweightExactMatch) ||
        isBilledUnneededOverweight ||
        (!isBilledOverweightMatch && isOverweight) ||
        hasWeightMismatch
      )

      let targetTab: SummaryModalTab = 'items'

      // Prioritas 1: Type 2 (sudah di-handle di atas)
      // Prioritas 2: Selisih ukuran fisik dasar M3 (Laut) / Timbangan (Udara) / Komplain / COD
      if (!isMatch || isCodUrgentShortfall || isBilledUsingRejectedKomplain || isBilledMismatchedApprovedKomplain) {
        targetTab = 'm3_weight'
        // Prioritas 3: Selisih Overweight & Rasio Berat (Jalur Laut)
      } else if (hasOverweightIssue) {
        targetTab = 'overweight'
        // Prioritas 4: Selisih tarif pada Item Billing (Undercharge)
      } else if (hasUnderchargePrice) {
        targetTab = 'items'
        // Prioritas 5: Selisih Qty Koli
      } else if (hasQtyMismatch) {
        targetTab = 'm3_weight'
        // Prioritas 6: Biaya ekspedisi tbExpIndo belum tertagih
      } else if (hasUnbilledTransport) {
        targetTab = 'transport'
        // Prioritas 7: Biaya freight charge valas
      } else if (Boolean(res?.freightChargeSummary?.totalFc && res.freightChargeSummary.totalFc > 0)) {
        targetTab = 'freight'
      } else {
        targetTab = 'items'
      }

      setActiveTab(targetTab)
      hasAutoSelectedRef.current = String(billingData.fdInvNo)
    }
  }, [
    isOpen,
    initialTab,
    billingData.fdInvNo,
    isType2,
    res,
    isMatch,
    isCodUrgentShortfall,
    isBilledUsingRejectedKomplain,
    isBilledMismatchedApprovedKomplain,
    isAir,
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledOverweightMatch,
    isBilledUnneededOverweight,
    hasWeightMismatch,
    hasUnderchargePrice,
    hasQtyMismatch,
    hasUnbilledTransport,
  ])

  const totalAmount = Number(billingData.fdJumlah2 || 0) > 0 ? billingData.fdJumlah2 : billingData.fdJumlah1
  const currency = Number(billingData.fdJumlah2 || 0) > 0 ? (billingData.fdCurr1 || 'USD') : 'Rp.'

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-full sm:max-w-4xl lg:max-w-5xl flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 shrink-0 space-y-2.5">
          {/* Top Row: Title + Status + Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAllValid
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : hasWarning
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}>
                {isAllValid ? <CheckCircle2 size={16} /> : hasWarning ? <AlertTriangle size={16} /> : <XCircle size={16} />}
              </div>
              <h2 className="text-sm sm:text-base font-bold font-[var(--font-display)] text-[var(--color-primary)] tracking-tight truncate">
                Kesimpulan Validasi Tagihan
              </h2>

              <span className={`text-[10px] px-2 py-0.5 font-bold rounded border ${billTypeConfig.badgeClasses}`}>
                {billTypeConfig.label}
              </span>

              {isTransport ? (
                isLoadingTransport ? (
                  <Badge variant="info" className="text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                    <RefreshCw size={10} className="animate-spin" />
                    MEMVALIDASI...
                  </Badge>
                ) : transportValidation?.hasDuplicate ? (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold tracking-wide">
                    PERINGATAN (DUPLIKASI)
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold tracking-wide">
                    SESUAI (VALID)
                  </Badge>
                )
              ) : isLoadingValidation ? (
                <Badge variant="info" className="text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                  <RefreshCw size={10} className="animate-spin" />
                  MEMVALIDASI...
                </Badge>
              ) : billTypeConfig.skipValidation ? (
                <Badge variant={billType === BILL_TYPES.REVISI ? 'warning' : 'info'} className="text-[10px] px-1.5 py-0.5 font-bold">
                  DIKECUALIKAN
                </Badge>
              ) : !res ? (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0.5 font-bold">
                  BELUM TERSEDIA
                </Badge>
              ) : (
                <Badge
                  variant={isAllValid ? 'success' : hasWarning ? 'warning' : 'danger'}
                  className="text-[10px] px-2 py-0.5 font-bold tracking-wide"
                >
                  {isAllValid
                    ? 'SESUAI (VALID)'
                    : hasWarning
                      ? 'PERINGATAN'
                      : 'SELISIH'}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <BillingPrintButtons invNo={billingData.fdInvNo} size="xs" />

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 -mr-1 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer shrink-0"
                title="Tutup Modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 3 Cards Sejajar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {/* Card 1: Tagihan, Tanggal & Mode */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs flex flex-col justify-center min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider mb-1 block">
                Tagihan & Mode
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs text-[var(--color-primary)] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]">
                  {billingData.fdInvNo}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                  {isAir ? <><Plane size={10} /> AIR</> : <><Truck size={10} /> SEA</>}
                </span>
              </div>
              <div className="text-[11px] text-[var(--color-secondary)] flex items-center gap-1 mt-1 font-medium">
                <Calendar size={11} className="text-[var(--color-secondary)] shrink-0" />
                <span>{formatDate(billingData.fdInvDate)}</span>
              </div>
            </div>

            {/* Card 2: Customer & Status MKT */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs flex flex-col justify-center min-w-0">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Customer
                </span>
                {isMktCustomer(billingData.customer, billingData.customer?.fdSalesNM || (billingData as any)?.sales) && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    {billingData.customer?.fdBroker === 1 ? 'BROKER' : 'MKT'}
                  </span>
                )}
              </div>
              <p className="font-bold text-xs text-[var(--color-primary)] truncate" title={
                billingData.fdCustCode && billingData.customer?.fdCustName
                  ? `${billingData.fdCustCode.trim()}/${billingData.customer.fdCustName.trim()}`
                  : billingData.customer?.fdCustName || billingData.fdCustCode || '—'
              }>
                {billingData.fdCustCode && billingData.customer?.fdCustName
                  ? `${billingData.fdCustCode.trim()}/${billingData.customer.fdCustName.trim()}`
                  : billingData.customer?.fdCustName || billingData.fdCustCode || '—'}
              </p>
              {billingData.customer?.fdSalesNM && (
                <p className="text-[10px] text-[var(--color-secondary)] truncate mt-0.5">
                  Sales: <span className="font-medium text-[var(--color-primary)]">{billingData.customer.fdSalesNM.trim()}</span>
                </p>
              )}
            </div>

            {/* Card 3: Marking Code & No */}
            <div className="p-2 sm:p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs flex flex-col justify-center min-w-0">
              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider mb-1 block">
                Marking
              </span>
              <p className="font-mono font-bold text-xs text-[var(--color-primary)] truncate" title={`${billingData.fdMarkingCode || '—'} ${billingData.fdMarkingNo ? `(${billingData.fdMarkingNo.trim()})` : ''}`}>
                {billingData.fdMarkingCode ? billingData.fdMarkingCode.trim() : '—'}
              </p>
              {billingData.fdMarkingNo && (
                <p className="font-mono text-[11px] text-[var(--color-secondary)] truncate mt-0.5" title={billingData.fdMarkingNo.trim()}>
                  ({billingData.fdMarkingNo.trim()})
                </p>
              )}
              {billingData.fdConsignee && (
                <p className="text-[10px] text-[var(--color-secondary)] truncate mt-0.5" title={billingData.fdConsignee}>
                  Consignee: <span className="font-semibold text-[var(--color-primary)]">{billingData.fdConsignee}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3 sm:space-y-4">
          {isLoadingValidation ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Verdict Banner Skeleton */}
              <div className="p-4 sm:p-4.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-start gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl skeleton-shimmer shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3 w-28 rounded skeleton-shimmer" />
                  <div className="h-5 w-3/4 rounded-md skeleton-shimmer" />
                  <div className="h-3.5 w-full rounded skeleton-shimmer" />
                </div>
              </div>

              {/* 2 Grid Breakdown Cards Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                      <div className="h-4 w-28 rounded skeleton-shimmer" />
                    </div>
                    <div className="w-16 h-4 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                      <div className="h-4 w-20 rounded skeleton-shimmer" />
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border)]/60">
                      <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                      <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                    </div>
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
                      <div className="h-4 w-32 rounded skeleton-shimmer" />
                    </div>
                    <div className="w-16 h-4 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="h-3.5 w-28 rounded skeleton-shimmer" />
                      <div className="h-4 w-20 rounded skeleton-shimmer" />
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-[var(--color-border)]/60">
                      <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                      <div className="h-3.5 w-24 rounded skeleton-shimmer" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Skeleton */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-36 rounded skeleton-shimmer" />
                  <div className="h-4 w-16 rounded skeleton-shimmer" />
                </div>
                <div className="space-y-2">
                  <div className="h-11 w-full rounded-lg skeleton-shimmer" />
                  <div className="h-11 w-full rounded-lg skeleton-shimmer" />
                </div>
              </div>
            </div>
          ) : isTransport ? (
            <div className="space-y-3">
              {/* Verdict Banner Transport */}
              <div
                className={`p-4 sm:p-4.5 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${transportValidation?.hasDuplicate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${transportValidation?.hasDuplicate ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                    }`}
                >
                  {transportValidation?.hasDuplicate ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-75">
                    <Sparkles size={12} />
                    <span>Hasil Validasi Bill Transport</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] leading-snug">
                    {transportValidation?.hasDuplicate
                      ? `Peringatan: Ditemukan ${transportValidation.duplicates.length} Tagihan Lain dengan Nominal Sama (${formatCurrency(transportBillAmount)})`
                      : `Bill Transport Valid — Tidak Ditemukan Duplikasi (${formatCurrency(transportBillAmount)})`}
                  </h3>
                  <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
                    {transportValidation?.hasDuplicate
                      ? `Ditemukan tagihan lain dengan nominal ${formatCurrency(transportBillAmount)} untuk Customer (${billingData.customer?.fdCustName || billingData.fdCustCode}) dan Marking (${billingData.fdMarkingCode || '—'}). Harap pastikan bukan penagihan ganda.`
                      : `Tagihan ongkos transport telah divalidasi. Tidak ditemukan tagihan lain dengan nominal yang sama untuk Customer dan Marking ini.`}
                  </p>
                </div>
              </div>

              {/* Rincian Duplikasi Jika Ada */}
              {transportValidation?.hasDuplicate && transportValidation.duplicates.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                      <span>Daftar Tagihan dengan Nominal yang Sama:</span>
                    </h4>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                      {transportValidation.duplicates.length} invoice ditemukan
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-[var(--color-secondary)] text-left">
                          <th className="py-2 px-2.5 font-bold">No. Invoice</th>
                          <th className="py-2 px-2.5 font-bold">Tanggal</th>
                          <th className="py-2 px-2.5 font-bold">Marking</th>
                          <th className="py-2 px-2.5 font-bold text-right">Nominal</th>
                          <th className="py-2 px-2.5 font-bold">Pembuat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]/60">
                        {transportValidation.duplicates.map((dup) => (
                          <tr key={dup.fdInvNo} className="hover:bg-[var(--color-neutral)]/40">
                            <td className="py-2 px-2.5 font-mono font-bold text-[var(--color-primary)]">
                              {dup.fdInvNo}
                            </td>
                            <td className="py-2 px-2.5 text-[var(--color-secondary)]">
                              {dup.fdInvDate ? formatDate(dup.fdInvDate) : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-[var(--color-primary)]">
                              {dup.fdMarkingCode} {dup.fdMarkingNo ? `(${dup.fdMarkingNo})` : ''}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency(dup.fdJumlah1)}
                            </td>
                            <td className="py-2 px-2.5 text-[var(--color-secondary)]">
                              {dup.fdEmpName || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Parameter Verifikasi Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Customer</span>
                  <span className="text-xs font-semibold text-[var(--color-primary)] block truncate mt-0.5">
                    {billingData.customer?.fdCustName || billingData.fdCustCode || '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Marking Code</span>
                  <span className="text-xs font-semibold text-[var(--color-primary)] block truncate mt-0.5 font-mono">
                    {billingData.fdMarkingCode || '—'}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Nominal Dicek</span>
                  <span className="text-xs font-bold text-[var(--color-primary)] block mt-0.5 font-mono">
                    {formatCurrency(transportBillAmount)}
                  </span>
                </div>
              </div>

              {/* Ekspedisi Indo Section (tbExpIndo) */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-600 dark:text-blue-400" />
                    <span>Data Ekspedisi:</span>
                  </h4>
                  {transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> {transportValidation.expedisiList.length} data ekspedisi
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--color-secondary)]">
                      Belum ada data ekspedisi
                    </span>
                  )}
                </div>

                {transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                  <div className="space-y-2">
                    {transportValidation.expedisiList.map((exp) => {
                      const isAmountMatch = Math.abs(exp.fdTotalExp - transportBillAmount) < 0.01 && exp.fdTotalExp > 0
                      return (
                        <div
                          key={exp.fdId}
                          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${isAmountMatch
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-[var(--color-border)]/70 bg-[var(--color-neutral)]/20'
                            }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[var(--color-primary)] text-sm">
                                {exp.fdExpName || 'Ekspedisi (Tanpa Nama)'}
                              </span>
                              {exp.fdPaid === 1 ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Harus Tagih
                                </span>
                              ) : exp.fdPaid === 2 ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  COD (Bayar Tujuan)
                                </span>
                              ) : null}
                              {isAmountMatch ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  ✓ Nominal Cocok
                                </span>
                              ) : Number(exp.fdTotalExp || 0) <= 0 ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  Biaya Rp 0 (Tidak Valid / Belum Terisi)
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-[var(--color-secondary)]">
                              No. Resi: <strong className="font-mono text-[var(--color-primary)]">{exp.fdResiExp || '—'}</strong>
                              {exp.fdListCode && <> · List: <span className="font-mono text-[var(--color-primary)]">{exp.fdListCode}</span></>}
                              {exp.fdJmlBerat && <> · Berat: <span className="font-mono text-[var(--color-primary)]">{exp.fdJmlBerat} kg</span></>}
                              {exp.fdCreatedDate && <> · Tanggal: <span>{formatDate(exp.fdCreatedDate)}</span></>}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Biaya Ekspedisi</span>
                            <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
                              {formatCurrency(exp.fdTotalExp)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--color-secondary)] italic">
                    Tidak ditemukan catatan tbExpIndo untuk List Code atau Customer ({billingData.customer?.fdCustName || billingData.fdCustCode}) & Marking ({billingData.fdMarkingCode || '—'}).
                  </p>
                )}
              </div>

              {/* Total Tagihan Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-neutral)]/60 border border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                    TOTAL TAGIHAN
                  </span>
                  <span className="text-[11px] text-[var(--color-secondary)]">
                    {details.length} baris item tagihan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                    {formatCurrency(transportBillAmount)}
                  </span>
                </div>
              </div>

              {/* Rincian Item Tagihan */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-2xs">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--color-border)]">
                  <h4 className="text-xs font-bold text-[var(--color-primary)]">Rincian Item Tagihan</h4>
                  <span className="text-[11px] text-[var(--color-secondary)]">{details.length} item</span>
                </div>
                <div className="space-y-2">
                  {details.map((item) => (
                    <div
                      key={item.fdID}
                      className="p-2.5 rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-neutral)]/30 flex justify-between items-center text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-semibold text-[var(--color-primary)] truncate">{item.fdItemName}</p>
                        <p className="text-[11px] text-[var(--color-secondary)] font-mono">
                          {formatDecimal(item.fdQty, 2)} {item.fdListCode || ''} @ {formatCurrency(item.fdItemPrice)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[var(--color-primary)]">
                          {formatCurrency(item.fdTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : billTypeConfig.skipValidation ? (
            <div className="space-y-3">
              <div className="p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-sm">Bill Revisi — Dikecualikan Dari Validasi Operasional</p>
                  <p className="leading-relaxed opacity-90">Invoice ini teridentifikasi sebagai Bill Revisi. Dikecualikan dari proses validasi operasional.</p>
                </div>
              </div>

              {/* Total Tagihan Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-neutral)]/60 border border-[var(--color-border)] flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                    TOTAL TAGIHAN
                  </span>
                  <span className="text-[11px] text-[var(--color-secondary)]">
                    {details.length} baris item tagihan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-mono font-bold text-[var(--color-primary)]">
                    {formatCurrency(transportBillAmount)}
                  </span>
                </div>
              </div>
            </div>
          ) : (isLoadingValidation || !res) ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <LoadingSpinner message="Menganalisis kubikasi & acuan tarif..." />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Main Verdict Banner */}
              <div
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all flex items-start gap-3.5 ${isAllValid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  : hasWarning
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${isAllValid
                    ? 'bg-emerald-500 text-white'
                    : hasWarning
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                    }`}
                >
                  {isAllValid ? <CheckCircle2 size={20} /> : hasWarning ? <AlertTriangle size={20} /> : <XCircle size={20} />}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider opacity-75">
                    <Sparkles size={12} />
                    <span>Hasil Analisis Sistem</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)] leading-snug">
                    {verdictTitle}
                  </h3>
                  <p className="text-xs text-[var(--color-secondary)] leading-relaxed">
                    {verdictDescription}
                  </p>

                  {/* Rincian Detail Selisih & Temuan Operasional (Collapsible Accordion) */}
                  {discrepancyDetails.length > 0 && !isAllValid && (
                    <div className="mt-2.5 pt-2 border-t border-[var(--color-border)]/50">
                      <button
                        type="button"
                        onClick={() => setIsDiscrepancyExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between text-left py-1 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Rincian Temuan ({discrepancyDetails.length}):
                          </span>
                          {!isDiscrepancyExpanded && (
                            <span className="text-[11px] font-normal text-[var(--color-secondary)] truncate max-w-[280px] sm:max-w-md">
                              {discrepancyDetails[0].title}
                              {discrepancyDetails.length > 1 ? ` (+${discrepancyDetails.length - 1} lainnya)` : ''}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-tertiary)] shrink-0 ml-2 group-hover:underline">
                          {isDiscrepancyExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}
                          {isDiscrepancyExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      </button>

                      {isDiscrepancyExpanded && (
                        <div className="mt-2 space-y-1.5 animate-fadeIn">
                          {discrepancyDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl text-xs flex items-start gap-2.5 border bg-[var(--color-surface)]/50 ${item.type === 'critical'
                                ? 'border-rose-500/25'
                                : item.type === 'warning'
                                  ? 'border-amber-500/25'
                                  : 'border-sky-500/25'
                                }`}
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 border uppercase tracking-wider ${item.type === 'critical'
                                  ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5'
                                  : item.type === 'warning'
                                    ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                                    : 'border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/5'
                                  }`}
                              >
                                {item.category}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-[var(--color-primary)] text-xs leading-snug">
                                  {item.title}
                                </div>
                                <div className="text-[11px] text-[var(--color-secondary)] mt-0.5 leading-relaxed">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Tab Navigasi Modal */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${activeTab === 'items'
                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                >
                  <Layers size={13} />
                  <span>Item Tagihan & Tarif</span>
                  {hasPriceDiscrepancy ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      Cek Tarif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      ✓ Valid
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('m3_weight')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${activeTab === 'm3_weight'
                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                >
                  {isType2 ? <Scale size={13} /> : <Box size={13} />}
                  <span>{isType2 ? 'Compare M3:KG' : isAir ? 'Timbangan Fisik' : 'Validasi M3'}</span>
                  {isType2 ? (
                    isType2Discrepancy ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        Perlu Cek
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        ✓ Valid
                      </span>
                    )
                  ) : isMatch ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      ✓ Sesuai
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                      Selisih
                    </span>
                  )}
                </button>

                {!isAir && !isType2 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('overweight')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${activeTab === 'overweight'
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                      }`}
                  >
                    <Scale size={13} />
                    <span>Overweight</span>
                    {(isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight)) && !hasWeightMismatch ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        ✓ Aman
                      </span>
                    ) : isBilledOverweightTolerated && !hasWeightMismatch ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        ✓ Toleransi
                      </span>
                    ) : hasWeightMismatch && !isOverweight ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        Selisih Berat
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                        Perlu Cek
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('freight')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${activeTab === 'freight'
                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                >
                  <Coins size={13} />
                  <span>Freight Charge</span>
                  {res?.freightChargeSummary?.totalFc && res.freightChargeSummary.totalFc > 0 ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      {formatNumber(res.freightChargeSummary.totalFc)} {res.freightChargeSummary.currency}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)]">
                      Nihil
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('transport')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${activeTab === 'transport'
                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                    : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                >
                  <Truck size={13} />
                  <span>Ekspedisi</span>
                  {hasUnbilledTransport ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30 animate-pulse">
                      {unbilledExpedisiList.length} Belum Ditagih
                    </span>
                  ) : transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                    codExpedisiList.length > 0 && mustBillExpedisiList.length === 0 ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-600 border border-sky-500/30">
                        {codExpedisiList.length} COD
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        {transportValidation.expedisiList.length} Data
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)]">
                      Nihil
                    </span>
                  )}
                </button>
              </div>

              {/* 3. Tab Content - Kesimpulan Saja */}
              {/* TAB 1: ITEM BILLING & TARIF */}
              {activeTab === 'items' && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Warning: Biaya Ekspedisi (tbExpIndo) Belum Ditagih */}
                  {hasUnbilledTransport && (
                    <div className="p-3 sm:p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle size={15} />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                            Peringatan: Ditemukan Biaya Ekspedisi di tbExpIndo Belum Ditagihkan!
                          </h4>
                          <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                            Tercatat {unbilledExpedisiList.length} data ekspedisi lokal di database <code className="font-mono px-1 rounded bg-amber-500/20">tbExpIndo</code> senilai total <strong className="font-mono font-bold text-amber-950 dark:text-amber-100">{formatCurrency(totalUnbilledTransportAmount)}</strong> ({unbilledExpedisiList[0]?.fdExpName || 'Ekspedisi'}{unbilledExpedisiList[0]?.fdResiExp ? ` Resi: ${unbilledExpedisiList[0].fdResiExp}` : ''}), namun belum ada baris item tagihan Transport / Ongkir pada invoice ini.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('transport')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition-colors shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <Truck size={13} />
                        <span>Lihat Ekspedisi ({unbilledExpedisiList.length}) →</span>
                      </button>
                    </div>
                  )}

                  {/* Sumber Price List Bar */}
                  {res?.priceValidation && (
                    <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-[var(--color-primary)] shrink-0" />
                        <span>Tgl Agen:</span>
                        <strong className="text-[var(--color-primary)]">
                          {res.priceValidation.fdTglAgent ? formatDate(res.priceValidation.fdTglAgent) : '—'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {res.priceValidation.hasCustomerPriceList ? (
                          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/40">
                            Price List Khusus Customer
                          </span>
                        ) : res.priceValidation.isMarkingOverride ? (
                          <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30">
                            Override Marking ({res.priceValidation.matchedMarkingCode || 'MARKING'})
                          </span>
                        ) : isMktCustomer(res.customer, res.customer?.fdSalesNM) ? (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                            Master MKT {res.customer?.fdBroker === 1 ? '(Broker)' : '(Sales)'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded border border-blue-500/30">
                            Master CS (Non-Broker)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Profile Harga Customer (Master / Audit) */}
                  {res?.profileHarga && (
                    <div className="p-3 sm:p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                          <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Profile Harga Customer</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-[10px] font-mono">
                            Type Tagihan: {
                              res.profileHarga.typeTagihan === 1
                                ? '1 (m3 + Kg)'
                                : res.profileHarga.typeTagihan === 2
                                  ? '2 (compare m3 : Kg)'
                                  : res.profileHarga.typeTagihan === 3
                                    ? '3 (m3 tidak kena Kg)'
                                    : res.profileHarga.typeTagihan === 4
                                      ? '4 (Kg)'
                                      : `${res.profileHarga.typeTagihan}`
                            }
                          </Badge>
                          {(res.profileHarga.fdUpdate || res.profileHarga.fdUpdateDate) && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-secondary)]">
                              <Clock size={11} className="text-[var(--color-tertiary)] shrink-0" />
                              <span>Update: <strong className="text-[var(--color-primary)] font-semibold">{res.profileHarga.fdUpdate || '—'}</strong></span>
                              {res.profileHarga.fdUpdateDate && (
                                <>
                                  <span>•</span>
                                  <span>{formatDate(res.profileHarga.fdUpdateDate)}</span>
                                </>
                              )}
                              {res.profileHarga.fdUpdateSource === 'AUDIT' ? (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  tbAuditHarga
                                </span>
                              ) : res.profileHarga.fdUpdateSource === 'CUSTOMER_HARGA' ? (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                  tbCustomerHarga
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Kelompok Tarif Utama */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                          <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">Harga M3</p>
                          <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                            {res.profileHarga.harga > 0 ? formatCurrency(res.profileHarga.harga) : '—'}
                          </p>
                        </div>

                        <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                          <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">Harga Kg</p>
                          <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                            {res.profileHarga.kg > 0 ? `${formatDecimal(res.profileHarga.kg, 0)} kg` : '—'}
                          </p>
                        </div>

                        <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                          <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">Rasio Overweight</p>
                          <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                            {res.profileHarga.rasio > 0 ? formatDecimal(res.profileHarga.rasio, 2) : '—'}
                          </p>
                        </div>

                        <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                          <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">
                            {res.fdListType === 1 ? 'Min. Charge Kg' : 'Min. Charge M3'}
                          </p>
                          <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                            {res.fdListType === 1
                              ? (res.profileHarga.minChargeKg && res.profileHarga.minChargeKg > 0
                                ? `${formatDecimal(res.profileHarga.minChargeKg, 2)} kg`
                                : '3.00 kg (Default)')
                              : (res.profileHarga.minChargeM3 && res.profileHarga.minChargeM3 > 0
                                ? `${formatDecimal(res.profileHarga.minChargeM3, 4)} m³`
                                : '0.1000 m³ (Default)')}
                          </p>
                        </div>
                      </div>

                      {/* Kelompok Tax Return (jika ada) */}
                      {(res.profileHarga.taxReturnPrice > 0 || res.profileHarga.taxReturnMinCharge > 0) && (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                          <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                            <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">Tarif Tax Return</p>
                            <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                              {res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'}
                            </p>
                          </div>

                          <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg p-2">
                            <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">Min Charge Tax Return</p>
                            <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                              {res.profileHarga.taxReturnMinCharge > 0 ? `${formatDecimal(res.profileHarga.taxReturnMinCharge, 4)} m³` : '—'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-item card list */}
                  <div className="space-y-1.5">
                    {evaluatedItems.map(({ item, evaluation: evalRes }, idx) => {
                      const billedPrice = Number(item?.fdItemPrice || 0)

                      const statusBadge = evalRes.isMatched ? (
                        <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                          <span>Match</span>
                        </Badge>
                      ) : evalRes.hasTargetPrice && (evalRes.isTransportItem || evalRes.isTaxReturnItem ? (evalRes.isTransportItem ? evalRes.minTargetPrice > 0 : evalRes.profilePrice > 0) : evalRes.priceItem !== null) ? (
                        evalRes.statusType === 'HIGHER' ? (
                          <Badge variant="info" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                            <TrendingUp className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>Overcharge</span>
                          </Badge>
                        ) : evalRes.statusType === 'LOWER' ? (
                          <Badge variant="danger" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                            <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Undercharge</span>
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="shrink-0 text-[10px]">{evalRes.targetColName}</Badge>
                        )
                      ) : evalRes.isTransportItem ? (
                        <Badge variant="warning" className="shrink-0 text-[10px]">Belum Ada tbExpIndo</Badge>
                      ) : (
                        <span className="text-[10px] text-[var(--color-secondary)] shrink-0">—</span>
                      )

                      return (
                        <div
                          key={item?.fdID || idx}
                          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/30 transition-colors overflow-hidden"
                        >
                          {/* Baris 1: nama + komoditi + status */}
                          <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 border-b border-[var(--color-border)]/60">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-[var(--color-primary)] leading-tight" title={item?.fdItemName ?? undefined}>
                                  {item?.fdItemName}
                                </p>
                                {evalRes.isTaxReturnItem && (res?.profileHarga?.taxReturnMinCharge ?? 0) > 0 && (
                                  <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                                    Min Charge: {formatDecimal(res?.profileHarga?.taxReturnMinCharge, 4)} m³
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-[var(--color-tertiary)] whitespace-nowrap shrink-0 mt-0.5">
                                {evalRes.comodityName}
                              </span>
                            </div>
                            <div className="shrink-0 mt-0.5">{statusBadge}</div>
                          </div>

                          {/* Baris 2: 3 kolom harga */}
                          <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]/60 text-[11px]">
                            <div className="px-2.5 py-1.5">
                              <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">Harga Invoice</p>
                              <p className="font-mono font-bold text-[var(--color-primary)]">{formatCurrency(billedPrice)}</p>
                            </div>
                            <div className="px-2.5 py-1.5">
                              <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                                {evalRes.isTransportItem ? 'Ref. Ekspedisi' : 'Harga Profile'}
                              </p>
                              <p className="font-mono text-[var(--color-secondary)]">
                                {evalRes.isTransportItem
                                  ? (evalRes.transportExpedisi?.fdExpName || (evalRes.hasTargetPrice ? 'tbExpIndo' : '—'))
                                  : (evalRes.profilePrice > 0 ? formatCurrency(evalRes.profilePrice) : '—')}
                              </p>
                            </div>
                            <div className="px-2.5 py-1.5">
                              <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                                {evalRes.isTransportItem ? 'Acuan tbExpIndo' : 'Price List'}
                              </p>
                              <p className="font-mono font-semibold text-blue-700 dark:text-blue-300 break-all leading-tight">
                                {evalRes.priceListDisplay || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: KUBIKASI M3 / BERAT FISIK / TYPE 2 COMPARE */}
              {activeTab === 'm3_weight' && (
                isType2 ? (
                  <div className="space-y-4 animate-fadeIn">
                    <Type2ComparisonPanel
                      invNo={billingData.fdInvNo || ''}
                      listCode={billingData.fdListCode}
                      markingCode={billingData.fdMarkingCode}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 animate-fadeIn">
                    {/* Status Bar */}
                    <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                          {isAir ? <Plane size={15} /> : <Box size={15} />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-primary)]">
                            {isAir ? 'Status Berat Fisik (Udara)' : 'Status Kubikasi M3 (Laut)'}
                          </h4>
                          <span className="text-[10px] text-[var(--color-secondary)]">
                            Sumber Pencocokan: <strong className="text-[var(--color-primary)]">{matchLabel}</strong>
                          </span>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${isMatch ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        }`}>
                        {isMatch ? '✓ Dimensi Sesuai' : '⚠ Ditemukan Selisih'}
                      </span>
                    </div>

                    {/* Grid Metrik Dimensi */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      {/* Card 1: Ditagihkan */}
                      <div className={`p-3 rounded-xl space-y-1.5 flex flex-col justify-between transition-colors border-2 ${isMatch
                          ? 'bg-emerald-500/5 border-emerald-500/80 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-primary)]'
                        }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Ditagihkan</span>
                            {isMatch && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Billed</span>
                            )}
                          </div>
                          <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                            {isAir ? `${formatDecimal(effectiveBilledKg, 2)} kg` : `${formatDecimal(billedM3, 4)} m³`}
                          </span>
                          <span className="text-[10px] text-[var(--color-secondary)] block truncate">Invoice Billed</span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-secondary)]">Satuan</span>
                          <span className="font-mono font-semibold text-[var(--color-primary)]">{isAir ? 'KG' : 'M³'}</span>
                        </div>
                      </div>

                      {/* Card 2: Ukuran Gudang */}
                      <div className={`p-3 rounded-xl space-y-1.5 flex flex-col justify-between transition-colors border-2 ${isGudangMatched
                          ? 'bg-emerald-500/5 border-emerald-500/80 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                        }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Ukuran Gudang</span>
                            {isGudangMatched && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Cocok</span>
                            )}
                          </div>
                          <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                            {isAir ? `${formatDecimal(res?.fdBeratList || 0, 2)} kg` : gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                          </span>
                          <span className="text-[10px] text-[var(--color-secondary)] block truncate">Gudang fisik</span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-secondary)]">Per Marking:</span>
                          <span className={`font-mono font-semibold ${(isAir ? (beratMarking !== null && Math.abs(beratMarking - effectiveBilledKg) < 0.01) : (custMarkingM3 !== null && Math.abs(normM3(custMarkingM3) - billedM3) < 0.001))
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-[var(--color-primary)]'
                            }`}>
                            {isAir
                              ? (beratMarking !== null && beratMarking > 0 ? `${formatDecimal(beratMarking, 2)} kg` : '—')
                              : (custMarkingM3 !== null && custMarkingM3 > 0 ? `${formatDecimal(custMarkingM3, 4)} m³` : '—')}
                          </span>
                        </div>
                      </div>

                      {/* Card 3: Packing List */}
                      <div className={`p-3 rounded-xl space-y-1.5 flex flex-col justify-between transition-colors border-2 ${isPLMatched
                          ? 'bg-emerald-500/5 border-emerald-500/80 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                        }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Packing List</span>
                            {isPLMatched && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Cocok</span>
                            )}
                          </div>
                          <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                            {!isAir && plValues.length > 0 ? `${formatDecimal(plValues[0], 4)} m³` : '—'}
                          </span>
                          <span className="text-[10px] text-[var(--color-secondary)] block truncate">PL Supplier</span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-secondary)]">Per Marking:</span>
                          <span className={`font-mono font-semibold ${(!isAir && plMarkingM3 !== null && Math.abs(normM3(plMarkingM3) - billedM3) < 0.001)
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-[var(--color-primary)]'
                            }`}>
                            {!isAir && plMarkingM3 !== null && plMarkingM3 > 0 ? `${formatDecimal(plMarkingM3, 4)} m³` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Card 4: Komplain Fisik */}
                      <div className={`p-3 rounded-xl space-y-1.5 flex flex-col justify-between transition-colors border-2 ${isKomplainMatched
                          ? 'bg-emerald-500/5 border-emerald-500/80 shadow-2xs'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                        }`}>
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Komplain Fisik</span>
                            {isKomplainMatched && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Cocok</span>
                            )}
                          </div>
                          <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                            {targetKomplainM3 ? `${formatDecimal(targetKomplainM3, 4)} m³` : 'Tidak Ada'}
                          </span>
                          <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                            {isApprovedKomplainActive ? 'Disetujui' : 'Nihil'}
                          </span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[10px]">
                          <span className="text-[var(--color-secondary)]">Per Marking:</span>
                          <span className={`font-mono font-semibold ${(!isAir && komplainMarkingM3 !== null && komplainMarkingM3 > 0 && Math.abs(normM3(komplainMarkingM3) - billedM3) < 0.001)
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-[var(--color-primary)]'
                            }`}>
                            {komplainMarkingM3 !== null && komplainMarkingM3 > 0
                              ? `${formatDecimal(komplainMarkingM3, 4)} m³`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Qty Coly Status */}
                    <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs flex items-center justify-between gap-2">
                      <span className="text-[var(--color-secondary)]">Kesesuaian Jumlah Koli:</span>
                      <span className={`font-bold ${hasQtyMismatch ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {hasQtyMismatch ? `⚠ Terdapat Selisih Qty Coly (${activeQtys.map((q) => `${q.label}: ${q.val}`).join(', ')})` : '✓ Qty Koli Sama Antar Dokumen'}
                      </span>
                    </div>

                    {/* Kesesuaian Berat Fisik */}
                    <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs flex items-center justify-between gap-2">
                      <span className="text-[var(--color-secondary)]">Kesesuaian Berat Fisik:</span>
                      <span className={`font-bold ${hasWeightMismatch ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {hasWeightMismatch
                          ? `⚠ Terdapat Selisih Berat (${activeWeights.map((w) => `${w.label}: ${formatDecimal(w.val, 2)} kg`).join(', ')})`
                          : activeWeights.length > 1
                            ? `✓ Berat Sama Antar Dokumen (${formatDecimal(activeWeights[0].val, 2)} kg)`
                            : activeWeights.length === 1
                              ? `✓ Berat Terdata (${formatDecimal(activeWeights[0].val, 2)} kg)`
                              : '— Data Berat Belum Terdata'}
                      </span>
                    </div>

                    {/* Panel Rincian Berat Fisik (List vs Surat Jalan vs Komplain) */}
                    {activeWeights.length > 0 && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                            Perbandingan Berat Fisik (List vs Surat Jalan vs Komplain)
                          </span>
                          {hasWeightMismatch ? (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              ⚠ Ada Selisih Berat
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              ✓ Berat Konsisten
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          {/* 1. Berat List */}
                          <div className={`p-2.5 rounded-lg border transition-colors ${isWeightListDiff
                              ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/20'
                              : 'border-[var(--color-border)] bg-[var(--color-neutral)]/40'
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase">1. Berat List</span>
                              {isWeightListDiff && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">Beda</span>
                              )}
                            </div>
                            <p className="text-sm font-bold font-mono text-[var(--color-primary)] mt-1">
                              {beratList > 0 ? `${formatDecimal(beratList, 2)} kg` : '—'}
                            </p>
                            <span className="text-[10px] text-[var(--color-secondary)]">tbEntryList</span>
                          </div>

                          {/* 2. Berat Surat Jalan */}
                          <div className={`p-2.5 rounded-lg border transition-colors ${isWeightSJDiff
                              ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/20'
                              : 'border-[var(--color-border)] bg-[var(--color-neutral)]/40'
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase">2. Berat Surat Jalan</span>
                              {isWeightSJDiff && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">Beda</span>
                              )}
                            </div>
                            <p className="text-sm font-bold font-mono text-[var(--color-primary)] mt-1">
                              {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                            </p>
                            <span className="text-[10px] text-[var(--color-secondary)]">tbDelivery (SJ)</span>
                          </div>

                          {/* 3. Berat Komplain */}
                          <div className={`p-2.5 rounded-lg border transition-colors ${isWeightKomplainDiff
                              ? 'border-amber-500/70 bg-amber-500/5 ring-1 ring-amber-500/20'
                              : 'border-[var(--color-border)] bg-[var(--color-neutral)]/40'
                            }`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[var(--color-secondary)] uppercase">3. Berat Komplain</span>
                              {isWeightKomplainDiff && (
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">Beda</span>
                              )}
                            </div>
                            <p className="text-sm font-bold font-mono text-[var(--color-primary)] mt-1">
                              {beratKomplain > 0 ? `${formatDecimal(beratKomplain, 2)} kg` : 'Nihil (0 kg)'}
                            </p>
                            <span className="text-[10px] text-[var(--color-secondary)]">tbEntryListKomplain</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/70 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                      <Info size={13} className="text-[var(--color-tertiary)] shrink-0" />
                      <span>Untuk melihat rincian ukuran per resi atau persebaran koli, user dapat melihat pada halaman validasi detail di belakang dialog ini.</span>
                    </div>
                  </div>
                )
              )}

              {/* TAB 3: OVERWEIGHT & RASIO (JALUR LAUT - Tidak Berlaku Untuk Type 2) */}
              {activeTab === 'overweight' && !isAir && !isType2 && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Status Bar */}
                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Scale size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-primary)]">
                          Status Overweight & Rasio Berat
                        </h4>
                        <span className="text-[10px] text-[var(--color-secondary)]">
                          Rasio Acuan: {formatNumber(rasio)} kg/m³
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight)
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : isBilledOverweightTolerated || isBilledUnneededOverweight
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      }`}>
                      {isBilledOverweightExactMatch
                        ? '✓ Overweight Sesuai'
                        : isBilledOverweightTolerated
                          ? `Toleransi ±${Math.abs(overweightDiff ?? 0)} kg`
                          : isOverweight
                            ? '⚠ Overweight Belum Ditagih'
                            : isBilledUnneededOverweight
                              ? `⚠ Ditagih ${formatNumber(effectiveBilledKg)} kg (Aman)`
                              : '✓ Berat Normal (Aman)'}
                    </span>
                  </div>

                  {/* 4 Metrik Rasio */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Rasio Pelanggan</span>
                        <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">{formatNumber(rasio)} kg/m³</span>
                      </div>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">Batas berat per m³</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Batas Kuota Berat</span>
                        <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                          {maxAllowedWeight > 0 ? `${formatDecimal(maxAllowedWeight, 2)} kg` : '—'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">{formatDecimal(refM3, 4)} m³ × {rasio}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Berat Aktual Fisik</span>
                          {hasWeightMismatch ? (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                              Selisih
                            </span>
                          ) : null}
                        </div>
                        <span className="text-base font-bold font-mono text-[var(--color-primary)] block mt-0.5">
                          {actualWeightKg > 0 ? `${formatDecimal(actualWeightKg, 2)} kg` : '—'}
                        </span>
                        <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                          {isGabungan ? 'Total berat gabungan marking' : 'Timbangan riil acuan'}
                        </span>
                      </div>
                      <div className="pt-1.5 mt-1 border-t border-[var(--color-border)]/60 space-y-0.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">{isGabungan ? 'Entry List (Marking):' : 'Entry List:'}</span>
                          <span className={`font-mono ${isWeightListDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                            {beratList > 0 ? `${formatDecimal(beratList, 2)} kg` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">{isGabungan ? 'Surat Jalan (Marking):' : 'Surat Jalan:'}</span>
                          <span className={`font-mono ${isWeightSJDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                            {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[var(--color-secondary)]">Komplain:</span>
                          <span className={`font-mono ${isWeightKomplainDiff ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-[var(--color-primary)] font-medium'}`}>
                            {beratKomplain > 0 ? `${formatDecimal(beratKomplain, 2)} kg` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between space-y-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                          {isOverweight ? 'Kelebihan Berat' : 'Sisa Kuota Berat'}
                        </span>
                        <span className={`text-base font-bold font-mono block mt-0.5 ${isOverweight ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isOverweight ? `+${formatNumber(overweightKg)} kg` : `${formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg`}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate pt-1 border-t border-[var(--color-border)]/60">
                        {isBilledOverweightExactMatch ? 'Sudah ditagihkan' : isOverweight ? 'Perlu penagihan KG' : 'Aman'}
                      </span>
                    </div>
                  </div>

                  {/* Banner Ringkas */}
                  <div className="p-3 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] leading-relaxed">
                    {isBilledOverweightExactMatch ? (
                      <span className="text-emerald-800 dark:text-emerald-200">
                        ✓ Muatan terindikasi overweight (+{formatNumber(overweightKg)} kg) dan invoice telah memuat item penagihan KG sebesar {formatNumber(effectiveBilledKg)} kg secara presisi.
                      </span>
                    ) : isBilledOverweightTolerated ? (
                      <span className="text-amber-800 dark:text-amber-200">
                        ⚠ Tagihan memuat item penagihan KG sebesar {formatNumber(effectiveBilledKg)} kg. Terdapat selisih pembulatan wajar {Math.abs(overweightDiff ?? 0)} kg dengan perhitungan sistem (+{formatNumber(overweightKg)} kg).
                      </span>
                    ) : isBilledUnneededOverweight ? (
                      <span className="text-amber-800 dark:text-amber-200">
                        ⚠ Berat aktual fisik masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar {formatNumber(effectiveBilledKg)} kg.
                      </span>
                    ) : isOverweight ? (
                      effectiveBilledKg > 0 ? (
                        <span className="text-rose-800 dark:text-rose-200 font-medium">
                          ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun item penagihan KG pada invoice ({formatNumber(effectiveBilledKg)} kg) memiliki selisih {Math.abs(overweightDiff ?? 0)} kg dengan sistem.
                        </span>
                      ) : (
                        <span className="text-rose-800 dark:text-rose-200 font-medium">
                          ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun invoice belum memuat item penagihan KG.
                        </span>
                      )
                    ) : (
                      <span className="text-emerald-800 dark:text-emerald-200">
                        ✓ Berat fisik aktual berada di dalam batas kuota rasio ({formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg sisa kuota).
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/70 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                    <Info size={13} className="text-[var(--color-tertiary)] shrink-0" />
                    <span>Untuk melihat rincian surat jalan atau timbangan fisik, user dapat melihat pada halaman validasi detail di belakang dialog ini.</span>
                  </div>
                </div>
              )}

              {/* TAB 4: FREIGHT CHARGE */}
              {activeTab === 'freight' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Coins size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-primary)]">
                          Status Biaya Freight Charge (Valas)
                        </h4>
                        <span className="text-[10px] text-[var(--color-secondary)]">
                          Data operasional EntryList
                        </span>
                      </div>
                    </div>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${res?.freightChargeSummary?.totalFc ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      }`}>
                      {res?.freightChargeSummary?.totalFc ? 'Terdapat Biaya FC' : 'Tidak Ada FC'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Total FC Valas</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {formatNumber(res?.freightChargeSummary?.totalFc || 0)} {res?.freightChargeSummary?.currency || ''}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">EntryList operasional</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Jumlah List Batch</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {res?.freightChargeSummary?.listsWithFcCount || 0} list
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">List dengan nilai FC</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/70 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                    <Info size={13} className="text-[var(--color-tertiary)] shrink-0" />
                    <span>Untuk rincian kurs valas dan nomor list batch terkait, user dapat melihat pada halaman validasi detail di belakang dialog ini.</span>
                  </div>
                </div>
              )}

              {/* TAB 5: EKSPEDISI INDO (tbExpIndo) */}
              {activeTab === 'transport' && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                        <Truck size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--color-primary)]">
                          Data Ekspedisi Lokal
                        </h4>
                        <span className="text-[10px] text-[var(--color-secondary)]">
                          Nominal Dicek: <strong className="font-mono text-[var(--color-primary)]">{formatCurrency(effectiveTransportAmount)}</strong>
                        </span>
                      </div>
                    </div>
                    {transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {transportValidation.expedisiList.length} Data
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold border bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Belum Tercatat
                      </span>
                    )}
                  </div>

                  {/* Warning Box jika ada ekspedisi Harus Tagih namun item tagihan tidak ada */}
                  {hasUnbilledTransport && (
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs flex items-start gap-3 shadow-2xs">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle size={15} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-bold text-amber-900 dark:text-amber-200">
                          Peringatan: Biaya Ekspedisi (Harus Tagih) Belum Ditagihkan ke Invoice Ini!
                        </h4>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                          Ditemukan {unbilledExpedisiList.length} data ekspedisi Harus Tagih (fdPaid: 1) di <code className="font-mono px-1 rounded bg-amber-500/20">tbExpIndo</code> senilai total <strong className="font-mono font-bold text-amber-950 dark:text-amber-100">{formatCurrency(totalUnbilledTransportAmount)}</strong> untuk pengiriman ini, tetapi belum ada item tagihan Transport / Ongkir pada rincian tagihan customer.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Info Box jika ada ekspedisi COD (Bayar di Tujuan) dan belum ada item transport */}
                  {!hasTransportItem && codExpedisiList.length > 0 && !hasUnbilledTransport && (
                    <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs flex items-start gap-3 shadow-2xs">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Truck size={15} />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-bold text-sky-900 dark:text-sky-200">
                          Ekspedisi Berstatus COD (Bayar di Tujuan) — Tidak Perlu Ditagihkan
                        </h4>
                        <p className="text-[11px] text-sky-800/90 dark:text-sky-300 leading-relaxed">
                          Ditemukan {codExpedisiList.length} catatan ekspedisi di <code className="font-mono px-1 rounded bg-sky-500/20">tbExpIndo</code> dengan status COD (<span className="font-semibold">fdPaid = 2</span>). Biaya ekspedisi dibayarkan langsung oleh penerima saat serah terima barang, sehingga aman dan tidak perlu dimasukkan ke dalam tagihan customer.
                        </p>
                      </div>
                    </div>
                  )}

                  {transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                    <div className="space-y-2">
                      {transportValidation.expedisiList.map((exp) => {
                        const isAmountMatch = Math.abs(Number(exp.fdTotalExp || 0) - effectiveTransportAmount) < 0.01 && exp.fdTotalExp > 0
                        return (
                          <div
                            key={exp.fdId}
                            className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${isAmountMatch
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-[var(--color-border)]/70 bg-[var(--color-neutral)]/20'
                              }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[var(--color-primary)] text-sm">
                                  {exp.fdExpName || 'Ekspedisi (Tanpa Nama)'}
                                </span>
                                {exp.fdPaid === 1 ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                    Harus Tagih
                                  </span>
                                ) : exp.fdPaid === 2 ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                    COD (Bayar Tujuan)
                                  </span>
                                ) : null}
                                {isAmountMatch ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                    ✓ Nominal Cocok
                                  </span>
                                ) : Number(exp.fdTotalExp || 0) <= 0 ? (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                    Biaya Rp 0 (Tidak Valid / Belum Terisi)
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[11px] text-[var(--color-secondary)]">
                                No. Resi: <strong className="font-mono text-[var(--color-primary)]">{exp.fdResiExp || '—'}</strong>
                                {exp.fdListCode && <> · List: <span className="font-mono text-[var(--color-primary)]">{exp.fdListCode}</span></>}
                                {exp.fdJmlBerat && <> · Berat: <span className="font-mono text-[var(--color-primary)]">{exp.fdJmlBerat} kg</span></>}
                                {exp.fdCreatedDate && <> · Tanggal: <span>{formatDate(exp.fdCreatedDate)}</span></>}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Biaya Ekspedisi</span>
                              <span className="font-mono font-bold text-sm text-[var(--color-primary)]">
                                {formatCurrency(exp.fdTotalExp)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-center space-y-1">
                      <p className="text-xs font-semibold text-[var(--color-primary)]">
                        Belum Ditemukan Catatan Ekspedisi Lokal (tbExpIndo)
                      </p>
                      <p className="text-[11px] text-[var(--color-secondary)] max-w-md mx-auto">
                        Belum ada data biaya ekspedisi lokal tercatat untuk List Code ({billingData.fdListCode || '—'}) ataupun Customer ({billingData.customer?.fdCustName || billingData.fdCustCode}) & Marking ({billingData.fdMarkingCode || '—'}).
                      </p>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/70 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                    <Info size={13} className="text-[var(--color-tertiary)] shrink-0" />
                    <span>Data di atas disinkronkan secara langsung dari tabel <code className="font-mono text-[10px] bg-[var(--color-neutral)] px-1 rounded">tbExpIndo</code> join <code className="font-mono text-[10px] bg-[var(--color-neutral)] px-1 rounded">tbExpedisi</code>.</span>
                  </div>
                </div>
              )}

              {/* 4. Total Tagihan Summary Box */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] flex items-center justify-between gap-3 shadow-2xs">
                <div className="text-xs space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider block">
                    TOTAL NILAI TAGIHAN
                  </span>
                  <span className="text-xs text-[var(--color-secondary)] font-medium">
                    {details.length} baris item tagihan
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg sm:text-xl font-bold font-mono text-[var(--color-primary)]">
                    {formatWithCurrency(totalAmount, currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-[var(--color-secondary)] hidden sm:inline-block">
            Tekan <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded shadow-2xs">ESC</kbd> untuk menutup
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto ml-auto">
            {Number(billingData.fdGive) !== 1 && onOpenIssueModal && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenIssueModal()
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Terbitkan invoice menjadi status Issued"
              >
                <Send size={13} />
                <span>Terbitkan Invoice</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-1.5 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] border border-[var(--color-border)] text-[var(--color-primary)] text-xs font-semibold shadow-xs transition-all cursor-pointer text-center justify-center flex items-center"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
