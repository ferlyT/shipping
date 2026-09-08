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
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { billingApi } from '../services/billing.service'
import { formatDate, formatDecimal, formatNumber, formatCurrency, calculateOverweight } from '@/lib/utils'
import { evaluateItemPrice, isMktCustomer, type PriceEvaluationContext } from '../utils/billing.utils'
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
  } | null
  comodityTypes?: ComodityType[]
}

export type ValidationModalTab = 'summary'

interface BillingValidationSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
  billingData: Billing
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

export type SummaryModalTab = 'items' | 'm3_weight' | 'overweight' | 'freight'

export function BillingValidationSummaryModal({
  isOpen,
  onClose,
  billingData,
  validationData: res,
  isLoadingValidation = false,
  billedM3,
  billedKg = 0,
  billType: billTypeProp,
  onOpenIssueModal,
}: BillingValidationSummaryModalProps) {
  const [activeTab, setActiveTab] = useState<SummaryModalTab>('items')
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
  const transportBillAmount = Number(billingData.fdJumlah2 || 0) > 0 ? Number(billingData.fdJumlah2) : Number(billingData.fdJumlah1 || 0)

  const { data: transportValidation, isLoading: isLoadingTransport } = useQuery({
    queryKey: ['billingTransportCheck', billingData.fdInvNo, billingData.fdCustCode, billingData.fdMarkingCode, billingData.fdMarkingNo, billingData.fdListCode, transportBillAmount],
    queryFn: async () => {
      if (!isTransport || !billingData.fdCustCode || !billingData.fdMarkingCode) return null
      const response = await billingApi.transportCheck({
        invNo: billingData.fdInvNo,
        custCode: billingData.fdCustCode,
        markingCode: billingData.fdMarkingCode,
        markingNo: billingData.fdMarkingNo || '',
        listCode: billingData.fdListCode || '',
        amount: transportBillAmount,
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
    enabled: isOpen && isTransport && !!billingData.fdCustCode && !!billingData.fdMarkingCode,
    staleTime: 60000,
  })

  const isAir = res?.fdListType === 1 || res?.expectedMode === 'BY AIR'
  const details = [...(billingData?.details || [])].sort((a, b) => String(a?.fdID ?? '').localeCompare(String(b?.fdID ?? '')))

  // 1. Qty Parsing & Validation
  const parseQty = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const n = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(n) ? null : n
  }

  const rawUnified = res?.m3PackingList?.raw?.[0] || res?.m3ListBatch?.raw?.[0] || {}
  const qtyList = res?.fdQtyList ?? res?.m3ListBatch?.qty ?? parseQty(rawUnified.fdQtyList ?? rawUnified.qtyList)
  const qtyPL = res?.fdTotalQtyPL ?? res?.m3PackingList?.qty ?? parseQty(rawUnified.fdTotalQtyPL ?? rawUnified.fdTtoalQtyPL ?? rawUnified.fdQtyPL)
  const qtyGudang = res?.fdTotalQtyGudang ?? res?.m3Gudang?.qty ?? parseQty(rawUnified.fdTotalQtyGudang ?? rawUnified.fdQtyGudang)
  const qtyKomplain = res?.fdTotalQtyKomplain ?? res?.m3Komplain?.qty ?? parseQty(rawUnified.fdTotalQtyKomplain ?? rawUnified.fdQtyKomplain)

  const activeQtys: { key: string; label: string; val: number }[] = []
  if (qtyList !== null) activeQtys.push({ key: 'ListBatch', label: 'EntryList', val: qtyList })
  if (qtyPL !== null) activeQtys.push({ key: 'PL', label: 'Packing List', val: qtyPL })
  if (qtyGudang !== null) activeQtys.push({ key: 'Gudang', label: 'Gudang', val: qtyGudang })
  if (qtyKomplain !== null && qtyKomplain > 0) {
    activeQtys.push({ key: 'Komplain', label: 'Komplain', val: qtyKomplain })
  }

  const distinctQtyVals = Array.from(new Set(activeQtys.map((q) => q.val)))
  const hasQtyMismatch = activeQtys.length > 1 && distinctQtyVals.length > 1

  // 2. Volume / Weight Match Calculation
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)
  const effectiveBilledKg = billedKg > 0 ? billedKg : 0
  const beratList = res?.fdBeratList ?? 0
  const beratKomplain = res?.fdJmlBeratKomplain ?? 0
  const beratSJ = res?.totalJmlBeratSJ ?? 0
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0
    ? res.profileHarga.minChargeKg
    : (res?.minChargeKg ?? 3)

  const plValues = res?.m3PackingList?.values || []
  const gudangValues = res?.m3Gudang?.values || []
  const komplainValues = res?.m3Komplain?.values || []
  const listBatchValues = res?.m3ListBatch?.values || []
  const custMarkingValues = res?.m3CustPerMarking?.values || []
  const komplainPerMarkingValues = res?.m3KomplainPerMarking?.values || []
  const plPerMarkingValues = res?.m3PLPerMarking?.values || []

  const isGabungan = billType === BILL_TYPES.GABUNGAN

  const airCandidates: { sourceKey: string; sourceName: string; val: number }[] = [
    ...(beratKomplain > 0 ? [{ sourceKey: 'Komplain', sourceName: 'Berat Komplain', val: beratKomplain }] : []),
    ...(beratSJ > 0 ? [{ sourceKey: 'SJ', sourceName: 'Berat Surat Jalan', val: beratSJ }] : []),
    { sourceKey: 'EntryList', sourceName: 'Berat EntryList', val: beratList },
    ...(minChargeKg > 0 ? [{ sourceKey: 'MinCharge', sourceName: `Min. Charge (${formatDecimal(minChargeKg, 2)} kg)`, val: minChargeKg }] : []),
  ]

  const airPrimaryMatch = isAir ? airCandidates.find((c) => Math.abs(c.val - effectiveBilledKg) < 0.01) : null

  const hasValidPlQty = qtyPL !== null && qtyPL > 0
  const isHybridActive = Boolean(res?.isPartialKomplain && res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0)

  const seaCandidates: { sourceKey: string; sourceName: string; val: number }[] = [
    ...(hasValidPlQty ? plValues.map((v) => ({ sourceKey: 'PL', sourceName: 'Packing List', val: normM3(v) })) : []),
    ...gudangValues.map((v) => ({ sourceKey: 'Gudang', sourceName: 'Gudang', val: normM3(v) })),
    ...komplainValues.map((v) => ({ sourceKey: 'Komplain', sourceName: 'Komplain', val: normM3(v) })),
    ...plPerMarkingValues.map((v) => ({ sourceKey: 'PLPerMarking', sourceName: 'Packing List (Per Marking)', val: normM3(v) })),
    ...komplainPerMarkingValues.map((v) => ({ sourceKey: 'KomplainPerMarking', sourceName: 'M3 Komplain Per Marking', val: normM3(v) })),
    ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: 'List Batch', val: normM3(v) })),
    ...(isHybridActive ? [{ sourceKey: 'KomplainHybrid', sourceName: `Komplain Parsial + Gudang (${res?.countKomplainLC ?? 0} LC Komplain + ${res?.countGudangLC ?? 0} LC Gudang)`, val: normM3(res!.m3KomplainPlusGudang!) }] : []),
  ]

  // Approved Komplain Logic (Disetujui HANYA JIKA Qty Cocok Persis)
  // Aturan Mutlak: isFullKomplainQtyMatch -> false maka ukuran komplain tidak bisa diterima
  const rawKomplainM3 = isGabungan
    ? (komplainPerMarkingValues[0] ?? komplainValues[0] ?? null)
    : (komplainValues[0] ?? komplainPerMarkingValues[0] ?? null)

  const effectiveQtyKomplain = isGabungan
    ? parseQty(res?.m3KomplainPerMarking?.raw?.[0]?.QtyKomplainPerMarking) ?? qtyKomplain
    : qtyKomplain

  const effectiveQtyList = isGabungan
    ? parseQty(res?.m3KomplainPerMarking?.raw?.[0]?.TotalJmlPackSJ) ?? parseQty(res?.totalEntryList) ?? qtyList
    : qtyList

  const hasKomplainM3 = rawKomplainM3 !== null && rawKomplainM3 > 0
  const isFullKomplainQtyMatch = Boolean(
    hasKomplainM3 &&
    effectiveQtyKomplain !== null &&
    effectiveQtyList !== null &&
    effectiveQtyKomplain > 0 &&
    effectiveQtyKomplain === effectiveQtyList
  )
  const isApprovedKomplainActive = res?.hasApprovedKomplain ?? (hasKomplainM3 && isFullKomplainQtyMatch)
  const isKomplainRejected = res?.isKomplainRejected ?? (hasKomplainM3 && !isFullKomplainQtyMatch)
  const targetKomplainM3 = isApprovedKomplainActive && rawKomplainM3 !== null ? normM3(rawKomplainM3) : null

  const isBilledMatchedApprovedKomplain = !isAir && isApprovedKomplainActive && targetKomplainM3 !== null && Math.abs(targetKomplainM3 - billedM3) < 0.001
  const isBilledMismatchedApprovedKomplain = !isAir && isApprovedKomplainActive && targetKomplainM3 !== null && !isBilledMatchedApprovedKomplain
  const isBilledUsingRejectedKomplain = !isAir && isKomplainRejected && rawKomplainM3 !== null && Math.abs(normM3(rawKomplainM3) - billedM3) < 0.001

  const seaPrimaryMatch = !isAir ? seaCandidates.find((c) => Math.abs(c.val - billedM3) < 0.001) : null
  const seaMarkingMatch = !isAir && !seaPrimaryMatch && custMarkingValues.length > 0 && Math.abs(normM3(custMarkingValues[0]) - billedM3) < 0.001

  let isMatch = false
  let matchLabel = ''
  if (isAir) {
    isMatch = Boolean(airPrimaryMatch)
    matchLabel = airPrimaryMatch?.sourceName || (effectiveBilledKg === 0 ? 'Tagihan Berat Belum Diisi' : 'Selisih Berat')
  } else {
    isMatch = Boolean(seaPrimaryMatch || seaMarkingMatch)
    if (isBilledMatchedApprovedKomplain) {
      matchLabel = isGabungan ? 'M3 Komplain Per Marking' : 'Ukuran Komplain'
    } else {
      matchLabel = seaPrimaryMatch?.sourceName || (seaMarkingMatch ? 'M3 Per Marking' : 'Selisih Kubikasi (M3)')
    }
  }

  // 3. Overweight & Rasio Berat Validation
  const rasio = res?.profileHarga?.rasio ?? 0
  const actualWeightGudang = res?.fdJmlBeratGudang ?? 0
  const actualWeightList = res?.fdBeratList ?? 0
  const actualWeightKomplain = res?.fdJmlBeratKomplain ?? 0
  const actualWeightSJ = res?.totalJmlBeratSJ ?? 0
  const totalBeratPerMarking = res?.totalBeratPerMarking ?? 0

  const actualWeightKg = isGabungan
    ? (totalBeratPerMarking > 0 ? totalBeratPerMarking : (actualWeightSJ > 0 ? actualWeightSJ : (actualWeightGudang || actualWeightList)))
    : actualWeightKomplain > 0
    ? actualWeightKomplain
    : actualWeightGudang > 0
    ? actualWeightGudang
    : actualWeightList > 0
    ? actualWeightList
    : actualWeightSJ

  const refM3 = billedM3 > 0 ? billedM3 : (targetKomplainM3 ?? gudangValues[0] ?? plValues[0] ?? res?.recommendedM3 ?? 0)
  const maxAllowedWeight = !isAir && rasio > 0 && refM3 > 0 ? refM3 * rasio : 0
  const overweightKg = !isAir && rasio > 0 && refM3 > 0 && actualWeightKg > 0 ? calculateOverweight(actualWeightKg, refM3, rasio) : 0
  const isOverweight = overweightKg > 0
  const isBilledOverweightExactMatch = isOverweight && effectiveBilledKg > 0 && Math.abs(effectiveBilledKg - overweightKg) < 0.01
  const isBilledOverweightTolerated = isOverweight && effectiveBilledKg > 0 && !isBilledOverweightExactMatch && Math.abs(effectiveBilledKg - overweightKg) <= 1
  const isBilledOverweightMatch = isOverweight && effectiveBilledKg > 0 && (isBilledOverweightExactMatch || isBilledOverweightTolerated)
  const isBilledUnneededOverweight = !isOverweight && effectiveBilledKg > 0
  const overweightDiff = effectiveBilledKg > 0 ? effectiveBilledKg - overweightKg : null

  // Bill-level Commodity Category
  const defaultTypeId = res?.defaultFdTypeComodity ?? res?.markingComodityType ?? null
  const defaultMatchType = res?.comodityTypes?.find(
    (c) => c.fdTypeComodity === defaultTypeId && (res?.fdListType ? c.fdListType === res.fdListType : true)
  )
  const defaultComodityName = defaultMatchType ? defaultMatchType.fdComodityName : (defaultTypeId ? `Kategori ${defaultTypeId}` : '—')

  const priceEvaluationCtx: PriceEvaluationContext = {
    res,
    isAir,
    defaultTypeId,
    defaultComodityName,
  }

  // Evaluasi harga seluruh item invoice
  const evaluatedDetails = details.map((item) => ({
    item,
    ...evaluateItemPrice(item, priceEvaluationCtx),
  }))

  const itemsWithTarget = evaluatedDetails.filter((e) => e.hasTargetPrice)
  const underchargedItems = itemsWithTarget.filter((e) => e.statusType === 'LOWER')
  const overchargedItems = itemsWithTarget.filter((e) => e.statusType === 'HIGHER')
  const hasUnderchargePrice = underchargedItems.length > 0
  const hasOverchargePrice = overchargedItems.length > 0
  const hasPriceDiscrepancy = hasUnderchargePrice
  const allPricesValid = itemsWithTarget.length > 0 && itemsWithTarget.every((e) => e.isMatched || e.statusType === 'HIGHER')
  const firstUndercharge = underchargedItems[0]
  const firstOvercharge = overchargedItems[0]

  const isCodOrUrgent = res?.isCodOrUrgent
  const recommendedM3 = res?.recommendedM3 ?? 0
  const isCodUrgentShortfall = !isAir && isCodOrUrgent && !isApprovedKomplainActive && recommendedM3 > billedM3 + 0.001

  // Final summary status badge
  const isPhysicalValid = isMatch && !hasQtyMismatch && !isCodUrgentShortfall && !isBilledMismatchedApprovedKomplain && (!isOverweight || isBilledOverweightExactMatch) && !isBilledUnneededOverweight
  const isAllValid = isPhysicalValid && allPricesValid
  const hasWarning = !isAllValid && (
    hasUnderchargePrice ||
    isCodUrgentShortfall ||
    isBilledMismatchedApprovedKomplain ||
    (isMatch && hasQtyMismatch) ||
    isBilledOverweightTolerated ||
    isBilledUnneededOverweight ||
    (isOverweight && !isBilledOverweightMatch)
  )

  // Keterangan spesifik Undercharge & Overcharge
  const underchargeSummary = underchargedItems
    .map((u) => `${u.item.fdItemName || u.comodityName} (${formatCurrency(u.item.fdItemPrice)} < Acuan ${formatCurrency(u.minTargetPrice || 0)})`)
    .join(', ')

  const overchargeSummary = overchargedItems
    .map((o) => `${o.item.fdItemName || o.comodityName} (${formatCurrency(o.item.fdItemPrice)} > Acuan ${formatCurrency(o.maxTargetPrice || 0)})`)
    .join(', ')

  let verdictTitle = ''
  let verdictDescription = ''

  if (isAllValid) {
    if (isBilledMatchedApprovedKomplain) {
      verdictTitle = `Tagihan Sesuai dengan Ukuran Komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³)`
      verdictDescription = `Tagihan telah divalidasi tepat menggunakan ukuran komplain fisik (Qty cocok ${effectiveQtyKomplain}/${effectiveQtyList} coly).`
    } else if (hasOverchargePrice) {
      verdictTitle = `Data Fisik Sesuai & Tarif Valid (Overcharge: ${overchargedItems.map((o) => o.comodityName || o.item.fdItemName).join(', ')})`
      verdictDescription = `Seluruh data volume/berat valid. Ditemukan tarif di atas acuan ${firstOvercharge?.targetColName || 'Price List'} (${overchargeSummary}).`
    } else {
      verdictTitle = 'Tagihan Sesuai dengan Data Fisik & Acuan Price List'
      verdictDescription = 'Seluruh data kubikasi/timbangan dan tarif telah diverifikasi valid terhadap data operasional.'
    }
  } else if (hasUnderchargePrice) {
    verdictTitle = `Ditemukan Tarif di Bawah Acuan (Undercharge: ${underchargedItems.map((u) => u.comodityName || u.item.fdItemName).join(', ')})`
    verdictDescription = `Ditemukan harga satuan di bawah acuan ${firstUndercharge?.targetColName || 'Price List'} pada: ${underchargeSummary}.`
  } else if (hasOverchargePrice) {
    verdictTitle = `Ditemukan Tarif di Atas Acuan (Overcharge: ${overchargedItems.map((o) => o.comodityName || o.item.fdItemName).join(', ')})`
    verdictDescription = `Harga satuan berada di atas acuan ${firstOvercharge?.targetColName || 'Price List'} pada: ${overchargeSummary}.`
  } else if (isBilledUsingRejectedKomplain) {
    verdictTitle = `Ukuran Komplain Ditolak (Qty ${qtyKomplain ?? 0}/${qtyList ?? 0} Coly Tidak Cocok)`
    verdictDescription = `Ukuran komplain (${formatDecimal(normM3(rawKomplainM3 ?? 0), 4)} m³) tidak dapat diterima karena Qty komplain (${effectiveQtyKomplain ?? 0} coly) tidak sama dengan Qty EntryList (${effectiveQtyList ?? 0} coly). Tagihan harus menggunakan ukuran operasional (Gudang/PL).`
  } else if (isBilledMismatchedApprovedKomplain) {
    verdictTitle = `Terdapat Ukuran Komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³), Tagihan Masih Menggunakan ${matchLabel}`
    verdictDescription = `Ukuran komplain (${formatDecimal(targetKomplainM3 ?? 0, 4)} m³, Qty ${effectiveQtyKomplain}/${effectiveQtyList} coly cocok) telah disetujui. Tagihan saat ini masih ditagihkan ${formatDecimal(billedM3, 4)} m³ (${matchLabel}). Disarankan tagihan direvisi ke ukuran komplain.`
  } else if (!isMatch) {
    verdictTitle = isAir ? 'Selisih Berat Tagihan dengan Data Timbangan' : 'Selisih Kubikasi (M3) Tagihan dengan Data Operasional'
    verdictDescription = isAir
      ? effectiveBilledKg === 0
        ? `Tagihan berat belum diisi (0 kg). Berat Real EntryList adalah ${formatDecimal(beratList, 2)} kg${minChargeKg > 0 ? ` (Min. Charge: ${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
        : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) tidak cocok dengan Berat Real (${formatDecimal(beratList, 2)} kg)${minChargeKg > 0 ? ` maupun Min. Charge (${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
      : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) tidak cocok dengan data dokumen operasional mana pun.`
  } else if (hasQtyMismatch) {
    verdictTitle = 'Terdapat Selisih Jumlah Koli (Qty Mismatch)'
    verdictDescription = `Terdapat perbedaan jumlah Qty koli antara ${activeQtys.map((q) => `${q.label} (${formatNumber(q.val)})`).join(', ')}. Harap periksa dokumen operasional.`
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
    verdictTitle = 'Ditemukan Selisih Antara Tagihan dan Data Operasional'
    verdictDescription = 'Terdapat ketidaksesuaian nilai tagihan dengan acuan operasional atau price list.'
  }

  // Otomatis aktifkan tab yang bermasalah saat modal dibuka / data validasi dimuat
  useEffect(() => {
    if (!isOpen) {
      hasAutoSelectedRef.current = null
      return
    }

    if (res && hasAutoSelectedRef.current !== String(billingData.fdInvNo)) {
      let targetTab: SummaryModalTab = 'items'

      // Prioritas 1: Masalah tarif pada Item Billing
      if (hasUnderchargePrice) {
        targetTab = 'items'
      // Prioritas 2: Masalah kubikasi M3 / timbangan fisik / koli
      } else if (!isMatch || hasQtyMismatch || isCodUrgentShortfall || isBilledUsingRejectedKomplain || isBilledMismatchedApprovedKomplain) {
        targetTab = 'm3_weight'
      // Prioritas 3: Masalah overweight & rasio (jalur laut)
      } else if (!isAir && ((isOverweight && !isBilledOverweightExactMatch) || isBilledUnneededOverweight)) {
        targetTab = 'overweight'
      // Prioritas 4: Biaya freight charge valas
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
    billingData.fdInvNo,
    res,
    hasUnderchargePrice,
    isMatch,
    hasQtyMismatch,
    isCodUrgentShortfall,
    isBilledUsingRejectedKomplain,
    isBilledMismatchedApprovedKomplain,
    isAir,
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledUnneededOverweight,
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
        className="relative w-full max-w-3xl sm:max-w-4xl flex flex-col rounded-2xl sm:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-fadeIn max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 shrink-0 space-y-2.5">
          {/* Top Row: Title + Status + Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isAllValid
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

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer shrink-0"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
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
                className={`p-4 sm:p-4.5 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
                  transportValidation?.hasDuplicate
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    transportValidation?.hasDuplicate ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
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
                    <span>Data Ekspedisi Indo (tbExpIndo):</span>
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
                          className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                            isAmountMatch
                              ? 'border-emerald-500/40 bg-emerald-500/5'
                              : 'border-[var(--color-border)]/70 bg-[var(--color-neutral)]/20'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[var(--color-primary)] text-sm">
                                {exp.fdExpName || 'Ekspedisi (Tanpa Nama)'}
                              </span>
                              {isAmountMatch && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  ✓ Nominal Cocok
                                </span>
                              )}
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
                className={`p-4 sm:p-4.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isAllValid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : hasWarning
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    isAllValid
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
                </div>
              </div>

              {/* 2. Tab Navigasi Modal */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    activeTab === 'items'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    activeTab === 'm3_weight'
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                      : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Box size={13} />
                  <span>{isAir ? 'Timbangan Fisik' : 'Validasi M3'}</span>
                  {isMatch ? (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      ✓ Sesuai
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                      Selisih
                    </span>
                  )}
                </button>

                {!isAir && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('overweight')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                      activeTab === 'overweight'
                        ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-primary)] shadow-2xs font-bold'
                        : 'border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                    }`}
                  >
                    <Scale size={13} />
                    <span>Overweight</span>
                    {isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight) ? (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        ✓ Aman
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border ${
                    activeTab === 'freight'
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
              </div>

              {/* 3. Tab Content - Kesimpulan Saja */}
              {/* TAB 1: ITEM BILLING & TARIF */}
              {activeTab === 'items' && (
                <div className="space-y-3 animate-fadeIn">
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

                  {/* Per-item card list */}
                  <div className="space-y-1.5">
                    {evaluatedDetails.map((evalRes, idx) => {
                      const item = evalRes.item
                      const billedPrice = Number(item?.fdItemPrice || 0)

                      const statusBadge = evalRes.isMatched ? (
                        <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                          <span>Match</span>
                        </Badge>
                      ) : evalRes.hasTargetPrice && (evalRes.isTaxReturnItem ? evalRes.profilePrice > 0 : evalRes.priceItem !== null) ? (
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
                              <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">Harga Profile</p>
                              <p className="font-mono text-[var(--color-secondary)]">
                                {evalRes.profilePrice > 0 ? formatCurrency(evalRes.profilePrice) : '—'}
                              </p>
                            </div>
                            <div className="px-2.5 py-1.5">
                              <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">Price List</p>
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

              {/* TAB 2: KUBIKASI M3 / BERAT FISIK */}
              {activeTab === 'm3_weight' && (
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
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      isMatch ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                    }`}>
                      {isMatch ? '✓ Dimensi Sesuai' : '⚠ Ditemukan Selisih'}
                    </span>
                  </div>

                  {/* Grid Metrik Dimensi */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border-2 border-[var(--color-primary)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Ditagihkan</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {isAir ? `${formatDecimal(effectiveBilledKg, 2)} kg` : `${formatDecimal(billedM3, 4)} m³`}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">Invoice Billed</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Timbangan Gudang</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {isAir ? `${formatDecimal(res?.fdBeratList || 0, 2)} kg` : gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">Gudang fisik</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Packing List</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {!isAir && plValues.length > 0 ? `${formatDecimal(plValues[0], 4)} m³` : '—'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">PL Supplier</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Komplain Fisik</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {targetKomplainM3 ? `${formatDecimal(targetKomplainM3, 4)} m³` : 'Tidak Ada'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                        {isApprovedKomplainActive ? 'Disetujui' : 'Nihil'}
                      </span>
                    </div>
                  </div>

                  {/* Qty Coly Status */}
                  <div className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs flex items-center justify-between gap-2">
                    <span className="text-[var(--color-secondary)]">Kesesuaian Jumlah Koli:</span>
                    <span className={`font-bold ${hasQtyMismatch ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {hasQtyMismatch ? `⚠ Terdapat Selisih Qty Coly (${activeQtys.map((q) => `${q.label}: ${q.val}`).join(', ')})` : '✓ Qty Koli Sama Antar Dokumen'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--color-neutral)]/70 text-[11px] text-[var(--color-secondary)] flex items-center gap-2">
                    <Info size={13} className="text-[var(--color-tertiary)] shrink-0" />
                    <span>Untuk melihat rincian ukuran per resi atau persebaran koli, user dapat melihat pada halaman validasi detail di belakang dialog ini.</span>
                  </div>
                </div>
              )}

              {/* TAB 3: OVERWEIGHT & RASIO (JALUR LAUT) */}
              {activeTab === 'overweight' && !isAir && (
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
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight)
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
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Rasio Pelanggan</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">{formatNumber(rasio)} kg/m³</span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">Batas berat per m³</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Batas Kuota Berat</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {maxAllowedWeight > 0 ? `${formatDecimal(maxAllowedWeight, 2)} kg` : '—'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">{formatDecimal(refM3, 4)} m³ × {rasio}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Berat Aktual Fisik</span>
                      <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                        {actualWeightKg > 0 ? `${formatDecimal(actualWeightKg, 2)} kg` : '—'}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">Timbangan riil</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">
                        {isOverweight ? 'Kelebihan Berat' : 'Sisa Kuota Berat'}
                      </span>
                      <span className={`text-base font-bold font-mono block ${isOverweight ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isOverweight ? `+${formatNumber(overweightKg)} kg` : `${formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg`}
                      </span>
                      <span className="text-[10px] text-[var(--color-secondary)] block truncate">
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
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      res?.freightChargeSummary?.totalFc ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
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
                    {currency} {Number(totalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
