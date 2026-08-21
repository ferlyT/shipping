import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, AlertCircle, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface EditEffectiveDateModalProps {
  isOpen: boolean
  onClose: () => void
  uploadId: number
  fileName?: string
  currentEffectiveDate: string
  onSave: (newEffectiveDate: string) => Promise<void>
}

export function EditEffectiveDateModal({
  isOpen,
  onClose,
  uploadId,
  fileName,
  currentEffectiveDate,
  onSave,
}: EditEffectiveDateModalProps) {
  const [effectiveDate, setEffectiveDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // Format YYYY-MM-DD
      const dateStr = currentEffectiveDate
        ? new Date(currentEffectiveDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
      setEffectiveDate(dateStr)
      setError(null)
      setSavedSuccess(false)
    }
  }, [isOpen, currentEffectiveDate])

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveDate) {
      setError('Tanggal berlaku efektif wajib diisi.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      await onSave(effectiveDate)
      setSavedSuccess(true)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Gagal memperbarui tanggal efektif.')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-10 animate-scaleUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-primary)]">Edit Tanggal Efektif</h3>
              <p className="text-xs text-[var(--color-secondary)]">Price List #{uploadId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fileName && (
            <div className="p-3 bg-[var(--color-neutral)]/60 rounded-xl border border-[var(--color-border)] text-xs text-[var(--color-secondary)] truncate">
              <span className="font-semibold text-[var(--color-primary)]">File:</span> {fileName}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--color-primary)] mb-1.5">
              Tanggal Efektif Berlaku
            </label>
            <div className="relative">
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-primary)] focus:outline-hidden focus:border-[var(--color-tertiary)] transition-colors cursor-pointer"
                required
              />
            </div>
            <p className="mt-1.5 text-[11px] text-[var(--color-secondary)]">
              Tanggal saat ini: <strong className="text-[var(--color-primary)]">{formatDate(currentEffectiveDate)}</strong>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <Check size={15} className="shrink-0" />
              <span>Tanggal efektif berhasil diperbarui!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving || savedSuccess}
            >
              {isSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
