import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { cashierApi } from '../services/cashier.service'
import { customersApi } from '@/features/customers/services/customers.service'
import type { UnattachedTempCashier } from '../types/cashier.types'

interface CashierHeaderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdId: string) => void
}

export function CashierHeaderModal({
  isOpen,
  onClose,
  onSuccess,
}: CashierHeaderModalProps) {
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

  // Opsi attach kasir sementara
  const [isAttachMode, setIsAttachMode] = useState(false)
  const [unattachedTemps, setUnattachedTemps] = useState<UnattachedTempCashier[]>([])
  const [selectedTempId, setSelectedTempId] = useState('')
  const [isLoadingTemps, setIsLoadingTemps] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch preview nomor kasir
  useEffect(() => {
    if (isOpen) {
      cashierApi
        .getNextNumber('OFFICIAL', cashierDate)
        .then((res: any) => {
          const d = res.data?.data ?? res.data
          setNextNumberPreview(d?.nextNumber || '')
        })
        .catch(() => {})
    }
  }, [isOpen, cashierDate])

  // Search customers
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

  // Fetch unattached temp receipts jika mode attach aktif
  useEffect(() => {
    if (isOpen && isAttachMode) {
      setIsLoadingTemps(true)
      cashierApi
        .getUnattachedTempCashiers(custCode || undefined)
        .then((res: any) => {
          const raw = res.data
          const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
          setUnattachedTemps(list)
        })
        .catch(() => {})
        .finally(() => setIsLoadingTemps(false))
    }
  }, [isOpen, isAttachMode, custCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!custCode) {
      addToast({ type: 'error', message: 'Pelanggan wajib dipilih' })
      return
    }

    try {
      setIsSubmitting(true)
      const res: any = await cashierApi.createOfficial({
        custCode,
        cashierDate,
        attachTempId: isAttachMode && selectedTempId ? selectedTempId : undefined,
      })

      const d = res.data?.data ?? res.data
      const createdId = d?.fdCashierID || ''
      addToast({
        type: 'success',
        message: `Register kasir ${createdId} berhasil dibuat`,
      })
      onSuccess(createdId)
      onClose()
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal membuat kasir resmi',
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
              {t('cashier.btnNewOfficial')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Format: {nextNumberPreview || 'RR-XXXXXX-MM-YYYY'} (Reset Bulanan)
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

          {/* Pilih Pelanggan (Single Source of Truth) */}
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

          {/* Opsi Tarik dari Kasir Sementara (Attach) */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAttachMode}
                onChange={(e) => {
                  setIsAttachMode(e.target.checked)
                  if (!e.target.checked) setSelectedTempId('')
                }}
                className="rounded border-[var(--color-border)] text-[var(--color-tertiary)] focus:ring-0"
              />
              <span className="text-xs font-semibold text-[var(--color-primary)]">
                Tarik data dari Kasir Sementara (Attach TR-)
              </span>
            </label>

            {isAttachMode && (
              <div className="mt-2.5 space-y-2 pl-5 border-l-2 border-[var(--color-tertiary)]/40">
                <p className="text-[11px] text-[var(--color-secondary)]">
                  Pilih bukti kasir sementara yang akan dikonversi menjadi kasir resmi:
                </p>
                {isLoadingTemps ? (
                  <div className="p-2 text-xs text-[var(--color-secondary)]">{t('common.loading')}</div>
                ) : unattachedTemps.length === 0 ? (
                  <div className="p-2 text-xs text-amber-500">
                    Tidak ada kasir sementara yang berstatus pending untuk customer ini.
                  </div>
                ) : (
                  <select
                    value={selectedTempId}
                    onChange={(e) => setSelectedTempId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)] font-mono"
                  >
                    <option value="">-- Pilih Nomor Kasir Sementara --</option>
                    {unattachedTemps.map((tmp) => (
                      <option key={tmp.fdCashierID} value={tmp.fdCashierID}>
                        {tmp.fdCashierID} - {tmp.fdCustName} ({tmp.fdDescr || 'Tanpa Keterangan'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
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
