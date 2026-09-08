import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Tag,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Layers,
  Box,
  Scale,
  Coins,
  History,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatDecimal, formatCurrency, formatNumber, calculateOverweight } from '@/lib/utils'
import { evaluateItemPrice } from '../utils/billing.utils'
import { PriceListDetailModal } from './PriceListDetailModal'
import { CustMarkingDetailModal } from './CustMarkingDetailModal'
import { BILL_TYPES, type BillType } from '../constants/billing.constants'

export type ValidationCardTab = 'profile' | 'm3_weight' | 'overweight' | 'freight'

interface InvoiceDetail {
  fdInvNo: string
  fdID: string
  fdItemName: string
  fdQty: number
  fdListCode: string | null
  fdItemPrice: number
  fdTotal: number
  fdCurr: string | null
  fdTypeComodity?: number | null
  fdComodity?: string | null
}

interface BillingValidationCardProps {
  listCode: string
  billedM3: number
  billedKg?: number
  billedVfc?: number
  invoiceDetails?: InvoiceDetail[]
  billFdTypeComodity?: number | null
  billType?: BillType
  markingCode?: string | null
  markingNo?: string | null
  invoiceNo?: string | null
  customerName?: string | null
  custCode?: string | null
  onOpenSummaryModal?: () => void
  onOpenAuditModal?: () => void
}

interface PriceItem {
  id: number
  sheetType: string
  mode: string
  branch: string
  category: string
  price: number
}

interface ComodityType {
  fdID: number
  fdTypeComodity: number | null
  fdComodityName: string
  fdListType: number | null
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
    expectedMode?: string | null
    expectedBranch?: string | null
    items: PriceItem[]
    comodityTypes?: ComodityType[]
  } | null
  customer?: {
    fdListCode?: string
    fdMarkingCode: string | null
    fdCustCode: string | null
    fdCustName: string | null
    fdBlocked?: number
    fdSalesNM?: string | null
    fdBroker?: any
  } | null
  isCodOrUrgent: boolean
  recommendedM3: number
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
  minChargeKg?: number | null
  actualWeightKg?: number
  freightChargeSummary?: {
    totalFc: number
    currency: string
    listsWithFcCount: number
    listsWithFc: string[]
  }
  profileHarga?: {
    fdListCode?: string
    fdCustCode?: string
    harga: number
    rasio: number
    typeTagihan: number
    kg: number
    taxReturnPrice: number
    taxReturnMinCharge: number
    minChargeM3?: number
    minChargeKg?: number
    categoryName?: string
    ratioKg?: number
    freightCharge?: number
    freightChargeCur?: string
    overweightLimit?: number
    ppnPercent?: number
    chargeOverweightDirectly?: boolean
    freeM3?: number
    pricePerM3?: number
    pricePerKg?: number
    keterangan?: string
    noteTarif?: string
    isSpecial?: boolean
  } | null
  comodityTypes?: ComodityType[]
}

