import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Receipt,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToastStore } from '@/stores/toastStore'
import { formatCurrency, cn } from '@/lib/utils'
import { billingApi } from '../services/billing.service'
import type { BillingDetail, BillingDetailInput } from '../types/billing.types'

const COMMON_UNITS = ['M3', 'KG', 'PCS', 'Y$', 'HK$', 'USD', 'SET', 'CTN', 'ROLL', 'FREIGHT CHARGE']

interface EditBillingDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  invNo: string
  custName?: string
  custCode?: string
  markingCode?: string
  initialDetails: BillingDetail[]
  isPaid?: boolean
  paymentStatus?: string
  onSuccess?: () => void
}

export function EditBillingDetailsModal({
  isOpen,
  onClose,
  invNo,
  custName,
  custCode,
  markingCode,
  initialDetails,
  isPaid = false,
  paymentStatus,
  onSuccess,
}: EditBillingDetailsModalProps) {
  const { addToast } = useToastStore()

  const [items, setItems] = useState<BillingDetailInput[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [saveToPrev, setSaveToPrev] = useState(true)

  // Initialize items when modal opens (sorted by ID ascending)
  useEffect(() => {
    if (isOpen && initialDetails) {
      const sorted = [...initialDetails].sort((a, b) => {
        const idA = String(a?.fdID ?? '').trim()
        const idB = String(b?.fdID ?? '').trim()
        return idA.localeCompare(idB, undefined, { numeric: true })
      })
      setItems(
        sorted.map((d, idx) => ({
          fdID: (d.fdID ? d.fdID.trim() : '').padStart(2, '0') || String(idx + 1).padStart(2, '0'),
          fdItemName: d.fdItemName || '',
          fdQty: Number(d.fdQty || 0),
          fdItemPrice: Number(d.fdItemPrice || 0),
          fdTotal: Number(d.fdTotal || Math.round(Number(d.fdQty || 0) * Number(d.fdItemPrice || 0))),
          fdListCode: d.fdListCode ? d.fdListCode.trim() : 'M3',
          fdItemCode: d.fdItemCode ? d.fdItemCode.trim() : 'P0001',
          fdCurr: d.fdCurr ? d.fdCurr.trim() : 'RP.',
          fdSatuan: d.fdSatuan ? d.fdSatuan.trim() : '',
          fdComodity: d.fdComodity ? d.fdComodity.trim() : '',
          fdTypeComodity: d.fdTypeComodity !== undefined && d.fdTypeComodity !== null ? Number(d.fdTypeComodity) : 0,
        }))
      )
      setSortAsc(true)
      setValidationError(null)
    }
  }, [isOpen, initialDetails])

  // Keydown Escape support
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  // Calculations
  const originalTotal = initialDetails.reduce(
    (sum, d) => sum + Number(d.fdTotal || Math.round(Number(d.fdQty || 0) * Number(d.fdItemPrice || 0))),
    0
  )
  const currentTotal = items.reduce((sum, it) => sum + Number(it.fdTotal || 0), 0)
  const deltaTotal = currentTotal - originalTotal

  // Handlers
  const handleItemChange = (index: number, field: keyof BillingDetailInput, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      const target = { ...copy[index] }

      if (field === 'fdQty') {
        const qty = parseFloat(value) || 0
        target.fdQty = qty
        const multiplier = qty === 0 ? 1 : qty
        target.fdTotal = Math.round(multiplier * Number(target.fdItemPrice || 0))
      } else if (field === 'fdItemPrice') {
        const price = parseFloat(value) || 0
        target.fdItemPrice = price
        const qty = Number(target.fdQty || 0)
        const multiplier = qty === 0 ? 1 : qty
        target.fdTotal = Math.round(multiplier * price)
      } else {
        ;(target as any)[field] = value
      }

      copy[index] = target
      return copy
    })
    if (validationError) setValidationError(null)
  }

  const handleToggleSort = () => {
    const nextAsc = !sortAsc
    setSortAsc(nextAsc)
    setItems((prev) =>
      [...prev].sort((a, b) => {
        const idA = String(a.fdID ?? '').trim()
        const idB = String(b.fdID ?? '').trim()
        const cmp = idA.localeCompare(idB, undefined, { numeric: true })
        return nextAsc ? cmp : -cmp
      })
    )
  }

  const handleAddRow = () => {
    setItems((prev) => {
      const usedIds = new Set(prev.map((i) => (i.fdID ? i.fdID.trim() : '')))
      let nextNum = 1
      while (usedIds.has(String(nextNum).padStart(2, '0'))) nextNum++
      const nextId = String(nextNum).padStart(2, '0')

      const updated = [
        ...prev,
        {
          fdID: nextId,
          fdItemName: '',
          fdQty: 1,
          fdItemPrice: 0,
          fdTotal: 0,
          fdListCode: 'M3',
          fdItemCode: 'P0001',
          fdCurr: 'RP.',
          fdSatuan: '',
          fdComodity: '',
          fdTypeComodity: 0,
        },
      ]
      return updated.sort((a, b) => {
        const idA = String(a.fdID ?? '').trim()
        const idB = String(b.fdID ?? '').trim()
        const cmp = idA.localeCompare(idB, undefined, { numeric: true })
        return sortAsc ? cmp : -cmp
      })
    })
  }

  const handleDeleteRow = (index: number) => {
    if (items.length <= 1) {
      setValidationError('Invoice harus memiliki minimal 1 baris item.')
      return
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleReset = () => {
    if (initialDetails) {
      const sorted = [...initialDetails].sort((a, b) => {
        const idA = String(a?.fdID ?? '').trim()
        const idB = String(b?.fdID ?? '').trim()
        return idA.localeCompare(idB, undefined, { numeric: true })
      })
      setItems(
        sorted.map((d, idx) => ({
          fdID: (d.fdID ? d.fdID.trim() : '').padStart(2, '0') || String(idx + 1).padStart(2, '0'),
          fdItemName: d.fdItemName || '',
          fdQty: Number(d.fdQty || 0),
          fdItemPrice: Number(d.fdItemPrice || 0),
          fdTotal: Number(d.fdTotal || Math.round(Number(d.fdQty || 0) * Number(d.fdItemPrice || 0))),
          fdListCode: d.fdListCode ? d.fdListCode.trim() : 'M3',
          fdItemCode: d.fdItemCode ? d.fdItemCode.trim() : 'P0001',
          fdCurr: d.fdCurr ? d.fdCurr.trim() : 'RP.',
          fdSatuan: d.fdSatuan ? d.fdSatuan.trim() : '',
          fdComodity: d.fdComodity ? d.fdComodity.trim() : '',
          fdTypeComodity: d.fdTypeComodity !== undefined && d.fdTypeComodity !== null ? Number(d.fdTypeComodity) : 0,
        }))
      )
      setSortAsc(true)
      setValidationError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (items.length === 0) {
      setValidationError('Invoice harus memiliki minimal 1 baris item.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.fdItemName.trim()) {
        setValidationError(`Baris #${i + 1}: Nama/Deskripsi item tidak boleh kosong.`)
        return
      }
      if (it.fdQty < 0) {
        setValidationError(`Baris #${i + 1} (${it.fdItemName}): Kuantitas tidak boleh negatif.`)
        return
      }
      if (it.fdItemPrice < 0) {
        setValidationError(`Baris #${i + 1} (${it.fdItemName}): Harga satuan tidak boleh negatif.`)
        return
      }
    }

    const sortedPayload = [...items].sort((a, b) => {
      const idA = String(a.fdID ?? '').trim()
      const idB = String(b.fdID ?? '').trim()
      return idA.localeCompare(idB, undefined, { numeric: true })
    })

    setIsSubmitting(true)
    try {
      await billingApi.updateDetails(invNo, sortedPayload, saveToPrev)
      addToast({
        type: 'success',
        message: `Rincian item tagihan ${invNo} berhasil diperbarui${saveToPrev ? ' (tersinkron ke tbBillingDetailPrev)' : ''}!`,
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan rincian item tagihan.'
      setValidationError(msg)
      addToast({
        type: 'error',
        message: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-[var(--font-body)]">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden text-[var(--color-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── 1. Header ─── */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-tertiary)]/15 text-[var(--color-tertiary)] flex items-center justify-center shrink-0">
              <Receipt size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-[var(--color-primary)]">
                  Edit Rincian Item Tagihan
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] font-bold text-[var(--color-tertiary)]">
                  {invNo}
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-secondary)] truncate">
                Customer: <strong className="text-[var(--color-primary)]">{custName || custCode || '—'}</strong>
                {markingCode && ` • Marking: ${markingCode}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer disabled:opacity-50 shrink-0 ml-2"
            title="Tutup (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── 2. Warning if Paid / Partial ─── */}
        {(isPaid || paymentStatus === 'LUNAS' || paymentStatus === 'SEBAGIAN') && (
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Perhatian:</strong> Tagihan ini telah berstatus <strong>{paymentStatus || 'Sudah Dibayar'}</strong> di kasir. Mengubah rincian item akan memperbarui total tagihan invoice.
            </span>
          </div>
        )}

        {/* ─── 3. Validation Error Alert ─── */}
        {validationError && (
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle size={14} className="shrink-0 text-rose-500" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {/* ─── 4. Table Form (Scrollable) ─── */}
        <form id="edit-details-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 p-3 sm:p-4">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10px] uppercase font-bold text-[var(--color-secondary)] bg-[var(--color-neutral)]/60">
                  <th
                    className="px-2 py-2 w-14 text-center cursor-pointer select-none hover:text-[var(--color-primary)] transition-colors group"
                    onClick={handleToggleSort}
                    title="Klik untuk mengubah urutan ID (Naik / Turun)"
                  >
                    <div className="inline-flex items-center justify-center gap-1 group-hover:text-[var(--color-tertiary)]">
                      <span>ID</span>
                      {sortAsc ? (
                        <ArrowUp size={11} className="text-[var(--color-tertiary)]" />
                      ) : (
                        <ArrowDown size={11} className="text-[var(--color-tertiary)]" />
                      )}
                    </div>
                  </th>
                  <th className="px-2.5 py-2">Deskripsi Item Tagihan</th>
                  <th className="px-2 py-2 w-28">Satuan</th>
                  <th className="px-2 py-2 w-28 text-right">Kuantitas</th>
                  <th className="px-2.5 py-2 w-36 text-right">Harga Satuan (Rp)</th>
                  <th className="px-2.5 py-2 w-36 text-right">Subtotal (Rp)</th>
                  <th className="px-2 py-2 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]/60">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-neutral)]/20 transition-colors">
                    {/* ID */}
                    <td className="px-2 py-2 text-center">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-neutral)] text-[var(--color-secondary)] border border-[var(--color-border)]">
                        {item.fdID}
                      </span>
                    </td>

                    {/* Deskripsi */}
                    <td className="px-2.5 py-2">
                      <input
                        type="text"
                        value={item.fdItemName}
                        onChange={(e) => handleItemChange(idx, 'fdItemName', e.target.value)}
                        placeholder="Deskripsi item..."
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-medium text-xs focus:border-[var(--color-tertiary)] focus:ring-1 focus:ring-[var(--color-tertiary)]/20 outline-none transition-all placeholder:text-[var(--color-secondary)]/50"
                      />
                    </td>

                    {/* Satuan / ListCode */}
                    <td className="px-2 py-2">
                      <div className="relative">
                        <input
                          type="text"
                          list="unit-options"
                          value={item.fdListCode || ''}
                          onChange={(e) => handleItemChange(idx, 'fdListCode', e.target.value.toUpperCase())}
                          placeholder="M3 / KG..."
                          className="w-full font-mono uppercase px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-bold text-xs focus:border-[var(--color-tertiary)] outline-none text-center"
                        />
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={item.fdQty !== undefined && item.fdQty !== null ? item.fdQty : ''}
                        onChange={(e) => handleItemChange(idx, 'fdQty', e.target.value)}
                        required
                        className="w-full font-mono text-right px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-bold text-xs focus:border-[var(--color-tertiary)] outline-none"
                      />
                    </td>

                    {/* Harga Satuan */}
                    <td className="px-2.5 py-2 text-right">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={item.fdItemPrice || ''}
                        onChange={(e) => handleItemChange(idx, 'fdItemPrice', e.target.value)}
                        required
                        className="w-full font-mono text-right px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] font-bold text-xs focus:border-[var(--color-tertiary)] outline-none"
                      />
                    </td>

                    {/* Subtotal (Disabled / Auto-calculated) */}
                    <td className="px-2.5 py-2 text-right">
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={formatCurrency(item.fdTotal || 0)}
                        title="Subtotal otomatis (jika Qty 0 maka Subtotal = Harga × 1)"
                        className="w-full font-mono text-right px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-neutral)] text-[var(--color-primary)] font-bold text-xs cursor-not-allowed select-none opacity-80"
                      />
                    </td>

                    {/* Action: Delete */}
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={items.length <= 1 ? 'Minimal 1 item' : 'Hapus baris item'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Datalist for unit suggestions */}
            <datalist id="unit-options">
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>

            {/* Add Row Button */}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[var(--color-border)] hover:border-[var(--color-tertiary)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-neutral)]/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="text-[var(--color-tertiary)]" />
                <span>Tambah Baris Item</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                title="Kembalikan ke data awal sebelum diedit"
              >
                <RotateCcw size={12} />
                <span>Reset Perubahan</span>
              </button>
            </div>
          </div>

          {/* ─── 5. Summary Bar & Action Footer ─── */}
          <div className="p-3 sm:p-4 border-t border-[var(--color-border)] bg-[var(--color-neutral)]/40 shrink-0 space-y-3">
            {/* Total Comparison Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Total Baris</p>
                <p className="text-sm font-bold text-[var(--color-primary)]">{items.length} item</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Total Semula</p>
                <p className="font-mono text-sm font-semibold text-[var(--color-secondary)]">
                  {formatCurrency(originalTotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Total Baru</p>
                <p className="font-mono text-sm font-bold text-[var(--color-primary)]">
                  {formatCurrency(currentTotal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[var(--color-secondary)]">Selisih (Delta)</p>
                <p
                  className={cn(
                    'font-mono text-sm font-bold',
                    deltaTotal > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : deltaTotal < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--color-secondary)]'
                  )}
                >
                  {deltaTotal > 0 ? `+${formatCurrency(deltaTotal)}` : deltaTotal < 0 ? `-${formatCurrency(Math.abs(deltaTotal))}` : 'Rp 0'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--color-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToPrev}
                  onChange={(e) => setSaveToPrev(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-[var(--color-tertiary)] focus:ring-[var(--color-tertiary)] cursor-pointer"
                />
                <span>
                  Simpan ke tabel <code className="font-mono text-[11px] font-bold text-[var(--color-primary)]">tbBillingDetailPrev</code> juga
                </span>
              </label>

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="bg-[var(--color-tertiary)] hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {!isSubmitting && <Save size={14} />}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
