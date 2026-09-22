import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { walletApi } from '../services/wallet.service'
import apiClient from '@/api/client'

interface TopupModalProps {
  isOpen: boolean
  onClose: () => void
  initialCustCode?: string
  initialCustName?: string
  onSuccess: () => void
}

export function TopupModal({
  isOpen,
  onClose,
  initialCustCode = '',
  initialCustName = '',
  onSuccess,
}: TopupModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [custCode, setCustCode] = useState(initialCustCode)
  const [custName, setCustName] = useState(initialCustName)
  const [amount, setAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH' | 'GIRO'>('TRANSFER')
  const [bankId, setBankId] = useState('BCB')
  const [refNo, setRefNo] = useState('')
  const [notes, setNotes] = useState('')

  // Customer search
  const [customerOptions, setCustomerOptions] = useState<{ fdCustCode: string; fdCustName: string }[]>([])
  const [custSearch, setCustSearch] = useState('')
  const [isSearchingCust, setIsSearchingCust] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialCustCode) {
      setCustCode(initialCustCode)
      setCustName(initialCustName)
    }
  }, [initialCustCode, initialCustName])

  // Cari customer
  useEffect(() => {
    if (!isOpen || initialCustCode) return
    const timer = setTimeout(async () => {
      try {
        setIsSearchingCust(true)
        const res: any = await apiClient.get('/customers', {
          params: { search: custSearch || undefined, limit: 10 },
        })
        const list = res.data?.data?.items ?? res.data?.items ?? res.data ?? []
        setCustomerOptions(list)
      } catch {
        setCustomerOptions([])
      } finally {
        setIsSearchingCust(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [custSearch, isOpen, initialCustCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custCode.trim()) {
      addToast({ type: 'error', message: 'Silakan pilih pelanggan' })
      return
    }
    if (!amount || Number(amount) <= 0) {
      addToast({ type: 'error', message: 'Nominal top-up harus lebih dari 0' })
      return
    }

    try {
      setIsSubmitting(true)
      await walletApi.topup({
        custCode: custCode.trim(),
        amount: Number(amount),
        paymentMethod,
        bankId: paymentMethod === 'TRANSFER' ? bankId : undefined,
        refNo: refNo.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      addToast({ type: 'success', message: 'Top-up saldo deposit berhasil diproses' })
      onSuccess()
      onClose()
      // reset form
      setAmount('')
      setRefNo('')
      setNotes('')
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal melakukan top-up deposit',
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
              {t('wallet.topupTitle')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Setoran dana deposit di muka (Advance Deposit)
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
          {/* Customer Selection */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              {t('wallet.customer')} <span className="text-red-500">*</span>
            </label>
            {initialCustCode ? (
              <div className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/60 font-medium text-[var(--color-primary)]">
                {custName} <span className="text-[var(--color-secondary)] font-mono">({custCode})</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Ketik nama atau kode customer..."
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                />
                {isSearchingCust ? (
                  <div className="text-[11px] text-[var(--color-secondary)] italic">Mencari customer...</div>
                ) : customerOptions.length > 0 ? (
                  <select
                    value={custCode}
                    onChange={(e) => {
                      setCustCode(e.target.value)
                      const found = customerOptions.find((c) => c.fdCustCode === e.target.value)
                      if (found) setCustName(found.fdCustName)
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customerOptions.map((c) => (
                      <option key={c.fdCustCode} value={c.fdCustCode}>
                        {c.fdCustName} ({c.fdCustCode})
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            )}
          </div>

          {/* Nominal Topup */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              {t('wallet.amount')} (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              required
              min="1"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-base font-bold text-emerald-500 tabular-nums focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Metode Pembayaran */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                {t('wallet.paymentMethod')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
              >
                <option value="TRANSFER">TRANSFER BANK</option>
                <option value="CASH">TUNAI (CASH)</option>
                <option value="GIRO">GIRO</option>
              </select>
            </div>

            {paymentMethod === 'TRANSFER' && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                  Bank Penerima
                </label>
                <input
                  type="text"
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value.toUpperCase())}
                  placeholder="BCB, MANDIRI, dll"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] uppercase focus:outline-none focus:border-[var(--color-tertiary)]"
                />
              </div>
            )}
          </div>

          {/* No Referensi & Keterangan */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Nomor Referensi / Bukti Transfer
            </label>
            <input
              type="text"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
              placeholder="Contoh: TRF-202609-0129"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Catatan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan (opsional)..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--color-border)]">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {t('wallet.btnProcessTopup')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
