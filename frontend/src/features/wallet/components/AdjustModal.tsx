import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { walletApi } from '../services/wallet.service'

interface AdjustModalProps {
  isOpen: boolean
  onClose: () => void
  custCode: string
  custName: string
  currentBalance: number
  onSuccess: () => void
}

export function AdjustModal({
  isOpen,
  onClose,
  custCode,
  custName,
  currentBalance,
  onSuccess,
}: AdjustModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [amount, setAmount] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      addToast({ type: 'error', message: 'Nominal penyesuaian harus lebih dari 0' })
      return
    }
    if (direction === 'DEBIT' && Number(amount) > currentBalance) {
      addToast({
        type: 'error',
        message: `Saldo tidak mencukupi untuk penyesuaian debit. Saldo saat ini: ${formatCurrency(currentBalance)}`,
      })
      return
    }
    if (!reason.trim() || reason.trim().length < 3) {
      addToast({ type: 'error', message: 'Alasan penyesuaian wajib diisi (minimal 3 karakter)' })
      return
    }

    try {
      setIsSubmitting(true)
      await walletApi.adjust({
        custCode,
        direction,
        amount: Number(amount),
        reason: reason.trim(),
      })
      addToast({ type: 'success', message: 'Penyesuaian saldo berhasil disimpan' })
      onSuccess()
      onClose()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menyimpan penyesuaian saldo',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isOpen])

  if (!isOpen) return null

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
              {t('wallet.adjustTitle')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Penyesuaian saldo koreksi / audit saldo deposit
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Customer & Saldo */}
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold uppercase text-[var(--color-secondary)]">
                Customer
              </span>
              <span className="font-mono text-xs text-[var(--color-secondary)]">{custCode}</span>
            </div>
            <div className="font-bold text-sm text-[var(--color-primary)]">{custName}</div>
            <div className="pt-1 flex justify-between items-center text-xs border-t border-[var(--color-border)]/50 mt-1">
              <span className="text-[var(--color-secondary)]">Saldo Saat Ini:</span>
              <span className="font-bold text-[var(--color-primary)] tabular-nums">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Direction Toggle */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1.5">
              Jenis Penyesuaian <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('CREDIT')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  direction === 'CREDIT'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-xs'
                    : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                }`}
              >
                + TAMBAH SALDO (Kredit)
              </button>
              <button
                type="button"
                onClick={() => setDirection('DEBIT')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                  direction === 'DEBIT'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-xs'
                    : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                }`}
              >
                - KURANGI SALDO (Debit)
              </button>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Nominal Penyesuaian (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              required
              min="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className={`w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-base font-bold tabular-nums focus:outline-none ${
                direction === 'CREDIT' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            />
          </div>

          {/* Alasan */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Alasan Penyesuaian / Dasar Memo <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Koreksi selisih pencatatan nota pembukuan..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Simpan Penyesuaian
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
