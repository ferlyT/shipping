import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, AlertTriangle, Info, X, RefreshCw } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDecimal, displayCustName } from '@/lib/utils'
import { evaluateItemPrice } from '../utils/billing.utils'
import { useOverweightValidation } from '../hooks/useOverweightValidation'
import { PriceListDetailModal } from './PriceListDetailModal'
import { CustMarkingDetailModal } from './CustMarkingDetailModal'
import { DimensionDetailModal, type DimensionSourceKey } from './DimensionDetailModal'
import { BILL_TYPES } from '../constants/billing.constants'

import {
  ValidationCardHeader,
  ValidationCardTabsBar,
  ProfilePricingTab,
  PhysicalValidationTab,
  OverweightTab,
  FreightChargeTab,
  TransportTab,
} from './validation-card'

import type {
  ValidationCardTab,
  InvoiceDetail,
  BillingValidationCardProps,
  MarkingDetailItem,
  ValidationCardDerivedProps,
  M3CheckResponse,
} from './validation-card/types'

export type {
  ValidationCardTab,
  InvoiceDetail,
  BillingValidationCardProps,
  MarkingDetailItem,
  M3CheckResponse,
}

export function BillingValidationCard({
  listCode,
  validation,
  validationData: validationDataProp,
  billedM3,
  billedKg = 0,
  billedVfc = 0,
  invoiceDetails = [],
  billFdTypeComodity,
  billType,
  markingCode,
  invoiceNo,
  branchCode,
  customerName: customerNameProp,
  custCode: custCodeProp,
  onOpenAuditModal,
  activeTab: activeTabProp,
  onTabChange,
}: BillingValidationCardProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCustMarkingModalOpen, setIsCustMarkingModalOpen] = useState(false)
  const [isDimensionModalOpen, setIsDimensionModalOpen] = useState(false)
  const [dimensionInitialSource, setDimensionInitialSource] = useState<DimensionSourceKey>('entryList')
  const [internalSelectedTab, setInternalSelectedTab] = useState<ValidationCardTab | null>(null)
  const userSelectedTab = activeTabProp !== undefined ? activeTabProp : internalSelectedTab
  const setUserSelectedTab = (tab: ValidationCardTab) => {
    setInternalSelectedTab(tab)
    onTabChange?.(tab)
  }
  const [selectedNoteMode, setSelectedNoteMode] = useState<'air' | 'sea' | null>(null)

  const { data: internalRes, isLoading: isInternalLoading, isError: isInternalError, refetch, isFetching } = useQuery({
    queryKey: ['billingM3Check', listCode],
    queryFn: async () => {
      const response = await billingApi.m3Check(listCode)
      return response.data?.data as M3CheckResponse
    },
    enabled: !validation && !validationDataProp && !!listCode,
    staleTime: 60000,
  })

  const res = validationDataProp ?? internalRes
  const isLoading = !validation && isInternalLoading && !res
  const isError = !validation && isInternalError && !res

  // Bill-level Commodity Category (default from entryList join or marking)
  const defaultTypeId = validation
    ? validation.defaultTypeId
    : (billFdTypeComodity ?? res?.defaultFdTypeComodity ?? res?.markingComodityType ?? null)
  const defaultMatchType = res?.comodityTypes?.find(
    (c) => c.fdTypeComodity === defaultTypeId && (res?.fdListType ? c.fdListType === res.fdListType : true)
  )
  const defaultComodityName = validation
    ? validation.defaultComodityName
    : (defaultMatchType ? defaultMatchType.fdComodityName : (defaultTypeId ? `Kategori ${defaultTypeId}` : '—'))

  const isAir = validation ? validation.isAir : Boolean(res?.fdListType === 1 || res?.expectedMode === 'BY AIR')
  const effectiveNoteMode = selectedNoteMode ?? (isAir ? 'air' : 'sea')
  const isType2 = validation ? validation.isType2 : Boolean(res?.profileHarga?.typeTagihan === 2)
  const isGabungan = validation ? validation.isGabungan : billType === BILL_TYPES.GABUNGAN

  const { data: localType2Compare } = useQuery({
    queryKey: ['type2Compare', invoiceNo, listCode],
    queryFn: async () => {
      if (!invoiceNo) return null
      const response = await billingApi.type2CompareCheck({
        invNo: invoiceNo,
        listCode: listCode || undefined,
        markingCode: markingCode || undefined,
      })
      return response.data?.data as any
    },
    enabled: isType2 && !validation && !!invoiceNo,
    staleTime: 120000,
  })

  const isType2Discrepancy = validation
    ? validation.isType2Discrepancy
    : Boolean(
      localType2Compare &&
      (localType2Compare.validationStatus === 'OVERCHARGE' || localType2Compare.validationStatus === 'UNDERCHARGE')
    )

  const plValues = res?.m3PackingList?.values || []
  const gudangValues = res?.m3Gudang?.values || []
  const komplainValues = res?.m3Komplain?.values || []
  const komplainPerMarkingValues = res?.m3KomplainPerMarking?.values || []
  const custMarkingValues = res?.m3CustPerMarking?.values || []
  const plPerMarkingValues = res?.m3PLPerMarking?.values || []
  const listBatchValues = res?.m3ListBatch?.values || []

  // Extract Qty and fdSatuan from backend response
  const parseQty = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const n = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(n) ? null : n
  }

  const rawUnified = res?.m3PackingList?.raw?.[0] || res?.m3ListBatch?.raw?.[0] || {}
  const qtyList = validation ? validation.qtyList : (res?.fdQtyList ?? res?.m3ListBatch?.qty ?? parseQty(rawUnified.fdQtyList ?? rawUnified.qtyList))
  const qtyPL = validation ? validation.qtyPL : (res?.fdTotalQtyPL ?? res?.m3PackingList?.qty ?? parseQty(rawUnified.fdTotalQtyPL ?? rawUnified.fdTtoalQtyPL ?? rawUnified.fdQtyPL))
  const qtyGudang = validation ? validation.qtyGudang : (res?.fdTotalQtyGudang ?? res?.m3Gudang?.qty ?? parseQty(rawUnified.fdTotalQtyGudang ?? rawUnified.fdQtyGudang))
  const qtyKomplain = validation ? validation.qtyKomplain : (res?.fdTotalQtyKomplain ?? res?.m3Komplain?.qty ?? parseQty(rawUnified.fdTotalQtyKomplain ?? rawUnified.fdQtyKomplain))
  const totalEntryKomplain = validation ? validation.totalEntryKomplain : (res?.totalEntryKomplain ?? res?.m3KomplainPerMarking?.totalEntryKomplain ?? parseQty(rawUnified.TotalEntryKomplain ?? rawUnified.totalEntryKomplain ?? rawUnified.fdTotalEntryKomplain))
  const totalEntryList = validation ? validation.totalEntryList : (res?.totalEntryList ?? res?.m3CustPerMarking?.totalEntryList ?? parseQty(rawUnified.TotalEntryList ?? rawUnified.totalEntryList ?? rawUnified.fdTotalEntryList))
  const fdSatuan = validation ? validation.fdSatuan : ((res?.fdSatuan || rawUnified.fdSatuan || rawUnified.Satuan || '').trim())

  const activeQtys = validation ? validation.activeQtys : (() => {
    const list: { key: string; label: string; val: number }[] = []
    if (qtyList !== null) list.push({ key: 'ListBatch', label: t('billing.validation.listBatch') || 'EntryList', val: qtyList })
    if (qtyPL !== null) list.push({ key: 'PL', label: t('billing.validation.pl') || 'Packing List', val: qtyPL })
    if (qtyGudang !== null) list.push({ key: 'Gudang', label: t('billing.validation.gudang') || 'Gudang', val: qtyGudang })
    if (qtyKomplain !== null && qtyKomplain > 0) {
      list.push({ key: 'Komplain', label: t('billing.validation.komplain') || 'Komplain', val: qtyKomplain })
    }
    return list
  })()

  const hasQtyMismatch = validation ? validation.hasQtyMismatch : activeQtys.length > 1 && Array.from(new Set(activeQtys.map((q) => q.val))).length > 1
  const isQtyListDiff = validation ? validation.isQtyListDiff : (hasQtyMismatch && qtyList !== null && activeQtys.some((q) => q.key !== 'ListBatch' && q.val !== qtyList))
  const isQtyPLDiff = validation ? validation.isQtyPLDiff : (hasQtyMismatch && qtyPL !== null && activeQtys.some((q) => q.key !== 'PL' && q.val !== qtyPL))
  const isQtyGudangDiff = validation ? validation.isQtyGudangDiff : (hasQtyMismatch && qtyGudang !== null && activeQtys.some((q) => q.key !== 'Gudang' && q.val !== qtyGudang))
  const isQtyKomplainDiff = validation ? validation.isQtyKomplainDiff : (hasQtyMismatch && qtyKomplain !== null && activeQtys.some((q) => q.key !== 'Komplain' && q.val !== qtyKomplain))

  // Air Mode (By Air) Berat / Weight validation
  const effectiveBilledKg = validation ? validation.overweight.effectiveBilledKg : (billedKg !== undefined && billedKg > 0 ? billedKg : 0)
  const effectiveBilledVfc = validation ? validation.billedVfc : (billedVfc !== undefined && billedVfc > 0 ? billedVfc : 0)
  const beratMarking = validation?.beratMarking ?? ((res?.totalBeratPerMarking !== undefined && res?.totalBeratPerMarking !== null && Number(res.totalBeratPerMarking) > 0) ? Number(res.totalBeratPerMarking) : null)
  const beratList = validation ? validation.beratList : (
    isGabungan && beratMarking !== null
      ? beratMarking
      : (res?.fdBeratList ? Number(res.fdBeratList) : 0)
  )
  const beratSJ = validation ? validation.beratSJ : (isGabungan ? (res?.totalJmlBeratSJ ?? 0) : ((res?.fdBeratSJ && res.fdBeratSJ > 0) ? res.fdBeratSJ : (res?.totalJmlBeratSJ ?? 0)))
  const beratKomplain = validation ? validation.beratKomplain : (res?.fdJmlBeratKomplain ? Number(res.fdJmlBeratKomplain) : 0)
  const vfcGudang = res?.fdVFCGudang ?? 0
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0 ? res.profileHarga.minChargeKg : (res?.minChargeKg ?? 3)

  const activeWeights = validation ? validation.activeWeights : (() => {
    const list: { key: string; label: string; val: number }[] = []
    if (beratList > 0) list.push({ key: 'List', label: isGabungan ? 'Berat List (Marking)' : (t('billing.validation.weightList') || 'Berat List'), val: beratList })
    if (beratSJ > 0) list.push({ key: 'SJ', label: isGabungan ? 'Berat SJ (Marking)' : (t('billing.validation.weightSJ') || 'Berat Surat Jalan'), val: beratSJ })
    if (beratKomplain > 0) list.push({ key: 'Komplain', label: t('billing.validation.weightKomplain') || 'Berat Komplain', val: beratKomplain })
    return list
  })()

  const hasWeightMismatch = validation ? validation.hasWeightMismatch : (
    activeWeights.length > 1 && (
      (beratList > 0 && activeWeights.some((w) => w.key !== 'List' && Math.abs(w.val - beratList) > 0.1)) ||
      (beratSJ > 0 && activeWeights.some((w) => w.key !== 'SJ' && Math.abs(w.val - beratSJ) > 0.1)) ||
      (beratKomplain > 0 && activeWeights.some((w) => w.key !== 'Komplain' && Math.abs(w.val - beratKomplain) > 0.1))
    )
  )
  const isWeightListDiff = validation ? validation.isWeightListDiff : (hasWeightMismatch && beratList > 0 && activeWeights.some((w) => w.key !== 'List' && Math.abs(w.val - beratList) > 0.1))
  const isWeightSJDiff = validation ? validation.isWeightSJDiff : (hasWeightMismatch && beratSJ > 0 && activeWeights.some((w) => w.key !== 'SJ' && Math.abs(w.val - beratSJ) > 0.1))
  const isWeightKomplainDiff = validation ? validation.isWeightKomplainDiff : (hasWeightMismatch && beratKomplain > 0 && activeWeights.some((w) => w.key !== 'Komplain' && Math.abs(w.val - beratKomplain) > 0.1))

  const airCandidates = validation ? validation.airCandidates : [
    { sourceKey: 'EntryList', sourceName: 'Berat EntryList', val: beratList, rawVal: beratList },
    ...(beratKomplain > 0
      ? [{ sourceKey: 'Komplain', sourceName: 'Berat Komplain', val: beratKomplain, rawVal: beratKomplain }]
      : []),
    ...(beratSJ > 0
      ? [{ sourceKey: 'SJ', sourceName: 'Berat Surat Jalan', val: beratSJ, rawVal: beratSJ }]
      : []),
    ...(minChargeKg > 0
      ? [{ sourceKey: 'MinCharge', sourceName: `Min. Charge (${formatDecimal(minChargeKg, 2)} kg)`, val: minChargeKg, rawVal: minChargeKg }]
      : []),
  ]

  const airPrimaryMatch = validation ? validation.airPrimaryMatch : (isAir ? airCandidates.find((c) => Math.abs(c.val - effectiveBilledKg) < 0.01) : null)
  const isVfcMatched = effectiveBilledVfc > 0 && vfcGudang > 0 && Math.abs(vfcGudang - effectiveBilledVfc) < 0.01

  // Helper untuk aturan M3 minimal 0.1 m³
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

  // Check 1: Primary match against PL, Gudang, Komplain, List Batch, dan Komplain Parsial + Gudang (Sea)
  const primaryCandidates = validation ? validation.seaCandidates : [
    ...plValues.map((v) => ({ sourceKey: 'PL', sourceName: t('billing.validation.pl'), val: normM3(v), rawVal: v })),
    ...gudangValues.map((v) => ({ sourceKey: 'Gudang', sourceName: t('billing.validation.gudang'), val: normM3(v), rawVal: v })),
    ...komplainValues.map((v) => ({ sourceKey: 'Komplain', sourceName: t('billing.validation.komplain'), val: normM3(v), rawVal: v })),
    ...plPerMarkingValues.map((v) => ({ sourceKey: 'PLPerMarking', sourceName: `${t('billing.validation.pl')} (${t('billing.validation.perMarkingGroup') || 'Per Marking'})`, val: normM3(v), rawVal: v })),
    ...komplainPerMarkingValues.map((v) => ({ sourceKey: 'KomplainPerMarking', sourceName: t('billing.validation.komplainPerMarking') || 'M3 Komplain per Marking', val: normM3(v), rawVal: v })),
    ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: t('billing.validation.listBatch') || 'M3 List Batch', val: normM3(v), rawVal: v })),
  ]

  const seaPrimaryMatch = validation ? validation.seaPrimaryMatch : primaryCandidates.find((c) => Math.abs(c.val - billedM3) < 0.001)

  // Check 2: Secondary match against M3 per Marking jika tidak match di primary
  const rawMarkingVal = custMarkingValues.length > 0 ? custMarkingValues[0] : null
  const markingCandidate = custMarkingValues
    .map(normM3)
    .find((v) => Math.abs(v - billedM3) < 0.001)

  let matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH' = validation ? validation.matchStatus : 'NO_MATCH'
  let matchedSourceName = validation ? validation.matchedSourceName : ''
  let isMinChargeApplied = validation ? validation.isMinChargeApplied : false
  let matchedRawVal = 0

  if (!validation) {
    if (isType2) {
      if (!isType2Discrepancy) {
        matchStatus = 'MATCH_PRIMARY'
        matchedSourceName = localType2Compare?.overallWinner
          ? `Compare M3:KG (${localType2Compare.overallWinner})`
          : 'Compare M3:KG'
      } else {
        matchStatus = 'NO_MATCH'
        matchedSourceName = 'Compare M3:KG'
      }
    } else if (isAir) {
      if (airPrimaryMatch) {
        matchStatus = 'MATCH_PRIMARY'
        matchedSourceName = airPrimaryMatch.sourceName
        matchedRawVal = airPrimaryMatch.rawVal ?? airPrimaryMatch.val
        isMinChargeApplied = airPrimaryMatch.sourceKey === 'MinCharge'
      } else {
        matchStatus = 'NO_MATCH'
      }
    } else {
      if (seaPrimaryMatch) {
        matchStatus = 'MATCH_PRIMARY'
        matchedSourceName = seaPrimaryMatch.sourceName
        matchedRawVal = seaPrimaryMatch.rawVal ?? seaPrimaryMatch.val
        isMinChargeApplied = (seaPrimaryMatch.rawVal ?? 0) > 0 && (seaPrimaryMatch.rawVal ?? 0) < 0.1
      } else if (markingCandidate !== undefined) {
        matchStatus = 'MATCH_MARKING'
        matchedSourceName = t('billing.validation.custPerMarking')
        matchedRawVal = rawMarkingVal || 0
        isMinChargeApplied = matchedRawVal > 0 && matchedRawVal < 0.1
      }
    }
  }

  // Evaluasi Tagihan di Bawah Minimum Charge M3 (Laut)
  const effectiveMinChargeM3 = validation?.minChargeM3 ?? (
    (res?.profileHarga?.minChargeM3 && res.profileHarga.minChargeM3 > 0)
      ? res.profileHarga.minChargeM3
      : (res?.minChargeM3 && res.minChargeM3 > 0 ? res.minChargeM3 : 0.1)
  )
  const isBilledBelowMinM3 = validation?.isBilledBelowMinM3 ?? (
    !isAir && billedM3 > 0 && billedM3 < (effectiveMinChargeM3 - 0.0001)
  )

  const isCodOrUrgent = Boolean(res?.isCodOrUrgent)
  const recommendedM3 = res?.recommendedM3 ?? 0
  const isCodUrgentShortfall = validation ? validation.isCodUrgentShortfall : (!isAir && isCodOrUrgent && recommendedM3 > billedM3 + 0.001)

  // Overall status badge variant
  let badgeVariant: 'success' | 'info' | 'warning' | 'danger' = 'success'
  let StatusIcon = Check

  if (isType2) {
    if (isType2Discrepancy) {
      badgeVariant = 'warning'
      StatusIcon = AlertTriangle
    } else {
      badgeVariant = 'success'
      StatusIcon = Check
    }
  } else if (isCodUrgentShortfall) {
    badgeVariant = 'warning'
    StatusIcon = AlertTriangle
  } else if (isBilledBelowMinM3) {
    badgeVariant = 'warning'
    StatusIcon = AlertTriangle
  } else if (matchStatus === 'MATCH_PRIMARY') {
    badgeVariant = 'success'
    StatusIcon = Check
  } else if (matchStatus === 'MATCH_MARKING') {
    badgeVariant = 'info'
    StatusIcon = Info
  } else {
    badgeVariant = 'danger'
    StatusIcon = X
  }

  const type2Winner = (validation?.type2CompareData?.overallWinner || localType2Compare?.overallWinner || '').toUpperCase()

  const badgeText = isType2
    ? isType2Discrepancy
      ? 'SELISIH (COMPARE M3:KG)'
      : `COCOK (${type2Winner ? `BASIS ${type2Winner}` : 'M3:KG'})`
    : isAir
      ? matchStatus === 'MATCH_PRIMARY'
        ? isMinChargeApplied
          ? `COCOK (ATURAN MIN. CHARGE ${formatDecimal(minChargeKg, 2)} KG · Real: ${formatDecimal(beratList, 2)} kg)`
          : `COCOK (${matchedSourceName.toUpperCase()})`
        : effectiveBilledKg === 0
          ? 'TAGIHAN BERAT (0 KG) BELUM DIISI'
          : `SELISIH BERAT (${formatDecimal(effectiveBilledKg, 2)} kg ≠ Real: ${formatDecimal(beratList, 2)} kg)`
      : isCodUrgentShortfall
        ? t('billing.validation.statusCodUrgentWarning')
        : matchStatus === 'NO_MATCH'
          ? t('billing.validation.statusNoMatch')
          : isBilledBelowMinM3
            ? `DI BAWAH MIN. CHARGE (${formatDecimal(billedM3, 4)} m³ < ${formatDecimal(effectiveMinChargeM3, 3)} m³ · ${matchedSourceName || 'GUDANG'})`
            : isMinChargeApplied
              ? `COCOK (ATURAN MIN. ${formatDecimal(effectiveMinChargeM3, 3)} m³ · ${matchedSourceName})`
              : t('billing.validation.statusMatch', { source: matchedSourceName })

  const isMatch = validation ? validation.isMatch : (matchStatus === 'MATCH_PRIMARY' || matchStatus === 'MATCH_MARKING')

  // Overweight Calculations (Sea only) — via useOverweightValidation (single source of truth)
  const refM3Fallback = komplainValues[0] ?? gudangValues[0] ?? plValues[0] ?? res?.recommendedM3 ?? 0
  const fallbackOverweight = useOverweightValidation({
    res,
    invoiceDetails,
    billedM3,
    billedKg,
    isAir,
    isGabungan,
    refM3Fallback,
  })
  const overweight = validation ? validation.overweight : fallbackOverweight
  const {
    isOverweight,
    isBilledOverweightExactMatch,
    isBilledOverweightMatch,
    isBilledUnneededOverweight,
  } = overweight

  // Price Discrepancy Check across all items
  const fallbackEvaluatedItems = useMemo(() => {
    if (!res || !invoiceDetails || invoiceDetails.length === 0) return []
    return invoiceDetails.map((item) => {
      const evaluation = evaluateItemPrice(item, {
        res,
        isAir,
        defaultTypeId,
        defaultComodityName,
        branchCode,
        invNo: invoiceNo,
      })
      return { item, evaluation }
    })
  }, [res, invoiceDetails, isAir, defaultTypeId, defaultComodityName, branchCode, invoiceNo])

  const evaluatedItems = validation ? validation.evaluatedItems : fallbackEvaluatedItems
  const hasPriceDiscrepancy = validation ? validation.hasPriceDiscrepancy : evaluatedItems.some(({ evaluation }) => evaluation.statusType === 'LOWER')

  // Ekspedisi (tbExpIndo)
  const validExpedisiList = validation ? validation.validExpedisiList : []
  const mustBillExpedisiList = validation ? validation.mustBillExpedisiList : []
  const codExpedisiList = validation ? validation.codExpedisiList : []
  const unbilledExpedisiList = validation ? validation.unbilledExpedisiList : []
  const hasUnbilledTransport = validation ? validation.hasUnbilledTransport : false

  const hasFreightCharge = Boolean(res?.freightChargeSummary?.totalFc && res.freightChargeSummary.totalFc > 0)

  // Helper cek selisih overweight & rasio berat fisik (jalur laut)
  const hasOverweightIssue = !isAir && !isType2 && (
    (isOverweight && !isBilledOverweightExactMatch) ||
    isBilledUnneededOverweight ||
    (!isBilledOverweightMatch && isOverweight)
  )

  // Auto-determined active tab based on problem hierarchy
  const activeTab: ValidationCardTab = useMemo(() => {
    if (userSelectedTab) return userSelectedTab
    if (isType2) return 'm3_weight'
    if (!isMatch) return 'm3_weight'
    if (hasOverweightIssue) return 'overweight'
    if (hasPriceDiscrepancy) return 'profile'
    if (hasQtyMismatch) return 'm3_weight'
    if (hasUnbilledTransport) return 'transport'
    if (hasFreightCharge) return 'freight'
    return 'profile'
  }, [
    userSelectedTab,
    isType2,
    isMatch,
    hasOverweightIssue,
    hasPriceDiscrepancy,
    hasQtyMismatch,
    hasUnbilledTransport,
    hasFreightCharge,
  ])

  if (!listCode) {
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 shadow-sm flex items-center justify-center gap-2 text-sm text-[var(--color-secondary)]">
        <LoadingSpinner message={t('billing.validation.loading')} />
      </div>
    )
  }

  if (isError || !res) {
    return (
      <div className="bg-red-50/50 border border-red-200 rounded-[var(--radius-lg)] p-4 text-xs text-red-600 flex items-center justify-between">
        <span>{t('billing.validation.error')}</span>
        <button onClick={() => refetch()} className="text-red-700 font-semibold underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    )
  }

  const derivedProps: ValidationCardDerivedProps = {
    res,
    validation,
    listCode,
    invoiceNo,
    markingCode,
    branchCode,
    customerName: customerNameProp,
    custCode: custCodeProp,
    invoiceDetails,
    billedM3,
    billedKg,
    billedVfc,

    // Mode flags
    isAir,
    isType2,
    isGabungan,

    // Match status
    matchStatus,
    matchedSourceName,
    matchedRawVal,
    isMinChargeApplied,
    isMatch,

    // Kandidat sumber data M3 / berat
    seaPrimaryMatch,
    airPrimaryMatch,
    primaryCandidates,
    airCandidates,

    // M3 values
    plValues,
    gudangValues,
    komplainValues,
    komplainPerMarkingValues,
    custMarkingValues,
    plPerMarkingValues,
    listBatchValues,

    // Qty
    qtyList,
    qtyPL,
    qtyGudang,
    qtyKomplain,
    totalEntryList,
    totalEntryKomplain,
    fdSatuan,
    activeQtys,
    hasQtyMismatch,
    isQtyListDiff,
    isQtyPLDiff,
    isQtyGudangDiff,
    isQtyKomplainDiff,

    // Berat
    beratList,
    beratSJ,
    beratKomplain,
    beratMarking,
    effectiveBilledKg,
    effectiveBilledVfc,
    vfcGudang,
    minChargeKg,
    activeWeights,
    hasWeightMismatch,
    isWeightListDiff,
    isWeightSJDiff,
    isWeightKomplainDiff,
    isVfcMatched,

    // Validated flags
    isBilledBelowMinM3,
    effectiveMinChargeM3,
    isCodOrUrgent,
    recommendedM3,
    isCodUrgentShortfall,
    isType2Discrepancy,
    localType2Compare,

    // Overweight
    overweight,

    // Ekspedisi
    validExpedisiList,
    mustBillExpedisiList,
    codExpedisiList,
    unbilledExpedisiList,
    hasUnbilledTransport,
    hasFreightCharge,
    hasOverweightIssue,

    // Evaluated items
    evaluatedItems,
    hasPriceDiscrepancy,

    // Comodity
    defaultTypeId,
    defaultComodityName,

    // Mode catatan tarif
    effectiveNoteMode,
    selectedNoteMode,
    setSelectedNoteMode,

    // Modal openers
    setIsModalOpen,
    setIsCustMarkingModalOpen,
    setDimensionInitialSource,
    setIsDimensionModalOpen,
    onOpenAuditModal,
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden animate-fadeIn flex flex-col h-full min-h-0">
      {/* Header */}
      <ValidationCardHeader
        isAir={isAir}
        isType2={isType2}
        listCode={listCode}
        badgeVariant={badgeVariant}
        badgeText={badgeText}
        StatusIcon={StatusIcon}
        refetch={refetch}
        isFetching={isFetching}
      />

      {/* Navigation Tab Bar */}
      <ValidationCardTabsBar
        activeTab={activeTab}
        setUserSelectedTab={setUserSelectedTab}
        hasPriceDiscrepancy={hasPriceDiscrepancy}
        isType2={isType2}
        isAir={isAir}
        isType2Discrepancy={isType2Discrepancy}
        isMatch={isMatch}
        isBilledOverweightExactMatch={overweight.isBilledOverweightExactMatch}
        isOverweight={overweight.isOverweight}
        isBilledUnneededOverweight={overweight.isBilledUnneededOverweight}
        isBilledOverweightTolerated={overweight.isBilledOverweightTolerated}
        hasFreightCharge={hasFreightCharge}
        res={res}
        hasUnbilledTransport={hasUnbilledTransport}
        unbilledExpedisiList={unbilledExpedisiList}
        codExpedisiList={codExpedisiList}
        mustBillExpedisiList={mustBillExpedisiList}
        validExpedisiList={validExpedisiList}
      />

      {/* Main Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 pb-8 sm:pb-10">
        {activeTab === 'profile' && (
          <ProfilePricingTab
            res={res}
            isAir={isAir}
            defaultTypeId={defaultTypeId}
            defaultComodityName={defaultComodityName}
            branchCode={branchCode}
            invoiceNo={invoiceNo}
            invoiceDetails={invoiceDetails}
            evaluatedItems={evaluatedItems}
            effectiveNoteMode={effectiveNoteMode}
            setSelectedNoteMode={setSelectedNoteMode}
            setIsModalOpen={setIsModalOpen}
            onOpenAuditModal={onOpenAuditModal}
          />
        )}

        {activeTab === 'm3_weight' && (
          <PhysicalValidationTab {...derivedProps} />
        )}

        {activeTab === 'overweight' && !isAir && !isType2 && (
          <OverweightTab
            overweight={overweight}
            hasWeightMismatch={hasWeightMismatch}
            isGabungan={isGabungan}
            beratList={beratList}
            isWeightListDiff={isWeightListDiff}
            beratSJ={beratSJ}
            isWeightSJDiff={isWeightSJDiff}
            beratKomplain={beratKomplain}
            isWeightKomplainDiff={isWeightKomplainDiff}
          />
        )}

        {activeTab === 'freight' && (
          <FreightChargeTab
            res={res}
            hasFreightCharge={hasFreightCharge}
          />
        )}

        {activeTab === 'transport' && (
          <TransportTab
            hasUnbilledTransport={hasUnbilledTransport}
            unbilledExpedisiList={unbilledExpedisiList}
            codExpedisiList={codExpedisiList}
            validExpedisiList={validExpedisiList}
            validation={validation}
          />
        )}
      </div>

      {/* Modals */}
      <PriceListDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tglAgent={res.priceValidation?.fdTglAgent}
        effectiveDate={res.priceValidation?.effectiveDate}
        expectedMode={res.expectedMode || res.priceValidation?.expectedMode}
        expectedBranch={res.expectedBranch || res.priceValidation?.expectedBranch}
        salesName={res.customer?.fdSalesNM}
        customerName={displayCustName(customerNameProp || res.customer?.fdCustName)}
        customerCode={custCodeProp || res.customer?.fdCustCode}
        hasCustomerPriceList={res.priceValidation?.hasCustomerPriceList}
        items={res.priceValidation?.items || []}
      />

      <CustMarkingDetailModal
        isOpen={isCustMarkingModalOpen}
        onClose={() => setIsCustMarkingModalOpen(false)}
        custCode={custCodeProp || res.customer?.fdCustCode || null}
        custName={displayCustName(customerNameProp || res.customer?.fdCustName)}
        markingCode={res.customer?.fdMarkingCode || res.fdListCode || listCode}
      />

      <DimensionDetailModal
        isOpen={isDimensionModalOpen}
        onClose={() => setIsDimensionModalOpen(false)}
        listCode={(res?.fdListCode || listCode || '').trim()}
        customerName={displayCustName(customerNameProp || res?.customer?.fdCustName)}
        initialSource={dimensionInitialSource}
      />
    </div>
  )
}
