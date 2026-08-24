import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, AlertTriangle, Info, ShieldCheck, RefreshCw, Calendar, Tag, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatDecimal, formatCurrency, formatNumber } from '@/lib/utils'
import { PriceListDetailModal } from './PriceListDetailModal'
import { CustMarkingDetailModal } from './CustMarkingDetailModal'

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

interface M3CheckResponse {
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
  fdJmlBeratKomplain?: number | null
  totalJmlBeratSJ?: number | null
  fdVFCGudang?: number | null
  fdVFCPL?: number | null
  fdVFCKomplain?: number | null
  vfcGudangPerMarking?: number | null
  vfcKomplainPerMarking?: number | null
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

export function BillingValidationCard({ listCode, billedM3, billedKg, billedVfc, invoiceDetails = [], billFdTypeComodity }: BillingValidationCardProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCustMarkingModalOpen, setIsCustMarkingModalOpen] = useState(false)

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

  const plValues = res.m3PackingList?.values || []
  const gudangValues = res.m3Gudang?.values || []
  const komplainValues = res.m3Komplain?.values || []
  const komplainPerMarkingValues = res.m3KomplainPerMarking?.values || []
  const custMarkingValues = res.m3CustPerMarking?.values || []
  const plPerMarkingValues = res.m3PLPerMarking?.values || []
  const listBatchValues = res.m3ListBatch?.values || []

