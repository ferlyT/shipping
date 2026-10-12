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
  RefreshCw,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { formatDate, copyToClipboard, cn, displayCustName } from '@/lib/utils'
import { BillingValidationCard } from '../components/BillingValidationCard'
import { ValidationListDrawer } from '../components/ValidationListDrawer'
import { BillingValidationSummaryModal } from '../components/BillingValidationSummaryModal'
import { useVoiceAssistantStore } from '@/stores/voiceAssistantStore'
import type { ValidationCardTab } from '../components/validation-card/types'
import type { SummaryModalTab } from '../components/validation-summary/types'
import type { Billing, BillingDetail, M3CheckResponse } from '../types/billing.types'
import { BillingPrintButtons } from '../components/BillingPrintButtons'
import { CustomerBillingHistoryModal } from '../components/CustomerBillingHistoryModal'
import { IssueInvoiceModal } from '../components/IssueInvoiceModal'
import { BillResiMarkingModal } from '../components/BillResiMarkingModal'
import { EditBillingDetailsModal } from '../components/EditBillingDetailsModal'
import { CustomerTariffAuditModal } from '../components/CustomerTariffAuditModal'
import { CustomerHargaModal } from '../components/CustomerHargaModal'
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

  const { registerContext, unregisterContext, suppressVoice } = useVoiceAssistantStore()

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
  const [isCustomerHargaModalOpen, setIsCustomerHargaModalOpen] = useState(false)
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

  // ── Register Voice Assistant Context for GlobalVoiceHud Actions ──
  useEffect(() => {
    if (!data) return
    registerContext({
      currentInvNo: data.fdInvNo,
      isIssued: Number(data.fdGive) === 1,
      underchargedCount: underchargedItems.length,
      isSea: isSea,
      onOpenSummary: (tab) => {
        if (tab) setSummaryInitialTab(tab)
        setIsSummaryModalOpen(true)
      },
      onCloseSummary: () => setIsSummaryModalOpen(false),
      onTriggerIssue: () => setIsIssueModalOpen(true),
      onRefreshValidation: handleRefresh,
      onSwitchTab: (tabKey) => {
        setMobileTab('validation')
        if (tabKey === 'pricing' || tabKey === 'tab1') setValidationCardTab('profile')
        else if (tabKey === 'm3' || tabKey === 'tab2') setValidationCardTab('m3_weight')
        else if (tabKey === 'overweight' || tabKey === 'tab3') setValidationCardTab(isSea ? 'overweight' : 'freight')
        else if (tabKey === 'freight' || tabKey === 'tab4') setValidationCardTab(isSea ? 'freight' : 'transport')
        else if (tabKey === 'transport' || tabKey === 'tab5') setValidationCardTab('transport')
        else if (tabKey === 'items') setMobileTab('items')
      },
      onPrintInvoice: () => {
        if (data?.fdInvNo) downloadInvoicePdf(data.fdInvNo)
      },
      onOpenDrawer: () => setIsListDrawerOpen(true),
      onOpenModal: (name) => {
        if (name === 'resi') setIsResiModalOpen(true)
        else if (name === 'inspection') setIsAuditModalOpen(true)
        else if (name === 'history') setIsHistoryModalOpen(true)
        else if (name === 'audit') setIsAuditModalOpen(true)
        else if (name === 'tarif') setIsCustomerHargaModalOpen(true)
        else if (name === 'issue') setIsIssueModalOpen(true)
        else if (name === 'summary') setIsSummaryModalOpen(true)
      },
      onBack: () => navigate(ROUTES.BILLING_VALIDATION_LIST),
    })

    return () => {
      unregisterContext()
    }
  }, [data?.fdInvNo, data?.fdGive, underchargedItems.length, isSea, registerContext, unregisterContext, handleRefresh, navigate])

  const isAnyModalOpen = Boolean(
    isListDrawerOpen ||
    isSummaryModalOpen ||
    isIssueModalOpen ||
    isHistoryModalOpen ||
    isResiModalOpen ||
    isEditItemsModalOpen ||
    isAuditModalOpen ||
    isCustomerHargaModalOpen
  )
  // Supresi asisten suara otomatis saat dialog modal sedang terbuka
  useEffect(() => {
    if (isAnyModalOpen) {
      const unsuppress = suppressVoice()
      return () => {
        unsuppress()
      }
    }
  }, [isAnyModalOpen, suppressVoice])

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
            onOpenCustomerHarga={() => setIsCustomerHargaModalOpen(true)}
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
              onOpenCustomerHargaModal={() => setIsCustomerHargaModalOpen(true)}
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
        onSelectInvoice={(invNo) => navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))}
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

      <CustomerHargaModal
        isOpen={isCustomerHargaModalOpen}
        custCode={data.fdCustCode || ''}
        custName={displayCustName(data.customer?.fdCustName || data.fdCustCode)}
        onClose={() => setIsCustomerHargaModalOpen(false)}
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

    </div>
  )
}

export default ValidationDetailPage