export function BillingValidationCard({
  listCode,
  billedM3,
  billedKg = 0,
  billedVfc = 0,
  invoiceDetails = [],
  billFdTypeComodity,
  billType,
  onOpenAuditModal,
}: BillingValidationCardProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCustMarkingModalOpen, setIsCustMarkingModalOpen] = useState(false)
  const [userSelectedTab, setUserSelectedTab] = useState<ValidationCardTab | null>(null)

  const { data: res, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['billingM3Check', listCode],
    queryFn: async () => {
      const response = await billingApi.m3Check(listCode)
      return response.data?.data as M3CheckResponse
    },
    enabled: !!listCode,
    staleTime: 60000,
  })

  // Bill-level Commodity Category (default from entryList join or marking)
  const defaultTypeId = billFdTypeComodity ?? res?.defaultFdTypeComodity ?? res?.markingComodityType ?? null
  const defaultMatchType = res?.comodityTypes?.find(
    (c) => c.fdTypeComodity === defaultTypeId && (res?.fdListType ? c.fdListType === res.fdListType : true)
  )
  const defaultComodityName = defaultMatchType ? defaultMatchType.fdComodityName : (defaultTypeId ? `Kategori ${defaultTypeId}` : '—')

  const isAir = res?.fdListType === 1 || res?.expectedMode === 'BY AIR'

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
  const qtyList = res?.fdQtyList ?? res?.m3ListBatch?.qty ?? parseQty(rawUnified.fdQtyList ?? rawUnified.qtyList)
  const qtyPL = res?.fdTotalQtyPL ?? res?.m3PackingList?.qty ?? parseQty(rawUnified.fdTotalQtyPL ?? rawUnified.fdTtoalQtyPL ?? rawUnified.fdQtyPL)
  const qtyGudang = res?.fdTotalQtyGudang ?? res?.m3Gudang?.qty ?? parseQty(rawUnified.fdTotalQtyGudang ?? rawUnified.fdQtyGudang)
  const qtyKomplain = res?.fdTotalQtyKomplain ?? res?.m3Komplain?.qty ?? parseQty(rawUnified.fdTotalQtyKomplain ?? rawUnified.fdQtyKomplain)
  const totalEntryKomplain = res?.totalEntryKomplain ?? res?.m3KomplainPerMarking?.totalEntryKomplain ?? parseQty(rawUnified.TotalEntryKomplain ?? rawUnified.totalEntryKomplain ?? rawUnified.fdTotalEntryKomplain)
  const totalEntryList = res?.totalEntryList ?? res?.m3CustPerMarking?.totalEntryList ?? parseQty(rawUnified.TotalEntryList ?? rawUnified.totalEntryList ?? rawUnified.fdTotalEntryList)
  const fdSatuan = (res?.fdSatuan || rawUnified.fdSatuan || rawUnified.Satuan || '').trim()

  // Qty Consistency Validation:
  // Semua Qty (EntryList, PL, Gudang) harus sama.
  // Apabila Komplain null atau 0 maka normal (diabaikan).
  // Apabila Komplain > 0 maka ikut dibandingkan.
  const activeQtys: { key: string; label: string; val: number }[] = []
  if (qtyList !== null) activeQtys.push({ key: 'ListBatch', label: t('billing.validation.listBatch') || 'EntryList', val: qtyList })
  if (qtyPL !== null) activeQtys.push({ key: 'PL', label: t('billing.validation.pl') || 'Packing List', val: qtyPL })
  if (qtyGudang !== null) activeQtys.push({ key: 'Gudang', label: t('billing.validation.gudang') || 'Gudang', val: qtyGudang })
  if (qtyKomplain !== null && qtyKomplain > 0) {
    activeQtys.push({ key: 'Komplain', label: t('billing.validation.komplain') || 'Komplain', val: qtyKomplain })
  }

  const distinctQtyVals = Array.from(new Set(activeQtys.map((q) => q.val)))
  const hasQtyMismatch = activeQtys.length > 1 && distinctQtyVals.length > 1
  const isQtyListDiff = hasQtyMismatch && qtyList !== null && activeQtys.some((q) => q.key !== 'ListBatch' && q.val !== qtyList)
  const isQtyPLDiff = hasQtyMismatch && qtyPL !== null && activeQtys.some((q) => q.key !== 'PL' && q.val !== qtyPL)
  const isQtyGudangDiff = hasQtyMismatch && qtyGudang !== null && activeQtys.some((q) => q.key !== 'Gudang' && q.val !== qtyGudang)
  const isQtyKomplainDiff = hasQtyMismatch && qtyKomplain !== null && qtyKomplain > 0 && activeQtys.some((q) => q.key !== 'Komplain' && q.val !== qtyKomplain)

  // Air Mode (By Air) Berat / Weight validation
  const effectiveBilledKg = billedKg !== undefined && billedKg > 0 ? billedKg : 0
  const effectiveBilledVfc = billedVfc !== undefined && billedVfc > 0 ? billedVfc : 0
  const beratList = res?.fdBeratList ?? 0
  const beratKomplain = res?.fdJmlBeratKomplain ?? 0
  const beratSJ = res?.totalJmlBeratSJ ?? 0
  const vfcGudang = res?.fdVFCGudang ?? 0
  const minChargeKg = res?.profileHarga?.minChargeKg && res?.profileHarga.minChargeKg > 0 ? res.profileHarga.minChargeKg : (res?.minChargeKg ?? 3)

  const airCandidates: { sourceKey: string; sourceName: string; val: number; rawVal: number }[] = [
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

  const airPrimaryMatch = isAir ? airCandidates.find((c) => Math.abs(c.val - effectiveBilledKg) < 0.01) : null
  const isVfcMatched = effectiveBilledVfc > 0 && vfcGudang > 0 && Math.abs(vfcGudang - effectiveBilledVfc) < 0.01

  // Helper untuk aturan M3 minimal 0.1 m³
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

  // Check 1: Primary match against PL, Gudang, Komplain, List Batch, dan Komplain Parsial + Gudang (Sea)
  const primaryCandidates: { sourceKey: string; sourceName: string; val: number; rawVal: number }[] = [
    ...plValues.map((v) => ({ sourceKey: 'PL', sourceName: t('billing.validation.pl'), val: normM3(v), rawVal: v })),
    ...gudangValues.map((v) => ({ sourceKey: 'Gudang', sourceName: t('billing.validation.gudang'), val: normM3(v), rawVal: v })),
    ...komplainValues.map((v) => ({ sourceKey: 'Komplain', sourceName: t('billing.validation.komplain'), val: normM3(v), rawVal: v })),
    ...plPerMarkingValues.map((v) => ({ sourceKey: 'PLPerMarking', sourceName: `${t('billing.validation.pl')} (${t('billing.validation.perMarkingGroup') || 'Per Marking'})`, val: normM3(v), rawVal: v })),
    ...komplainPerMarkingValues.map((v) => ({ sourceKey: 'KomplainPerMarking', sourceName: t('billing.validation.komplainPerMarking') || 'M3 Komplain per Marking', val: normM3(v), rawVal: v })),
    ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: t('billing.validation.listBatch') || 'M3 List Batch', val: normM3(v), rawVal: v })),
    ...(res?.m3KomplainPlusGudang !== null && res?.m3KomplainPlusGudang !== undefined && res.m3KomplainPlusGudang > 0
      ? [
          {
            sourceKey: 'KomplainHybrid',
            sourceName: `Komplain Parsial + Gudang (${res.countKomplainLC ?? totalEntryKomplain ?? 0} LC Komplain + ${res.countGudangLC ?? ((totalEntryList || 0) - (totalEntryKomplain || 0))} LC Gudang)`,
            val: normM3(res.m3KomplainPlusGudang),
            rawVal: res.m3KomplainPlusGudang,
          },
        ]
      : []),
  ]

  const seaPrimaryMatch = primaryCandidates.find((c) => Math.abs(c.val - billedM3) < 0.001)

  // Check 2: Secondary match against M3 per Marking jika tidak match di primary
  const rawMarkingVal = custMarkingValues.length > 0 ? custMarkingValues[0] : null
  const markingCandidate = custMarkingValues
    .map(normM3)
    .find((v) => Math.abs(v - billedM3) < 0.001)

  let matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH' = 'NO_MATCH'
  let matchedSourceName = ''
  let isMinChargeApplied = false
  let matchedRawVal = 0

  if (isAir) {
    if (airPrimaryMatch) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = airPrimaryMatch.sourceName
      matchedRawVal = airPrimaryMatch.rawVal
      isMinChargeApplied = airPrimaryMatch.sourceKey === 'MinCharge'
    } else {
      matchStatus = 'NO_MATCH'
    }
  } else {
    if (seaPrimaryMatch) {
      matchStatus = 'MATCH_PRIMARY'
      matchedSourceName = seaPrimaryMatch.sourceName
      matchedRawVal = seaPrimaryMatch.rawVal
      isMinChargeApplied = seaPrimaryMatch.rawVal > 0 && seaPrimaryMatch.rawVal < 0.1
    } else if (markingCandidate !== undefined) {
      matchStatus = 'MATCH_MARKING'
      matchedSourceName = t('billing.validation.custPerMarking')
      matchedRawVal = rawMarkingVal || 0
      isMinChargeApplied = matchedRawVal > 0 && matchedRawVal < 0.1
    }
  }

  const isCodOrUrgent = Boolean(res?.isCodOrUrgent)
  const recommendedM3 = res?.recommendedM3 ?? 0
  const isCodUrgentShortfall = !isAir && isCodOrUrgent && recommendedM3 > billedM3 + 0.001

  // Overall status badge variant
  let badgeVariant: 'success' | 'info' | 'warning' | 'danger' = 'success'
  let StatusIcon = Check

  if (isCodUrgentShortfall) {
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

  const badgeText = isAir
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
        : isMinChargeApplied
          ? `COCOK (ATURAN MIN. 0,1 m³ · ${matchedSourceName})`
          : t('billing.validation.statusMatch', { source: matchedSourceName })

  const isMatch = matchStatus === 'MATCH_PRIMARY' || matchStatus === 'MATCH_MARKING'

  // Overweight Calculations (Sea only)
  const rasio = res?.profileHarga?.ratioKg ?? res?.profileHarga?.rasio ?? 0
  const actualWeightGudang = res?.fdJmlBeratGudang ?? 0
  const actualWeightList = res?.fdBeratList ? Number(res.fdBeratList) : 0
  const actualWeightKomplain = res?.fdJmlBeratKomplain ?? 0
  const actualWeightSJ = res?.totalJmlBeratSJ ?? 0
  const totalBeratPerMarking = res?.totalBeratPerMarking ?? 0

  const isGabungan = Boolean(
    billType === BILL_TYPES.GABUNGAN ||
    (res?.markingDetails && res.markingDetails.length > 1) ||
    (res?.totalEntryList && res.totalEntryList > 1)
  )

  const actualWeightKg = isGabungan
    ? (totalBeratPerMarking > 0 ? totalBeratPerMarking : (actualWeightSJ > 0 ? actualWeightSJ : (actualWeightGudang || actualWeightList)))
    : actualWeightKomplain > 0
    ? actualWeightKomplain
    : actualWeightGudang > 0
    ? actualWeightGudang
    : actualWeightList > 0
    ? actualWeightList
    : (res?.actualWeightKg ?? actualWeightSJ)

  // Check if invoice has billed KG for sea shipment
  const seaBilledKgItem = useMemo(() => {
    if (isAir || !invoiceDetails || invoiceDetails.length === 0) return null
    return invoiceDetails.find(
      (item) =>
        (item.fdItemName && item.fdItemName.toLowerCase().includes('kg')) ||
        (item.fdItemName && item.fdItemName.toLowerCase().includes('berat')) ||
        (item.fdItemName && item.fdItemName.toLowerCase().includes('overweight'))
    )
  }, [isAir, invoiceDetails])

  const seaBilledKg = billedKg || (seaBilledKgItem ? seaBilledKgItem.fdQty : 0)
  const refM3 = billedM3 > 0 ? billedM3 : (komplainValues[0] ?? gudangValues[0] ?? plValues[0] ?? res?.recommendedM3 ?? 0)
  const maxAllowedWeight = !isAir && rasio > 0 && refM3 > 0 ? refM3 * rasio : 0
  const overweightKg = !isAir && rasio > 0 && refM3 > 0 && actualWeightKg > 0 ? calculateOverweight(actualWeightKg, refM3, rasio) : 0
  const isOverweight = overweightKg > 0
  const isBilledOverweightExactMatch = !isAir && isOverweight && seaBilledKg > 0 && Math.abs(seaBilledKg - overweightKg) < 0.01
  const isBilledOverweightTolerated = !isAir && isOverweight && seaBilledKg > 0 && !isBilledOverweightExactMatch && Math.abs(seaBilledKg - overweightKg) <= 1
  const isBilledOverweightMatch = !isAir && isOverweight && seaBilledKg > 0 && (isBilledOverweightExactMatch || isBilledOverweightTolerated)
  const isBilledUnneededOverweight = !isAir && !isOverweight && seaBilledKg > 0
  const overweightDiff = seaBilledKg > 0 ? seaBilledKg - overweightKg : null

  // Price Discrepancy Check across all items
  const evaluatedItems = useMemo(() => {
    if (!res || !invoiceDetails || invoiceDetails.length === 0) return []
    return invoiceDetails.map((item) => {
      const evaluation = evaluateItemPrice(item, {
        res,
        isAir,
        defaultTypeId,
        defaultComodityName,
      })
      return { item, evaluation }
    })
  }, [res, invoiceDetails, isAir, defaultTypeId, defaultComodityName])

  const hasPriceDiscrepancy = useMemo(() => {
    return evaluatedItems.some(({ evaluation }) => evaluation.statusType === 'LOWER')
  }, [evaluatedItems])

  const hasFreightCharge = Boolean(res?.freightChargeSummary?.totalFc && res.freightChargeSummary.totalFc > 0)

  // Auto-determined active tab based on problem hierarchy
  const activeTab: ValidationCardTab = useMemo(() => {
    if (userSelectedTab) return userSelectedTab
    if (hasPriceDiscrepancy) return 'profile'
    if (!isMatch) return 'm3_weight'
    if (!isAir && (isOverweight || isBilledUnneededOverweight) && !isBilledOverweightMatch) return 'overweight'
    if (hasFreightCharge) return 'freight'
    return 'profile'
  }, [userSelectedTab, hasPriceDiscrepancy, isMatch, isAir, isOverweight, isBilledUnneededOverweight, isBilledOverweightMatch, hasFreightCharge])

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
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="px-3 py-2.5 sm:px-5 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-primary)] truncate">
            {isAir ? 'Validasi Berat (Udara)' : t('billing.validation.title')}
          </h3>
          <span className="text-[10px] sm:text-[11px] text-[var(--color-secondary)] font-mono shrink-0">({listCode})</span>
          {isAir && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider shrink-0">
              BY AIR
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Badge variant={badgeVariant} className="flex items-center gap-1 text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 font-semibold">
            <StatusIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px] sm:max-w-none">{badgeText}</span>
          </Badge>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar (Clean 4-Tab Header with Touch Scrolling) */}
      <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/30 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
        {/* Tab 1: Profile / Items */}
        <button
          type="button"
          onClick={() => setUserSelectedTab('profile')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
            activeTab === 'profile'
              ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
              : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          }`}
        >
          <Layers size={13} />
          <span>Item & Tarif</span>
          {hasPriceDiscrepancy ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
              Cek
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
              ✓ Valid
            </span>
          )}
        </button>

        {/* Tab 2: M3 / Weight */}
        <button
          type="button"
          onClick={() => setUserSelectedTab('m3_weight')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
            activeTab === 'm3_weight'
              ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
              : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          }`}
        >
          <Box size={13} />
          <span>{isAir ? 'Timbangan' : 'Validasi M3'}</span>
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

        {/* Tab 3: Overweight (Sea only) */}
        {!isAir && (
          <button
            type="button"
            onClick={() => setUserSelectedTab('overweight')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
              activeTab === 'overweight'
                ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
                : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
            }`}
          >
            <Scale size={13} />
            <span>Overweight</span>
            {isBilledOverweightExactMatch || (!isOverweight && !isBilledUnneededOverweight) ? (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                ✓ Aman
              </span>
            ) : isBilledOverweightTolerated ? (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                ✓ Toleransi
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                Cek
              </span>
            )}
          </button>
        )}

        {/* Tab 4: Freight Charge */}
        <button
          type="button"
          onClick={() => setUserSelectedTab('freight')}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
            activeTab === 'freight'
              ? "bg-transparent border-[var(--color-tertiary)] text-[var(--color-tertiary)] shadow-xs font-bold"
              : "border-transparent text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          }`}
        >
          <Coins size={13} />
          <span>Freight Charge</span>
          {hasFreightCharge ? (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
              {formatNumber(res?.freightChargeSummary?.totalFc || 0)} {res?.freightChargeSummary?.currency}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium text-[var(--color-secondary)]">
              Nihil
            </span>
          )}
        </button>
      </div>

      {/* Main Comparison Body */}
      <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* TAB 1: ITEM & TARIF / PROFILE HARGA CUSTOMER */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
        {res.profileHarga && (
          <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{t('billing.validation.custPriceProfile')}</span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenAuditModal && (
                  <button
                    type="button"
                    onClick={onOpenAuditModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shadow-2xs"
                    title={t('billing.validation.priceAuditTooltip')}
                  >
                    <History className="w-3 h-3 text-amber-500" />
                    <span>{t('billing.validation.priceAudit')}</span>
                  </button>
                )}
                <Badge variant="default" className="text-[10px] font-mono">
                {t('billing.validation.billTypeLabel')}: {
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
              </div>
            </div>

            {/* Kelompok Tarif Utama — full width */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2">
              <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider">
                {t('billing.validation.mainTariff')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.m3Price')}</p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.harga > 0 ? formatCurrency(res.profileHarga.harga) : '—'}
                  </p>
                </div>

                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.kgPrice')}</p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.kg > 0 ? `${formatDecimal(res.profileHarga.kg, 0)} kg` : '—'}
                  </p>
                </div>

                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.ratio')}</p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.rasio > 0 ? formatDecimal(res.profileHarga.rasio, 2) : '—'}
                  </p>
                </div>

                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">
                    {res.fdListType === 1 ? t('billing.validation.minChargeKg') : t('billing.validation.minChargeM3')}
                  </p>
                  <div className="mt-0.5">
                    {res.fdListType === 1 ? (
                      (res.profileHarga.minChargeKg ?? 0) > 0 ? (
                        <p className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                          {`${formatDecimal(res.profileHarga.minChargeKg, 2)} kg`}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                            3.00 kg
                          </span>
                          <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                            {t('billing.validation.noDataYet')}
                          </Badge>
                        </div>
                      )
                    ) : (res.profileHarga.minChargeM3 ?? 0) > 0 ? (
                      <p className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                        {`${formatDecimal(res.profileHarga.minChargeM3, 4)} m³`}
                      </p>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-bold text-[var(--color-primary)] text-xs sm:text-sm">
                          0.1000 m³
                        </span>
                        <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                          {t('billing.validation.noDataYet')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Kelompok Tax Return — baris terpisah di bawah */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2">
              <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider">
                {t('billing.validation.taxReturnTitle')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.taxReturnTariff')}</p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'}
                  </p>
                </div>

                <div className="bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-md p-2">
                  <p className="text-[9px] uppercase font-sans text-[var(--color-secondary)] font-bold">{t('billing.validation.taxReturnMinCharge')}</p>
                  <p className="font-bold text-[var(--color-primary)] mt-0.5 text-xs sm:text-sm">
                    {res.profileHarga.taxReturnMinCharge > 0 ? `${formatDecimal(res.profileHarga.taxReturnMinCharge, 4)} m³` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validasi Komoditas & Price List (3-Way Comparison) */}
        {invoiceDetails && invoiceDetails.length > 0 && (
          <div className="pt-3 border-t border-[var(--color-border)] space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[var(--color-tertiary)]" />
                  {t('billing.validation.itemPriceCheck')}
                </p>
                <Badge variant="info" className="text-[10px] font-bold px-2 py-0.5">
                  {defaultComodityName}
                </Badge>
              </div>
              <span className="text-[10px] font-sans text-[var(--color-secondary)]">
                {t('billing.validation.itemCountLabel', { count: invoiceDetails.length })}
              </span>
            </div>

            <div className="space-y-1.5">
              {invoiceDetails.map((item, idx) => {
                const evalObj = evaluatedItems.find((e) => e.item.fdID === item.fdID)
                const evaluation = evalObj?.evaluation || evaluateItemPrice(item, {
                  res,
                  isAir,
                  defaultTypeId,
                  defaultComodityName,
                })
                const {
                  comodityName,
                  profilePrice,
                  minTargetPrice,
                  maxTargetPrice,
                  priceListDisplay,
                  isMatched,
                  hasTargetPrice,
                  isTaxReturnItem,
                  targetColName,
                } = evaluation

                const billedPrice = Number(item.fdItemPrice || 0)

                const statusBadge = isMatched ? (
                  <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                    <span>{t('billing.validation.matchBadge')}</span>
                  </Badge>
                ) : hasTargetPrice && (isTaxReturnItem ? profilePrice > 0 : evaluation.priceItem !== null) ? (
                  billedPrice > (isTaxReturnItem ? profilePrice : maxTargetPrice) ? (
                    <Badge variant="info" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0" title={`Harga invoice (${formatCurrency(billedPrice)}) lebih tinggi dari acuan (${priceListDisplay}) - Diizinkan`}>
                      <TrendingUp className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>Overcharge</span>
                    </Badge>
                  ) : billedPrice < (isTaxReturnItem ? profilePrice : minTargetPrice) ? (
                    <Badge variant="danger" className="inline-flex items-center gap-1 font-semibold text-[10px] shrink-0" title={`Peringatan: Harga invoice (${formatCurrency(billedPrice)}) lebih rendah dari acuan (${priceListDisplay})`}>
                      <TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Undercharge</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="shrink-0 text-[10px]">{targetColName}</Badge>
                  )
                ) : (
                  <span className="text-[10px] text-[var(--color-secondary)]">—</span>
                )

                return (
                  <div
                    key={item.fdID || idx}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/30 transition-colors overflow-hidden"
                  >
                    {/* Row 1: Deskripsi + Komoditi + Status */}
                    <div className="flex items-start justify-between gap-2 px-2.5 py-1.5 border-b border-[var(--color-border)]/60">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--color-primary)] leading-tight" title={item.fdItemName}>
                            {item.fdItemName}
                          </p>
                          {isTaxReturnItem && (res.profileHarga?.taxReturnMinCharge ?? 0) > 0 && (
                            <span className="text-[9px] font-normal text-[var(--color-secondary)]">
                              Min Charge: {formatDecimal(res.profileHarga?.taxReturnMinCharge, 4)} m³
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[var(--color-tertiary)] whitespace-nowrap shrink-0 mt-0.5">
                          {comodityName}
                        </span>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        {statusBadge}
                      </div>
                    </div>

                    {/* Row 2: Tiga kolom harga */}
                    <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]/60 text-[11px]">
                      <div className="px-2.5 py-1.5">
                        <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                          {t('billing.validation.invoicePriceCol')}
                        </p>
                        <p className="font-mono font-bold text-[var(--color-primary)]">
                          {formatCurrency(billedPrice)}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                          {t('billing.validation.priceProfileCol')}
                        </p>
                        <p className="font-mono text-[var(--color-secondary)]">
                          {profilePrice > 0 ? formatCurrency(profilePrice) : '—'}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5">
                        <p className="text-[9px] uppercase font-bold text-[var(--color-secondary)] mb-0.5">
                          {t('billing.validation.priceListCol')}
                        </p>
                        <p className="font-mono font-semibold text-blue-700 dark:text-blue-300 break-all leading-tight">
                          {priceListDisplay}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Price List Info & Action Link Acuan Tarif */}
        {(res.priceValidation?.effectiveDate || (res.priceValidation?.items && res.priceValidation.items.length > 0)) && (
          <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-secondary)]">
            <div className="flex items-center gap-2 flex-wrap">
              {res.priceValidation.hasCustomerPriceList && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-500 bg-transparent px-2 py-0.5 rounded border border-purple-500/40">
                  <Tag className="w-3 h-3 text-purple-500" />
                  <span>{t('billing.validation.customerPriceActive') || 'Price List Khusus Customer'}</span>
                </span>
              )}
              {res.priceValidation.effectiveDate && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-secondary)]">
                  <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{t('billing.validation.effectivePriceDate')}:</span>
                  <span className="font-semibold text-blue-500">{formatDate(res.priceValidation.effectiveDate)}</span>
                </div>
              )}
            </div>

            {res.priceValidation.items && res.priceValidation.items.length > 0 && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline transition-colors cursor-pointer ml-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('billing.validation.viewPriceList')}</span>
              </button>
            )}
          </div>
        )}
          </div>
        )}

        {/* TAB 2: VALIDASI M3 / TIMBANGAN BERAT */}
        {activeTab === 'm3_weight' && (
          <div className="space-y-3">
            {/* Baris 1: Card Billed + Box Data Utama */}
            <div className="flex gap-2.5 items-stretch">
          {/* Card 1: Billed Metric — lebar tetap */}
          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] bg-[var(--color-neutral)] p-2.5 sm:p-3 shrink-0 w-28 sm:w-32 flex flex-col justify-center">
            <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
              {isAir ? 'Tagihan Berat (Billed KG)' : t('billing.validation.billedM3')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-bold text-[var(--color-primary)] tabular-nums">
              {isAir ? `${formatDecimal(effectiveBilledKg, 2)} kg` : `${formatDecimal(billedM3, 4)} m³`}
            </p>
            {isAir && effectiveBilledVfc > 0 && (
              <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 font-semibold">
                VFC: {formatDecimal(effectiveBilledVfc, 2)} kg
              </p>
            )}
            {isAir && billedM3 > 0 && (
              <p className="text-[10px] text-[var(--color-secondary)] mt-0.5 font-mono">
                Vol: {formatDecimal(billedM3, 4)} m³
              </p>
            )}
          </div>
              {/* JIKA UDARA (isAir / fdListType = 1) -> Tampilkan Berat Timbangan */}
              {isAir ? (
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                      Data Berat Timbangan & Tarif (Udara)
                    </p>
                    {hasQtyMismatch ? (
                      <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{t('billing.validation.qtyMismatch') || 'Selisih Qty'}</span>
                      </Badge>
                    ) : activeQtys.length > 0 ? (
                      <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                        <span>{t('billing.validation.qtyMatch') || 'Qty Sama'}</span>
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* Berat EntryList */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        airPrimaryMatch?.sourceKey === 'EntryList'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        Berat EntryList
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {beratList > 0 ? `${formatDecimal(beratList, 2)} kg` : '0 kg'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span>Qty</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {qtyList !== null ? `${formatNumber(qtyList)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Berat Komplain */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        airPrimaryMatch?.sourceKey === 'Komplain'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        Berat Komplain
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {beratKomplain > 0 ? `${formatDecimal(beratKomplain, 2)} kg` : 'Normal (0 kg)'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span>Qty</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {qtyKomplain !== null && qtyKomplain > 0 ? `${formatNumber(qtyKomplain)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Min Charge KG */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        airPrimaryMatch?.sourceKey === 'MinCharge'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        Min. Charge KG
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {formatDecimal(minChargeKg, 2)} kg
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span>Status</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {beratList < minChargeKg ? 'Kena Min' : 'Normal'}
                        </span>
                      </p>
                    </div>

                    {/* VFC Gudang */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        isVfcMatched
                          ? 'border-purple-500 dark:border-purple-400 bg-transparent ring-1 ring-purple-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                          VFC Gudang
                        </p>
                        {isVfcMatched && (
                          <span className="text-[8px] px-1 py-0 font-bold border border-purple-500/40 text-purple-500 rounded">
                            COCOK
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {vfcGudang > 0 ? `${formatDecimal(vfcGudang, 2)} kg` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span>Vol. Flight</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* JIKA LAUT (fdListType = 2 / !isAir) -> Tampilkan M3 Per ListCode */
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.referenceGroup') || 'Per ListCode'}
                    </p>
                    {hasQtyMismatch ? (
                      <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{t('billing.validation.qtyMismatch') || 'Selisih Qty'}</span>
                      </Badge>
                    ) : activeQtys.length > 0 ? (
                      <Badge variant="success" className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                        <span>{t('billing.validation.qtyMatch') || 'Qty Sama'}</span>
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* EntryList / ListBatch */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'ListBatch'
                        ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                        : isQtyListDiff
                          ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                        }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.listBatch')}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {listBatchValues.length > 0 ? `${formatDecimal(listBatchValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="flex items-center gap-1">
                          <span>Qty</span>
                          {isQtyListDiff && (
                            <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                              {t('billing.validation.qtyDiff') || 'Beda'}
                            </Badge>
                          )}
                        </span>
                        <span className={`font-semibold ${isQtyListDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                          {qtyList !== null ? `${formatNumber(qtyList)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Packing List */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'PL' || seaPrimaryMatch?.sourceKey === 'PackingList'
                        ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                        : isQtyPLDiff
                          ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                        }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.pl')}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {plValues.length > 0 ? `${formatDecimal(plValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="flex items-center gap-1">
                          <span>Qty</span>
                          {isQtyPLDiff && (
                            <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                              {t('billing.validation.qtyDiff') || 'Beda'}
                            </Badge>
                          )}
                        </span>
                        <span className={`font-semibold ${isQtyPLDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                          {qtyPL !== null ? `${formatNumber(qtyPL)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Gudang */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'Gudang'
                        ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                        : isQtyGudangDiff
                          ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                        }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.gudang')}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="flex items-center gap-1">
                          <span>Qty</span>
                          {isQtyGudangDiff && (
                            <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                              {t('billing.validation.qtyDiff') || 'Beda'}
                            </Badge>
                          )}
                        </span>
                        <span className={`font-semibold ${isQtyGudangDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                          {qtyGudang !== null ? `${formatNumber(qtyGudang)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Komplain */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'Komplain'
                        ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                        : isQtyKomplainDiff
                          ? 'border-amber-400 dark:border-amber-600/60 bg-transparent'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                        }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.komplain')}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {komplainValues.length > 0 ? `${formatDecimal(komplainValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="flex items-center gap-1">
                          <span>Qty</span>
                          {qtyKomplain === null || qtyKomplain === 0 ? (
                            <span className="text-[8px] text-[var(--color-secondary)] font-normal">
                              ({t('billing.validation.normal') || 'Normal'})
                            </span>
                          ) : isQtyKomplainDiff ? (
                            <Badge variant="warning" className="text-[8px] px-1 py-0 font-bold">
                              {t('billing.validation.qtyDiff') || 'Beda'}
                            </Badge>
                          ) : null}
                        </span>
                        <span className={`font-semibold ${isQtyKomplainDiff ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--color-primary)]'}`}>
                          {qtyKomplain !== null && qtyKomplain > 0 ? `${formatNumber(qtyKomplain)}${fdSatuan ? ` ${fdSatuan}` : ''}` : '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Baris 2 */}
            {isAir ? (
              /* UDARA (fdListType = 1): Baris 2 adalah Per Marking & SJ */
              <div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 w-full">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                      Per Marking & SJ
                    </p>
                    {res.customer?.fdCustCode && (
                      <button
                        type="button"
                        onClick={() => setIsCustMarkingModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-0.5 cursor-pointer"
                        title={t('billing.validation.viewCustMarkingDetail')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* VFC Per Marking */}
                    <div className="rounded-md border p-2 border-[var(--color-border)] bg-[var(--color-neutral)]">
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        VFC Marking
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {res.vfcGudangPerMarking ? `${formatDecimal(res.vfcGudangPerMarking, 2)} kg` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="text-[9px] truncate mr-1">Total LC</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Berat SJ */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        airPrimaryMatch?.sourceKey === 'SJ'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        Berat SJ
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {beratSJ > 0 ? `${formatDecimal(beratSJ, 2)} kg` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="text-[9px] truncate mr-1">Surat Jalan</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {beratSJ > 0 ? 'Tercatat' : '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* LAUT (fdListType = 2): Baris 2 adalah Per Marking M3 */
              <div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 w-full">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.perMarkingGroup') || 'Per Marking'}
                    </p>
                    {res.customer?.fdCustCode && (
                      <button
                        type="button"
                        onClick={() => setIsCustMarkingModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-0.5 cursor-pointer"
                        title={t('billing.validation.viewCustMarkingDetail')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {/* M3 Cust Per Marking */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        matchStatus === 'MATCH_MARKING'
                          ? 'border-sky-500 dark:border-sky-400 bg-transparent ring-1 ring-sky-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.custPerMarking') || 'M3 Marking'}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {custMarkingValues.length > 0 ? `${formatDecimal(custMarkingValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="text-[9px] truncate mr-1">Total LC</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* PL Per Marking */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        seaPrimaryMatch?.sourceKey === 'PLPerMarking'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.plPerMarking') || 'PL Per Marking'}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {plPerMarkingValues.length > 0 ? `${formatDecimal(plPerMarkingValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="text-[9px] truncate mr-1">Total LC</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {totalEntryList !== null ? `${formatNumber(totalEntryList)}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Komplain Per Marking */}
                    <div
                      className={`rounded-md border p-2 transition-colors ${
                        seaPrimaryMatch?.sourceKey === 'KomplainPerMarking'
                          ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                          : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                    >
                      <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                        {t('billing.validation.komplainPerMarking') || 'Komplain Per Marking'}
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                        {komplainPerMarkingValues.length > 0 ? `${formatDecimal(komplainPerMarkingValues[0], 4)} m³` : '—'}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                        <span className="text-[9px] truncate mr-1">Total LC</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {totalEntryKomplain !== null && totalEntryKomplain > 0 ? `${formatNumber(totalEntryKomplain)}` : '—'}
                        </span>
                      </p>
                    </div>

                    {/* Komplain Parsial + Gudang (Hybrid) if applicable */}
                    {res?.m3KomplainPlusGudang && res.m3KomplainPlusGudang > 0 ? (
                      <div
                        className={`rounded-md border p-2 transition-colors ${
                          seaPrimaryMatch?.sourceKey === 'KomplainHybrid'
                            ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                            : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                        }`}
                      >
                        <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)] truncate" title="Komplain Parsial + Gudang">
                          Komplain + Gudang
                        </p>
                        <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                          {formatDecimal(res.m3KomplainPlusGudang, 4)} m³
                        </p>
                        <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                          <span className="text-[9px] truncate mr-1">LC Gabungan</span>
                          <span className="font-semibold text-[var(--color-primary)]">
                            {(res.countKomplainLC ?? 0) + (res.countGudangLC ?? 0)}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

        {/* Status Explanation Message */}
        <div className="space-y-2">
          {isAir ? (
            matchStatus === 'MATCH_PRIMARY' ? (
              <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-emerald-50/80 dark:bg-transparent border border-[var(--color-success)] rounded-[var(--radius-md)] p-2.5">
                <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  {isMinChargeApplied
                    ? `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) SESUAI dengan aturan Min. Charge (${formatDecimal(minChargeKg, 2)} kg · Berat Real: ${formatDecimal(beratList, 2)} kg)`
                    : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) COCOK dengan data ${matchedSourceName}`}
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-xs text-[var(--color-danger)] bg-rose-50/80 dark:bg-transparent border border-[var(--color-danger)] rounded-[var(--radius-md)] p-2.5">
                <X className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5 stroke-[2.5]" />
                <span className="font-medium">
                  {effectiveBilledKg === 0
                    ? `Tagihan berat belum diisi (0 kg). Berat Real EntryList adalah ${formatDecimal(beratList, 2)} kg${minChargeKg > 0 ? ` (Min. Charge: ${formatDecimal(minChargeKg, 2)} kg)` : ''}.`
                    : `Berat Tagihan (${formatDecimal(effectiveBilledKg, 2)} kg) TIDAK COCOK dengan Berat Real (${formatDecimal(beratList, 2)} kg)${minChargeKg > 0 ? ` maupun Min. Charge (${formatDecimal(minChargeKg, 2)} kg)` : ''}.`}
                </span>
              </div>
            )
          ) : (
            <>
              {matchStatus === 'MATCH_PRIMARY' && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-success)] bg-emerald-50/80 dark:bg-transparent border border-[var(--color-success)] rounded-[var(--radius-md)] p-2.5">
                  <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5 stroke-[2.5]" />
                  <span className="font-medium">
                    {isMinChargeApplied
                      ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data ${matchedSourceName}: ${formatDecimal(matchedRawVal, 4)} m³)`
                      : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan data ${matchedSourceName}`}
                  </span>
                </div>
              )}

              {matchStatus === 'MATCH_MARKING' && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-tertiary)] bg-sky-50/80 dark:bg-transparent border border-[var(--color-tertiary)] rounded-[var(--radius-md)] p-2.5">
                  <Info className="w-4 h-4 text-[var(--color-tertiary)] shrink-0 mt-0.5" />
                  <span className="font-medium">
                    {isMinChargeApplied
                      ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data M3 per Marking: ${formatDecimal(matchedRawVal, 4)} m³)`
                      : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan M3 per Marking`}
                  </span>
                </div>
              )}

              {matchStatus === 'NO_MATCH' && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-danger)] bg-rose-50/80 dark:bg-transparent border border-[var(--color-danger)] rounded-[var(--radius-md)] p-2.5">
                  <X className="w-4 h-4 text-[var(--color-danger)] shrink-0 mt-0.5 stroke-[2.5]" />
                  <span className="font-medium">
                    {t('billing.validation.noMatch').replace('{billed}', formatDecimal(billedM3, 4))}
                  </span>
                </div>
              )}

              {/* COD / URGENT Alert */}
              {isCodUrgentShortfall && (
                <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
                  <span className="font-medium">
                    {t('billing.validation.codUrgentWarning').replace('{recommended}', formatDecimal(recommendedM3, 4))}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Qty Mismatch Alert */}
          {hasQtyMismatch && (
            <div className="flex items-start gap-2 text-xs text-[var(--color-warning)] bg-amber-50/80 dark:bg-transparent border border-[var(--color-warning)] rounded-[var(--radius-md)] p-2.5">
              <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{t('billing.validation.qtyMismatch')}: </span>
                <span>
                  Terdapat perbedaan jumlah Qty antara{' '}
                  {activeQtys.map((q) => `${q.label} (${formatNumber(q.val)})`).join(', ')}
                  {fdSatuan ? ` ${fdSatuan}` : ''}.
                </span>
              </div>
            </div>
          )}
        </div>
          </div>
        )}

        {/* TAB 3: OVERWEIGHT (Sea Only) */}
        {activeTab === 'overweight' && !isAir && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Scale size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-primary)]">
                    Analisis Rasio Overweight Muatan Laut
                  </h4>
                  <span className="text-[10px] text-[var(--color-secondary)]">
                    Rasio standard {res.profileHarga?.ratioKg || res.profileHarga?.rasio || 0} kg/m³
                  </span>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                isBilledOverweightExactMatch
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                  : isBilledOverweightTolerated
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                    : isOverweight || isBilledUnneededOverweight
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}>
                {isBilledOverweightExactMatch
                  ? 'Overweight Ditagihkan'
                  : isBilledOverweightTolerated
                    ? 'Toleransi Wajar'
                    : isBilledUnneededOverweight
                      ? 'Ditagih Tanpa Overweight'
                      : isOverweight
                        ? (seaBilledKg > 0 ? 'Selisih Tagihan KG' : 'Overweight Belum Ditagih')
                        : 'Tidak Ada Overweight'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Batas Kuota Rasio</span>
                <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                  {formatNumber(maxAllowedWeight)} kg
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                  {formatDecimal(billedM3, 4)} m³ × {res.profileHarga?.ratioKg || res.profileHarga?.rasio || 0} kg
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Berat Aktual Fisik</span>
                <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                  {formatNumber(actualWeightKg)} kg
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                  {isGabungan ? 'Total berat gabungan marking' : 'Data timbangan EntryList'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Kelebihan (Overweight)</span>
                <span className={`text-base font-bold font-mono block ${isOverweight ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {isOverweight ? `+${formatNumber(overweightKg)} kg` : '0 kg'}
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                  {isOverweight ? 'Melebihi batas kuota' : 'Sisa kuota aman'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Item KG di Tagihan</span>
                <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                  {formatNumber(seaBilledKg)} kg
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">
                  {isBilledOverweightExactMatch ? 'Cocok presisi' : isBilledOverweightTolerated ? 'Selisih wajar' : 'Baris invoice'}
                </span>
              </div>
            </div>

            {/* Banner Status Overweight */}
            <div className="p-3.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs text-[var(--color-secondary)] leading-relaxed">
              {isBilledOverweightExactMatch ? (
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                  ✓ Muatan terindikasi overweight (+{formatNumber(overweightKg)} kg) dan invoice telah memuat item penagihan KG sebesar {formatNumber(seaBilledKg)} kg secara presisi.
                </span>
              ) : isBilledOverweightTolerated ? (
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  ⚠ Tagihan memuat item penagihan KG sebesar {formatNumber(seaBilledKg)} kg. Terdapat selisih pembulatan wajar {Math.abs(overweightDiff ?? 0)} kg dengan perhitungan sistem (+{formatNumber(overweightKg)} kg).
                </span>
              ) : isBilledUnneededOverweight ? (
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  ⚠ Berat aktual fisik masih berada dalam batas kuota rasio (0 kg overweight), namun invoice menagihkan item KG sebesar {formatNumber(seaBilledKg)} kg.
                </span>
              ) : isOverweight ? (
                seaBilledKg > 0 ? (
                  <span className="text-rose-800 dark:text-rose-300 font-medium">
                    ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun item penagihan KG pada invoice ({formatNumber(seaBilledKg)} kg) memiliki selisih {Math.abs(overweightDiff ?? 0)} kg dengan sistem.
                  </span>
                ) : (
                  <span className="text-rose-800 dark:text-rose-300 font-medium">
                    ⚠ Muatan fisik melebihi batas kuota rasio sebesar +{formatNumber(overweightKg)} kg, namun invoice belum memuat item penagihan KG.
                  </span>
                )
              ) : (
                <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                  ✓ Berat fisik aktual ({formatNumber(actualWeightKg)} kg) berada di dalam batas kuota rasio ({formatNumber(maxAllowedWeight)} kg). Sisa kuota aman: {formatNumber(Math.max(0, maxAllowedWeight - actualWeightKg))} kg.
                </span>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: FREIGHT CHARGE */}
        {activeTab === 'freight' && (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Coins size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--color-primary)]">
                    Status Biaya Freight Charge (Valas)
                  </h4>
                  <span className="text-[10px] text-[var(--color-secondary)]">
                    Data operasional dari EntryList pengiriman
                  </span>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                hasFreightCharge ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
              }`}>
                {hasFreightCharge ? 'Terdapat Biaya FC' : 'Tidak Ada FC'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Total FC Valas</span>
                <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                  {formatNumber(res?.freightChargeSummary?.totalFc || 0)} {res?.freightChargeSummary?.currency || ''}
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">Total biaya freight charge valas</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] block">Jumlah List Batch Terkena</span>
                <span className="text-base font-bold font-mono text-[var(--color-primary)] block">
                  {res?.freightChargeSummary?.listsWithFcCount || 0} list
                </span>
                <span className="text-[10px] text-[var(--color-secondary)] block truncate">Nomor list batch yang memuat nilai FC</span>
              </div>
            </div>

            {hasFreightCharge && res?.freightChargeSummary?.listsWithFc && res.freightChargeSummary.listsWithFc.length > 0 && (
              <div className="p-3 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)] text-xs space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--color-primary)] block">Daftar List Batch FC:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {res.freightChargeSummary.listsWithFc.map((lc) => (
                    <Badge key={lc} variant="default" className="font-mono text-[10px]">
                      {lc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <PriceListDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tglAgent={res.priceValidation?.fdTglAgent}
        effectiveDate={res.priceValidation?.effectiveDate}
        expectedMode={res.expectedMode || res.priceValidation?.expectedMode}
        expectedBranch={res.expectedBranch || res.priceValidation?.expectedBranch}
        salesName={res.customer?.fdSalesNM}
        customerName={res.customer?.fdCustName}
        customerCode={res.customer?.fdCustCode}
        hasCustomerPriceList={res.priceValidation?.hasCustomerPriceList}
        items={res.priceValidation?.items || []}
      />

      <CustMarkingDetailModal
        isOpen={isCustMarkingModalOpen}
        onClose={() => setIsCustMarkingModalOpen(false)}
        custCode={res.customer?.fdCustCode || null}
        markingCode={res.customer?.fdMarkingCode || res.fdListCode || listCode}
      />
    </div>
  )
}