  // Extract Qty and fdSatuan from backend response
  const parseQty = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null
    const n = typeof val === 'number' ? val : parseInt(String(val), 10)
    return isNaN(n) ? null : n
  }

  const rawUnified = res.m3PackingList?.raw?.[0] || res.m3ListBatch?.raw?.[0] || {}
  const qtyList = res.fdQtyList ?? res.m3ListBatch?.qty ?? parseQty(rawUnified.fdQtyList ?? rawUnified.qtyList)
  const qtyPL = res.fdTotalQtyPL ?? res.m3PackingList?.qty ?? parseQty(rawUnified.fdTotalQtyPL ?? rawUnified.fdTtoalQtyPL ?? rawUnified.fdQtyPL)
  const qtyGudang = res.fdTotalQtyGudang ?? res.m3Gudang?.qty ?? parseQty(rawUnified.fdTotalQtyGudang ?? rawUnified.fdQtyGudang)
  const qtyKomplain = res.fdTotalQtyKomplain ?? res.m3Komplain?.qty ?? parseQty(rawUnified.fdTotalQtyKomplain ?? rawUnified.fdQtyKomplain)
  const totalEntryKomplain = res.totalEntryKomplain ?? res.m3KomplainPerMarking?.totalEntryKomplain ?? parseQty(rawUnified.TotalEntryKomplain ?? rawUnified.totalEntryKomplain ?? rawUnified.fdTotalEntryKomplain)
  const totalEntryList = res.totalEntryList ?? res.m3CustPerMarking?.totalEntryList ?? parseQty(rawUnified.TotalEntryList ?? rawUnified.totalEntryList ?? rawUnified.fdTotalEntryList)
  const fdSatuan = (res.fdSatuan || rawUnified.fdSatuan || rawUnified.Satuan || '').trim()

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

  const isAir = res.fdListType === 1 || res.expectedMode === 'BY AIR'

  // Air Mode (By Air) Berat / Weight validation
  const effectiveBilledKg = billedKg !== undefined && billedKg > 0 ? billedKg : 0
  const effectiveBilledVfc = billedVfc !== undefined && billedVfc > 0 ? billedVfc : 0
  const beratList = res.fdBeratList ?? 0
  const beratKomplain = res.fdJmlBeratKomplain ?? 0
  const beratSJ = res.totalJmlBeratSJ ?? 0
  const vfcGudang = res.fdVFCGudang ?? 0
  const minChargeKg = res.profileHarga?.minChargeKg && res.profileHarga.minChargeKg > 0 ? res.profileHarga.minChargeKg : (res.minChargeKg ?? 3)

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
    ...(res.m3KomplainPlusGudang !== null && res.m3KomplainPlusGudang !== undefined && res.m3KomplainPlusGudang > 0
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

  const isCodOrUrgent = res.isCodOrUrgent
  const recommendedM3 = res.recommendedM3
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

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-sm overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] uppercase tracking-wider text-[var(--color-primary)]">
            {isAir ? 'Validasi Tagihan Berat (Udara)' : t('billing.validation.title')}
          </h3>
          <span className="text-[11px] text-[var(--color-secondary)] font-normal">({listCode})</span>
          {isAir && (
            <Badge variant="default" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider">
              BY AIR
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant} className="flex items-center gap-1 text-[11px] px-2 py-0.5 font-semibold">
            <StatusIcon className="w-3.5 h-3.5" />
            {badgeText}
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

      {/* Main Comparison Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Card 1: Billed Metric */}
          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] bg-[var(--color-neutral)] p-2.5 sm:p-3">
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

          {isAir ? (
            <>
              {/* Group: Per ListCode (Data Berat Timbangan) */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 col-span-2 sm:col-span-4 lg:col-span-4">
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

              {/* Group: Per Marking & SJ (Air) */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 col-span-2 sm:col-span-2 lg:col-span-2">
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

                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
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
            </>
          ) : (
            <>
              {/* Group: Per ListCode (Sea) */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 col-span-2 sm:col-span-4 lg:col-span-4">
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
                  {/* EntryList */}
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

              {/* Group: Per Marking (Sea) */}
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 sm:p-3 col-span-2 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.perMarkingGroup') || 'Per Marking'}
                    </p>
                    {res.isPartialKomplain && (
                      <Badge variant="warning" className="text-[8px] px-1.5 py-0 font-bold">
                        Komplain Parsial ({totalEntryKomplain}/{totalEntryList} LC)
                      </Badge>
                    )}
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* M3 PL per Marking */}
                  <div
                    className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'PLPerMarking'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                  >
                    <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.pl')}
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

                  {/* M3 Customer per Marking */}
                  <div
                    className={`rounded-md border p-2 transition-colors ${matchStatus === 'MATCH_MARKING'
                      ? 'border-sky-500 dark:border-sky-400 bg-transparent ring-1 ring-sky-500/30'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                  >
                    <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.gudang')}
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

                  {/* M3 Komplain per Marking */}
                  <div
                    className={`rounded-md border p-2 transition-colors ${seaPrimaryMatch?.sourceKey === 'KomplainPerMarking'
                      ? 'border-emerald-500 dark:border-emerald-400 bg-transparent ring-1 ring-emerald-500/30'
                      : 'border-[var(--color-border)] bg-[var(--color-neutral)]'
                      }`}
                  >
                    <p className="text-[9px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.validation.komplain')}
                    </p>
                    <p className="mt-0.5 text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                      {komplainPerMarkingValues.length > 0 ? `${formatDecimal(komplainPerMarkingValues[0], 4)} m³` : '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--color-secondary)] font-medium tabular-nums flex items-center justify-between border-t border-[var(--color-border)]/60 pt-1">
                      <span className="text-[9px] truncate mr-1">Total LC</span>
                      <span className="font-semibold text-[var(--color-primary)]">
                        {totalEntryKomplain !== null ? `${formatNumber(totalEntryKomplain)}` : '—'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Hybrid Validation Bar if Partial Komplain */}
                {res.isPartialKomplain && res.m3KomplainPlusGudang !== null && res.m3KomplainPlusGudang !== undefined && res.m3KomplainPlusGudang > 0 && (
                  <div
                    className={`mt-2 p-1.5 rounded-md border text-[10px] font-mono flex items-center justify-between transition-colors ${
                      seaPrimaryMatch?.sourceKey === 'KomplainHybrid'
                        ? 'border-emerald-500 dark:border-emerald-400 bg-emerald-50/80 dark:bg-transparent text-emerald-950 dark:text-emerald-200'
                        : 'border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-transparent text-sky-950 dark:text-sky-200'
                    }`}
                  >
                    <span className="font-sans font-semibold text-[9px] flex items-center gap-1">
                      <span>Validasi Komplain + Gudang:</span>
                    </span>
                    <span className="font-bold tabular-nums">
                      {formatDecimal(res.m3KomplainPlusGudang, 4)} m³
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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

        {/* Tanggal Agen & Price List Info */}
        {res.priceValidation?.fdTglAgent && (
          <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-secondary)]">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
              <span>{t('billing.validation.tglAgent')}:</span>
              <span className="font-bold text-[var(--color-primary)]">{formatDate(res.priceValidation.fdTglAgent)}</span>
            </div>

            <div className="flex items-center gap-3">
              {res.priceValidation.hasCustomerPriceList && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-500 bg-transparent px-2 py-0.5 rounded border border-purple-500/40">
                  <Tag className="w-3 h-3 text-purple-500" />
                  <span>{t('billing.validation.customerPriceActive') || 'Price List Khusus Customer'}</span>
                </span>
              )}

              {res.priceValidation.effectiveDate && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-secondary)]">
                  <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{t('billing.validation.effectivePriceDate')}:</span>
                  <span className="font-semibold text-blue-500">{formatDate(res.priceValidation.effectiveDate)}</span>
                </div>
              )}

              {res.priceValidation.items && res.priceValidation.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-400 hover:underline transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('billing.validation.viewPriceList')}</span>
                </button>
              )}
            </div>
          </div>
        )}
        {/* Profile Harga Customer Section (dbo.get_profile_harga_dari_listcode) */}
        {res.profileHarga && (
          <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{t('billing.validation.custPriceProfile')}</span>
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Kelompok Tarif Utama */}
              <div className="md:col-span-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2">
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

              {/* Kelompok Tax Return */}
              <div className="md:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-2.5 space-y-2">
                <p className="text-[10px] uppercase font-sans text-[var(--color-secondary)] font-bold tracking-wider">
                  {t('billing.validation.taxReturnTitle')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
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

            <div className="overflow-x-auto border border-[var(--color-border)] rounded-lg">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[var(--color-neutral)] text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-2.5 py-2">{t('billing.detail.colDescription')}</th>
                    <th className="px-2.5 py-2">{t('billing.validation.commodityTypeCol') || 'TIPE KOMODITI'}</th>
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.invoicePriceCol')}</th>
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.priceProfileCol')}</th>
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.priceListCol')}</th>
                    <th className="px-2.5 py-2 text-center">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {invoiceDetails.map((item, idx) => {
                    const listType = res.fdListType ?? null
                    let typeId = item.fdTypeComodity ?? defaultTypeId ?? res.markingComodityType ?? null
                    let directComodityName = ''
                    
                    // Logic pencocokan komoditas cerdas:
                    // 1. Ambil teks di belakang tanda '-' jika ada (atau setelah PARCELS)
                    // 2. Pecahkan token berdasarkan tanda koma ','
                    // 3. Cocokkan irisan token dengan fdComodity dari master marking (get_qr_tbm3_perMarking_plus_rasio)
                    // 4. Pilih candidate dengan skor kecocokan tertinggi dan prioritaskan tier lebih tinggi (LARTAS - S) jika campuran
                    const itemNameUpper = (item.fdItemName || '').toUpperCase()
                    if (res.markingComodities && res.markingComodities.length > 0) {
                      const textAfterDash = itemNameUpper.includes('-')
                        ? itemNameUpper.split('-').slice(1).join('-').trim()
                        : itemNameUpper.replace(/^PARCELS\s+/i, '').trim()

                      const itemTokens = textAfterDash.split(',').map((t) => t.trim()).filter(Boolean)

                      const scoredCandidates = res.markingComodities
                        .filter((m) => !!m.fdComodity)
                        .map((m) => {
                          const mComUpper = m.fdComodity!.toUpperCase().trim()
                          const mTokens = mComUpper.split(',').map((t) => t.trim()).filter(Boolean)

                          let matchCount = 0
                          for (const it of itemTokens) {
                            for (const mt of mTokens) {
                              if (it === mt) {
                                matchCount += 3 // Exact token match
                              } else if (it.includes(mt) || mt.includes(it)) {
                                matchCount += 1 // Partial token match
                              }
                            }
                          }

                          const isFullExact = textAfterDash === mComUpper
                          const isSubstring = textAfterDash.includes(mComUpper) || mComUpper.includes(textAfterDash)
                          if (isSubstring) matchCount += 2

                          const catNameUpper = (m.fdComodityName || '').toUpperCase()
                          const isSuperLartas =
                            catNameUpper.includes('LARTAS - S') ||
                            catNameUpper.includes('LARTAS-S') ||
                            catNameUpper.includes('LARTAS S')

                          return {
                            candidate: m,
                            mComUpper,
                            matchCount,
                            isFullExact,
                            isSuperLartas,
                            length: mComUpper.length,
                          }
                        })
                        .filter((sc) => sc.matchCount > 0)
                        .sort((a, b) => {
                          // 1. Full exact match pertama
                          if (a.isFullExact !== b.isFullExact) return a.isFullExact ? -1 : 1
                          // 2. Skor kecocokan token tertinggi
                          if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount
                          // 3. Prioritaskan tier LARTAS - S jika gabungan
                          if (a.isSuperLartas !== b.isSuperLartas) return a.isSuperLartas ? -1 : 1
                          // 4. String kecocokan lebih panjang
                          return b.length - a.length
                        })

                      const matched = scoredCandidates.length > 0 ? scoredCandidates[0].candidate : null

                      if (matched) {
                        if (matched.fdTypeComodity) {
                          typeId = matched.fdTypeComodity
                        }
                        if (matched.fdComodityName) {
                          directComodityName = matched.fdComodityName
                        } else if (matched.fdComodity) {
                          directComodityName = matched.fdComodity
                        }
                      }
                    }

                    const isTaxReturnItem = (item.fdItemName || '').toUpperCase().includes('TAX RETURN') || (item.fdItemName || '').toUpperCase().includes('TAXRETURN')

                    // Find commodity name from tbTypeComodity (item specific or fallback to bill default)
                    let comodityName = ''
                    if (typeId) {
                      const matchType = res.comodityTypes?.find(
                        (c) => c.fdTypeComodity === typeId && (listType ? c.fdListType === listType : true)
                      )
                      if (matchType) {
                        comodityName = matchType.fdComodityName
                      }
                    }
                    if (!comodityName) {
                      comodityName = directComodityName || item.fdComodity || defaultComodityName
                    }

                    // Match with price list category (skipped for Tax Return)
                    let priceItem: PriceItem | null = null
                    let minTargetPrice = 0
                    let maxTargetPrice = 0
                    if (!isTaxReturnItem && res.priceValidation?.items && comodityName !== '—') {
                      const modeFilter = res.expectedMode || (listType === 1 ? 'BY AIR' : listType === 2 ? 'BY SEA' : null)
                      const branchFilter = res.expectedBranch || null
                      const expectedSheetType = res.customer?.fdBroker === 1 ? 'MKT' : 'CS'

                      // Prioritize CUSTOMER price list if available, then fallback to master CS/MKT
                      const custCandidates = res.priceValidation.items.filter((p) => {
                        if (p.sheetType?.toUpperCase() !== 'CUSTOMER') return false
                        if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
                        if (branchFilter && p.branch && p.branch.toUpperCase() !== branchFilter.toUpperCase()) return false
                        return true
                      })

                      const masterCandidates = res.priceValidation.items.filter((p) => {
                        if (p.sheetType?.toUpperCase() === 'CUSTOMER') return false
                        if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
                        if (branchFilter && p.branch && p.branch.toUpperCase() !== branchFilter.toUpperCase()) return false
                        if (p.sheetType && p.sheetType.toUpperCase() !== expectedSheetType) return false
                        return true
                      })

                      const candidateItems = custCandidates.length > 0 ? custCandidates : (masterCandidates.length > 0 ? masterCandidates : res.priceValidation.items)

                      const itemsToSearch = candidateItems.length > 0 ? candidateItems : res.priceValidation.items

                      const nameUpper = comodityName.toUpperCase()
                      const normName = nameUpper.replace(/[\s\-_]+/g, ' ').trim()

                      priceItem = itemsToSearch.find((p) => p.category.toUpperCase() === nameUpper || p.category.toUpperCase().replace(/[\s\-_]+/g, ' ').trim() === normName) || null

                      if (!priceItem) {
                        // Advanced keyword matching based on matrix
                        const isAir = listType === 1 || res.expectedMode === 'BY AIR'
                        if (isAir) {
                          if (normName.includes('GENERAL')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('general goods')) || null
                          } else if (normName.includes('BRANDED')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('branded goods')) || null
                          } else if (normName.includes('GARMENT')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('fabric') || p.category.toLowerCase().includes('garment')) || null
                          } else if (normName.includes('FOOD')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('ls &') || p.category.toLowerCase().includes('food')) || null
                          } else if (normName.includes('LAPTOP') || normName.includes('TABLET')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('laptop') || p.category.toLowerCase().includes('tablet')) || null
                          }
                        } else {
                          if (normName.includes('UMUM')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('general goods') || p.category.toUpperCase() === 'UMUM') || null
                          } else if (normName.includes('TEKSTIL')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('fabric') || p.category.toUpperCase() === 'TEKSTIL') || null
                          } else if (normName.includes('LARTAS N') || normName.includes('LARTAS NORMAL')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('lartas normal') || p.category.toUpperCase().includes('LARTAS NORMAL') || p.category.toUpperCase().includes('LARTAS - N') || p.category.toUpperCase().includes('LARTAS-N')) || null
                          } else if (normName.includes('ALKES') || normName.includes('MAKANAN') || normName.includes('FOOD') || normName.includes('LS')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('alkes') || p.category.toLowerCase().includes('makanan') || p.category.toLowerCase().includes('ls')) || null
                          } else if (normName.includes('LARTAS S') || normName.includes('LARTAS SUPER') || normName.includes('LARTAS SPECIAL') || normName.includes('KOSMETIK')) {
                            const matchedItems = itemsToSearch.filter((p) => {
                              const cat = p.category.toLowerCase()
                              return cat.includes('kosmetik') || cat.includes('obat') || cat.includes('alkes') || cat.includes('makanan') || cat.includes('ls') || p.category.toUpperCase().includes('LARTAS S') || p.category.toUpperCase().includes('LARTAS-S')
                            })
                            if (matchedItems.length > 0) {
                              priceItem = matchedItems[0]
                              minTargetPrice = Math.min(...matchedItems.map((p) => p.price))
                              maxTargetPrice = Math.max(...matchedItems.map((p) => p.price))
                            }
                          } else if (normName.includes('SEMI GARMENT')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('semi garment')) || null
                          } else if (normName.includes('GARMENT')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('garment')) || null
                          } else if (normName.includes('MACBOOK') || normName.includes('LAPTOP')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('laptop')) || null
                          } else if (normName.includes('IPAD') || normName.includes('TABLET')) {
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('ipad') || p.category.toLowerCase().includes('tablet')) || null
                          }
                        }
                      }

                      if (!priceItem) {
                        priceItem =
                          res.priceValidation.items.find(
                            (p) => p.category.toUpperCase().includes(nameUpper) || nameUpper.includes(p.category.toUpperCase())
                          ) || null
                      }
                    }

                      if (priceItem && minTargetPrice === 0 && maxTargetPrice === 0) {
                        minTargetPrice = priceItem.price
                        maxTargetPrice = priceItem.price
                      }

                    let profilePrice = 0
                    if (isTaxReturnItem) {
                      profilePrice = res.profileHarga?.taxReturnPrice || 0
                    } else {
                      profilePrice = res.profileHarga?.harga || 0
                    }

                    const isMatched = isTaxReturnItem
                      ? (profilePrice > 0 && Math.abs(item.fdItemPrice - profilePrice) < 0.01)
                      : (priceItem ? (item.fdItemPrice >= minTargetPrice - 0.01 && item.fdItemPrice <= maxTargetPrice + 0.01) : false)

                    const hasTargetPrice = isTaxReturnItem ? profilePrice > 0 : priceItem !== null
                    const targetColName = isTaxReturnItem || !priceItem ? t('billing.validation.priceProfileCol') : t('billing.validation.priceListCol')

                    let priceListDisplay = '—'
                    if (isTaxReturnItem) {
                      priceListDisplay = res.profileHarga?.taxReturnPrice && res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'
                    } else if (priceItem) {
                      const isCustPrice = priceItem.sheetType?.toUpperCase() === 'CUSTOMER'
                      if (minTargetPrice !== maxTargetPrice) {
                        priceListDisplay = `${formatCurrency(minTargetPrice)} - ${formatCurrency(maxTargetPrice)}${isCustPrice ? ' (Cust)' : ''}`
                      } else {
                        priceListDisplay = `${formatCurrency(priceItem.price)}${isCustPrice ? ' (Cust)' : ''}`
                      }
                    }

                    return (
                      <tr key={item.fdID || idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                        <td className="px-2.5 py-2 font-medium text-[var(--color-primary)] max-w-[180px] truncate" title={item.fdItemName}>
                          {item.fdItemName}
                          {isTaxReturnItem && (res.profileHarga?.taxReturnMinCharge ?? 0) > 0 && (
                            <span className="block text-[9px] font-normal text-[var(--color-secondary)]">
                              (Min Charge: {formatDecimal(res.profileHarga?.taxReturnMinCharge, 4)} m³)
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 font-semibold text-[var(--color-tertiary)] whitespace-nowrap">
                          {comodityName}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-semibold text-[var(--color-primary)]">
                          {formatCurrency(item.fdItemPrice)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-[var(--color-secondary)]">
                          {profilePrice > 0 ? formatCurrency(profilePrice) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-semibold text-blue-700 dark:text-blue-300">
                          {priceListDisplay}
                        </td>
                        <td className="px-2.5 py-2 text-center">
                          {isMatched ? (
                            <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px]">
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                              <span>{t('billing.validation.matchBadge')}</span>
                            </Badge>
                          ) : hasTargetPrice && (isTaxReturnItem ? profilePrice > 0 : priceItem !== null) ? (
                            item.fdItemPrice > (isTaxReturnItem ? profilePrice : maxTargetPrice) ? (
                              <Badge variant="danger" className="inline-flex items-center gap-1 font-semibold text-[10px]" title={`Harga invoice (${formatCurrency(item.fdItemPrice)}) lebih tinggi dari ${targetColName} (${priceListDisplay})`}>
                                <TrendingUp className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>{targetColName}</span>
                              </Badge>
                            ) : item.fdItemPrice < (isTaxReturnItem ? profilePrice : minTargetPrice) ? (
                              <Badge variant="warning" className="inline-flex items-center gap-1 font-semibold text-[10px]" title={`Harga invoice (${formatCurrency(item.fdItemPrice)}) lebih rendah dari ${targetColName} (${priceListDisplay})`}>
                                <TrendingDown className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>{targetColName}</span>
                              </Badge>
                            ) : (
                              <Badge variant="warning">{targetColName}</Badge>
                            )
                          ) : (
                            <span className="text-[10px] text-[var(--color-secondary)]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
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
