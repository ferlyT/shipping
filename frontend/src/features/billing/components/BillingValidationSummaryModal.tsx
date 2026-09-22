import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { useBillingValidation } from '../hooks/useBillingValidation'
import { getBillType, BILL_TYPES } from '../constants/billing.constants'
import { formatCurrency, formatDecimal, displayCustName } from '@/lib/utils'
import { ValidationSummaryHeader } from './validation-summary/ValidationSummaryHeader'
import { ValidationSummaryTabsBar } from './validation-summary/ValidationSummaryTabsBar'
import { FinancialAuditTab } from './validation-summary/FinancialAuditTab'
import { PhysicalAuditTab } from './validation-summary/PhysicalAuditTab'
import { OverweightAuditTab } from './validation-summary/OverweightAuditTab'
import { FreightAuditTab } from './validation-summary/FreightAuditTab'
import { TransportAuditTabContent } from './validation-summary/TransportAuditTabContent'
import { ValidationSummaryFooter } from './validation-summary/ValidationSummaryFooter'
import type {
  BillingValidationSummaryModalProps,
  SummaryModalTab,
} from './validation-summary/types'

// Re-export types from single source of truth (types/billing.types) for backward compatibility
export type {
  BillingValidationSummaryModalProps,
  SummaryModalTab,
}
export type {
  M3CheckResponse,
  MarkingDetailItem,
  ComodityType,
  PriceItem,
} from '../types/billing.types'

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
  const hasAutoSelectedRef = useRef<string | null>(null)

  const billType = billTypeProp || getBillType(billingData)
  const isTransport = billType === BILL_TYPES.TRANSPORT
  const details = [...(billingData?.details || [])].sort((a, b) =>
    String(a?.fdID ?? '').localeCompare(String(b?.fdID ?? ''))
  )

  const hasTransportItem =
    isTransport ||
    details.some((d) => {
      const name = (d?.fdItemName || '').toUpperCase()
      return (
        name.includes('TRANSPORT') ||
        name.includes('DELIVERY') ||
        name.includes('ONGKIR') ||
        name.includes('TRUCKING')
      )
    })

  const transportDetailItem = details.find((d) => {
    const name = (d?.fdItemName || '').toUpperCase()
    return (
      name.includes('TRANSPORT') ||
      name.includes('DELIVERY') ||
      name.includes('ONGKIR') ||
      name.includes('TRUCKING')
    )
  })

  const effectiveTransportAmount = transportDetailItem
    ? Number(transportDetailItem.fdTotal || 0) > 0
      ? Number(transportDetailItem.fdTotal)
      : Number(transportDetailItem.fdItemPrice || 0)
    : Number(billingData.fdJumlah2 || 0) > 0
      ? Number(billingData.fdJumlah2)
      : Number(billingData.fdJumlah1 || 0)

  const allBillingListCodes = Array.from(
    new Set(
      [billingData.fdListCode, res?.fdListCode, ...(billingData?.details || []).map((d) => d.fdListCode)]
        .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4)
        .map((lc) => lc.trim())
    )
  )
  const billingListCodeParam =
    allBillingListCodes.join(',') || (billingData.fdListCode ? String(billingData.fdListCode).trim() : '')

  const { data: transportValidation } = useQuery({
    queryKey: [
      'billingTransportCheck',
      billingData.fdInvNo,
      billingData.fdCustCode,
      billingData.fdMarkingCode,
      billingData.fdMarkingNo,
      billingListCodeParam,
      effectiveTransportAmount,
      hasTransportItem,
    ],
    queryFn: async () => {
      if (!billingListCodeParam && (!billingData.fdCustCode || !billingData.fdMarkingCode)) return null
      const response = await billingApi.transportCheck({
        invNo: billingData.fdInvNo,
        custCode: billingData.fdCustCode || '',
        markingCode: billingData.fdMarkingCode || '',
        markingNo: billingData.fdMarkingNo || '',
        listCode: billingListCodeParam,
        amount: effectiveTransportAmount,
      })
      return (response.data as any)?.data || null
    },
    enabled:
      !validationProp &&
      isOpen &&
      (!!billingListCodeParam || (!!billingData.fdCustCode && !!billingData.fdMarkingCode)),
    staleTime: 60000,
  })

  // Single Source of Truth via useBillingValidation
  const internalValidation = useBillingValidation({
    billingData,
    validationData: res,
    transportValidation,
  })
  const v = validationProp ?? internalValidation

  const {
    isAir,
    isType2,
    billedM3,
    isMatch,
    matchLabel,
    overweight,
    evaluatedItems,
    underchargedItems,
    hasPriceDiscrepancy,
    mustBillExpedisiList,
    unbilledExpedisiList,
    totalUnbilledTransportAmount,
    hasUnbilledTransport,
    isOverallValid,
  } = v

  const hasUnderchargePrice = !isLoadingValidation && underchargedItems.length > 0
  const hasUnbilledTransportActive = !isLoadingValidation && hasUnbilledTransport
  const hasWarning = !isLoadingValidation && (!isOverallValid || Boolean(v.isBilledBelowMinM3))

  // Auto-select tab logic based on discrepancy priority
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

    if (isType2) {
      setActiveTab('m3_weight')
      hasAutoSelectedRef.current = String(billingData.fdInvNo)
      return
    }

    if (res && !isLoadingValidation && hasAutoSelectedRef.current !== String(billingData.fdInvNo)) {
      if (!isMatch) {
        setActiveTab('m3_weight')
      } else if (overweight.isOverweight && !overweight.isBilledOverweightMatch) {
        setActiveTab('overweight')
      } else if (hasUnderchargePrice) {
        setActiveTab('items')
      } else if (hasUnbilledTransportActive) {
        setActiveTab('transport')
      } else {
        setActiveTab('items')
      }
      hasAutoSelectedRef.current = String(billingData.fdInvNo)
    }
  }, [
    isOpen,
    initialTab,
    billingData.fdInvNo,
    isType2,
    res,
    isLoadingValidation,
    isMatch,
    overweight.isOverweight,
    overweight.isBilledOverweightMatch,
    hasUnderchargePrice,
    hasUnbilledTransportActive,
  ])

  // Resolve Customer Name (Single Source of Truth)
  const resolvedCustName = displayCustName(
    billingData.customer?.fdCustName || res?.customer?.fdCustName || billingData.fdCustCode
  )

  // Verdict calculation
  const verdictTitle = isLoadingValidation
    ? 'Memvalidasi Data Fisik & Acuan Tarif...'
    : isOverallValid && !v.isBilledBelowMinM3
      ? 'Tagihan Sesuai dengan Data Fisik & Acuan Tarif'
      : hasUnderchargePrice
        ? `Ditemukan Tarif di Bawah Acuan (Undercharge: ${underchargedItems.map((u) => u.itemName).join(', ')})`
        : hasUnbilledTransportActive
          ? `Biaya Ekspedisi (${formatCurrency(totalUnbilledTransportAmount)}) Belum Ditagihkan`
          : !isMatch
            ? isAir
              ? 'Selisih Berat Tagihan dengan Data Timbangan'
              : 'Selisih Kubikasi (M3) Tagihan dengan Data Fisik'
            : v.isBilledBelowMinM3
              ? `Peringatan: Volume Ditagihkan (${formatDecimal(billedM3, 4)} m³) di Bawah Min. Charge (${formatDecimal(v.minChargeM3, 3)} m³)`
              : 'Terdapat Catatan Validasi Pada Invoice Ini'

  const verdictDescription = isLoadingValidation
    ? 'Sedang memuat data operasional gudang, timbangan, dan acuan tarif master...'
    : isOverallValid && !v.isBilledBelowMinM3
      ? 'Seluruh kubikasi, berat timbangan, dan tarif item telah cocok dengan data operasional dan price list.'
      : hasUnderchargePrice
        ? `Terdapat harga item invoice yang lebih rendah dari acuan resmi price list.`
        : hasUnbilledTransportActive
          ? `Terdapat catatan ekspedisi operasional di tbExpIndo yang berstatus Harus Tagih namun belum dimasukkan ke invoice.`
          : !isMatch
            ? `Nilai yang ditagihkan tidak cocok dengan dokumen fisik gudang/packing list.`
            : v.isBilledBelowMinM3
              ? `Volume tagihan lebih rendah dari batas minimum charge (${formatDecimal(v.minChargeM3, 4)} m³). Pastikan apakah penagihan volume riil ini disengaja.`
              : 'Harap periksa rincian pada tab audit di atas sebelum menerbitkan invoice.'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" className="h-[85vh] max-h-[85vh] flex flex-col" zIndex="z-[100]">
      <ValidationSummaryHeader
        billingData={billingData}
        customerName={resolvedCustName}
        isOverallValid={!isLoadingValidation && isOverallValid}
        hasWarning={hasWarning}
        isLoadingValidation={isLoadingValidation}
        onClose={onClose}
      />

      <ValidationSummaryTabsBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAir={isAir}
        isLoadingValidation={isLoadingValidation}
        hasPriceDiscrepancy={!isLoadingValidation && hasPriceDiscrepancy}
        hasPhysicalDiscrepancy={!isLoadingValidation && !isMatch}
        isBilledBelowMinM3={!isLoadingValidation && v.isBilledBelowMinM3}
        hasOverweightIssue={!isLoadingValidation && (overweight.isOverweight && !overweight.isBilledOverweightMatch)}
        hasUnbilledTransport={!isLoadingValidation && hasUnbilledTransport}
        hasFreightCharge={Boolean(res?.freightChargeSummary?.totalFc && res.freightChargeSummary.totalFc > 0)}
        freightChargeSummary={res?.freightChargeSummary}
        itemCount={details.length}
      />

      <Modal.Body className="p-3.5 sm:p-4 overflow-y-auto min-h-0 flex-1 bg-[var(--color-surface)]">
        {isLoadingValidation ? (
          <div className="p-12 text-center text-xs text-[var(--color-secondary)] space-y-2">
            <div className="h-6 w-36 mx-auto rounded-lg skeleton-shimmer" />
            <p>Memuat dan memvalidasi data invoice dari database...</p>
          </div>
        ) : (
          <>
            {activeTab === 'items' && (
              <FinancialAuditTab
                evaluatedItems={evaluatedItems}
              />
            )}

            {activeTab === 'm3_weight' && (
              <PhysicalAuditTab
                isAir={isAir}
                isType2={isType2}
                billedM3={billedM3}
                effectiveBilledKg={overweight.effectiveBilledKg}
                validationData={res}
                invNo={billingData.fdInvNo}
                markingCode={billingData.fdMarkingCode}
                isMatch={isMatch}
                matchLabel={matchLabel}
                minChargeM3={v.minChargeM3}
                isBilledBelowMinM3={v.isBilledBelowMinM3}
                matchedSourceKey={isAir ? v.airPrimaryMatch?.sourceKey : v.seaPrimaryMatch?.sourceKey}
              />
            )}

            {activeTab === 'overweight' && (
              <OverweightAuditTab overweight={overweight} billedM3={billedM3} />
            )}

            {activeTab === 'freight' && (
              <FreightAuditTab freightChargeSummary={res?.freightChargeSummary} />
            )}

            {activeTab === 'transport' && (
              <TransportAuditTabContent
                unbilledExpedisiList={unbilledExpedisiList}
                mustBillExpedisiList={mustBillExpedisiList}
                totalUnbilledAmount={totalUnbilledTransportAmount}
                hasUnbilledTransport={hasUnbilledTransport}
                effectiveTransportAmount={effectiveTransportAmount}
              />
            )}
          </>
        )}
      </Modal.Body>

      <ValidationSummaryFooter
        verdictTitle={verdictTitle}
        verdictDescription={verdictDescription}
        isOverallValid={!isLoadingValidation && isOverallValid}
        hasWarning={hasWarning}
        isLoadingValidation={isLoadingValidation}
        onOpenIssueModal={onOpenIssueModal}
        onClose={onClose}
        canIssue={Number(billingData.fdGive) !== 1}
      />
    </Modal>
  )
}
