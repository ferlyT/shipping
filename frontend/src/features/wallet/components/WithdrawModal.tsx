import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { walletApi } from '../services/wallet.service'

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  custCode: string
  custName: string
  currentBalance: number
  onSuccess: () => void
}

export function WithdrawModal({
  isOpen,
  onClose,
  custCode,
  custName,
  currentBalance,
  onSuccess,
}: WithdrawModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [amount, setAmount] = useState<number | ''>('')
  const [bankName, setBankName] = useState('')
  const [accountNo, setAccountNo] = useState('')
  const [accountName, setAccountName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      addToast({ type: 'error', message: 'Nominal penarikan harus lebih dari 0' })
      return
    }
    if (Number(amount) > currentBalance) {
      addToast({
        type: 'error',
        message: `Saldo tidak mencukupi. Tersedia: ${formatCurrency(currentBalance)}`,
      })
      return
    }
    if (!bankName.trim() || !accountNo.trim() || !accountName.trim()) {
      addToast({ type: 'error', message: 'Informasi rekening bank tujuan wajib diisi lengkap' })
      return
    }

    try {
      setIsSubmitting(true)
      await walletApi.withdraw({
        custCode,
        amount: Number(amount),
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        accountName: accountName.trim(),
        notes: notes.trim() || undefined,
      })
      addToast({ type: 'success', message: 'Penarikan saldo deposit berhasil diproses' })
      onSuccess()
      onClose()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal memproses penarikan deposit',
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
              {t('wallet.withdrawTitle')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Pengembalian dana deposit ke rekening pelanggan
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
          {/* Customer & Saldo Aktif */}
          <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold uppercase text-[var(--color-secondary)]">
                Customer
              </span>
              <span className="font-mono text-xs text-[var(--color-secondary)]">{custCode}</span>
            </div>
            <div className="font-bold text-sm text-[var(--color-primary)]">{custName}</div>
            <div className="pt-1 flex justify-between items-center text-xs border-t border-[var(--color-border)]/50 mt-1">
              <span className="text-[var(--color-secondary)]">Saldo Deposit Tersedia:</span>
              <span className="font-bold text-emerald-500 tabular-nums">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Nominal Tarik */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                Nominal Penarikan (Rp) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmount(currentBalance)}
                className="text-[11px] text-[var(--color-tertiary)] hover:underline cursor-pointer font-medium"
              >
                Tarik Semua
              </button>
            </div>
            <input
              type="number"
              step="1"
              required
              min="1"
              max={currentBalance}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-base font-bold text-rose-500 tabular-nums focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Info Bank Rekening Tujuan */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                Nama Bank Tujuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="BCA / Mandiri / BRI / BNI"
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                  Nomor Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  placeholder="1234567890"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] font-mono focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                  Nama Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Nama Sesuai Buku Tabungan"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Alasan / Keterangan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan penarikan (opsional)..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {t('wallet.btnProcessWithdraw')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
