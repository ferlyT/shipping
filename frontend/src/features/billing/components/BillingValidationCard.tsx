import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, AlertTriangle, Info, ShieldCheck, RefreshCw, Calendar, Tag, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useTranslation } from '@/hooks/useTranslation'
import { formatDate, formatDecimal, formatCurrency } from '@/lib/utils'
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
  fdTglAgent?: string | null
  expectedMode?: string | null
  expectedBranch?: string | null
  priceValidation?: {
    fdTglAgent: string | null
    effectiveDate: string | null
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
  m3PackingList: { raw: any[]; values: number[] }
  m3Gudang: { raw: any[]; values: number[] }
  m3CustPerMarking: { raw: any[]; values: number[] }
  m3Komplain: { raw: any[]; values: number[] }
  m3ListBatch?: { raw: any[]; values: number[] }
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

export function BillingValidationCard({ listCode, billedM3, invoiceDetails = [], billFdTypeComodity }: BillingValidationCardProps) {
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

  // Bill-level Commodity Category (default from entryList join)
  const defaultTypeId = billFdTypeComodity ?? res?.defaultFdTypeComodity ?? null
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
  const custMarkingValues = res.m3CustPerMarking?.values || []
  const listBatchValues = res.m3ListBatch?.values || []

  // Helper untuk aturan M3 minimal 0.1 m³
  const normM3 = (v: number) => (v > 0 && v < 0.1 ? 0.1 : v)

  // Check 1: Primary match against PL, Gudang, Komplain, dan List Batch
  const primaryCandidates: { sourceKey: string; sourceName: string; val: number; rawVal: number }[] = [
    ...plValues.map((v) => ({ sourceKey: 'PL', sourceName: t('billing.validation.pl'), val: normM3(v), rawVal: v })),
    ...gudangValues.map((v) => ({ sourceKey: 'Gudang', sourceName: t('billing.validation.gudang'), val: normM3(v), rawVal: v })),
    ...komplainValues.map((v) => ({ sourceKey: 'Komplain', sourceName: t('billing.validation.komplain'), val: normM3(v), rawVal: v })),
    ...listBatchValues.map((v) => ({ sourceKey: 'ListBatch', sourceName: t('billing.validation.listBatch') || 'M3 List Batch', val: normM3(v), rawVal: v })),
  ]

  const primaryMatch = primaryCandidates.find((c) => Math.abs(c.val - billedM3) < 0.001)

  // Check 2: Secondary match against M3 per Marking jika tidak match di primary
  const rawMarkingVal = custMarkingValues.length > 0 ? custMarkingValues[0] : null
  const markingCandidate = custMarkingValues
    .map(normM3)
    .find((v) => Math.abs(v - billedM3) < 0.001)

  let matchStatus: 'MATCH_PRIMARY' | 'MATCH_MARKING' | 'NO_MATCH' = 'NO_MATCH'
  let matchedSourceName = ''
  let isMinChargeApplied = false
  let matchedRawVal = 0

  if (primaryMatch) {
    matchStatus = 'MATCH_PRIMARY'
    matchedSourceName = primaryMatch.sourceName
    matchedRawVal = primaryMatch.rawVal
    isMinChargeApplied = primaryMatch.rawVal > 0 && primaryMatch.rawVal < 0.1
  } else if (markingCandidate !== undefined) {
    matchStatus = 'MATCH_MARKING'
    matchedSourceName = t('billing.validation.custPerMarking')
    matchedRawVal = rawMarkingVal || 0
    isMinChargeApplied = matchedRawVal > 0 && matchedRawVal < 0.1
  }

  const isCodOrUrgent = res.isCodOrUrgent
  const recommendedM3 = res.recommendedM3
  const isCodUrgentShortfall = isCodOrUrgent && recommendedM3 > billedM3 + 0.001

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

  const badgeText = isCodUrgentShortfall
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
            {t('billing.validation.title')}
          </h3>
          <span className="text-[11px] text-[var(--color-secondary)] font-normal">({listCode})</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={badgeVariant} className="flex items-center gap-1 text-[11px] px-2 py-0.5 font-semibold">
            <StatusIcon className="w-3.5 h-3.5" />
            {badgeText}
          </Badge>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Comparison Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* M3 Tagihan */}
          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-primary)] bg-[var(--color-neutral)] p-2.5 sm:p-3">
            <p className="text-[10px] uppercase font-bold font-[var(--font-label)] text-[var(--color-secondary)]">
              {t('billing.validation.billedM3')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-bold text-[var(--color-primary)] tabular-nums">
              {formatDecimal(billedM3, 4)} m³
            </p>
          </div>

          {/* M3 Packing List */}
          <div
            className={`rounded-[var(--radius-lg)] border p-2.5 sm:p-3 transition-colors ${primaryMatch?.sourceKey === 'PL'
              ? 'border-green-500 bg-green-50/50'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <p className="text-[10px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
              {t('billing.validation.pl')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
              {plValues.length > 0 ? `${formatDecimal(plValues[0], 4)} m³` : '—'}
            </p>
          </div>

          {/* M3 Gudang */}
          <div
            className={`rounded-[var(--radius-lg)] border p-2.5 sm:p-3 transition-colors ${primaryMatch?.sourceKey === 'Gudang'
              ? 'border-green-500 bg-green-50/50'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <p className="text-[10px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
              {t('billing.validation.gudang')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
              {gudangValues.length > 0 ? `${formatDecimal(gudangValues[0], 4)} m³` : '—'}
            </p>
          </div>

          {/* M3 Komplain */}
          <div
            className={`rounded-[var(--radius-lg)] border p-2.5 sm:p-3 transition-colors ${primaryMatch?.sourceKey === 'Komplain'
              ? 'border-green-500 bg-green-50/50'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <p className="text-[10px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
              {t('billing.validation.komplain')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
              {komplainValues.length > 0 ? `${formatDecimal(komplainValues[0], 4)} m³` : '—'}
            </p>
          </div>

          {/* M3 Customer per Marking */}
          <div
            className={`rounded-[var(--radius-lg)] border p-2.5 sm:p-3 transition-colors ${matchStatus === 'MATCH_MARKING'
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
                {t('billing.validation.custPerMarking')}
              </p>
              {res.customer?.fdCustCode && (
                <button
                  type="button"
                  onClick={() => setIsCustMarkingModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-0.5"
                  title={t('billing.validation.viewCustMarkingDetail')}
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
              {custMarkingValues.length > 0 ? `${formatDecimal(custMarkingValues[0], 4)} m³` : '—'}
            </p>
            {res.customer?.fdCustCode && (
              <button
                type="button"
                onClick={() => setIsCustMarkingModalOpen(true)}
                className="mt-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('billing.validation.viewDetail')}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* M3 Entry List / Batch */}
          <div
            className={`rounded-[var(--radius-lg)] border p-2.5 sm:p-3 transition-colors ${primaryMatch?.sourceKey === 'ListBatch'
              ? 'border-green-500 bg-green-50/50'
              : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
          >
            <p className="text-[10px] uppercase font-semibold font-[var(--font-label)] text-[var(--color-secondary)]">
              {t('billing.validation.listBatch')}
            </p>
            <p className="mt-1 text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
              {listBatchValues.length > 0 ? `${formatDecimal(listBatchValues[0], 4)} m³` : '—'}
            </p>
          </div>
        </div>

        {/* Status Explanation Message */}
        <div className="space-y-2">
          {matchStatus === 'MATCH_PRIMARY' && (
            <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-[var(--radius-md)] p-2.5">
              <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5 stroke-[2.5]" />
              <span>
                {isMinChargeApplied
                  ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data ${matchedSourceName}: ${formatDecimal(matchedRawVal, 4)} m³)`
                  : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan data ${matchedSourceName}`}
              </span>
            </div>
          )}

          {matchStatus === 'MATCH_MARKING' && (
            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-[var(--radius-md)] p-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {isMinChargeApplied
                  ? `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) SESUAI aturan M3 Minimal 0,1 m³ (Data M3 per Marking: ${formatDecimal(matchedRawVal, 4)} m³)`
                  : `M3 Tagihan (${formatDecimal(billedM3, 4)} m³) COCOK dengan M3 per Marking`}
              </span>
            </div>
          )}

          {matchStatus === 'NO_MATCH' && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-md)] p-2.5">
              <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5 stroke-[2.5]" />
              <span>
                {t('billing.validation.noMatch').replace('{billed}', formatDecimal(billedM3, 4))}
              </span>
            </div>
          )}

          {/* COD / URGENT Alert */}
          {isCodUrgentShortfall && (
            <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-[var(--radius-md)] p-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                {t('billing.validation.codUrgentWarning').replace('{recommended}', formatDecimal(recommendedM3, 4))}
              </span>
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
              {res.priceValidation.effectiveDate && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                  <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{t('billing.validation.effectivePriceDate')}:</span>
                  <span className="font-semibold text-blue-700">{formatDate(res.priceValidation.effectiveDate)}</span>
                </div>
              )}

              {res.priceValidation.items && res.priceValidation.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
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
              <Badge variant="default" className="text-[10px] font-mono bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
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
              <div className="md:col-span-3 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-lg p-2.5 space-y-2">
                <p className="text-[10px] uppercase font-sans text-purple-700 dark:text-purple-300 font-bold tracking-wider">
                  {t('billing.validation.mainTariff')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="bg-[var(--color-surface)] border border-purple-200/60 dark:border-purple-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-purple-700 dark:text-purple-300 font-bold">{t('billing.validation.m3Price')}</p>
                    <p className="font-bold text-purple-900 dark:text-purple-200 mt-0.5 text-xs sm:text-sm">
                      {res.profileHarga.harga > 0 ? formatCurrency(res.profileHarga.harga) : '—'}
                    </p>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-purple-200/60 dark:border-purple-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-purple-700 dark:text-purple-300 font-bold">{t('billing.validation.kgPrice')}</p>
                    <p className="font-bold text-purple-900 dark:text-purple-200 mt-0.5 text-xs sm:text-sm">
                      {res.profileHarga.kg > 0 ? `${formatDecimal(res.profileHarga.kg, 0)} kg` : '—'}
                    </p>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-purple-200/60 dark:border-purple-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-purple-700 dark:text-purple-300 font-bold">{t('billing.validation.ratio')}</p>
                    <p className="font-bold text-purple-900 dark:text-purple-200 mt-0.5 text-xs sm:text-sm">
                      {res.profileHarga.rasio > 0 ? formatDecimal(res.profileHarga.rasio, 2) : '—'}
                    </p>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-purple-200/60 dark:border-purple-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-purple-700 dark:text-purple-300 font-bold">
                      {res.fdListType === 1 ? t('billing.validation.minChargeKg') : t('billing.validation.minChargeM3')}
                    </p>
                    <div className="mt-0.5">
                      {res.fdListType === 1 ? (
                        (res.profileHarga.minChargeKg ?? 0) > 0 ? (
                          <p className="font-bold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
                            {`${formatDecimal(res.profileHarga.minChargeKg, 2)} kg`}
                          </p>
                        ) : (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
                              3.00 kg
                            </span>
                            <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              ({t('billing.validation.noDataYet')})
                            </span>
                          </div>
                        )
                      ) : (res.profileHarga.minChargeM3 ?? 0) > 0 ? (
                        <p className="font-bold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
                          {`${formatDecimal(res.profileHarga.minChargeM3, 4)} m³`}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-bold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
                            0.1000 m³
                          </span>
                          <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                            ({t('billing.validation.noDataYet')})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kelompok Tax Return */}
              <div className="md:col-span-2 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-lg p-2.5 space-y-2">
                <p className="text-[10px] uppercase font-sans text-blue-700 dark:text-blue-300 font-bold tracking-wider">
                  {t('billing.validation.taxReturnTitle')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[var(--color-surface)] border border-blue-200/60 dark:border-blue-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-blue-700 dark:text-blue-300 font-bold">{t('billing.validation.taxReturnTariff')}</p>
                    <p className="font-bold text-blue-900 dark:text-blue-200 mt-0.5 text-xs sm:text-sm">
                      {res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—'}
                    </p>
                  </div>

                  <div className="bg-[var(--color-surface)] border border-blue-200/60 dark:border-blue-900/40 rounded-md p-2">
                    <p className="text-[9px] uppercase font-sans text-blue-700 dark:text-blue-300 font-bold">{t('billing.validation.taxReturnMinCharge')}</p>
                    <p className="font-bold text-blue-900 dark:text-blue-200 mt-0.5 text-xs sm:text-sm">
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
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  {defaultComodityName}
                </span>
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
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.invoicePriceCol')}</th>
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.priceProfileCol')}</th>
                    <th className="px-2.5 py-2 text-right">{t('billing.validation.priceListCol')}</th>
                    <th className="px-2.5 py-2 text-center">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {invoiceDetails.map((item, idx) => {
                    const listType = res.fdListType ?? null
                    const typeId = item.fdTypeComodity ?? defaultTypeId ?? null
                    const isTaxReturnItem = (item.fdItemName || '').toUpperCase().includes('TAX RETURN') || (item.fdItemName || '').toUpperCase().includes('TAXRETURN')

                    // Find commodity name from tbTypeComodity (item specific or fallback to bill default)
                    const matchType = res.comodityTypes?.find(
                      (c) => c.fdTypeComodity === typeId && (listType ? c.fdListType === listType : true)
                    )
                    const comodityName = matchType ? matchType.fdComodityName : item.fdComodity || defaultComodityName

                    // Match with price list category (skipped for Tax Return)
                    let priceItem: PriceItem | null = null
                    if (!isTaxReturnItem && res.priceValidation?.items && comodityName !== '—') {
                      const modeFilter = res.expectedMode || (listType === 1 ? 'BY AIR' : listType === 2 ? 'BY SEA' : null)
                      const branchFilter = res.expectedBranch || null

                      // Filter candidate items matching mode & branch
                      const candidateItems = res.priceValidation.items.filter((p) => {
                        if (modeFilter && p.mode && p.mode.toUpperCase() !== modeFilter.toUpperCase()) return false
                        if (branchFilter && p.branch && p.branch.toUpperCase() !== branchFilter.toUpperCase()) return false
                        return true
                      })

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
                            priceItem = itemsToSearch.find((p) => p.category.toLowerCase().includes('kosmetik') || p.category.toLowerCase().includes('obat') || p.category.toUpperCase().includes('LARTAS S') || p.category.toUpperCase().includes('LARTAS-S')) || null
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

                    let profilePrice = 0
                    if (isTaxReturnItem) {
                      profilePrice = res.profileHarga?.taxReturnPrice || 0
                    } else {
                      profilePrice = res.profileHarga?.harga || 0
                    }

                    const isMatched = isTaxReturnItem
                      ? (profilePrice > 0 && Math.abs(item.fdItemPrice - profilePrice) < 0.01)
                      : (priceItem ? Math.abs(item.fdItemPrice - priceItem.price) < 0.01 : false)

                    const targetPrice = isTaxReturnItem ? profilePrice : (priceItem ? priceItem.price : 0)
                    const hasTargetPrice = isTaxReturnItem ? profilePrice > 0 : priceItem !== null
                    const targetColName = isTaxReturnItem || !priceItem ? t('billing.validation.priceProfileCol') : t('billing.validation.priceListCol')

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
                        <td className="px-2.5 py-2 text-right font-mono font-semibold text-[var(--color-primary)]">
                          {formatCurrency(item.fdItemPrice)}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-[var(--color-secondary)]">
                          {profilePrice > 0 ? formatCurrency(profilePrice) : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-semibold text-blue-700 dark:text-blue-300">
                          {isTaxReturnItem
                            ? (res.profileHarga?.taxReturnPrice && res.profileHarga.taxReturnPrice > 0 ? formatCurrency(res.profileHarga.taxReturnPrice) : '—')
                            : (priceItem ? formatCurrency(priceItem.price) : '—')}
                        </td>
                        <td className="px-2.5 py-2 text-center">
                          {isMatched ? (
                            <Badge variant="success" className="inline-flex items-center gap-1 font-semibold text-[10px]">
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                              <span>{t('billing.validation.matchBadge')}</span>
                            </Badge>
                          ) : hasTargetPrice && targetPrice > 0 ? (
                            item.fdItemPrice > targetPrice ? (
                              <Badge variant="danger" className="inline-flex items-center gap-1 font-semibold text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" title={`Harga invoice (${formatCurrency(item.fdItemPrice)}) beda dengan ${targetColName} (${formatCurrency(targetPrice)})`}>
                                <TrendingUp className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>{targetColName}</span>
                              </Badge>
                            ) : item.fdItemPrice < targetPrice ? (
                              <Badge variant="warning" className="inline-flex items-center gap-1 font-semibold text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" title={`Harga invoice (${formatCurrency(item.fdItemPrice)}) beda dengan ${targetColName} (${formatCurrency(targetPrice)})`}>
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
