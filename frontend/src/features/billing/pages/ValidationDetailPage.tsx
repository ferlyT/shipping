import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  Edit3,
  History,
  Truck,
  AlertTriangle,
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { formatDate, copyToClipboard, cn } from '@/lib/utils'
import { BillingValidationCard } from '../components/BillingValidationCard'
import { ValidationListDrawer } from '../components/ValidationListDrawer'
import { BillingValidationSummaryModal, type M3CheckResponse } from '../components/BillingValidationSummaryModal'
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
import type { Billing, BillingDetail } from '../types/billing.types'
import { formatQtyDecimal, isMktCustomer, evaluateItemPrice } from '../utils/billing.utils'
import { useBillingValidation } from '../hooks/useBillingValidation'

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

// ─── StatusBadge helpers ──────────────────────────────────────────────────────

function IssuedBadge({ isIssued }: { isIssued: boolean }) {
  return isIssued ? (
    <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
      <Check size={10} className="stroke-[3]" /> ISSUED
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
      DRAFT
    </span>
  )
}

function PaymentBadge({ status }: { status?: string | null }) {
  if (status === 'LUNAS')
    return (
      <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
        LUNAS
      </span>
    )
  if (status === 'SEBAGIAN')
    return (
      <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
        SEBAGIAN
      </span>
    )
  return (
    <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
      BELUM LUNAS
    </span>
  )
}

// ─── Item price inline badge ──────────────────────────────────────────────────

