import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, Check, FileText, ScanBarcode } from 'lucide-react'
import { billingApi } from '../services/billing.service'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { CurrencyValue, formatWithCurrency } from '@/components/ui/CurrencyValue'
import { formatDate, formatDateTime, copyToClipboard } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { statusConfig } from '@/features/customers/components/CustomerBadges'
import { CustomerBillingHistoryModal } from '../components/CustomerBillingHistoryModal'
import { BillResiMarkingModal } from '../components/BillResiMarkingModal'
import { useTranslation } from '@/hooks/useTranslation'
import { ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import type { Billing } from '../types/billing.types'
import { formatQtyDecimal, isMktCustomer } from '../utils/billing.utils'

function DetailPageSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn font-[var(--font-body)]">
      <PageHeader
        title={t('billing.detail.title') || 'Detail Tagihan'}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
          { label: 'Memuat...' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-lg skeleton-shimmer" />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 space-y-2.5 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 rounded skeleton-shimmer" />
              <div className="h-4 w-12 rounded-full skeleton-shimmer" />
            </div>
            <div className="h-5 w-3/4 rounded skeleton-shimmer" />
            <div className="h-3.5 w-1/2 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex justify-between items-center">
          <div className="h-5 w-44 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded skeleton-shimmer" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
          <div className="h-10 w-full rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export default function DetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addToast } = useToastStore()

  const [isCopied, setIsCopied] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [isResiModalOpen, setIsResiModalOpen] = useState(false)

  // Role check: Admin, superadmin, atau role dengan permission khusus yang dapat melihat fdConsignee
  const canViewConsignee =
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    Boolean(user?.permissions?.includes('billing.view_consignee'))

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

  if (isLoading) return <DetailPageSkeleton />

  if (isError || !data) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{t('billing.detail.errorLoad')}</p>
        <Button className="mt-4" onClick={() => navigate(ROUTES.BILLING_LIST)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t('billing.detail.backToList')}
        </Button>
      </div>
    )
  }

  const details = [...(data.details || [])].sort((a, b) => a.fdID.localeCompare(b.fdID))

  const isVfcItem = (name?: string | null) => {
    const n = (name || '').toUpperCase()
    return (
      n.includes('VOLUME FREIGHT') ||
      n.includes('FREIGHT CHARGE') ||
      n.includes('VFC')
    )
  }

  const unitTotals = details.reduce<Record<string, number>>((acc, row) => {
    const nameUpper = (row.fdItemName || '').toUpperCase()

    // Pisahkan Volume Freight Charges menjadi total tersendiri
    if (isVfcItem(row.fdItemName)) {
      acc['VOLUME FREIGHT CHARGES'] = (acc['VOLUME FREIGHT CHARGES'] || 0) + Number(row.fdQty || 0)
      return acc
    }

    const unit = row.fdListCode?.trim()
    if (!unit) return acc
    // Aturan khusus M3: hanya item PARCELS yang dihitung ke total M3
    if (unit.toUpperCase() === 'M3' && !nameUpper.includes('PARCEL')) return acc
    acc[unit] = (acc[unit] || 0) + Number(row.fdQty || 0)
    return acc
  }, {})

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-6 animate-fadeIn pb-24 font-[var(--font-body)]">
      <PageHeader
        title={`Invoice: ${data.fdInvNo}`}
        subtitle={`${t('billing.detail.subtitle')} (${data.customer?.fdCustName || data.fdCustCode})`}
        breadcrumbs={[
          { label: t('module.finance'), path: ROUTES.BILLING },
          { label: t('nav.billing'), path: ROUTES.BILLING_LIST },
          { label: `Invoice ${data.fdInvNo}` },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.BILLING_LIST)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('billing.detail.backToList')}
            </Button>
          </div>
        }
      />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] sm:rounded-[var(--radius-xl)] shadow-sm flex flex-col border border-[var(--color-border)]">
        <div className="p-3 sm:p-6 bg-[var(--color-neutral)] space-y-4 sm:space-y-6">
          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Customer */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.detail.customer')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--color-neutral)] hover:bg-[var(--color-neutral)]/80 text-[var(--color-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] transition-colors inline-flex items-center gap-1 cursor-pointer"
                    title="Buka riwayat seluruh invoice customer ini"
                  >
                    <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Riwayat Invoice</span>
                  </button>
                </div>
                <div className="mt-1 sm:mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {data.customer?.fdCustName || data.fdCustCode || '—'}
                  </span>
                  {data.customer && (
                    <Badge
                      variant={(statusConfig[(data.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).badgeVariant}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {(statusConfig[(data.customer.fdBlocked ?? 0) as keyof typeof statusConfig] || statusConfig[0]).label}
                    </Badge>
                  )}
                  {isMktCustomer(data.customer, data.customer?.fdSalesNM) && (
                    <Badge variant="warning" className="text-[10px] px-1.5 py-0 font-bold">
                      {data.customer?.fdBroker === 1 ? 'BROKER (MKT)' : 'MKT'}
                    </Badge>
                  )}
                </div>
                {data.customer?.fdSalesNM && (
                  <p className="mt-1 text-xs text-[var(--color-secondary)] leading-snug font-medium">
                    Sales: <span className="font-semibold text-[var(--color-primary)]">{data.customer.fdSalesNM.trim()}</span>
                  </p>
                )}
              </div>
              {data.customer?.fdBillAddr1 && data.customer.fdBillAddr1.trim() !== '0' && (
                <p className="mt-1.5 pt-1.5 border-t border-[var(--color-border)]/60 text-xs text-[var(--color-secondary)] leading-snug line-clamp-2">
                  {data.customer.fdBillAddr1}
                </p>
              )}
            </div>

            {/* Card 2: Status & Waktu Invoice (Tanggal Invoice, Tanggal Terbit, Pembuat Bill, Penyerah) */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.detail.invoiceDate')}
                  </span>
                  <span className="text-sm font-bold text-[var(--color-primary)]">
                    {formatDate(data.fdInvDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                    {t('billing.detail.issuedDate')}
                  </span>
                  <span className="font-medium text-[var(--color-primary)]">
                    {data.fdGiveDate ? (
                      formatDateTime(data.fdGiveDate)
                    ) : (
                      <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold">
                        DRAFT
                      </Badge>
                    )}
                  </span>
                </div>

                {data.giveEmployee && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                      Diserahkan Oleh
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[140px]" title={data.giveEmployee.fdEmpName || data.giveEmployee.fdEmpId || undefined}>
                      {data.giveEmployee.fdEmpName || data.giveEmployee.fdEmpId}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)] font-semibold">
                  {t('billing.detail.author')}
                </span>
                <span className="font-bold text-[var(--color-primary)]">
                  {data.employee?.fdEmpName || '—'}
                </span>
              </div>
            </div>

            {/* Card 3: Status Pembayaran (Kasir) */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                    Status Pembayaran
                  </p>
                  {data.paymentStatus === 'LUNAS' ? (
                    <Badge variant="success" className="text-[10px] px-2 py-0.5 font-bold">
                      ✓ LUNAS
                    </Badge>
                  ) : data.paymentStatus === 'SEBAGIAN' ? (
                    <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold">
                      SEBAGIAN
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px] px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400 border-amber-500/40">
                      BELUM LUNAS
                    </Badge>
                  )}
                </div>

                {data.isPaid ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--color-secondary)] text-[11px]">No. Kasir:</span>
                      <span className="font-mono font-bold text-[var(--color-primary)]">
                        {data.cashierID || '—'}
                      </span>
                    </div>
                    {data.cashierDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--color-secondary)] text-[11px]">Tgl Bayar:</span>
                        <span className="font-medium text-[var(--color-primary)]">
                          {formatDate(data.cashierDate)}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-secondary)]">
                    Belum ada catatan pembayaran kasir
                  </p>
                )}
              </div>

              {data.isPaid && data.totalPaid !== undefined && data.totalPaid > 0 && (
                <div className="pt-1.5 border-t border-[var(--color-border)]/60 flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)] font-semibold">
                    Total Bayar:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatWithCurrency(data.totalPaid, data.fdCurr1 || 'Rp.')}
                  </span>
                </div>
              )}
            </div>

            {/* Card 4: Marking & Komoditi */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 sm:p-4 shadow-sm flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-[var(--color-secondary)]">
                      {t('billing.detail.marking')}
                    </p>
                    {data.resiSummary?.isPartial && (
                      <button
                        type="button"
                        onClick={() => setIsResiModalOpen(true)}
                        className="cursor-pointer"
                        title="Nomor resi (fdTerima) terpecah di beberapa marking code untuk customer ini (Klik untuk rincian)"
                      >
                        <Badge
                          variant="warning"
                          className="text-[9px] px-1.5 py-0 font-bold animate-pulse shadow-2xs"
                        >
                          PARSIAL
                        </Badge>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canViewConsignee && data.fdConsignee && (
                      <Badge variant="info" className="text-[10px] px-1.5 py-0 font-bold" title="Consignee (tbMarking)">
                        {data.fdConsignee}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsResiModalOpen(true)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Cek persebaran nomor resi (fdTerima) di marking code apa saja"
                    >
                      <ScanBarcode className="w-3 h-3" />
                      <span>Cek Resi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMarkingInfo}
                      className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
                      title="Salin Data Customer, Marking Code, Marking No & Tgl Agent"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-1 sm:mt-1.5 text-sm font-semibold text-[var(--color-primary)]">
                  {data.fdMarkingCode || '—'}
                </p>
                {data.fdMarkingNo && (
                  <p className="text-xs font-medium text-[var(--color-secondary)] line-clamp-2">
                    {data.fdMarkingNo}
                  </p>
                )}
                {/* Nomor Resi (fdTerima) */}
                <div className="flex items-center justify-between gap-1.5 pt-1.5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-secondary)] font-semibold shrink-0">
                    No. Resi (fdTerima):
                  </span>
                  <div className="flex items-center gap-1 flex-wrap justify-end font-mono">
                    {data.resiSummary?.resiList && data.resiSummary.resiList.length > 0 ? (
                      data.resiSummary.resiList.map((resi) => (
                        <span
                          key={resi}
                          onClick={() => setIsResiModalOpen(true)}
                          className="font-bold text-[var(--color-primary)] bg-[var(--color-neutral)]/60 hover:bg-[var(--color-neutral)] px-1.5 py-0.5 rounded border border-[var(--color-border)] cursor-pointer text-[11px] transition-colors"
                          title="Klik untuk cek persebaran marking code"
                        >
                          {resi}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--color-secondary)] text-[11px] italic">
                        Tidak ada resi
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Komoditi, Tipe Komoditi & Tgl Agent */}
              <div className="space-y-1.5 pt-1.5 border-t border-[var(--color-border)]/60 text-xs">
                {(data.fdComodity || data.fdTypeComodityName) && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-secondary)] font-semibold shrink-0">
                      Komoditi:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {data.fdComodity && (
                        <span className="font-medium text-[var(--color-primary)] truncate max-w-[140px]" title={data.fdComodity}>
                          {data.fdComodity}
                        </span>
                      )}
                      {data.fdTypeComodityName && (
                        <Badge variant="default" className="text-[9px] px-1 py-0 font-bold uppercase tracking-wider">
                          {data.fdTypeComodityName}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                {data.fdTglAgent && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-secondary)] font-semibold">
                      Tgl Agent:
                    </span>
                    <span className="font-semibold text-[var(--color-primary)] font-mono">
                      {formatDate(data.fdTglAgent)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rincian Item */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold font-[var(--font-label)] text-[var(--color-primary)] uppercase tracking-wider">{t('billing.detail.itemDetails')}</h3>
              <span className="text-[11px] sm:text-xs text-[var(--color-secondary)] font-[var(--font-body)]">{details.length} {t('billing.detail.items')}</span>
            </div>

            {/* Desktop / tablet: hand-rolled table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)] text-left text-xs font-[var(--font-label)] text-[var(--color-secondary)] uppercase tracking-wider">
                    <th className="px-4 py-3 sm:px-5 font-semibold">{t('billing.detail.itemDescription')}</th>
                    <th className="px-4 py-3 sm:px-5 font-semibold text-right">{t('billing.detail.quantity')}</th>
                    <th className="px-4 py-3 sm:px-5 font-semibold text-right">{t('billing.detail.unitPrice')}</th>
                    <th className="px-4 py-3 sm:px-5 font-semibold text-right">{t('billing.detail.amount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
                  {details.length > 0 ? (
                    details.map((detail) => (
                      <tr key={detail.fdID} className="hover:bg-[var(--color-neutral)]/50 transition-colors">
                        <td className="px-4 py-3 sm:px-5 text-xs sm:text-sm font-medium text-[var(--color-primary)] truncate font-[var(--font-body)]">
                          {detail.fdItemName || '—'}
                        </td>
                        <td className="px-4 py-3 sm:px-5 text-right text-xs sm:text-sm text-[var(--color-secondary)] tabular-nums font-[var(--font-body)]">
                          {formatQtyDecimal(detail.fdQty, detail.fdListCode)} {detail.fdListCode || ''}
                        </td>
                        <td className="px-4 py-3 sm:px-5 text-right text-xs sm:text-sm text-[var(--color-secondary)] tabular-nums font-[var(--font-body)]">
                          <CurrencyValue value={detail.fdItemPrice} currency={detail.fdCurr} />
                        </td>
                        <td className="px-4 py-3 sm:px-5 text-right text-xs sm:text-sm font-semibold text-[var(--color-primary)] tabular-nums font-[var(--font-body)]">
                          <CurrencyValue value={detail.fdTotal} currency={detail.fdCurr} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-secondary)]">
                        {t('billing.detail.noItems')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile layout */}
            <div className="sm:hidden divide-y divide-[var(--color-border)]">
              {details.length > 0 ? (
                <ul className="divide-y divide-[var(--color-border)]">
                  {details.map((detail) => (
                    <li key={detail.fdID} className="p-3.5 space-y-1.5">
                      <div className="font-semibold text-xs text-[var(--color-primary)]">
                        {detail.fdItemName || '—'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--color-secondary)]">
                        <span>
                          {formatQtyDecimal(detail.fdQty, detail.fdListCode)} {detail.fdListCode || ''} × <CurrencyValue value={detail.fdItemPrice} currency={detail.fdCurr} />
                        </span>
                        <span className="font-bold text-[var(--color-primary)]">
                          <CurrencyValue value={detail.fdTotal} currency={detail.fdCurr} />
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-secondary)]">
                  {t('billing.detail.noItems')}
                </div>
              )}
            </div>

            {/* Footer ringkasan */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-neutral)] px-4 py-4 sm:px-6 sm:py-5">
              <div className="ml-auto flex w-full flex-col gap-2.5 sm:w-[28rem]">
                {Object.entries(unitTotals).map(([unit, qty]) => {
                  const isVfc = unit === 'VOLUME FREIGHT CHARGES'
                  return (
                    <div key={unit} className="flex items-center justify-between gap-3">
                      <span className="text-[11px] sm:text-xs font-[var(--font-label)] uppercase tracking-wider text-[var(--color-secondary)]">
                        {isVfc ? 'TOTAL VOLUME FREIGHT CHARGES' : `${t('billing.detail.total')} ${unit}`}
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-[var(--color-primary)] tabular-nums">
                        {formatQtyDecimal(qty, isVfc ? 'KG' : unit)} {isVfc ? 'KG (VFC)' : unit}
                      </span>
                    </div>
                  )
                })}
                <div
                  className={`flex items-baseline justify-between gap-4 ${Object.keys(unitTotals).length > 0 ? 'mt-1 pt-3 border-t border-[var(--color-border)]' : ''
                    }`}
                >
                  <span className="shrink-0 text-xs sm:text-sm font-bold font-[var(--font-label)] uppercase tracking-widest text-[var(--color-secondary)]">
                    {t('billing.detail.totalAmount')}
                  </span>
                  <span className="text-right text-lg sm:text-xl md:text-2xl font-bold font-[var(--font-display)] text-[var(--color-tertiary)] tracking-tight whitespace-nowrap">
                    {Number(data.fdJumlah2 || 0) > 0 ? (
                      formatWithCurrency(data.fdJumlah2, data.fdCurr1)
                    ) : (
                      formatWithCurrency(data.fdJumlah1, 'Rp.')
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Billing History Modal */}
      {data.fdCustCode && (
        <CustomerBillingHistoryModal
          isOpen={isHistoryModalOpen}
          custCode={data.fdCustCode}
          custName={data.customer?.fdCustName}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}

      {/* Modal Pengecekan Resi & Persebaran Marking Code */}
      <BillResiMarkingModal
        isOpen={isResiModalOpen}
        onClose={() => setIsResiModalOpen(false)}
        invNo={data.fdInvNo}
        custName={data.customer?.fdCustName || undefined}
        custCode={data.fdCustCode || undefined}
        markingCode={data.fdMarkingCode || undefined}
        markingNo={data.fdMarkingNo || undefined}
      />
    </div>
  )
}
