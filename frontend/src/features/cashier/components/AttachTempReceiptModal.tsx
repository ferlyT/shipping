import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { formatCurrency } from '@/lib/utils'
import { cashierApi } from '../services/cashier.service'
import type { CashierItem } from '../types/cashier.types'

interface AttachTempReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  tempReceipt: CashierItem | null
  onSuccess: (newOfficialId: string) => void
}

export function AttachTempReceiptModal({
  isOpen,
  onClose,
  tempReceipt,
  onSuccess,
}: AttachTempReceiptModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const todayStr = new Date().toISOString().split('T')[0]
  const [officialDate, setOfficialDate] = useState(todayStr)
  const [descr, setDescr] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen || !tempReceipt) return null

  const handleAttach = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)
      const res: any = await cashierApi.attachTempReceipt({
        tempCashierId: tempReceipt.fdCashierID,
        officialDate,
        descr: descr || tempReceipt.fdDescr,
      })

      const officialId = res.data?.data?.officialId ?? res.data?.officialId ?? ''
      addToast({
        type: 'success',
        message: `Berhasil meng-attach kasir sementara ${tempReceipt.fdCashierID} ke kasir resmi ${officialId}`,
      })
      onSuccess(officialId)
      onClose()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal melakukan attach kasir',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)]">
          <div>
            <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              {t('cashier.btnAttach')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Konversi Kasir Sementara ({tempReceipt.fdCashierID}) ke Kasir Resmi (RR-)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAttach} className="p-5 space-y-4 text-xs">
          {/* Info Kasir Sementara */}
          <div className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-neutral)]/50 space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--color-secondary)]">No. Kasir Sementara:</span>
              <span className="font-mono font-bold text-[var(--color-primary)]">
                {tempReceipt.fdCashierID}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-secondary)]">Pelanggan:</span>
              <span className="font-bold text-[var(--color-primary)]">
                {tempReceipt.fdCustName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-secondary)]">Total Uang Masuk:</span>
              <span className="font-bold text-emerald-500 tabular-nums">
                {formatCurrency(tempReceipt.totalRcv)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-secondary)]">Total Faktur:</span>
              <span className="font-bold text-blue-500 tabular-nums">
                {formatCurrency(tempReceipt.totalDetail)}
              </span>
            </div>
          </div>

          {/* Tanggal Kasir Resmi Baru */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Tanggal Kasir Resmi (RR) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={officialDate}
              onChange={(e) => setOfficialDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Keterangan Kasir Resmi (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder={`Attach dari ${tempReceipt.fdCashierID}`}
              value={descr}
              onChange={(e) => setDescr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Alert Notice */}
          <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 text-[11.5px] text-sky-500 leading-relaxed">
            Seluruh rincian uang masuk (Kas/Bank/Giro) dan alokasi faktur dari kasir sementara ini akan disalin otomatis ke nomor kasir resmi baru berformat <span className="font-mono font-bold">RR-XXXXXX-MM-YYYY</span>.
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : 'Attach ke Kasir Resmi'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
