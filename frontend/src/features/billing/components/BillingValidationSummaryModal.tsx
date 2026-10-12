import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '../services/billing.service'
import { useBillingValidation } from '../hooks/useBillingValidation'
import { getBillType, BILL_TYPES } from '../constants/billing.constants'
import { displayCustName } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { extractInvoiceOpenTarget } from '../utils/voiceSearch.utils'
import { ValidationSummaryHeader } from './validation-summary/ValidationSummaryHeader'
import { ValidationSummaryTabsBar } from './validation-summary/ValidationSummaryTabsBar'
import { FinancialAuditTab } from './validation-summary/FinancialAuditTab'
import { PhysicalAuditTab } from './validation-summary/PhysicalAuditTab'
import { OverweightAuditTab } from './validation-summary/OverweightAuditTab'
import { FreightAuditTab } from './validation-summary/FreightAuditTab'
import { TransportAuditTabContent } from './validation-summary/TransportAuditTabContent'
import { ValidationSummaryFooter } from './validation-summary/ValidationSummaryFooter'
import { toast } from '@/stores/toastStore'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { useVoiceAssistantPermission } from '@/hooks/useVoiceAssistantPermission'
import {
  findTransportDetailItem,
  getEffectiveTransportAmount,
  getEffectiveInvoiceTotal,
  calculateValidationVerdict,
} from './validation-summary/validationSummary.utils'
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
  onSelectInvoice,
}: BillingValidationSummaryModalProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SummaryModalTab>(() => {
    const isInitialType2 = res?.profileHarga?.typeTagihan === 2 || !!validationProp?.isType2
    return isInitialType2 ? 'm3_weight' : 'items'
  })
  const hasAutoSelectedRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const { suppressVoice, isMuted, toggleVoiceMute } = useVoiceAssistantStore()
  const canUseVoice = useVoiceAssistantPermission()

  // Supresi asisten suara global selama modal validasi & audit ini terbuka
  useEffect(() => {
    if (!isOpen) return
    const unsuppress = suppressVoice()
    return () => {
      unsuppress()
    }
  }, [isOpen, suppressVoice])

  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const isManuallyStoppedRef = useRef(false)
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceCommandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // In-modal voice recognition lokal (terisolasi dari voice global & standby hands-free)
  const {
    isSupported: isVoiceSupported,
    isListening: isVoiceListening,
    transcript: voiceTranscript,
    interimTranscript: voiceInterim,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
    resetTranscript,
  } = useVoiceRecognition({
    lang: 'id-ID',
    continuous: true,
    interimResults: true,
    onEnd: () => {
      // Auto re-arm standby jika modal masih terbuka, tidak dimatikan manual, dan TIDAK MUTED TERPUSAT
      if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        rearmTimerRef.current = setTimeout(() => {
          if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
            startVoiceListening()
          }
        }, 200)
      }
    },
  })

  // Standby otomatis mendengarkan seketika saat modal dibuka HANYA JIKA !isMuted
  useEffect(() => {
    if (isOpen && isVoiceSupported && !isMuted) {
      isManuallyStoppedRef.current = false
      const timer = setTimeout(() => {
        if (isOpenRef.current && !isManuallyStoppedRef.current && !useVoiceAssistantStore.getState().isMuted) {
          startVoiceListening()
        }
      }, 150)
      return () => {
        clearTimeout(timer)
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        if (voiceCommandTimerRef.current) {
          clearTimeout(voiceCommandTimerRef.current)
          voiceCommandTimerRef.current = null
        }
      }
    } else {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopVoiceListening()
      resetTranscript()
    }
  }, [isOpen, isVoiceSupported, isMuted, startVoiceListening, stopVoiceListening, resetTranscript])

  // KONTROL TERPUSAT: Bereaksi seketika terhadap perubahan isMuted (dari Floating HUD atau Alt+V) saat modal terbuka
  useEffect(() => {
    if (!isOpen) return
    if (isMuted) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopVoiceListening()
      resetTranscript()
    } else if (isVoiceSupported && isOpenRef.current) {
      isManuallyStoppedRef.current = false
      startVoiceListening()
    }
  }, [isMuted, isOpen, isVoiceSupported, startVoiceListening, stopVoiceListening, resetTranscript])

  const handleToggleVoice = () => {
    toggleVoiceMute() // Sinkronkan ke Master Control terpusat!
  }

  // Shortcut Alt+V di dalam modal untuk toggle mic lokal (tersinkronisasi ke store)
  useEffect(() => {
    if (!isOpen || !canUseVoice) return
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        e.preventDefault()
        e.stopPropagation()
        toggleVoiceMute() // Sinkronkan ke Master Control terpusat!
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, canUseVoice, toggleVoiceMute])



  const billType = billTypeProp || getBillType(billingData)
  const isTransport = billType === BILL_TYPES.TRANSPORT

  const details = useMemo(() => {
    return [...(billingData?.details || [])].sort((a, b) =>
      String(a?.fdID ?? '').localeCompare(String(b?.fdID ?? ''))
    )
  }, [billingData?.details])

  const transportDetailItem = useMemo(() => {
    return findTransportDetailItem(details)
  }, [details])

  const hasTransportItem = isTransport || Boolean(transportDetailItem)

  const effectiveTransportAmount = useMemo(() => {
    return getEffectiveTransportAmount(billingData, transportDetailItem)
  }, [billingData, transportDetailItem])

  const allBillingListCodes = useMemo(() => {
    return Array.from(
      new Set(
        [billingData.fdListCode, res?.fdListCode, ...(billingData?.details || []).map((d) => d.fdListCode)]
          .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4)
          .map((lc) => lc.trim())
      )
    )
  }, [billingData.fdListCode, billingData?.details, res?.fdListCode])

  const billingListCodeParam = useMemo(() => {
    return allBillingListCodes.join(',') || (billingData.fdListCode ? String(billingData.fdListCode).trim() : '')
  }, [allBillingListCodes, billingData.fdListCode])

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
  const isOverweightUnbilled = overweight.isOverweight && !overweight.isBilledOverweightMatch
  const hasOverweightIssue = !isAir && !isType2 && (
    isOverweightUnbilled ||
    overweight.isBilledUnneededOverweight
  )
  const hasWarning = !isLoadingValidation && isOverallValid && (Boolean(v.isBilledBelowMinM3) || Boolean(v.isCodUrgentShortfall))

  // Definisi executor perintah suara lokal modal (disimpan pada ref agar selalu menggunakan state terbaru)
  const executeModalVoiceCommandRef = useRef<(rawText: string) => void>(() => {})

  executeModalVoiceCommandRef.current = (rawText: string) => {
    if (!isOpenRef.current) return
    const text = rawText.trim().toLowerCase()
    if (!text) return

    // 0. Perintah Buka No Invoice Langsung ("buka no invoice GZS 010751", "buka invoice 010751", "buka 010751", dsb)
    const openInvoiceTarget = extractInvoiceOpenTarget(text)
    if (openInvoiceTarget) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopVoiceListening()
      resetTranscript()
      onClose()
      if (onSelectInvoice) {
        onSelectInvoice(openInvoiceTarget)
      } else {
        navigate(ROUTES.BILLING_VALIDATION_DETAIL(openInvoiceTarget))
      }
      return
    }

    // 1. Perintah Terbitkan
    if (/(terbitkan|terbitkan\s+invoice|terbitkan\s+bill|proses\s+terbit|issue\s+invoice)/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopVoiceListening()
      resetTranscript()
      if (Number(billingData.fdGive) === 1) {
        toast.info(`Invoice ${billingData.fdInvNo} sudah berstatus Terbit (Issued)`)
        return
      }
      onClose()
      onOpenIssueModal?.()
      return
    }

    // 2. Perintah Refresh / Segarkan Data Validasi
    if (/\b(refresh|segarkan|muat\s*ulang|reload|cek\s*ulang|sinkron|update\s*data)\b/i.test(text)) {
      resetTranscript()
      queryClient.invalidateQueries({ queryKey: ['m3-check'] })
      queryClient.invalidateQueries({ queryKey: ['billingDetail'] })
      queryClient.invalidateQueries({ queryKey: ['billingTransportCheck'] })
      toast.info('Menyegarkan data validasi...')
      return
    }

    // Urutan tab sesuai tampilan visual:
    // Laut: 1=items, 2=m3_weight, 3=overweight, 4=freight, 5=transport
    // Udara: 1=items, 2=m3_weight, 3=freight, 4=transport
    const orderedTabs: SummaryModalTab[] = isAir
      ? ['items', 'm3_weight', 'freight', 'transport']
      : ['items', 'm3_weight', 'overweight', 'freight', 'transport']

    // 2a. Perintah Buka Tab berdasarkan nomor urut tampilan ("buka tab 1", "tab 2", "buka tab tiga", dsb)
    const tabNumMatch =
      text.match(/(?:buka\s+)?(?:tab|halaman|nomor|ke)\s*(?:nomor\s*)?([1-5]|satu|pertama|dua|kedua|tiga|ketiga|empat|keempat|lima|kelima)\b/i) ||
      text.match(/^(?:buka\s+)?([1-5]|satu|dua|tiga|empat|lima)$/i)

    if (tabNumMatch) {
      const rawNum = tabNumMatch[1].toLowerCase()
      const NUMBER_MAP: Record<string, number> = {
        '1': 0, 'satu': 0, 'pertama': 0,
        '2': 1, 'dua': 1, 'kedua': 1,
        '3': 2, 'tiga': 2, 'ketiga': 2,
        '4': 3, 'empat': 3, 'keempat': 3,
        '5': 4, 'lima': 4, 'kelima': 4,
      }
      const idx = NUMBER_MAP[rawNum]
      if (idx !== undefined && idx < orderedTabs.length) {
        setActiveTab(orderedTabs[idx])
        resetTranscript()
        return
      }
    }

    // 2b. Perintah Buka Tab berdasarkan nama tab
    // Tab Overweight
    if (/(overweight|kelebihan\s+berat|tonase)/i.test(text)) {
      if (isAir) {
        toast.info('Tab Overweight hanya berlaku untuk moda pengiriman Laut')
      } else {
        setActiveTab('overweight')
      }
      resetTranscript()
      return
    }

    // Tab Freight Charge
    if (/(freight|freight\s+charge|uang\s+tambang)/i.test(text)) {
      setActiveTab('freight')
      resetTranscript()
      return
    }

    // Tab Transport / Ekspedisi Lokal
    if (/(transport|ekspedisi|ongkir|biaya\s+ekspedisi|indo)/i.test(text)) {
      setActiveTab('transport')
      resetTranscript()
      return
    }

    // Tab Fisik / M3 / Kubikasi / Timbangan
    if (/(fisik|kubikasi|m3|m\s*3|meter\s+kubik|berat|timbangan|volume|audit\s+fisik)/i.test(text)) {
      setActiveTab('m3_weight')
      resetTranscript()
      return
    }

    // Tab Item / Tarif / Harga
    if (/(tarif|harga|item|rincian\s+item|audit\s+tarif|item\s+tagihan)/i.test(text)) {
      setActiveTab('items')
      resetTranscript()
      return
    }

    // 3. Perintah Tutup Modal
    if (/^(tutup|tutup\s+modal|tutup\s+dialog|batal|cancel|kembali|keluar|close)$/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopVoiceListening()
      resetTranscript()
      onClose()
      return
    }

    // Jika setelah 1 detik tidak cocok dengan perintah apapun, bersihkan transkrip
    resetTranscript()
  }

  // Pemrosesan perintah suara lokal modal dengan buffer jeda hening ~1 detik (1000ms):
  // Menunggu 1 detik jeda hening setelah ucapan terakhir pengguna agar kata majemuk & nomor invoice lengkap tidak terpotong
  useEffect(() => {
    if (!isOpen) {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      return
    }

    const combined = `${voiceTranscript} ${voiceInterim}`.trim()
    if (!combined) {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      return
    }

    // Reset dan tunda eksekusi selama 1000ms (1 detik) setiap kali ada kata atau token suara baru yang terdeteksi
    if (voiceCommandTimerRef.current) {
      clearTimeout(voiceCommandTimerRef.current)
    }

    voiceCommandTimerRef.current = setTimeout(() => {
      voiceCommandTimerRef.current = null
      executeModalVoiceCommandRef.current(combined)
    }, 1000)

    return () => {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
    }
  }, [voiceTranscript, voiceInterim, isOpen])

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
      } else if (hasOverweightIssue) {
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
    hasOverweightIssue,
    hasUnderchargePrice,
    hasUnbilledTransportActive,
  ])

  // Resolve Customer Name (Single Source of Truth)
  const resolvedCustName = useMemo(() => {
    return displayCustName(
      billingData.customer?.fdCustName || res?.customer?.fdCustName || billingData.fdCustCode
    )
  }, [billingData.customer?.fdCustName, billingData.fdCustCode, res?.customer?.fdCustName])

  const { total: effectiveTotalInvoice, currency: effectiveCurrency } = useMemo(() => {
    return getEffectiveInvoiceTotal(billingData, details)
  }, [billingData, details])

  // Verdict calculation via centralized helper
  const { title: verdictTitle, description: verdictDescription } = useMemo(() => {
    return calculateValidationVerdict({
      isLoadingValidation,
      isOverallValid,
      isAir,
      billedM3,
      effectiveBilledKg: overweight.effectiveBilledKg,
      actualWeightKg: overweight.actualWeightKg,
      maxAllowedWeight: overweight.maxAllowedWeight,
      overweightKg: overweight.overweightKg,
      isOverweightUnbilled,
      isBilledUnneededOverweight: overweight.isBilledUnneededOverweight,
      hasUnderchargePrice,
      underchargedItems,
      hasUnbilledTransportActive,
      unbilledExpedisiCount: unbilledExpedisiList.length,
      totalUnbilledTransportAmount,
      isMatch,
      isBilledBelowMinM3: Boolean(v.isBilledBelowMinM3),
      minChargeM3: v.minChargeM3,
      isCodUrgentShortfall: Boolean(v.isCodUrgentShortfall),
      recommendedM3: res?.recommendedM3 ?? 0,
      hasQtyMismatch: Boolean(v.hasQtyMismatch),
      activeQtys: v.activeQtys || [],
      isBilledMismatchedApprovedKomplain: Boolean(v.isBilledMismatchedApprovedKomplain),
      targetKomplainM3: v.targetKomplainM3,
      isType2Discrepancy: Boolean(v.isType2Discrepancy),
      validationIssues: v.validationIssues || [],
      isCurrencyInputError: Boolean(v.isCurrencyInputError),
      currencyInputErrorMessage: v.currencyInputErrorDetail
        ? `Header mencatat ${v.currencyInputErrorDetail.foreignCurr} ${v.currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID')} di kolom valas (fdJumlah2), namun tidak ada item yang menggunakan valas tersebut (riil Rp ${v.currencyInputErrorDetail.correctTotalRp.toLocaleString('id-ID')}).`
        : undefined,
    })
  }, [
    v.isCurrencyInputError,
    v.currencyInputErrorDetail,
    isLoadingValidation,
    isOverallValid,
    isAir,
    billedM3,
    overweight.effectiveBilledKg,
    overweight.actualWeightKg,
    overweight.maxAllowedWeight,
    overweight.overweightKg,
    isOverweightUnbilled,
    overweight.isBilledUnneededOverweight,
    hasUnderchargePrice,
    underchargedItems,
    hasUnbilledTransportActive,
    unbilledExpedisiList.length,
    totalUnbilledTransportAmount,
    isMatch,
    v.isBilledBelowMinM3,
    v.minChargeM3,
    v.isCodUrgentShortfall,
    res?.recommendedM3,
    v.hasQtyMismatch,
    v.activeQtys,
    v.isBilledMismatchedApprovedKomplain,
    v.targetKomplainM3,
    v.isType2Discrepancy,
    v.validationIssues,
  ])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" className="h-[85vh] max-h-[85vh] flex flex-col max-w-[1400px] w-full" zIndex="z-[100]">
      <ValidationSummaryHeader
        billingData={billingData}
        customerName={resolvedCustName}
        isOverallValid={!isLoadingValidation && isOverallValid}
        hasWarning={hasWarning}
        isLoadingValidation={isLoadingValidation}
        onClose={onClose}
        isVoiceListening={isVoiceListening}
        voiceTranscript={voiceTranscript}
        voiceInterim={voiceInterim}
        onToggleVoice={handleToggleVoice}
        isVoiceSupported={isVoiceSupported}
      />

      <ValidationSummaryTabsBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAir={isAir}
        isLoadingValidation={isLoadingValidation}
        hasPriceDiscrepancy={!isLoadingValidation && hasPriceDiscrepancy}
        hasPhysicalDiscrepancy={!isLoadingValidation && !isMatch}
        isBilledBelowMinM3={!isLoadingValidation && v.isBilledBelowMinM3}
        isCodUrgentShortfall={!isLoadingValidation && v.isCodUrgentShortfall}
        hasOverweightIssue={!isLoadingValidation && hasOverweightIssue}
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
                totalInvoice={effectiveTotalInvoice}
                currency={effectiveCurrency}
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
                isCodUrgentShortfall={v.isCodUrgentShortfall}
                recommendedM3={res?.recommendedM3}
                custCode={billingData.fdCustCode}
                custName={resolvedCustName}
                onSelectInvoice={onSelectInvoice}
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
        validationIssues={v.validationIssues}
        onOpenIssueModal={onOpenIssueModal}
        onClose={onClose}
        canIssue={Number(billingData.fdGive) !== 1}
      />
    </Modal>
  )
}
