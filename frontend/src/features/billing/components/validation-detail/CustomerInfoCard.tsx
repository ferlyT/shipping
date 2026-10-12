import { Check, Copy, Clock, AlertTriangle, Tag } from 'lucide-react'
import { formatDate, formatDateTime, displayCustName } from '@/lib/utils'
import { isMktCustomer } from '../../utils/billing.utils'
import { useBillingViewConsigneePermission } from '../../hooks/useBillingPermissions'
import type { Billing } from '../../types/billing.types'

export interface CustomerInfoCardProps {
  data: Billing
  isCopied: boolean
  onCopyMarkingInfo: () => void
  isCurrencyInputError: boolean
  currencyInputErrorDetail: {
    foreignCurr: string
    fdJumlah2: number
    correctTotalRp: number
    matchedItemName?: string
  } | null | undefined
  onOpenCustomerHarga?: () => void
}

export function CustomerInfoCard({
  data,
  isCopied,
  onCopyMarkingInfo,
  isCurrencyInputError,
  currencyInputErrorDetail,
  onOpenCustomerHarga,
}: CustomerInfoCardProps) {
  const canViewConsignee = useBillingViewConsigneePermission()

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 sm:p-4 shadow-2xs shrink-0 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-3.5 text-xs">
        {/* Customer */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider block">Customer</span>
            {onOpenCustomerHarga && (
              <button
                type="button"
                onClick={onOpenCustomerHarga}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-bold rounded-md bg-transparent border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                title="Lihat Tarif Acuan Customer (tbCustomersHarga)"
              >
                <Tag size={10} className="text-amber-500" />
                <span>Tarif</span>
              </button>
            )}
          </div>
          <p className="font-bold text-sm text-[var(--color-primary)] truncate" title={displayCustName(data.customer?.fdCustName || data.fdCustCode)}>
            {displayCustName(data.customer?.fdCustName || data.fdCustCode)}
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

        {/* Tanggal & Waktu Issued */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider block">Tgl Tagihan</span>
          <p className="font-bold text-sm text-[var(--color-primary)]">{formatDate(data.fdInvDate)}</p>

          {/* Timestamp Issued */}
          <div className="pt-1 border-t border-[var(--color-border)]/60 space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-[var(--color-secondary)] font-[var(--font-label)] tracking-wider">
              <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Waktu Issued</span>
            </div>
            {data.fdGiveDate ? (
              <div>
                <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  {formatDateTime(data.fdGiveDate)}
                </p>
                {data.giveEmployee?.fdEmpName && (
                  <p className="text-[10px] text-[var(--color-secondary)] truncate" title={data.giveEmployee.fdEmpName.trim()}>
                    Oleh: <span className="font-medium text-[var(--color-primary)]">{data.giveEmployee.fdEmpName.trim()}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Belum Terbit (Draft)
              </p>
            )}
          </div>

          {data.fdTglAgent && (
            <p className="text-[11px] text-[var(--color-secondary)] pt-0.5">
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
              onClick={onCopyMarkingInfo}
              className="p-1 rounded hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
              title="Salin Data Customer, Marking & Tgl Agent"
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
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
          {canViewConsignee && data.fdConsignee && (
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

      {/* Alert: Kesalahan Input Mata Uang */}
      {isCurrencyInputError && currencyInputErrorDetail && (
        <div className="p-2.5 sm:p-3 rounded-lg bg-rose-500/10 border border-rose-500/35 text-xs flex items-start gap-2.5 text-rose-700 dark:text-rose-300">
          <div className="w-5 h-5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={13} className="stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200">
                ⚠️ Kesalahan Input: Anomali Mata Uang
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-semibold">
                Header: {currencyInputErrorDetail.foreignCurr} {currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] leading-snug text-rose-800 dark:text-rose-200">
              Header invoice mencatat valas <strong className="font-mono">{currencyInputErrorDetail.foreignCurr} {currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</strong> di kolom valas (<code className="font-mono px-1 rounded bg-rose-500/15">fdJumlah2</code>), namun <strong>tidak ada satu pun item</strong> yang menggunakan satuan/valas {currencyInputErrorDetail.foreignCurr} (seluruh item dalam Rupiah/Rp.).
              {currencyInputErrorDetail.matchedItemName && (
                <span> Nilai item <strong>"{currencyInputErrorDetail.matchedItemName}"</strong> (Rp {currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID')}) keliru diinput ke slot valas.</span>
              )}
            </p>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap text-[10.5px]">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                Total Riil Tagihan (Rp): Rp {currencyInputErrorDetail.correctTotalRp.toLocaleString('id-ID')}
              </span>
              <span className="text-[var(--color-secondary)]">
                (Jumlah 1: Rp {Number(data.fdJumlah1 || 0).toLocaleString('id-ID')} + Jumlah 2: Rp {currencyInputErrorDetail.fdJumlah2.toLocaleString('id-ID')})
              </span>
            </div>
          </div>
        </div>
      )}

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
  )
}
