import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { BILL_TYPE_CONFIGS, getBillType, isUnitCode } from '../constants/billing.constants'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useToastStore } from '@/stores/toastStore'
import type { Billing } from '../types/billing.types'
import { formatQtyDecimal, isMktCustomer, evaluateItemPrice } from '../utils/billing.utils'

function ValidationDetailPageSkeleton() {
  return (
    <div className="flex flex-col min-h-screen lg:h-[calc(100vh-4.25rem)] lg:overflow-hidden p-2 sm:p-3 gap-2.5 animate-fadeIn font-[var(--font-body)]">
      {/* Top Bar Skeleton */}
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

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        <div className="lg:col-span-5 h-[350px] lg:h-full rounded-xl skeleton-shimmer border border-[var(--color-border)]" />
        <div className="lg:col-span-7 min-h-[500px] lg:h-full rounded-xl skeleton-shimmer border border-[var(--color-border)]" />
      </div>
    </div>
  )
}

export function ValidationDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToastStore()

  const [isListDrawerOpen, setIsListDrawerOpen] = useState(false)
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
  const [isResiModalOpen, setIsResiModalOpen] = useState(false)

  useEffect(() => {
    if (id) {
      setIsSummaryModalOpen(true)
    }
  }, [id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsListDrawerOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billingDetail', id],
    queryFn: async () => {
      if (!id) return null
      const res = await billingApi.detail(id)
      return res.data?.data as Billing
    },
    enabled: !!id,
    staleTime: 60000,
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
    staleTime: 60000,
  })

  const handleCopyMarkingInfo = async () => {
    const custName = data?.customer?.fdCustName || data?.fdCustCode || '—'
    const markingCode = data?.fdMarkingCode || '—'
    const markingNo = data?.fdMarkingNo || '—'
    const comodity = data?.fdComodity || ''
    const comodityType = data?.fdTypeComodityName || ''
    const tglAgent = data?.fdTglAgent ? formatDate(data.fdTglAgent) : '—'

    let textToCopy = `Customer: ${custName}\nMarking Code: ${markingCode}\nMarking No: ${markingNo}`
    if (comodity || comodityType) {
      textToCopy += `\nKomoditi: ${[comodity, comodityType ? `(${comodityType})` : ''].filter(Boolean).join(' ')}`
    }
    textToCopy += `\nTgl Agent: ${tglAgent}`

    const success = await copyToClipboard(textToCopy)
    if (success) {
      setIsCopied(true)
      addToast({
        type: 'success',
        message: 'Data customer, marking, komoditi & tgl agent berhasil disalin!',
      })
      setTimeout(() => setIsCopied(false), 2000)
    } else {
      addToast({
        type: 'error',
        message: 'Gagal menyalin data ke clipboard',
      })
    }
  }

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

  const details = [...(data?.details || [])].sort((a, b) => String(a?.fdID ?? '').localeCompare(String(b?.fdID ?? '')))

  const isAuxiliaryItem = (name?: string | null) => {
    const n = (name || '').toUpperCase()
    return (
      n.includes('TAX RETURN') ||
      n.includes('ADMIN') ||
      n.includes('SURCHARGE') ||
      n.includes('DISCOUNT') ||
      n.includes('BIAYA') ||
      n.includes('PENYESUAIAN')
    )
  }

  const isVfcItem = (name?: string | null, unitCode?: string | null) => {
    const n = (name || '').toUpperCase()
    const u = (unitCode || '').toUpperCase().trim()
    return (n.includes('VOLUME FREIGHT') || n.includes('VFC')) && (u === 'KG' || !u || u === 'VFC') && !n.includes('FREIGHT CHARGE')
  }

  const isFreightChargeItem = (name?: string | null, unitCode?: string | null) => {
    const n = (name || '').toUpperCase()
    const u = (unitCode || '').toUpperCase().trim()
    if (isVfcItem(name, unitCode)) return false
    return (
      n.includes('FREIGHT CHARGE') ||
      n.includes('FREIGHT CHARGES') ||
      ['HK$', 'Y$', 'RMB', 'USD', 'S$', '$'].includes(u)
    )
  }

  const unitTotals = details.reduce<Record<string, number>>((acc, row) => {
    if (isAuxiliaryItem(row.fdItemName)) return acc

    const nameUpper = (row.fdItemName || '').toUpperCase()
    let unit = row.fdListCode?.trim()?.toUpperCase()

    if (isFreightChargeItem(row.fdItemName, row.fdListCode)) {
      const fcUnit = unit || 'FREIGHT CHARGE'
      const key = fcUnit === 'FREIGHT CHARGE' ? 'FREIGHT CHARGE' : `FREIGHT CHARGE (${fcUnit})`
      acc[key] = (acc[key] || 0) + Number(row.fdQty || 0)
      return acc
    }

    if (isVfcItem(row.fdItemName, row.fdListCode)) {
      acc['VOLUME FREIGHT CHARGES (KG)'] = (acc['VOLUME FREIGHT CHARGES (KG)'] || 0) + Number(row.fdQty || 0)
      return acc
    }

    if (!unit) {
      if (nameUpper.includes('(M3)')) unit = 'M3'
      else if (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)')) unit = 'KG'
      else if (nameUpper.includes('(PCS)')) unit = 'PCS'
    }

    if (!unit) return acc

    acc[unit] = (acc[unit] || 0) + Number(row.fdQty || 0)
    return acc
  }, {})

  if (unitTotals['M3'] !== undefined && unitTotals['M3'] > 0 && unitTotals['M3'] < 0.1) {
    unitTotals['M3'] = 0.1
  }

  const rawM3FromItems = details.reduce((sum, d) => {
    if (isAuxiliaryItem(d.fdItemName)) return sum
    if (isVfcItem(d.fdItemName, d.fdListCode) || isFreightChargeItem(d.fdItemName, d.fdListCode)) return sum
    let unit = d.fdListCode?.trim()?.toUpperCase()
    const nameUpper = (d.fdItemName || '').toUpperCase()
    if (!unit && nameUpper.includes('(M3)')) unit = 'M3'

    const isM3Item =
      unit === 'M3' ||
      (unit !== 'KG' && nameUpper.includes('(M3)')) ||
      (unit !== 'KG' && nameUpper.includes('PARCEL') && !nameUpper.includes('(KG)') && !nameUpper.includes('PARCELS TO JAKARTA (KG)'))
    return isM3Item ? sum + Number(d.fdQty || 0) : sum
  }, 0)

  const rawKgFromItems = details.reduce((sum, d) => {
    if (isAuxiliaryItem(d.fdItemName)) return sum
    if (isVfcItem(d.fdItemName, d.fdListCode) || isFreightChargeItem(d.fdItemName, d.fdListCode)) return sum
    let unit = d.fdListCode?.trim()?.toUpperCase()
    const nameUpper = (d.fdItemName || '').toUpperCase()
    if (!unit && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)'))) {
      unit = 'KG'
    }

    const isKgItem = unit === 'KG' || (unit !== 'M3' && (nameUpper.includes('(KG)') || nameUpper.includes('PARCELS TO JAKARTA (KG)')))
    return isKgItem ? sum + Number(d.fdQty || 0) : sum
  }, 0)

  const rawVfcFromItems = details.reduce((sum, d) => {
    if (isAuxiliaryItem(d.fdItemName)) return sum
    if (!isVfcItem(d.fdItemName, d.fdListCode)) return sum
    return sum + Number(d.fdQty || 0)
  }, 0)

  const calcM3 = unitTotals['M3'] ?? rawM3FromItems
  const billedM3 = calcM3 > 0 && calcM3 < 0.1 ? 0.1 : calcM3
  const billedKg = unitTotals['KG'] ?? rawKgFromItems
  const billedVfc = unitTotals['VOLUME FREIGHT CHARGES (KG)'] ?? rawVfcFromItems

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

          {/* No. Invoice & Tipe */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-[var(--color-secondary)]">
              Inv:
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-[var(--color-primary)]">
              {data.fdInvNo}
            </span>
            <span className={cn('text-[9px] sm:text-[10px] px-1.5 py-0.2 font-bold rounded border uppercase', billTypeConfig.badgeClasses)}>
              {billTypeConfig.label}
            </span>
          </div>

          {/* Customer Name Pill */}
          <div className="hidden md:flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-[var(--color-neutral)] border border-[var(--color-border)] max-w-[200px] truncate">
            <User size={12} className="text-[var(--color-secondary)] shrink-0" />
            <span className="font-semibold truncate text-[var(--color-primary)]" title={data.customer?.fdCustName || data.fdCustCode || '—'}>
              {data.customer?.fdCustName || data.fdCustCode || '—'}
            </span>
          </div>

          {/* Status Terbit */}
          {Number(data.fdGive) === 1 ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <Check size={10} className="stroke-[3]" /> ISSUED
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              DRAFT
            </span>
          )}

          {/* Status Bayar */}
          {data.paymentStatus === 'LUNAS' ? (
            <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              LUNAS
            </span>
          ) : data.paymentStatus === 'SEBAGIAN' ? (
            <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              SEBAGIAN
            </span>
          ) : (
            <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
              BELUM LUNAS
            </span>
          )}
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

      {/* ─── 2. MAIN 2-COLUMN SINGLE VIEWPORT CONTAINER ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 2xl:grid-cols-12 gap-2 sm:gap-2.5 lg:min-h-0 lg:overflow-hidden">
        {/* ─── KOLOM KIRI (4/12 di bawah 2xl, 5/12 di 2xl): TAGIHAN & RINCIAN ITEM ─── */}
        <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-5 flex flex-col gap-2 lg:min-h-0 lg:overflow-hidden">
          {/* Card 1: Identitas Tagihan & Customer (High-Density Compact Card) */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 shadow-2xs shrink-0 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {/* Customer Info */}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider">
                  Customer
                </span>
                <p className="font-bold text-[var(--color-primary)] truncate" title={data.customer?.fdCustName || data.fdCustCode || '—'}>
                  {data.customer?.fdCustName || data.fdCustCode || '—'}
                </p>
                {data.customer?.fdSalesNM && (
                  <p className="text-[10px] text-[var(--color-secondary)] truncate">
                    Sales: <span className="font-semibold text-[var(--color-primary)]">{data.customer.fdSalesNM.trim()}</span>
                    {isMktCustomer(data.customer, data.customer?.fdSalesNM) && (
                      <span className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">(MKT)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Tanggal Inv & Agent */}
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider">
                  Tgl Tagihan
                </span>
                <p className="font-bold text-[var(--color-primary)]">
                  {formatDate(data.fdInvDate)}
                </p>
                {data.fdTglAgent && (
                  <p className="text-[10px] text-[var(--color-secondary)]">
                    Agent: <span className="font-medium text-[var(--color-primary)]">{formatDate(data.fdTglAgent)}</span>
                  </p>
                )}
              </div>

              {/* Marking & Copy Action */}
              <div className="col-span-2 sm:col-span-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider">
                    Marking
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMarkingInfo}
                    className="p-0.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                    title="Salin Data Customer, Marking & Tgl Agent"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <p className="font-bold text-[var(--color-primary)] truncate font-mono" title={`${data.fdMarkingCode || '—'} ${data.fdMarkingNo || ''}`}>
                  {data.fdMarkingCode || '—'} {data.fdMarkingNo ? `(${data.fdMarkingNo})` : ''}
                </p>
                {data.resiSummary?.resiList && data.resiSummary.resiList.length > 0 && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate" title={data.resiSummary.resiList.join(', ')}>
                    Resi: {data.resiSummary.resiList[0]} {data.resiSummary.resiList.length > 1 ? `(+${data.resiSummary.resiList.length - 1})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-row: Pembayaran Kasir & Pembuat Bill */}
            <div className="pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-[11px] text-[var(--color-secondary)]">
              <span>Pembuat: <strong className="text-[var(--color-primary)]">{data.employee?.fdEmpName || '—'}</strong></span>
              {data.isPaid ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Kasir #{data.cashierID} • {data.cashierDate ? formatDate(data.cashierDate) : 'Lunas'}
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">Belum Dibayar</span>
              )}
            </div>
          </div>

          {/* Card 2: Tabel Rincian Item Tagihan (Body Scrollable, Sticky Footer) */}
          <div className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xs overflow-hidden max-h-[350px] lg:max-h-none lg:flex-1 lg:min-h-0">
            {/* Table Header Row */}
            <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)] font-[var(--font-label)] flex items-center gap-1.5">
                <Receipt size={14} className="text-[var(--color-tertiary)]" />
                <span>Rincian Item Tagihan</span>
              </span>
              <span className="text-[11px] font-semibold text-[var(--color-secondary)]">
                {details.length} item
              </span>
            </div>

            {/* Table Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[var(--color-border)]">
              {details.length > 0 ? (
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col style={{ width: '52%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead className="bg-[var(--color-neutral)]/80 sticky top-0 z-10 text-[10px] uppercase font-bold text-[var(--color-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-2.5 py-1.5">Deskripsi / Komoditas</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                      <th className="px-2.5 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {details.map((row) => (
                      <tr key={row.fdID} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                        <td className="px-2.5 py-2 leading-tight">
                          <p className="font-semibold text-[var(--color-primary)] text-xs line-clamp-2" title={row.fdItemName}>
                            {row.fdItemName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {row.fdComodity && (
                              <span className="text-[9px] px-1 py-0 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)] font-medium truncate max-w-[120px]">
                                {row.fdComodity}
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--color-secondary)] font-mono">
                              @ {formatWithCurrency(row.fdItemPrice, row.fdCurr)}
                            </span>
                            {validationData && (() => {
                              const evalRes = evaluateItemPrice(row, {
                                res: validationData,
                                isAir: validationData.fdListType === 1 || validationData.expectedMode === 'BY AIR',
                                defaultTypeId: validationData.defaultFdTypeComodity ?? validationData.markingComodityType ?? null,
                                defaultComodityName: validationData.markingComodities?.[0]?.fdComodityName || '—',
                              })
                              if (!evalRes.hasTargetPrice && !evalRes.isTaxReturnItem && !evalRes.isKgOverweightItem) return null
                              if (evalRes.statusType === 'LOWER') {
                                return (
                                  <span className="text-[9px] px-1 py-0 rounded font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap" title="Harga di bawah tarif acuan master">
                                    Undercharge
                                  </span>
                                )
                              }
                              if (evalRes.statusType === 'HIGHER') {
                                return (
                                  <span className="text-[9px] px-1 py-0 rounded font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap" title="Harga di atas tarif acuan master">
                                    Overcharge
                                  </span>
                                )
                              }
                              return (
                                <span className="text-[9px] px-1 py-0 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap" title="Harga sesuai acuan master">
                                  Match
                                </span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-medium text-[var(--color-primary)]">
                          {formatQtyDecimal(row.fdQty, row.fdListCode, row.fdItemName)}
                          {row.fdListCode && (
                            <span className="text-[9px] text-[var(--color-secondary)] block font-sans">
                              {row.fdListCode.trim()}
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold text-[var(--color-primary)]">
                          <CurrencyValue value={row.fdTotal} currency={row.fdCurr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--color-secondary)]">
                  {t('billing.detail.noItems')}
                </div>
              )}
            </div>

            {/* Sticky Table Footer: Total M3 / KG & Grand Total */}
            <div className="p-2.5 bg-[var(--color-neutral)] border-t border-[var(--color-border)] flex items-center justify-between gap-2 shrink-0 flex-wrap">
              {/* Left: Physical metrics summary */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {Object.entries(unitTotals).map(([unit, qty]) => (
                  <span key={unit} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-semibold text-[11px] text-[var(--color-primary)]">
                    <span className="text-[var(--color-secondary)] font-normal">{unit}:</span>
                    <span>{formatQtyDecimal(qty, unit)}</span>
                  </span>
                ))}
              </div>

              {/* Right: Grand Total Amount */}
              <div className="flex items-baseline gap-1.5 ml-auto">
                <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] tracking-wider">
                  Total:
                </span>
                <span className="font-mono font-bold text-base sm:text-lg text-[var(--color-tertiary)]">
                  {Number(data.fdJumlah2 || 0) > 0
                    ? formatWithCurrency(data.fdJumlah2, data.fdCurr1)
                    : formatWithCurrency(data.fdJumlah1, 'Rp.')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── KOLOM KANAN (8/12 di bawah 2xl, 7/12 di 2xl): MESIN VALIDASI OPERASIONAL ─── */}
        <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-7 flex flex-col min-h-0 h-auto lg:h-full lg:overflow-hidden">
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

      {/* Floating Action Button (Drawer Pencarian Invoice) */}
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

      {/* MODALS */}
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
    </div>
  )
}
export default ValidationDetailPage
