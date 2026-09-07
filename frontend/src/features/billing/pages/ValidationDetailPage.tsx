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
} from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { formatDate, copyToClipboard, cn } from '@/lib/utils'
import { BillingValidationCard } from '../components/BillingValidationCard'
import { ValidationListDrawer } from '../components/ValidationListDrawer'
import { BillingValidationSummaryModal, type M3CheckResponse } from '../components/BillingValidationSummaryModal'
import { CustomerBillingHistoryModal } from '../components/CustomerBillingHistoryModal'
import { IssueInvoiceModal } from '../components/IssueInvoiceModal'
import { BillResiMarkingModal } from '../components/BillResiMarkingModal'
import { EditBillingDetailsModal } from '../components/EditBillingDetailsModal'
import { BILL_TYPE_CONFIGS, getBillType, isUnitCode } from '../constants/billing.constants'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import type { Billing, BillingDetail } from '../types/billing.types'
import { formatQtyDecimal, isMktCustomer, evaluateItemPrice } from '../utils/billing.utils'
import { useInvoiceMetrics } from '../hooks/useInvoiceMetrics'

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

function ItemPriceBadge({ row, validationData }: {
  row: BillingDetail
  validationData?: M3CheckResponse | null
}) {
  if (!validationData) return null
  const evalRes = evaluateItemPrice(row, {
    res: validationData,
    isAir: validationData.fdListType === 1 || validationData.expectedMode === 'BY AIR',
    defaultTypeId: validationData.defaultFdTypeComodity ?? validationData.markingComodityType ?? null,
    defaultComodityName: validationData.markingComodities?.[0]?.fdComodityName || '—',
  })
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isResiModalOpen, setIsResiModalOpen] = useState(false)
  const [isEditItemsModalOpen, setIsEditItemsModalOpen] = useState(false)

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
  const details = useMemo(
    () =>
      [...(data?.details || [])].sort((a, b) =>
        String(a?.fdID ?? '').trim().localeCompare(String(b?.fdID ?? '').trim(), undefined, { numeric: true })
      ),
    [data?.details]
  )

  const { unitTotals, billedM3, billedKg, billedVfc, underchargedItems } = useInvoiceMetrics({
    details,
    validationData,
  })

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
    const comodity = data.fdComodity || ''
    const comodityType = data.fdTypeComodityName || ''
    const tglAgent = data.fdTglAgent ? formatDate(data.fdTglAgent) : '—'

    let text = `Customer: ${custName}\nMarking Code: ${markingCode}\nMarking No: ${markingNo}`
    if (comodity || comodityType) {
      text += `\nKomoditi: ${[comodity, comodityType ? `(${comodityType})` : ''].filter(Boolean).join(' ')}`
    }
    text += `\nTgl Agent: ${tglAgent}`

    const success = await copyToClipboard(text)
    if (success) {
      setIsCopied(true)
      addToast({ type: 'success', message: 'Data customer, marking, komoditi & tgl agent berhasil disalin!' })
      setTimeout(() => setIsCopied(false), 2000)
    } else {
      addToast({ type: 'error', message: 'Gagal menyalin data ke clipboard' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen lg:h-[calc(100vh-4.25rem)] lg:overflow-hidden p-2 sm:p-3 gap-2 sm:gap-2.5 bg-[var(--color-neutral)] text-[var(--color-primary)] font-[var(--font-body)] animate-fadeIn overflow-y-auto lg:overflow-y-hidden">

      {/* ─── 1. COMPACT TOP HEADER BAR ─── */}
      <div className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs shrink-0 flex-wrap">
        {/* Left: Back + Inv No + Status Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(ROUTES.BILLING_VALIDATION_LIST)}
            className="p-1 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            title={t('billing.validation.backToList')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-[var(--color-secondary)]">Inv:</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-[var(--color-primary)]">{data.fdInvNo}</span>
            <span className={cn('text-[9px] sm:text-[10px] px-1.5 py-0.2 font-bold rounded border uppercase', billTypeConfig.badgeClasses)}>
              {billTypeConfig.label}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] max-w-[200px] truncate">
            <User size={12} className="text-[var(--color-secondary)] shrink-0" />
            <span className="font-semibold truncate text-[var(--color-primary)]" title={data.customer?.fdCustName || data.fdCustCode || '—'}>
              {data.customer?.fdCustName || data.fdCustCode || '—'}
            </span>
          </div>

          <IssuedBadge isIssued={Number(data.fdGive) === 1} />
          <PaymentBadge status={data.paymentStatus} />
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap ml-auto">
          {Number(data.fdGive) !== 1 && (
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(true)}
              className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              title="Terbitkan invoice menjadi status Issued"
            >
              <Send className="w-3 h-3" />
              <span>Terbitkan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSummaryModalOpen(true)}
            className="px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            title="Buka dialog kesimpulan validasi operasional & tarif"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Inspeksi Ringkas</span>
            <span className="sm:hidden">Inspeksi</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResiModalOpen(true)}
            className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            title="Pengecekan Resi & Persebaran Marking"
          >
            <ScanBarcode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Cek Resi</span>
            <span className="sm:hidden">Resi</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-1.5 sm:px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            title="Riwayat Tagihan / Billing Customer"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            type="button"
            onClick={() => setIsListDrawerOpen(true)}
            className="p-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] shadow-2xs transition-all cursor-pointer"
            title="Cari Invoice Lain (Ctrl+F)"
          >
            <ListFilter className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN 2-COLUMN LAYOUT ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-3 sm:gap-3.5 lg:min-h-0 lg:overflow-hidden">

        {/* ── Kolom Kiri: Identitas Tagihan & Rincian Item ── */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 flex flex-col gap-3 lg:gap-3.5 lg:min-h-0 lg:overflow-hidden">

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

            {/* Body */}
            <div className="overflow-y-auto min-h-0 max-h-[calc(100vh-20rem)] divide-y divide-[var(--color-border)]/60">
              {details.length > 0 ? (
                <table className="w-full table-fixed text-left text-xs">
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
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {row.fdComodity && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[130px]">
                                {row.fdComodity}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                              @ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}
                            </span>
                            <ItemPriceBadge row={row} validationData={validationData} />
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
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 flex flex-col min-h-0 h-auto lg:h-full lg:overflow-hidden">
          {primaryListCode && (
            <BillingValidationCard
              listCode={primaryListCode}
              billedM3={billedM3}
              billedKg={billedKg}
              billedVfc={billedVfc}
              invoiceDetails={details}
              billFdTypeComodity={data.fdTypeComodity}
              billType={billType}
              markingCode={data.fdMarkingCode}
              markingNo={data.fdMarkingNo}
              invoiceNo={data.fdInvNo}
              customerName={data.customer?.fdCustName}
              custCode={data.fdCustCode}
              onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
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
        validationData={validationData}
        isLoadingValidation={isLoadingValidation}
        billedM3={billedM3}
        billedKg={billedKg}
        billedVfc={billedVfc}
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