function ItemPriceBadge({ row, validationData, expedisiList }: {
  row: BillingDetail
  validationData?: M3CheckResponse | null
  expedisiList?: any[]
}) {
  if (!validationData && (!expedisiList || expedisiList.length === 0)) return null
  const evalRes = evaluateItemPrice(row, {
    res: validationData,
    isAir: validationData?.fdListType === 1 || validationData?.expectedMode === 'BY AIR',
    defaultTypeId: validationData?.defaultFdTypeComodity ?? validationData?.markingComodityType ?? null,
    defaultComodityName: validationData?.markingComodities?.[0]?.fdComodityName || '—',
    expedisiList,
  })

  // Penanganan khusus item Transport terhadap tbExpIndo
  if (evalRes.isTransportItem) {
    const exp = evalRes.transportExpedisi
    if (!evalRes.hasTargetPrice) {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap"
          title="Belum ada data biaya ekspedisi lokal tercatat di tbExpIndo"
        >
          Belum Ada tbExpIndo
        </span>
      )
    }

    const paidStatus = exp?.fdPaid === 1 ? 'Harus Tagih' : exp?.fdPaid === 2 ? 'COD' : ''
    const expTooltip = exp
      ? `Acuan tbExpIndo${paidStatus ? ` [${paidStatus}]` : ''}: ${exp.fdExpName || 'Ekspedisi'}${exp.fdResiExp ? ` (Resi: ${exp.fdResiExp})` : ''} — ${formatWithCurrency(exp.fdTotalExp, 'Rp.')}`
      : 'Acuan tbExpIndo'

    if (evalRes.statusType === 'LOWER') {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap flex items-center gap-1"
          title={expTooltip}
        >
          <span>Undercharge</span>
          {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
        </span>
      )
    }

    if (evalRes.statusType === 'HIGHER') {
      return (
        <span
          className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap flex items-center gap-1"
          title={expTooltip}
        >
          <span>Overcharge</span>
          {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
        </span>
      )
    }

    return (
      <span
        className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1"
        title={expTooltip}
      >
        <span>✓ Match tbExpIndo</span>
        {exp?.fdExpName && <span className="opacity-75 font-normal">({exp.fdExpName.trim()})</span>}
      </span>
    )
  }

  if (!evalRes.hasTargetPrice && !evalRes.isTaxReturnItem && !evalRes.isKgOverweightItem) return null

  if (evalRes.statusType === 'LOWER')
    return (
      <span className="text-[9px] px-1 py-0 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap" title="Harga di bawah tarif acuan master">
        Undercharge
      </span>
    )
  if (evalRes.statusType === 'HIGHER')
    return (
      <span className="text-[9px] px-1 py-0 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap" title="Harga di atas tarif acuan master">
        Overcharge
      </span>
    )
  return (
    <span className="text-[9px] px-1 py-0 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap" title="Harga sesuai acuan master">
      Match
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ValidationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToastStore()

  // ── Modal / Drawer states ──
  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isCopiedInv, setIsCopiedInv] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isResiModalOpen, setIsResiModalOpen] = useState(false)
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false)
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'validation' | 'items'>('validation')

  // Re-open summary modal on invoice change
  useEffect(() => { if (id) setIsSummaryModalOpen(true) }, [id])

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

  const billType = getBillType(data)
  const billTypeConfig = BILL_TYPE_CONFIGS[billType]

  const primaryListCode =
    (!isUnitCode(data?.fdListCode) ? data?.fdListCode?.trim() : null) ||
    data?.details?.find((d) => !isUnitCode(d.fdListCode))?.fdListCode?.trim() ||
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
          ...(data?.details || []).map((d) => d.fdListCode),
        ]
          .filter((lc): lc is string => typeof lc === 'string' && lc.trim().length >= 4)
          .map((lc) => lc.trim())
      )
    )
  }, [data?.fdListCode, validationData?.fdListCode, data?.details])
  const billingListCodeParam = allBillingListCodes.join(',') || (data?.fdListCode ? String(data.fdListCode).trim() : '')

  const transportDetailItem = useMemo(() => {
    return (data?.details || []).find((d) => {
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
  } = validation

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

  // ── Handlers ──
  const handleCopyMarkingInfo = async () => {
    const custName = data.customer?.fdCustName || data.fdCustCode || '—'
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
            <IssuedBadge isIssued={Number(data.fdGive) === 1} />
            <PaymentBadge status={data.paymentStatus} />
          </div>
        </div>

        {/* Row 2 / Right: Customer info + Quick Action Buttons Ribbon */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[var(--color-border)]/60 min-w-0">
          <div className="flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-md bg-[var(--color-neutral)] border border-[var(--color-border)] max-w-[140px] sm:max-w-[200px] truncate">
            <User size={11} className="text-[var(--color-secondary)] shrink-0" />
            <span className="font-semibold truncate text-[var(--color-primary)]" title={data.customer?.fdCustName || data.fdCustCode || '—'}>
              {data.customer?.fdCustName || data.fdCustCode || '—'}
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
              onClick={() => setIsListDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] shadow-2xs transition-all cursor-pointer shrink-0"
              title="Cari Invoice Lain (Ctrl+F)"
            >
              <ListFilter className="w-3.5 h-3.5" />
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
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-2xs shrink-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5 text-xs">

              {/* Customer */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider block">Customer</span>
                <p className="font-bold text-sm text-[var(--color-primary)] truncate" title={data.customer?.fdCustName || data.fdCustCode || '—'}>
                  {data.customer?.fdCustName || data.fdCustCode || '—'}
                </p>
                {data.customer?.fdSalesNM && (
                  <p className="text-[11px] text-[var(--color-secondary)] truncate">
                    Sales: <span className="font-semibold text-[var(--color-primary)]">{data.customer.fdSalesNM.trim()}</span>
                    {isMktCustomer(data.customer, data.customer?.fdSalesNM) && (
                      <span className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">(MKT)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Tanggal */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider block">Tgl Tagihan</span>
                <p className="font-bold text-sm text-[var(--color-primary)]">{formatDate(data.fdInvDate)}</p>
                {data.fdTglAgent && (
                  <p className="text-[11px] text-[var(--color-secondary)]">
                    Agent: <span className="font-medium text-[var(--color-primary)]">{formatDate(data.fdTglAgent)}</span>
                  </p>
                )}
              </div>

              {/* Marking + Copy */}
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider">Marking</span>
                  <button
                    type="button"
                    onClick={handleCopyMarkingInfo}
                    className="p-1 rounded hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    title="Salin Data Customer, Marking & Tgl Agent"
                  >
                    {isCopied
                      ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      : <Copy className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
                <p className="font-bold text-sm text-[var(--color-primary)] truncate font-mono" title={data.fdMarkingCode || '—'}>
                  {data.fdMarkingCode || '—'}
                </p>
                {data.fdMarkingNo && (
                  <p className="text-[11px] text-[var(--color-secondary)] font-mono truncate" title={data.fdMarkingNo.trim()}>
                    ({data.fdMarkingNo.trim()})
                  </p>
                )}
                {data.fdConsignee && (
                  <p className="text-[11px] text-[var(--color-secondary)] truncate" title={data.fdConsignee}>
                    Consignee: <span className="font-semibold text-[var(--color-primary)]">{data.fdConsignee}</span>
                  </p>
                )}
                {data.resiSummary?.resiList && data.resiSummary.resiList.length > 0 && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate" title={data.resiSummary.resiList.join(', ')}>
                    Resi: {data.resiSummary.resiList[0]}{data.resiSummary.resiList.length > 1 ? ` (+${data.resiSummary.resiList.length - 1})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-row: Pembuat & Kasir */}
            <div className="pt-2.5 mt-1 border-t border-[var(--color-border)]/70 flex items-center justify-between text-xs text-[var(--color-secondary)]">
              <span>Pembuat: <strong className="text-[var(--color-primary)] font-semibold">{data.employee?.fdEmpName || '—'}</strong></span>
              {data.isPaid ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Kasir #{data.cashierID} • {data.cashierDate ? formatDate(data.cashierDate) : 'Lunas'}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Belum Dibayar</span>
              )}
            </div>
          </div>

          {/* Card: Tabel Rincian Item (scrollable body, sticky footer) */}
          <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden h-fit max-h-[calc(100vh-13rem)]">
            {/* Header */}
            <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] flex items-center justify-center shrink-0">
                  <Receipt size={13} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-label)] truncate">
                  Rincian Item Tagihan
                </span>
                <span className="text-[11px] font-semibold text-[var(--color-secondary)] px-1.5 py-0.2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
                  {details.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditItemsModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-primary)] hover:border-[var(--color-tertiary)] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0"
                title="Edit Kuantitas, Harga, Satuan, atau Tambah/Hapus Baris Item"
              >
                <Edit3 size={13} className="text-[var(--color-tertiary)]" />
                <span>Edit Item</span>
              </button>
            </div>

            {/* Warning jika ada ekspedisi Harus Tagih namun item tagihan tidak ada */}
            {hasUnbilledTransport && (
              <div className="p-2.5 sm:p-3 bg-amber-500/10 border-b border-amber-500/25 flex items-start justify-between gap-2.5 text-xs shadow-2xs">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle size={12} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px] sm:text-xs">
                      Peringatan tbExpIndo: Biaya Ekspedisi (Harus Tagih) Belum Ditagihkan!
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-amber-800/90 dark:text-amber-300 block leading-tight">
                      Ditemukan {unbilledExpedisiList.length} catatan ekspedisi berstatus Harus Tagih (fdPaid: 1) di <code className="font-mono px-1 rounded bg-amber-500/20">tbExpIndo</code> senilai total <strong className="font-mono font-bold text-amber-950 dark:text-amber-100">{formatWithCurrency(totalUnbilledTransportAmount, 'Rp.')}</strong> ({unbilledExpedisiList[0]?.fdExpName || 'Ekspedisi'}{unbilledExpedisiList[0]?.fdResiExp ? ` Resi: ${unbilledExpedisiList[0].fdResiExp}` : ''}), namun belum ada baris item tagihan Transport / Ongkir pada invoice ini.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="px-2 py-1 rounded text-[11px] font-bold border border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200 hover:bg-amber-500/25 transition-colors shrink-0 whitespace-nowrap cursor-pointer self-start"
                >
                  Detail →
                </button>
              </div>
            )}

            {/* Body */}
            <div className="overflow-y-auto min-h-0 max-h-[calc(100vh-20rem)] divide-y divide-[var(--color-border)]/60">
              {details.length > 0 ? (
                <>
                  {/* MOBILE CARDS VIEW (< sm) */}
                  <div className="sm:hidden divide-y divide-[var(--color-border)]/60">
                    {details.map((row) => (
                      <div key={row.fdID} className="p-3 space-y-2 hover:bg-[var(--color-neutral)]/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[var(--color-primary)] text-xs leading-snug" title={row.fdItemName}>
                              {row.fdItemName}
                            </p>
                            {/* Baris Rincian tbExpIndo jika item adalah Transport */}
                            {/(TRANSPORT|DELIVERY|ONGKIR|TRUCKING)/i.test(row.fdItemName || '') && (
                              <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                                  <Truck size={10} />
                                  <span>tbExpIndo:</span>
                                </span>
                                {transportValidation?.matchingExpedisi ? (
                                  <>
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {transportValidation.matchingExpedisi.fdExpName || 'Ekspedisi'}
                                    </span>
                                    {transportValidation.matchingExpedisi.fdResiExp && (
                                      <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                        ({transportValidation.matchingExpedisi.fdResiExp.trim()})
                                      </span>
                                    )}
                                    {transportValidation.matchingExpedisi.fdPaid === 1 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                        Harus Tagih
                                      </span>
                                    ) : transportValidation.matchingExpedisi.fdPaid === 2 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                        COD
                                      </span>
                                    ) : null}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                      • Real: {formatWithCurrency(transportValidation.matchingExpedisi.fdTotalExp, 'Rp.')}
                                    </span>
                                  </>
                                ) : validExpedisiList.length > 0 ? (
                                  <>
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {validExpedisiList[0].fdExpName || 'Ekspedisi'}
                                    </span>
                                    {validExpedisiList[0].fdResiExp && (
                                      <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                        ({validExpedisiList[0].fdResiExp.trim()})
                                      </span>
                                    )}
                                    {validExpedisiList[0].fdPaid === 1 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                        Harus Tagih
                                      </span>
                                    ) : validExpedisiList[0].fdPaid === 2 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                        COD
                                      </span>
                                    ) : null}
                                    <span className="font-mono text-[var(--color-primary)]">
                                      • tbExpIndo: {formatWithCurrency(validExpedisiList[0].fdTotalExp, 'Rp.')}
                                    </span>
                                  </>
                                ) : transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                                  <span className="italic text-amber-600 dark:text-amber-400">
                                    tbExpIndo: Biaya Rp 0 (Belum Terisi / Tidak Valid)
                                  </span>
                                ) : (
                                  <span className="italic text-amber-600 dark:text-amber-400">
                                    Belum ada data di tbExpIndo
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right font-mono font-bold text-xs text-[var(--color-primary)] shrink-0">
                            <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-secondary)]">
                          <span className="flex items-center gap-1 font-sans">
                            <span className="font-semibold text-[var(--color-primary)] font-mono">
                              {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                            </span>
                            {row.fdListCode && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--color-neutral)] border border-[var(--color-border)]">
                                {row.fdListCode.trim()}
                              </span>
                            )}
                          </span>
                          <span>@ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--color-border)]/40 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const evalItem = evaluatedItems.find((e) => e.item.fdID === row.fdID)?.evaluation
                              const displayComodity = evalItem?.comodityName && evalItem.comodityName !== '—'
                                ? evalItem.comodityName
                                : row.fdComodity
                              return displayComodity ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[150px]">
                                  {displayComodity}
                                </span>
                              ) : null
                            })()}
                          </div>
                          <ItemPriceBadge row={row} validationData={validationData} expedisiList={validExpedisiList} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* DESKTOP / TABLET SPREADSHEET TABLE (>= sm) */}
                  <table className="hidden sm:table w-full table-fixed text-left text-xs">
                    <colgroup>
                      <col style={{ width: '52%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead className="bg-[var(--color-neutral)]/80 sticky top-0 z-10 text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                      <tr>
                        <th className="px-3.5 py-2">Deskripsi / Komoditas</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3.5 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]/60">
                      {details.map((row) => (
                        <tr key={row.fdID} className="hover:bg-[var(--color-neutral)]/30 transition-colors">
                          <td className="px-3.5 py-2.5 leading-snug">
                            <p className="font-semibold text-[var(--color-primary)] text-xs line-clamp-2" title={row.fdItemName}>
                              {row.fdItemName}
                            </p>
                            {/* Baris Rincian tbExpIndo jika item adalah Transport */}
                            {/(TRANSPORT|DELIVERY|ONGKIR|TRUCKING)/i.test(row.fdItemName || '') && (
                              <div className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                                  <Truck size={10} />
                                  <span>tbExpIndo:</span>
                                </span>
                                {transportValidation?.matchingExpedisi ? (
                                  <>
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {transportValidation.matchingExpedisi.fdExpName || 'Ekspedisi'}
                                    </span>
                                    {transportValidation.matchingExpedisi.fdResiExp && (
                                      <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                        ({transportValidation.matchingExpedisi.fdResiExp.trim()})
                                      </span>
                                    )}
                                    {transportValidation.matchingExpedisi.fdPaid === 1 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                        Harus Tagih
                                      </span>
                                    ) : transportValidation.matchingExpedisi.fdPaid === 2 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                        COD
                                      </span>
                                    ) : null}
                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                      • Real: {formatWithCurrency(transportValidation.matchingExpedisi.fdTotalExp, 'Rp.')}
                                    </span>
                                  </>
                                ) : validExpedisiList.length > 0 ? (
                                  <>
                                    <span className="font-semibold text-[var(--color-primary)]">
                                      {validExpedisiList[0].fdExpName || 'Ekspedisi'}
                                    </span>
                                    {validExpedisiList[0].fdResiExp && (
                                      <span className="font-mono text-[9px] text-[var(--color-secondary)]">
                                        ({validExpedisiList[0].fdResiExp.trim()})
                                      </span>
                                    )}
                                    {validExpedisiList[0].fdPaid === 1 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                        Harus Tagih
                                      </span>
                                    ) : validExpedisiList[0].fdPaid === 2 ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-600 border border-sky-500/30">
                                        COD
                                      </span>
                                    ) : null}
                                    <span className="font-mono text-[var(--color-primary)]">
                                      • tbExpIndo: {formatWithCurrency(validExpedisiList[0].fdTotalExp, 'Rp.')}
                                    </span>
                                  </>
                                ) : transportValidation?.expedisiList && transportValidation.expedisiList.length > 0 ? (
                                  <span className="italic text-amber-600 dark:text-amber-400">
                                    tbExpIndo: Biaya Rp 0 (Belum Terisi / Tidak Valid)
                                  </span>
                                ) : (
                                  <span className="italic text-amber-600 dark:text-amber-400">
                                    Belum ada data di tbExpIndo
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {(() => {
                                const evalItem = evaluatedItems.find((e) => e.item.fdID === row.fdID)?.evaluation
                                const displayComodity = evalItem?.comodityName && evalItem.comodityName !== '—'
                                  ? evalItem.comodityName
                                  : row.fdComodity
                                return displayComodity ? (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[130px]">
                                    {displayComodity}
                                  </span>
                                ) : null
                              })()}
                              <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                                @ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}
                              </span>
                              <ItemPriceBadge row={row} validationData={validationData} expedisiList={validExpedisiList} />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-medium text-[var(--color-primary)]">
                            {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                            {row.fdListCode && (
                              <span className="text-[9px] text-[var(--color-secondary)] block font-sans">
                                {row.fdListCode.trim()}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[var(--color-primary)]">
                            <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="py-10 text-center text-xs text-[var(--color-secondary)]">
                  {t('billing.detail.noItems')}
                </div>
              )}
            </div>

            {/* Sticky Footer: Totals */}
            <div className="p-3 sm:p-3.5 bg-[var(--color-neutral)]/70 border-t border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {Object.entries(unitTotals).map(([unit, qty]) => (
                  <span key={unit} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold text-xs text-[var(--color-primary)] shadow-2xs">
                    <span className="text-[var(--color-secondary)] font-normal">{unit}:</span>
                    <span>{formatQtyDecimal(qty, unit)}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-baseline gap-2 ml-auto">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">Total:</span>
                <span className="font-mono font-bold text-base sm:text-lg text-[var(--color-tertiary)]">
                  {Number(data.fdJumlah2 || 0) > 0
                    ? formatWithCurrency(data.fdJumlah2, data.fdCurr1)
                    : formatWithCurrency(data.fdJumlah1, 'Rp.')}
                </span>
              </div>
            </div>
          </div>
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
              customerName={data.customer?.fdCustName}
              custCode={data.fdCustCode}
              onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* ─── FAB: Drawer Pencarian Invoice ─── */}
      {createPortal(
        <button
          onClick={() => setIsListDrawerOpen(true)}
          className="fixed right-3 bottom-6 z-40 p-3 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-2xl hover:opacity-90 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-2 border-[var(--color-surface)]"
          title={`${t('billing.validation.selectInvoiceTitle')} (Ctrl + F)`}
        >
          <ListFilter className="w-4 h-4 text-[var(--color-on-primary)]" />
        </button>,
        document.body
      )}

      {/* ─── MODALS ─── */}
      <ValidationListDrawer
        isOpen={isListDrawerOpen}
        onClose={() => setIsListDrawerOpen(false)}
        currentInvNo={data.fdInvNo}
        onSelectInvoice={(invNo) => navigate(ROUTES.BILLING_VALIDATION_DETAIL(invNo))}
      />

      <BillingValidationSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        billingData={data}
        validation={validation}
        validationData={validationData}
        isLoadingValidation={isLoadingValidation}
        billedM3={billedM3}
        billedKg={billedKg}
        billedVfc={billedVfc}
        unitTotals={unitTotals}
        onOpenIssueModal={() => setIsIssueModalOpen(true)}
      />

      <CustomerBillingHistoryModal
        isOpen={isHistoryModalOpen}
        custCode={data.fdCustCode}
        custName={data.customer?.fdCustName}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <IssueInvoiceModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        invNo={data.fdInvNo}
        custName={data.customer?.fdCustName || data.fdCustCode || undefined}
        custCode={data.fdCustCode || undefined}
        invDate={data.fdInvDate}
        totalAmount={Number(data.fdJumlah2 || data.fdJumlah1 || 0)}
        underchargedItems={underchargedItems}
      />

      <BillResiMarkingModal
        isOpen={isResiModalOpen}
        onClose={() => setIsResiModalOpen(false)}
        invNo={data.fdInvNo}
        custName={data.customer?.fdCustName || data.fdCustCode || undefined}
        custCode={data.fdCustCode || undefined}
        markingCode={data.fdMarkingCode || undefined}
        markingNo={data.fdMarkingNo || undefined}
      />

      <CustomerTariffAuditModal
        isOpen={isAuditModalOpen}
        custCode={data.fdCustCode || null}
        custName={data.customer?.fdCustName || data.fdCustCode || undefined}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <EditBillingDetailsModal
        isOpen={isEditItemsModalOpen}
        onClose={() => setIsEditItemsModalOpen(false)}
        invNo={data.fdInvNo}
        custName={data.customer?.fdCustName || data.fdCustCode || undefined}
        custCode={data.fdCustCode || undefined}
        markingCode={data.fdMarkingCode || undefined}
        initialDetails={details}
        isPaid={data.isPaid}
        paymentStatus={data.paymentStatus}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['billingDetail', id] })
          queryClient.invalidateQueries({ queryKey: ['m3-check'] })
        }}
      />
    </div>
  )
}

export default ValidationDetailPage
