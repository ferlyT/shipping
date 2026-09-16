import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  CalendarDays,
  User,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  ShieldCheck,
  Coins,
  Receipt,
  Copy,
  Check,
} from 'lucide-react'
import { cn, formatDate, formatCurrency, formatDecimal, copyToClipboard } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { useTranslation } from '@/hooks/useTranslation'
import { BillingStatusTag } from '@/features/billing/components/BillingStatusTag'
import type { ShipmentInvoice } from '../../types/shipments.types'

interface ShipmentInvoiceTabProps {
  invoice: ShipmentInvoice
}

export function ShipmentInvoiceTab({ invoice }: ShipmentInvoiceTabProps) {
  const { t } = useTranslation()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = async (text: string | null | undefined, key: string) => {
    if (!text) return
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    }
  }

  const isLunas = invoice.isPaid || invoice.paymentStatus === 'LUNAS'
  const hasMultipleCurrencies = (invoice.totals || []).length > 1

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* ── 1. HEADER / SUMMARY BANNER ── */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
                {t('shipments.invoice.noInvoice') || 'Nomor Invoice'}
              </span>
              <BillingStatusTag status={invoice.paymentStatus} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-base sm:text-lg font-bold text-[var(--color-primary)]">
                {invoice.fdInvNo}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(invoice.fdInvNo, 'invNo')}
                className="p-1 rounded-md text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer"
                title="Salin No. Invoice"
              >
                {copiedKey === 'invNo' ? (
                  <Check size={14} className="text-emerald-500" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Links */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={ROUTES.BILLING_PRINT(invoice.fdInvNo)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-neutral)] transition-all cursor-pointer"
              title={t('shipments.invoice.print') || 'Cetak Faktur'}
            >
              <Printer size={13} className="text-[var(--color-secondary)]" />
              <span className="hidden sm:inline">{t('shipments.invoice.print') || 'Cetak'}</span>
            </Link>

            <Link
              to={ROUTES.BILLING_DETAIL(invoice.fdInvNo)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-semibold hover:opacity-90 transition-all shadow-xs cursor-pointer"
              title={t('shipments.invoice.viewDetail') || 'Lihat Invoice Lengkap'}
            >
              <span>{t('shipments.invoice.viewDetail') || 'Buka Invoice'}</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          {/* Tanggal Invoice & Terbit */}
          <div className="flex items-start gap-2 bg-[var(--color-neutral)] p-2.5 rounded-xl border border-[var(--color-border)]">
            <CalendarDays size={14} className="text-[var(--color-secondary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10.5px] uppercase font-semibold text-[var(--color-secondary)] block">
                {t('shipments.invoice.invDate') || 'Tgl. Invoice / Terbit'}
              </span>
              <span className="font-semibold text-[var(--color-text)] block mt-0.5">
                {formatDate(invoice.fdInvDate)}
              </span>
              {invoice.fdGiveDate && (
                <span className="text-[10px] text-[var(--color-secondary)] block">
                  Terbit: {formatDate(invoice.fdGiveDate)}
                </span>
              )}
            </div>
          </div>

          {/* Customer / Ditagihkan Kepada */}
          <div className="flex items-start gap-2 bg-[var(--color-neutral)] p-2.5 rounded-xl border border-[var(--color-border)]">
            <User size={14} className="text-[var(--color-secondary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10.5px] uppercase font-semibold text-[var(--color-secondary)] block">
                {t('shipments.invoice.billTo') || 'Ditagihkan Kepada'}
              </span>
              <span className="font-semibold text-[var(--color-text)] truncate block mt-0.5" title={invoice.fdBillTo || invoice.fdCustName || '—'}>
                {invoice.fdBillTo || invoice.fdCustName || '—'}
              </span>
              {invoice.fdBillTo && invoice.fdCustName && invoice.fdBillTo !== invoice.fdCustName && (
                <span className="text-[10px] text-[var(--color-secondary)] truncate block">
                  Master: {invoice.fdCustName}
                </span>
              )}
            </div>
          </div>

          {/* Status Validasi */}
          <div className="flex items-start gap-2 bg-[var(--color-neutral)] p-2.5 rounded-xl border border-[var(--color-border)]">
            <ShieldCheck size={14} className={cn('shrink-0 mt-0.5', invoice.fdCekDate ? 'text-emerald-500' : 'text-[var(--color-secondary)]')} />
            <div className="min-w-0">
              <span className="text-[10.5px] uppercase font-semibold text-[var(--color-secondary)] block">
                {t('shipments.invoice.validatedDate') || 'Validasi Audit'}
              </span>
              <span className="font-semibold text-[var(--color-text)] block mt-0.5">
                {invoice.fdCekDate ? formatDate(invoice.fdCekDate) : 'Sudah Diterbitkan'}
              </span>
              {invoice.fdCekBy && (
                <span className="text-[10px] text-[var(--color-secondary)] block">
                  Oleh: {invoice.fdCekBy}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. KPI METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Total Tagihan */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              {t('shipments.invoice.totalBill') || 'Total Tagihan'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center">
              <Receipt size={13} />
            </div>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-[var(--color-text)] tabular-nums">
            {formatCurrency(invoice.totalAmount)}
          </span>
        </div>

        {/* Sudah Dibayar */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              {t('shipments.invoice.paid') || 'Sudah Dibayar'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(invoice.totalPaid)}
          </span>
        </div>

        {/* Sisa Tagihan */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary)]">
              {t('shipments.invoice.balance') || 'Sisa Tagihan'}
            </span>
            <div
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center border',
                isLunas
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
              )}
            >
              {isLunas ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            </div>
          </div>
          <span
            className={cn(
              'text-lg sm:text-xl font-bold tracking-tight tabular-nums',
              isLunas ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {isLunas ? 'Rp. 0 (LUNAS)' : formatCurrency(invoice.balance)}
          </span>
        </div>
      </div>

      {/* ── 3. MULTI-CURRENCY TOTALS BREAKDOWN (JIKA ADA) ── */}
      {hasMultipleCurrencies && (
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)] uppercase tracking-wider">
            <Coins size={13} className="text-[var(--color-primary)]" />
            <span>Rincian Mata Uang Tagihan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] uppercase font-semibold text-[var(--color-secondary)]">
                  <th className="py-1.5 px-2">Mata Uang</th>
                  <th className="py-1.5 px-2 text-right">Jumlah Tagihan</th>
                  <th className="py-1.5 px-2 text-right">Sudah Dibayar</th>
                  <th className="py-1.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {invoice.totals.map((tot) => {
                  const isCurPaid = Number(tot.fdBayar || 0) >= Number(tot.fdJumlah || 0) || tot.fdSLunas === 1
                  return (
                    <tr key={tot.fdID} className="hover:bg-[var(--color-neutral)]/40">
                      <td className="py-2 px-2 font-mono font-bold text-[var(--color-primary)]">
                        {tot.fdCCYCode}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-[var(--color-text)] tabular-nums">
                        {Number(tot.fdJumlah || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Number(tot.fdBayar || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                            isCurPaid
                              ? 'bg-transparent border-emerald-500/40 text-emerald-500'
                              : 'bg-transparent border-amber-500/40 text-amber-500'
                          )}
                        >
                          {isCurPaid ? 'LUNAS' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4. TABLE RINCIAN ITEM TAGIHAN ── */}
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--color-primary)]" />
            <h4 className="text-xs sm:text-[13px] font-bold text-[var(--color-primary)] uppercase tracking-wider">
              {t('shipments.invoice.itemsTitle') || 'Rincian Item Tagihan'}
            </h4>
          </div>
          <span className="text-[11px] font-medium text-[var(--color-secondary)] tabular-nums">
            {invoice.details.length} item
          </span>
        </div>

        {invoice.details.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-neutral)]/50 text-[10.5px] uppercase font-semibold text-[var(--color-secondary)]">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[140px]">{t('shipments.invoice.itemDescription') || 'Deskripsi Item'}</th>
                  <th className="py-2.5 px-3 text-right w-20">{t('shipments.invoice.qty') || 'Qty'}</th>
                  <th className="py-2.5 px-3 text-center w-24">{t('shipments.invoice.listCode') || 'No. List'}</th>
                  <th className="py-2.5 px-3 text-right min-w-[100px]">{t('shipments.invoice.rate') || 'Tarif Satuan'}</th>
                  <th className="py-2.5 px-3 text-right min-w-[110px]">{t('shipments.invoice.subtotal') || 'Subtotal'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {invoice.details.map((item, idx) => (
                  <tr key={item.fdID || idx} className="hover:bg-[var(--color-neutral)]/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-medium text-[var(--color-secondary)] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--color-text)]">
                      {item.fdItemName || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[var(--color-text)] tabular-nums">
                      {formatDecimal(item.fdQty, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-[var(--color-primary)]">
                      {item.fdListCode || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[var(--color-text)] tabular-nums">
                      {formatCurrency(item.fdItemPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[var(--color-primary)] tabular-nums">
                      {formatCurrency(item.fdTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-neutral)]/40 font-bold text-xs">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-[var(--color-secondary)]">
                    {t('shipments.invoice.totalBill') || 'Total Tagihan'}:
                  </td>
                  <td className="py-2.5 px-3 text-right text-sm text-[var(--color-primary)] tabular-nums font-extrabold">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--color-secondary)]">
            Tidak ada item tagihan yang tercatat.
          </div>
        )}
      </div>
    </div>
  )
}
