import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { cashierApi } from '../services/cashier.service'
import { customersApi } from '@/features/customers/services/customers.service'

interface TempCashierModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdId: string) => void
}

export function TempCashierModal({
  isOpen,
  onClose,
  onSuccess,
}: TempCashierModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const todayStr = new Date().toISOString().split('T')[0]
  const [cashierDate, setCashierDate] = useState(todayStr)
  const [nextNumberPreview, setNextNumberPreview] = useState('')
  const [custCode, setCustCode] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [customers, setCustomers] = useState<{ fdCustCode: string; fdCustName: string }[]>([])
  const [isLoadingCust, setIsLoadingCust] = useState(false)
  const [selectedCustName, setSelectedCustName] = useState('')
  const [descr, setDescr] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      cashierApi
        .getNextNumber('TEMPORARY', cashierDate)
        .then((res: any) => {
          const d = res.data?.data ?? res.data
          setNextNumberPreview(d?.nextNumber || '')
        })
        .catch(() => {})
    }
  }, [isOpen, cashierDate])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      setIsLoadingCust(true)
      customersApi
        .list({ search: custSearch, limit: 20 })
        .then((res: any) => {
          const raw = res.data
          const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
          setCustomers(
            list.map((c: any) => ({
              fdCustCode: c.fdCustCode.trim(),
              fdCustName: c.fdCustName?.trim() || c.fdCustCode.trim(),
            }))
          )
        })
        .catch(() => {})
        .finally(() => setIsLoadingCust(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [isOpen, custSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custCode) {
      addToast({ type: 'error', message: 'Pelanggan wajib dipilih' })
      return
    }

    try {
      setIsSubmitting(true)
      const res: any = await cashierApi.createTemp({
        custCode,
        cashierDate,
        descr,
      })

      const d = res.data?.data ?? res.data
      const createdId = d?.fdCashierID || ''
      addToast({
        type: 'success',
        message: `Kasir sementara ${createdId} berhasil dibuat`,
      })
      onSuccess(createdId)
      onClose()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal membuat kasir sementara',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
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
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-scaleIn">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)]">
          <div>
            <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              {t('cashier.btnNewTemp')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Format: {nextNumberPreview || 'TR-XXXXXX-MM-YYYY'} (Kasir Lapangan / Sementara)
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Tanggal & No. Kasir Preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                {t('cashier.colDate')}
              </label>
              <input
                type="date"
                required
                value={cashierDate}
                onChange={(e) => setCashierDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
                No. Registrasi (Auto)
              </label>
              <input
                type="text"
                disabled
                value={nextNumberPreview}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-mono font-bold text-[var(--color-tertiary)] cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          {/* Pilih Pelanggan */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              {t('cashier.selectCustomer')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau kode pelanggan..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] mb-1.5"
            />
            <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)]/50 divide-y divide-[var(--color-border)]">
              {isLoadingCust ? (
                <div className="p-2.5 text-center text-xs text-[var(--color-secondary)]">
                  {t('common.loading')}
                </div>
              ) : customers.length === 0 ? (
                <div className="p-2.5 text-center text-xs text-[var(--color-secondary)]">
                  Customer tidak ditemukan
                </div>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.fdCustCode}
                    type="button"
                    onClick={() => {
                      setCustCode(c.fdCustCode)
                      setSelectedCustName(c.fdCustName)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center transition-colors cursor-pointer ${
                      custCode === c.fdCustCode
                        ? 'bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] font-bold'
                        : 'hover:bg-[var(--color-neutral)] text-[var(--color-primary)]'
                    }`}
                  >
                    <span>{c.fdCustName}</span>
                    <span className="font-mono text-[10.5px] text-[var(--color-secondary)]">
                      {c.fdCustCode}
                    </span>
                  </button>
                ))
              )}
            </div>
            {custCode && (
              <div className="mt-1.5 text-xs text-emerald-500 font-medium flex items-center gap-1">
                <span>✓ Terpilih:</span>
                <span className="font-bold">{selectedCustName}</span>
                <span className="font-mono text-[11px]">({custCode})</span>
              </div>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--color-secondary)] mb-1">
              Keterangan / Catatan Kasir
            </label>
            <textarea
              rows={2}
              maxLength={150}
              placeholder="Catatan kasir lapangan / titipan sementara..."
              value={descr}
              onChange={(e) => setDescr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--color-border)] flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting || !custCode}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
