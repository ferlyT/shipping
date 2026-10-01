import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ListFilter,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  Send,
  ScanBarcode,
  Receipt,
  User,
  History,
  RefreshCw,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { formatDate, copyToClipboard, cn, displayCustName } from '@/lib/utils'
import { BillingValidationCard } from '../components/BillingValidationCard'
import { ValidationListDrawer } from '../components/ValidationListDrawer'
import { BillingValidationSummaryModal } from '../components/BillingValidationSummaryModal'
import { extractInvoiceOpenTarget } from '../utils/voiceSearch.utils'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import { useVoiceRecognition } from '../hooks/useVoiceRecognition'
import { ValidationVoiceHud } from '../components/ValidationVoiceHud'
import type { ValidationCardTab } from '../components/validation-card/types'
import type { SummaryModalTab } from '../components/validation-summary/types'
import type { Billing, BillingDetail, M3CheckResponse } from '../types/billing.types'
import { BillingPrintButtons } from '../components/BillingPrintButtons'
import { CustomerBillingHistoryModal } from '../components/CustomerBillingHistoryModal'
import { IssueInvoiceModal } from '../components/IssueInvoiceModal'
import { BillResiMarkingModal } from '../components/BillResiMarkingModal'
import { EditBillingDetailsModal } from '../components/EditBillingDetailsModal'
import { CustomerTariffAuditModal } from '../components/CustomerTariffAuditModal'
import { BILL_TYPE_CONFIGS, BILL_TYPES, getBillType, isUnitCode } from '../constants/billing.constants'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import { downloadInvoicePdf, getEffectiveInvoiceTotal } from '../utils/billing.utils'
import { useBillingValidation } from '../hooks/useBillingValidation'
import { IssuedBadge, PaymentBadge, CustomerInfoCard, InvoiceItemsTable, ShipmentTimeline } from '../components/validation-detail'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ValidationDetailPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen lg:h-[calc(100vh-4.25rem)] lg:overflow-hidden p-2 sm:p-3 gap-2.5 animate-fadeIn font-[var(--font-body)]">
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
          <div className="h-7 w-48 rounded-lg skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded-lg skeleton-shimmer" />
          <div className="h-7 w-20 rounded-lg skeleton-shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        <div className="lg:col-span-5 h-[350px] lg:h-full rounded-xl skeleton-shimmer border border-[var(--color-border)]" />
        <div className="lg:col-span-7 min-h-[500px] lg:h-full rounded-xl skeleton-shimmer border border-[var(--color-border)]" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ValidationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  const {
    setDisplayMode,
    isMuted,
    toggleVoiceMute,
    commandStatus,
    setCommandStatus,
    commandFeedback,
    setVoiceTelemetry,
    registerContext,
    unregisterContext,
  } = useVoiceAssistantStore()

  // Aktifkan mode HUD terpadu selama berada di halaman validasi detail (auto-reset ke modal saat unmount)
  useEffect(() => {
    setDisplayMode('hud')
    return () => {
      setDisplayMode('modal')
    }
  }, [setDisplayMode])

  // ── Modal / Drawer states ──
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(true)
  const [summaryInitialTab, setSummaryInitialTab] = useState<SummaryModalTab | undefined>(undefined)
  const [isCopied, setIsCopied] = useState(false)
  const [isCopiedInv, setIsCopiedInv] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isResiModalOpen, setIsResiModalOpen] = useState(false)
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'validation' | 'items'>('validation')
  const [validationCardTab, setValidationCardTab] = useState<ValidationCardTab | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const drawerClosedAtRef = useRef<number>(0)

  const handleCloseDrawer = useCallback(() => {
    drawerClosedAtRef.current = Date.now()
    setIsListDrawerOpen(false)
  }, [])

  const handleSelectInvoice = useCallback((invNo: string) => {
    drawerClosedAtRef.current = Date.now()
    setIsListDrawerOpen(false)
    navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))
  }, [navigate])

  // Re-open summary modal on invoice change & reset card tab
  useEffect(() => {
    if (id) {
      setIsSummaryModalOpen(true)
      setValidationCardTab(null)
    }
  }, [id])

  // Ctrl+F → open list drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsListDrawerOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Data fetching ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ['billingDetail', id],
    queryFn: async () => {
      if (!id) return null
      const res = await billingApi.detail(id)
      return res.data?.data as Billing
    },
    enabled: !!id,
    staleTime: 60_000,
  })

  const { data: shipmentTimeline, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['billingTimeline', id],
    queryFn: () => billingApi.timeline(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })

  const billType = getBillType(data)
  const billTypeConfig = BILL_TYPE_CONFIGS[billType]

  const primaryListCode =
    (!isUnitCode(data?.fdListCode) ? data?.fdListCode?.trim() : null) ||
    data?.details?.find((d: BillingDetail) => !isUnitCode(d.fdListCode))?.fdListCode?.trim() ||
    data?.fdListCode?.trim() ||
    ''

  const { data: validationData, isLoading: isLoadingValidation } = useQuery({
    queryKey: ['m3-check', primaryListCode],
    queryFn: async () => {
      if (!primaryListCode) return null
      const response = await billingApi.m3Check(primaryListCode)
      return response.data?.data as M3CheckResponse
    },
    enabled: Boolean(data && primaryListCode && !billTypeConfig.skipValidation),
    staleTime: 60_000,
  })

  // ── Derived data (Hooks must execute unconditionally before early returns) ──
  const allBillingListCodes = useMemo(() => {
    return Array.from(
      new Set(
        [
          data?.fdListCode,
          validationData?.fdListCode,
          ...(data?.details || []).map((d: BillingDetail) => d.fdListCode),
        ]
          .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4)
          .map((lc) => lc.trim())
      )
    )
  }, [data?.fdListCode, validationData?.fdListCode, data?.details])
  const billingListCodeParam = allBillingListCodes.join(',') || (data?.fdListCode ? String(data.fdListCode).trim() : '')

  const transportDetailItem = useMemo(() => {
    return (data?.details || []).find((d: BillingDetail) => {
      const name = (d?.fdItemName || '').toUpperCase()
      return name.includes('TRANSPORT') || name.includes('DELIVERY') || name.includes('ONGKIR') || name.includes('TRUCKING')
    })
  }, [data?.details])

  const hasTransportItem = billType === BILL_TYPES.TRANSPORT || !!transportDetailItem
  const effectiveTransportAmount = transportDetailItem
    ? (Number(transportDetailItem.fdTotal || 0) > 0 ? Number(transportDetailItem.fdTotal) : Number(transportDetailItem.fdItemPrice || 0))
    : (Number(data?.fdJumlah2 || 0) > 0 ? Number(data?.fdJumlah2) : Number(data?.fdJumlah1 || 0))

  const { data: transportValidation } = useQuery({
    queryKey: ['billingTransportCheck', data?.fdInvNo, data?.fdCustCode, data?.fdMarkingCode, data?.fdMarkingNo, billingListCodeParam, effectiveTransportAmount, hasTransportItem],
    queryFn: async () => {
      if (!billingListCodeParam && (!data?.fdCustCode || !data?.fdMarkingCode)) return null
      const response = await billingApi.transportCheck({
        invNo: data?.fdInvNo,
        custCode: data?.fdCustCode || '',
        markingCode: data?.fdMarkingCode || '',
        markingNo: data?.fdMarkingNo || '',
        listCode: billingListCodeParam,
        amount: hasTransportItem ? effectiveTransportAmount : 0,
      })
      return response.data?.data as {
        isValid: boolean
        hasDuplicate: boolean
        duplicates: any[]
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
    enabled: Boolean(data && (billingListCodeParam || (data.fdCustCode && data.fdMarkingCode))),
    staleTime: 60_000,
  })

  // ── Single Source of Truth untuk seluruh validasi billing ──
  const validation = useBillingValidation({
    billingData: data,
    validationData,
    transportValidation,
  })

  const {
    details,
    billedM3,
    billedKg,
    billedVfc,
    unitTotals,
    validExpedisiList,
    unbilledExpedisiList,
    totalUnbilledTransportAmount,
    hasUnbilledTransport,
    underchargedItems,
    evaluatedItems,
    isCurrencyInputError,
    currencyInputErrorDetail,
    isAir,
    isType2,
  } = validation

  const { total: effectiveInvoiceTotal, currency: effectiveInvoiceCurrency } = useMemo(() => {
    if (!data) return { total: 0, currency: 'Rp.' }
    return getEffectiveInvoiceTotal(data, details)
  }, [data, details])

  const isSea = !isAir && !isType2

  // ── Handler Refresh Data Validasi & Tagihan ──
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['billingDetail', id] }),
        queryClient.invalidateQueries({ queryKey: ['m3-check'] }),
        queryClient.invalidateQueries({ queryKey: ['billingTransportCheck'] }),
      ])
      addToast({ type: 'success', message: 'Data validasi & tarif berhasil disegarkan' })
    } catch {
      addToast({ type: 'error', message: 'Gagal menyegarkan data validasi' })
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }, [id, queryClient, addToast])

  // ── Register Voice Assistant Context for Detail Page Actions ──
  useEffect(() => {
    if (!data) return
    registerContext({
      currentInvNo: data.fdInvNo,
      isIssued: Number(data.fdGive) === 1,
      underchargedCount: underchargedItems.length,
      onOpenSummary: (tab) => {
        if (tab) setSummaryInitialTab(tab)
        setIsSummaryModalOpen(true)
      },
      onCloseSummary: () => setIsSummaryModalOpen(false),
      onTriggerIssue: () => setIsIssueModalOpen(true),
      onRefreshValidation: handleRefresh,
    })

    return () => {
      unregisterContext()
    }
  }, [data?.fdInvNo, data?.fdGive, underchargedItems.length, registerContext, unregisterContext, handleRefresh])

  const isAnyModalOpen = Boolean(
    isListDrawerOpen ||
    isSummaryModalOpen ||
    isIssueModalOpen ||
    isHistoryModalOpen ||
    isResiModalOpen ||
    isEditItemsModalOpen ||
    isAuditModalOpen
  )
  const isAnyModalOpenRef = useRef(isAnyModalOpen)
  useEffect(() => {
    isAnyModalOpenRef.current = isAnyModalOpen
  }, [isAnyModalOpen])

  const isManuallyStoppedRef = useRef(false)
  const rearmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceCommandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    lang: 'id-ID',
    continuous: true,
    interimResults: true,
    onEnd: () => {
      // Auto re-arm standby jika tidak ada modal yang terbuka dan tidak dihentikan manual
      if (!isAnyModalOpenRef.current && !isManuallyStoppedRef.current) {
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        rearmTimerRef.current = setTimeout(() => {
          if (!isAnyModalOpenRef.current && !isManuallyStoppedRef.current) {
            startListening()
          }
        }, 200)
      }
    },
  })

  // Standby otomatis mendengarkan saat berada di halaman validasi (tanpa modal aktif)
  // BUG-06 FIX: tambah !isMuted agar mic tidak auto-start ulang setelah user mute lalu tutup modal
  useEffect(() => {
    if (!isAnyModalOpen && isSupported && !isMuted) {
      isManuallyStoppedRef.current = false
      const timer = setTimeout(() => {
        // BUG-02 FIX: double-check isMuted di dalam setTimeout (async gap)
        if (!isAnyModalOpenRef.current && !isMuted) {
          startListening()
        }
      }, 200)
      return () => {
        clearTimeout(timer)
        if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
        if (voiceCommandTimerRef.current) {
          clearTimeout(voiceCommandTimerRef.current)
          voiceCommandTimerRef.current = null
        }
      }
    } else {
      // BUG-02 FIX: set isManuallyStoppedRef = true SEBELUM stopListening()
      // agar onEnd callback tidak memicu re-arm saat modal baru dibuka
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopListening()
      resetTranscript()
    }
  }, [isAnyModalOpen, isSupported, isMuted, startListening, stopListening, resetTranscript])

  // Sinkronkan status telemetri suara ke voiceAssistantStore
  useEffect(() => {
    setVoiceTelemetry({
      isListening,
      isMuted,
      transcript,
      interimTranscript,
    })
  }, [isListening, isMuted, transcript, interimTranscript, setVoiceTelemetry])

  // Handler toggle mikrofon terpusat (digunakan oleh HUD & Alt+V)
  const handleToggleVoice = useCallback(() => {
    toggleVoiceMute()
    if (isListening) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      stopListening()
      resetTranscript()
    } else {
      isManuallyStoppedRef.current = false
      resetTranscript()
      startListening()
    }
  }, [isListening, startListening, stopListening, resetTranscript, toggleVoiceMute])

  // Shortcut Alt+V di halaman validasi untuk toggle mic lokal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAltV = e.altKey && (e.key?.toLowerCase() === 'v' || e.code === 'KeyV')
      if (isAltV) {
        if (isAnyModalOpenRef.current) return
        e.preventDefault()
        e.stopPropagation()
        handleToggleVoice()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleToggleVoice])

  const isNavigatingInvoiceRef = useRef(false)

  // Reset flag navigasi invoice saat id berubah
  useEffect(() => {
    isNavigatingInvoiceRef.current = false
  }, [id])

  // Handler navigasi langsung ke detail validasi invoice via perintah suara
  const handleOpenInvoiceByVoice = useCallback(
    async (target: string) => {
      if (!target) return
      if (isNavigatingInvoiceRef.current) return
      isNavigatingInvoiceRef.current = true

      // Matikan mic sementara saat memproses navigasi
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()

      const cleanTarget = target.trim().toUpperCase()
      const currentInv = (data?.fdInvNo || id || '').trim().toUpperCase()
      const currentPrefix = currentInv ? currentInv.split('-')[0]?.trim().toUpperCase() : ''

      // Deteksi jika pengguna menyebut kode cabang secara eksplisit (misal 'GZS', 'GZA', 'YWS')
      const branchMatch = cleanTarget.match(/^(GZS|GZA|YWS|YWA|JKS|JKA|SUB|SG|HK|BKK|KR|SZ|SH)[-\s]?/i)
      const explicitBranch = branchMatch ? branchMatch[1].toUpperCase() : ''
      const targetBranch = explicitBranch || currentPrefix || ''

      // Ambil angka murni dari input: e.g. "GZS-11023" -> "11023", "011023" -> "011023"
      const cleanDigits = cleanTarget.replace(/\D/g, '')
      const unpaddedDigits = cleanDigits.replace(/^0+/, '')
      const padded6Digits = cleanDigits.length <= 6 ? cleanDigits.padStart(6, '0') : cleanDigits

      // 1. Jika format benar-benar lengkap dengan tahun (misal "GZS-011023-09-2026")
      const isCompleteInv = /^[A-Z]{2,4}-\d{3,}-\d{2}-\d{4}$/i.test(cleanTarget)
      if (isCompleteInv) {
        if (cleanTarget === currentInv) {
          addToast({ type: 'info', message: `Invoice ${cleanTarget} sedang dibuka saat ini` })
          isNavigatingInvoiceRef.current = false
          return
        }
        addToast({ type: 'success', message: `Membuka invoice ${cleanTarget}...` })
        setIsListDrawerOpen(false)
        setIsSummaryModalOpen(false)
        navigate(ROUTES.BILLING_VALIDATION_DETAIL(cleanTarget))
        return
      }

      // 2. Pencarian cerdas ke backend: Prioritas UTAMA cari dari data bill yang BELUM ISSUED (draftOnly: true)
      try {
        const searchKeyword = unpaddedDigits || cleanTarget
        addToast({ type: 'info', message: `Mencari invoice belum issued "${searchKeyword}"...` })

        // Helper penilaian kecocokan invoice
        const evaluateMatch = (b: Billing) => {
          const invNo = (b.fdInvNo || '').trim().toUpperCase()
          const branch = invNo.split('-')[0]?.trim() || ''

          const parts = invNo.split('-')
          const seqPart = parts.length > 1 ? parts[1].trim() : parts[0].trim()
          const seqDigits = seqPart.replace(/\D/g, '')
          const unpaddedSeq = seqDigits.replace(/^0+/, '')

          let score = 0
          // Match persis nomor urut faktur (misal 11023 == 11023 atau 011023 == 011023)
          if (unpaddedDigits && (unpaddedSeq === unpaddedDigits || seqDigits === padded6Digits || seqDigits === cleanDigits)) {
            score += 100
          } else if (invNo.includes(cleanTarget) || (unpaddedDigits && invNo.includes(unpaddedDigits))) {
            score += 60
          }

          // Bonus kecocokan cabang (cabang eksplisit yang disebutkan atau cabang invoice saat ini)
          if (targetBranch && branch === targetBranch) {
            score += 40
          }

          return { bill: b, invNo, score, branch }
        }

        // Kueri 1: Cari dari data bill yang BELUM ISSUED (draftOnly = true, hasAmount = true)
        const draftRes = await billingApi.list({
          search: searchKeyword,
          draftOnly: 'true',
          hasAmount: 'true',
          minYear: '2023',
          noPagination: 'true',
        })
        const draftBillings = ((draftRes.data?.data || []) as Billing[]).filter((b) => {
          const isDraft = (b.fdGive ?? 0) !== 1 && (b.fdGive2 ?? 0) !== 1 && !b.fdCekDate
          const hasAmt = Number(b.fdJumlah1 || 0) > 0 || Number(b.fdJumlah2 || 0) > 0
          return isDraft && hasAmt
        })

        const rankedDrafts = draftBillings
          .map(evaluateMatch)
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            const dateA = a.bill.fdInvDate ? new Date(a.bill.fdInvDate).getTime() : 0
            const dateB = b.bill.fdInvDate ? new Date(b.bill.fdInvDate).getTime() : 0
            return dateB - dateA
          })

        if (rankedDrafts.length > 0) {
          const best = rankedDrafts[0]
          if (best.invNo === currentInv) {
            addToast({ type: 'info', message: `Invoice ${best.invNo} sedang dibuka saat ini` })
            isNavigatingInvoiceRef.current = false
            return
          }

          addToast({ type: 'success', message: `Membuka invoice ${best.invNo}...` })
          setIsListDrawerOpen(false)
          setIsSummaryModalOpen(false)
          navigate(ROUTES.BILLING_VALIDATION_DETAIL(best.invNo))
          return
        }

        // Kueri 2: Fallback jika tidak ditemukan di data belum issued (mungkin invoice sudah diterbitkan/issued sebelumnya)
        const allRes = await billingApi.list({
          search: searchKeyword,
          hasAmount: 'true',
          minYear: '2023',
          noPagination: 'true',
        })
        const allBillings = (allRes.data?.data || []) as Billing[]
        const rankedAll = allBillings
          .map(evaluateMatch)
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            const dateA = a.bill.fdInvDate ? new Date(a.bill.fdInvDate).getTime() : 0
            const dateB = b.bill.fdInvDate ? new Date(b.bill.fdInvDate).getTime() : 0
            return dateB - dateA
          })

        if (rankedAll.length > 0) {
          const best = rankedAll[0]
          if (best.invNo === currentInv) {
            addToast({ type: 'info', message: `Invoice ${best.invNo} sedang dibuka saat ini` })
            isNavigatingInvoiceRef.current = false
            return
          }

          const isAlreadyIssued = Number(best.bill.fdGive ?? 0) === 1
          if (isAlreadyIssued) {
            addToast({ type: 'info', message: `Membuka invoice ${best.invNo} (sudah berstatus Terbit / Issued)...` })
          } else {
            addToast({ type: 'success', message: `Membuka invoice ${best.invNo}...` })
          }

          setIsListDrawerOpen(false)
          setIsSummaryModalOpen(false)
          navigate(ROUTES.BILLING_VALIDATION_DETAIL(best.invNo))
          return
        }

        // Jika sama sekali tidak ditemukan di database
        addToast({
          type: 'error',
          message: `Invoice "${cleanTarget}" tidak ditemukan di data tagihan belum issued`,
        })
        isNavigatingInvoiceRef.current = false
      } catch {
        addToast({
          type: 'error',
          message: `Gagal mencari invoice "${cleanTarget}"`,
        })
        isNavigatingInvoiceRef.current = false
      } finally {
        setTimeout(() => {
          isNavigatingInvoiceRef.current = false
        }, 1000)
      }
    },
    [data?.fdInvNo, id, navigate, addToast, stopListening, resetTranscript]
  )

  // Definisi executor perintah suara halaman validasi (disimpan pada ref agar selalu menggunakan state terbaru)
  const executeVoiceCommandRef = useRef<(rawText: string) => void>(() => {})

  executeVoiceCommandRef.current = (rawText: string) => {
    if (isAnyModalOpenRef.current) return
    const text = rawText.toLowerCase().trim()
    if (!text) return

    setCommandStatus('evaluating')
    const triggerSuccess = (label: string) => {
      setCommandStatus('executed', label)
      setTimeout(() => setCommandStatus('idle'), 2200)
    }

    // 0. Perintah Buka No Invoice Langsung ("buka no invoice GZS 010751", "buka invoice 010751", "buka 010751", dsb)
    const openInvoiceTarget = extractInvoiceOpenTarget(text)
    if (openInvoiceTarget) {
      resetTranscript()
      triggerSuccess(`Membuka invoice ${openInvoiceTarget}`)
      handleOpenInvoiceByVoice(openInvoiceTarget)
      return
    }

    // 1. Perintah Cari / Pilih Invoice -> Buka drawer cari invoice (HANYA pilih invoice / cari)
    if (/\b(pilih\s+invoice|pilih\s+faktur|pilih\s+bill|cari|cari\s+invoice|cari\s+faktur|cari\s+bill|drawer|daftar\s+invoice|ganti\s+invoice)\b/i.test(text)) {
      // Cegah auto-reopen jika drawer baru saja ditutup (cooldown 1000ms untuk eliminasi sisa ucapan)
      if (Date.now() - drawerClosedAtRef.current < 1000) {
        resetTranscript()
        return
      }
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka drawer pencarian invoice')
      setIsListDrawerOpen(true)
      return
    }

    // 2. Perintah Refresh / Segarkan Halaman & Data Validasi
    if (/\b(refresh|segarkan|muat\s*ulang|reload|cek\s*ulang|sinkron|update\s*data)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Menyegarkan data validasi & tarif')
      handleRefresh()
      return
    }

    // 3. Perintah Cetak / Print Invoice
    if (/\b(cetak|print|unduh\s*pdf|download\s*pdf|cetak\s*invoice|cetak\s*faktur)\b/i.test(text)) {
      resetTranscript()
      if (data?.fdInvNo) {
        triggerSuccess(`Mencetak PDF Invoice ${data.fdInvNo}`)
        downloadInvoicePdf(data.fdInvNo)
        addToast({ type: 'info', message: `Mencetak/Mengunduh PDF Invoice ${data.fdInvNo}...` })
      }
      return
    }

    // 4. Perintah Ganti Tab Nomor Urut 1 - 5 (Mandiri tanpa harus kata "buka")

    // Tab 1: Item & Tarif
    if (/(?:buka\s+)?(?:tab\s*(?:1|satu|pertama)|tab\s*item|tab\s*tarif|tab\s*harga|item\s*tarif)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Beralih ke Tab 1: Item & Tarif')
      setMobileTab('validation')
      setValidationCardTab('profile')
      return
    }

    // Tab 2: Validasi M3 / Timbangan Fisik
    if (/(?:buka\s+)?(?:tab\s*(?:2|dua|kedua)|tab\s*m3|tab\s*timbangan|validasi\s*m3|kubikasi)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Beralih ke Tab 2: Validasi M³ / Timbangan')
      setMobileTab('validation')
      setValidationCardTab('m3_weight')
      return
    }

    // Tab 3: Overweight (Laut) atau Freight Charge (Udara / Type 2)
    if (/(?:buka\s+)?(?:tab\s*(?:3|tiga|ketiga))\b/i.test(text)) {
      resetTranscript()
      triggerSuccess(`Beralih ke Tab 3: ${isSea ? 'Overweight' : 'Freight Charge'}`)
      setMobileTab('validation')
      setValidationCardTab(isSea ? 'overweight' : 'freight')
      return
    }

    // Tab 4: Freight Charge (Laut) atau Ekspedisi (Udara / Type 2)
    if (/(?:buka\s+)?(?:tab\s*(?:4|empat|keempat))\b/i.test(text)) {
      resetTranscript()
      triggerSuccess(`Beralih ke Tab 4: ${isSea ? 'Freight Charge' : 'Ekspedisi'}`)
      setMobileTab('validation')
      setValidationCardTab(isSea ? 'freight' : 'transport')
      return
    }

    // Tab 5: Ekspedisi (Laut)
    if (/(?:buka\s+)?(?:tab\s*(?:5|lima|kelima))\b/i.test(text)) {
      if (isSea) {
        resetTranscript()
        triggerSuccess('Beralih ke Tab 5: Ekspedisi')
        setMobileTab('validation')
        setValidationCardTab('transport')
        return
      }
    }

    // Tab spesifik berdasarkan nama
    if (/\b(overweight|kelebihan\s*berat|lebih\s*kg|lebih\s*berat)\b/i.test(text)) {
      if (isSea) {
        resetTranscript()
        triggerSuccess('Beralih ke Tab Overweight')
        setMobileTab('validation')
        setValidationCardTab('overweight')
        return
      }
    }

    if (/\b(freight|freight\s*charge|fc)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Beralih ke Tab Freight Charge')
      setMobileTab('validation')
      setValidationCardTab('freight')
      return
    }

    if (/\b(ekspedisi|transport|ongkir|tbexpindo)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Beralih ke Tab Ekspedisi')
      setMobileTab('validation')
      setValidationCardTab('transport')
      return
    }

    // Tab Mobile: Info & Item Tagihan
    if (/\b(info\s*tagihan|rincian\s*item|daftar\s*item|tab\s*info)\b/i.test(text)) {
      resetTranscript()
      triggerSuccess('Beralih ke Rincian Item Tagihan')
      setMobileTab('items')
      return
    }

    // 5. Aksi Cepat Ribbon / Modal
    if (/\b(terbitkan|terbitkan\s*invoice|issue\s*invoice|terbitkan\s*bill)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka penerbitan invoice')
      setIsIssueModalOpen(true)
      return
    }

    if (/\b(inspeksi|audit\s*summary|ringkasan|kesimpulan|modal\s*audit)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka dialog inspeksi validasi')
      setIsSummaryModalOpen(true)
      return
    }

    if (/\b(resi|marking|persebaran\s*marking|cek\s*resi)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka dialog cek resi')
      setIsResiModalOpen(true)
      return
    }

    if (/\b(history|riwayat|riwayat\s*tagihan|billing\s*history)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka riwayat tagihan customer')
      setIsHistoryModalOpen(true)
      return
    }

    if (/\b(audit\s*tarif|tarif\s*customer|pricelist\s*customer|audit\s*harga)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Membuka audit tarif customer')
      setIsAuditModalOpen(true)
      return
    }

    if (/\b(kembali|daftar\s*validasi|antrean|back)\b/i.test(text)) {
      isManuallyStoppedRef.current = true
      if (rearmTimerRef.current) clearTimeout(rearmTimerRef.current)
      stopListening()
      resetTranscript()
      triggerSuccess('Kembali ke antrean validasi')
      navigate(ROUTES.BILLING_VALIDATION_LIST)
      return
    }

    // Jika setelah dievaluasi tidak cocok dengan perintah apapun, beritahu status unrecognized
    setCommandStatus('unrecognized', `Perintah tidak dikenali: "${text}"`)
    setTimeout(() => setCommandStatus('idle'), 1800)
    resetTranscript()
  }

  // Pemrosesan perintah suara lokal halaman validasi dengan buffer jeda hening ~1 detik (1000ms):
  // Menunggu 1 detik jeda hening setelah ucapan terakhir pengguna agar kata majemuk & nomor invoice lengkap tidak terpotong
  useEffect(() => {
    if (isAnyModalOpen) {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
      return
    }

    const combined = `${transcript} ${interimTranscript}`.trim()
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
      executeVoiceCommandRef.current(combined)
    }, 1000)

    return () => {
      if (voiceCommandTimerRef.current) {
        clearTimeout(voiceCommandTimerRef.current)
        voiceCommandTimerRef.current = null
      }
    }
  }, [transcript, interimTranscript, isAnyModalOpen])

  // ── Early returns ──
  if (isLoading) return <ValidationDetailPageSkeleton />
  if (isError || !data) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{t('billing.detail.errorLoad')}</p>
        <Button className="mt-4" onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('billing.detail.backToList')}
        </Button>
      </div>
    )
  }

  // ── Proteksi Status Terkunci (Read-Only) ──
  const isIssued = Number(data.fdGive) === 1
  const isCollected = Number(data.fdGive2) === 1
  const isPaid = Boolean(data.isPaid) || data.paymentStatus === 'LUNAS'
  const isLocked = isIssued || isCollected || isPaid
  const lockReason = isCollected || isPaid
    ? 'Invoice telah berstatus LUNAS / SELESAI di kasir. Rincian item dikunci demi integritas rekonsiliasi keuangan.'
    : isIssued
    ? 'Invoice telah diterbitkan (ISSUED). Rincian item dikunci demi kepatuhan pembukuan dan integritas data.'
    : undefined

  // ── Handlers ──
  const handleCopyMarkingInfo = async () => {
    const custName = displayCustName(data.customer?.fdCustName || data.fdCustCode)
    const markingCode = data.fdMarkingCode || '—'
    const markingNo = data.fdMarkingNo || '—'
    const consignee = data.fdConsignee || ''
    const comodity = data.fdComodity || ''
    const comodityType = data.fdTypeComodityName || ''
    const tglAgent = data.fdTglAgent ? formatDate(data.fdTglAgent) : '—'

    let text = `Customer: ${custName}\nMarking Code: ${markingCode}\nMarking No: ${markingNo}`
    if (consignee) {
      text += `\nConsignee: ${consignee}`
    }
    if (comodity || comodityType) {
      text += `\nKomoditi: ${[comodity, comodityType ? `(${comodityType})` : ''].filter(Boolean).join(' ')}`
    }
    text += `\nTgl Agent: ${tglAgent}`

    const success = await copyToClipboard(text)
    if (success) {
      setIsCopied(true)
      addToast({ type: 'success', message: 'Data customer, marking, consignee, komoditi & tgl agent berhasil disalin!' })
      setTimeout(() => setIsCopied(false), 2000)
    } else {
      addToast({ type: 'error', message: 'Gagal menyalin data ke clipboard' })
    }
  }

  const handleCopyInvNo = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!data?.fdInvNo) return
    const success = await copyToClipboard(data.fdInvNo)
    if (success) {
      setIsCopiedInv(true)
      addToast({ type: 'success', message: `No. Invoice ${data.fdInvNo} berhasil disalin ke clipboard!` })
      setTimeout(() => setIsCopiedInv(false), 2000)
    } else {
      addToast({ type: 'error', message: 'Gagal menyalin nomor invoice' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen lg:h-[calc(100vh-4.25rem)] lg:overflow-hidden p-2 sm:p-3 gap-2 sm:gap-2.5 bg-[var(--color-neutral)] text-[var(--color-primary)] font-[var(--font-body)] animate-fadeIn overflow-y-auto lg:overflow-y-hidden">

      {/* ─── 1. COMPACT TOP HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs shrink-0">
        {/* Row 1 / Left: Back + Inv No + Status Badges */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}
              className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer shrink-0"
              title={t('billing.validation.backToList')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-[var(--color-secondary)] shrink-0">Inv:</span>
              <span className="font-mono font-bold text-xs sm:text-sm text-[var(--color-primary)] truncate">{data.fdInvNo}</span>
              <button
                type="button"
                onClick={handleCopyInvNo}
                className="p-1 rounded text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0"
                title="Salin No. Invoice ke clipboard"
              >
                {isCopiedInv ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <span className={cn('text-[9px] sm:text-[10px] px-1.5 py-0.2 font-bold rounded border uppercase shrink-0', billTypeConfig.badgeClasses)}>
                {billTypeConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <IssuedBadge
              isIssued={Number(data.fdGive) === 1}
              issuedDate={data.fdGiveDate}
              issuedBy={data.giveEmployee?.fdEmpName}
            />
            <PaymentBadge status={data.paymentStatus} />
          </div>
        </div>

        {/* Row 2 / Right: Customer info + Quick Action Buttons Ribbon */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/60 min-w-0">
          <div className="flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] max-w-[140px] sm:max-w-[200px] truncate">
            <User size={11} className="text-[var(--color-secondary)] shrink-0" />
            <span className="font-semibold truncate text-[var(--color-primary)]" title={displayCustName(data.customer?.fdCustName || data.fdCustCode)}>
              {displayCustName(data.customer?.fdCustName || data.fdCustCode)}
            </span>
          </div>

          {/* Quick Action Buttons Ribbon */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5">
            {Number(data.fdGive) !== 1 && (
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(true)}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Terbitkan invoice menjadi status Issued"
              >
                <Send className="w-3 h-3" />
                <span className="hidden sm:inline">Terbitkan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSummaryModalOpen(true)}
              className="px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Buka dialog kesimpulan validasi operasional & tarif"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Inspeksi</span>
            </button>

            <BillingPrintButtons invNo={data.fdInvNo} size="xs" />

            <button
              type="button"
              onClick={() => setIsResiModalOpen(true)}
              className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Pengecekan Resi & Persebaran Marking"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Resi</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Riwayat Tagihan / Billing Customer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title={t('billing.validation.priceAuditTooltip')}
            >
              <History className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Audit</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
              title="Segarkan Data Validasi & Tagihan (Katakan 'Refresh' atau 'Segarkan')"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsListDrawerOpen(true)}
              className="px-2 py-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Cari & Pilih Faktur Lain (Katakan 'Cari invoice' atau Ctrl+F)"
            >
              <ListFilter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline text-xs font-semibold">Cari Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. MOBILE SEGMENTED CONTROL TAB SWITCHER (lg:hidden) ─── */}
      <div className="lg:hidden flex items-center p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('validation')}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'validation'
              ? 'bg-[var(--color-neutral)] text-[var(--color-tertiary)] shadow-2xs border border-[var(--color-border)]'
              : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          )}
        >
          <ShieldCheck size={14} className={mobileTab === 'validation' ? 'text-[var(--color-tertiary)]' : ''} />
          <span>Validasi Sistem</span>
          {underchargedItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono font-bold border border-rose-500/30">
              {underchargedItems.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('items')}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
            mobileTab === 'items'
              ? 'bg-[var(--color-neutral)] text-[var(--color-tertiary)] shadow-2xs border border-[var(--color-border)]'
              : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
          )}
        >
          <Receipt size={14} className={mobileTab === 'items' ? 'text-[var(--color-tertiary)]' : ''} />
          <span>Info & Item Tagihan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[var(--color-surface)] text-[var(--color-secondary)] font-mono border border-[var(--color-border)]">
            {details.length}
          </span>
        </button>
      </div>

      {/* ─── 3. MAIN 2-COLUMN / ADAPTIVE LAYOUT ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-3 sm:gap-3.5 lg:min-h-0 lg:overflow-hidden">

        {/* ── Kolom Kiri: Identitas Tagihan & Rincian Item ── */}
        <div className={cn(
          "lg:col-span-5 xl:col-span-5 2xl:col-span-5 flex flex-col gap-3 lg:gap-3.5 lg:min-h-0 lg:overflow-hidden",
          mobileTab !== 'items' && "hidden lg:flex"
        )}>

          {/* Card: Identitas Tagihan & Customer */}
          <CustomerInfoCard
            data={data}
            isCopied={isCopied}
            onCopyMarkingInfo={handleCopyMarkingInfo}
            isCurrencyInputError={isCurrencyInputError}
            currencyInputErrorDetail={currencyInputErrorDetail}
          />

          {/* Timeline Siklus Kargo */}
          <ShipmentTimeline
            timeline={shipmentTimeline}
            isLoading={isTimelineLoading}
          />

          {/* Card: Tabel Rincian Item (scrollable body, sticky footer) */}
          <InvoiceItemsTable
            details={details}
            data={data}
            isLocked={isLocked}
            onOpenEditItemsModal={() => setIsEditItemsModalOpen(true)}
            hasUnbilledTransport={hasUnbilledTransport}
            unbilledExpedisiList={unbilledExpedisiList}
            totalUnbilledTransportAmount={totalUnbilledTransportAmount}
            onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
            isCurrencyInputError={isCurrencyInputError}
            currencyInputErrorDetail={currencyInputErrorDetail}
            transportValidation={transportValidation}
            validExpedisiList={validExpedisiList}
            evaluatedItems={evaluatedItems}
            validationData={validationData}
            unitTotals={unitTotals}
          />
        </div>

        {/* ── Kolom Kanan: Mesin Validasi ── */}
        <div className={cn(
          "lg:col-span-7 xl:col-span-7 2xl:col-span-7 flex flex-col min-h-0 h-auto lg:h-full lg:overflow-hidden",
          mobileTab !== 'validation' && "hidden lg:flex"
        )}>
          {primaryListCode && (
            <BillingValidationCard
              listCode={primaryListCode}
              validation={validation}
              validationData={validationData}
              billedM3={billedM3}
              billedKg={billedKg}
              billedVfc={billedVfc}
              invoiceDetails={details}
              billFdTypeComodity={data.fdTypeComodity}
              billType={billType}
              billFdListType={data.fdListType}
              markingCode={data.fdMarkingCode}
              markingNo={data.fdMarkingNo}
              invoiceNo={data.fdInvNo}
              customerName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
              custCode={data.fdCustCode}
              onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              activeTab={validationCardTab}
              onTabChange={(tab) => setValidationCardTab(tab)}
            />
          )}
        </div>
      </div>



      {/* ─── MODALS ─── */}
      <ValidationListDrawer
        isOpen={isListDrawerOpen}
        onClose={handleCloseDrawer}
        currentInvNo={data.fdInvNo}
        onSelectInvoice={handleSelectInvoice}
      />

      <BillingValidationSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        initialTab={summaryInitialTab}
        billingData={data}
        validation={validation}
        validationData={validationData}
        isLoadingValidation={isLoadingValidation}
        billedM3={billedM3}
        billedKg={billedKg}
        billedVfc={billedVfc}
        unitTotals={unitTotals}
        onOpenIssueModal={() => setIsIssueModalOpen(true)}
        onSelectInvoice={handleOpenInvoiceByVoice}
      />

      <CustomerBillingHistoryModal
        isOpen={isHistoryModalOpen}
        custCode={data.fdCustCode}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        tglAgent={data.fdTglAgent}
        typeComodity={data.fdTypeComodityName}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <IssueInvoiceModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        invNo={data.fdInvNo}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        custCode={data.fdCustCode || undefined}
        invDate={data.fdInvDate}
        totalAmount={effectiveInvoiceTotal}
        currency={effectiveInvoiceCurrency}
        underchargedItems={underchargedItems}
      />

      <BillResiMarkingModal
        isOpen={isResiModalOpen}
        onClose={() => setIsResiModalOpen(false)}
        invNo={data.fdInvNo}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        custCode={data.fdCustCode || undefined}
        markingCode={data.fdMarkingCode || undefined}
        markingNo={data.fdMarkingNo || undefined}
      />

      <CustomerTariffAuditModal
        isOpen={isAuditModalOpen}
        custCode={data.fdCustCode || null}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <EditBillingDetailsModal
        isOpen={isEditItemsModalOpen}
        onClose={() => setIsEditItemsModalOpen(false)}
        invNo={data.fdInvNo}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        custCode={data.fdCustCode || undefined}
        markingCode={data.fdMarkingCode || undefined}
        initialDetails={details}
        isPaid={data.isPaid}
        paymentStatus={data.paymentStatus}
        isLocked={isLocked}
        lockReason={lockReason}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['billingDetail', id] })
          queryClient.invalidateQueries({ queryKey: ['m3-check'] })
          queryClient.invalidateQueries({ queryKey: ['billingTransportCheck'] })
        }}
      />

      {/* ─── UNIFIED DYNAMIC VOICE CAPSULE HUD (Bottom-Center) ─── */}
      <ValidationVoiceHud
        isSupported={isSupported}
        isListening={isListening}
        isMuted={isMuted}
        transcript={transcript}
        interimTranscript={interimTranscript}
        commandStatus={commandStatus}
        commandFeedback={commandFeedback}
        onToggleMute={handleToggleVoice}
        onExecuteSimulatedCommand={(cmd) => executeVoiceCommandRef.current(cmd)}
        activeInvNo={data?.fdInvNo}
        isSea={isSea}
      />
    </div>
  )
}

export default ValidationDetailPage
