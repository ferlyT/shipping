import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cashierApi } from '../services/cashier.service'
import type { UnpaidInvoice } from '../types/cashier.types'

interface InvoiceAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  cashierId: string
  custCode: string
  custName: string
  onSuccess: () => void
}

interface SelectedInvoiceItem {
  invNo: string
  sisaTagihan: number
  amount: number
  ccyCode: string
}

export function InvoiceAllocationModal({
  isOpen,
  onClose,
  cashierId,
  custCode,
  custName,
  onSuccess,
}: InvoiceAllocationModalProps) {
  const { t } = useTranslation()
  const addToast = useToastStore((s) => s.addToast)

  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([])
  const [search, setSearch] = useState('')
  const [selectedMap, setSelectedMap] = useState<Record<string, SelectedInvoiceItem>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch unpaid invoices
  useEffect(() => {
    if (isOpen && custCode) {
      setIsLoading(true)
      cashierApi
        .getUnpaidInvoices(custCode, search || undefined)
        .then((res: any) => {
          const raw = res.data
          const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : []
          setInvoices(list)
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, custCode, search])

  // Toggle invoice selection
  const handleToggle = (inv: UnpaidInvoice) => {
    setSelectedMap((prev) => {
      const next = { ...prev }
      if (next[inv.fdInvNo]) {
        delete next[inv.fdInvNo]
      } else {
        next[inv.fdInvNo] = {
          invNo: inv.fdInvNo,
          sisaTagihan: inv.sisaTagihan,
          amount: inv.sisaTagihan, // Default lunas penuh
          ccyCode: inv.fdCCYCode || 'RP.',
        }
      }
      return next
    })
  }

  // Update custom amount
  const handleAmountChange = (invNo: string, val: number) => {
    setSelectedMap((prev) => {
      if (!prev[invNo]) return prev
      return {
        ...prev,
        [invNo]: {
          ...prev[invNo],
          amount: val,
        },
      }
    })
  }

  const selectedList = Object.values(selectedMap)
  const totalAllocated = selectedList.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedList.length === 0) {
      addToast({ type: 'error', message: 'Pilih minimal satu faktur untuk dilunasi' })
      return
    }

    try {
      setIsSubmitting(true)
      await cashierApi.allocateInvoices(cashierId, {
        invoices: selectedList.map((item) => ({
          invNo: item.invNo,
          amount: Number(item.amount),
          ccyCode: item.ccyCode,
          currValue: 1.0,
        })),
      })

      addToast({
        type: 'success',
        message: `${selectedList.length} faktur berhasil dialokasikan`,
      })
      onSuccess()
      onClose()
      setSelectedMap({})
    } catch (err: any) {
      addToast({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal mengalokasikan faktur',
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
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)]">
          <div>
            <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              {t('cashier.btnAllocate')}
            </h3>
            <p className="text-[12px] text-[var(--color-secondary)]">
              Pelanggan: <span className="font-bold text-[var(--color-primary)]">{custName}</span> ({custCode})
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

        {/* Filter Search */}
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <input
            type="text"
            placeholder="Cari nomor faktur / invoice tagihan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-xs text-[var(--color-primary)] focus:outline-none focus:border-[var(--color-tertiary)]"
          />
        </div>

        {/* Invoice List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
              {t('common.loading')}
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-secondary)]">
              Tidak ada faktur piutang yang belum lunas untuk pelanggan ini.
            </div>
          ) : (
            <table className="w-full divide-y divide-[var(--color-border)] text-xs tabular-nums">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] uppercase tracking-wider font-semibold text-[var(--color-secondary)]">
                  <th className="py-2 px-2 text-center w-10">Pilih</th>
                  <th className="py-2 px-3 text-left">No. Invoice</th>
                  <th className="py-2 px-3 text-left">Tanggal</th>
                  <th className="py-2 px-3 text-right">Total Tagihan</th>
                  <th className="py-2 px-3 text-right">Sudah Bayar</th>
                  <th className="py-2 px-3 text-right">Sisa Piutang</th>
                  <th className="py-2 px-3 text-right w-36">Alokasi Kasir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {invoices.map((inv) => {
                  const isSelected = !!selectedMap[inv.fdInvNo]
                  const curAmount = selectedMap[inv.fdInvNo]?.amount ?? inv.sisaTagihan

                  return (
                    <tr
                      key={inv.fdInvNo}
                      onClick={() => handleToggle(inv)}
                      className={`hover:bg-[var(--color-neutral)]/40 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(inv)}
                          className="rounded border-[var(--color-border)] text-[var(--color-tertiary)] focus:ring-0"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-[var(--color-primary)] font-mono">
                        {inv.fdInvNo}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-secondary)]">
                        {inv.fdInvDate ? formatDate(inv.fdInvDate) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--color-secondary)]">
                        {formatCurrency(inv.fdJumlah)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--color-secondary)]">
                        {formatCurrency(inv.fdBayar)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-500">
                        {formatCurrency(inv.sisaTagihan)}
                      </td>
                      <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {isSelected ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={inv.sisaTagihan}
                            value={curAmount}
                            onChange={(e) =>
                              handleAmountChange(inv.fdInvNo, parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-2 py-1 text-right rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-blue-500 tabular-nums focus:outline-none focus:border-[var(--color-tertiary)]"
                          />
                        ) : (
                          <span className="text-[var(--color-secondary)] opacity-50">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Summary & Actions */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-neutral)] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs">
            <span className="text-[var(--color-secondary)]">Terpilih: </span>
            <span className="font-bold text-[var(--color-primary)]">{selectedList.length} faktur</span>
            <span className="mx-2 text-[var(--color-secondary)]">|</span>
            <span className="text-[var(--color-secondary)]">Total Alokasi: </span>
            <span className="font-bold text-blue-500 tabular-nums">{formatCurrency(totalAllocated)}</span>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedList.length === 0}
            >
              {isSubmitting ? t('common.loading') : `Simpan Alokasi (${selectedList.length})`}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
