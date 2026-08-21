import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Tag, AlertCircle, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import type { ItemMarking } from '../types'

interface MarkingManagerModalProps {
  isOpen: boolean
  onClose: () => void
  itemId: number
  itemDescription: {
    sheetType?: string
    mode: string
    branch: string
    category: string
    price: number
    custName?: string
  }
  initialMarkings?: ItemMarking[]
  onSave: (markings: { markingCode: string; agentName?: string }[]) => Promise<void>
}

export function MarkingManagerModal({
  isOpen,
  onClose,
  itemId: _itemId,
  itemDescription,
  initialMarkings = [],
  onSave,
}: MarkingManagerModalProps) {
  const [markings, setMarkings] = useState<ItemMarking[]>([])
  const [newCode, setNewCode] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMarkings(initialMarkings)
      setNewCode('')
      setNewAgentName('')
      setError(null)
      setSavedSuccess(false)
    }
  }, [isOpen, initialMarkings])

  if (!isOpen || typeof document === 'undefined') return null

  const handleAddMarking = () => {
    const cleanCode = newCode.trim().toUpperCase()
    if (!cleanCode) return

    if (markings.some((m) => m.markingCode.toUpperCase() === cleanCode)) {
      setError(`Kode marking "${cleanCode}" sudah ada di daftar.`)
      return
    }

    setMarkings((prev) => [
      ...prev,
      {
        markingCode: cleanCode,
        agentName: newAgentName.trim() || null,
      },
    ])
    setNewCode('')
    setNewAgentName('')
    setError(null)
  }

  const handleRemoveMarking = (codeToRemove: string) => {
    setMarkings((prev) => prev.filter((m) => m.markingCode.toUpperCase() !== codeToRemove.toUpperCase()))
    setError(null)
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onSave(
        markings.map((m) => ({
          markingCode: m.markingCode,
          agentName: m.agentName || undefined,
        }))
      )
      setSavedSuccess(true)
      setTimeout(() => {
        onClose()
      }, 700)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Gagal menyimpan daftar agen.')
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fadeIn" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-neutral)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Tag size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--color-primary)]">Kelola Agen & Marking Code</h3>
              <p className="text-[11px] text-[var(--color-secondary)]">
                Hubungkan satu atau beberapa kode agen khusus untuk tarif ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Item Info Banner */}
          <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--color-primary)]">
                {itemDescription.mode} · {itemDescription.branch}
                {itemDescription.sheetType && ` · ${itemDescription.sheetType}`}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(itemDescription.price)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-secondary)] font-medium truncate">{itemDescription.category}</p>
            {itemDescription.custName && (
              <p className="text-[11px] text-[var(--color-tertiary)] font-medium">Customer: {itemDescription.custName}</p>
            )}
          </div>

          {/* Form Input Tambah Agen */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
              Tambah Kode Marking Agen
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Kode Marking (mis. GZC)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMarking()
                    }
                  }}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase placeholder:normal-case"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Nama Agen (Opsional)"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMarking()
                    }
                  }}
                  className="w-full h-9 px-3 text-xs rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddMarking}
                  className="w-full h-9 text-xs"
                >
                  <Plus size={14} className="mr-1" />
                  Tambah
                </Button>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* List Agen / Marking Chips */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)]">
                Agen Terhubung ({markings.length})
              </span>
              {markings.length === 0 && (
                <span className="text-[11px] text-[var(--color-secondary)] italic">Berlaku untuk semua agen (Default)</span>
              )}
            </div>

            {markings.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl min-h-[70px] max-h-[160px] overflow-y-auto">
                {markings.map((m) => (
                  <div
                    key={m.markingCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-2xs group"
                  >
                    <span>{m.markingCode}</span>
                    {m.agentName && (
                      <span className="text-[10px] text-[var(--color-secondary)] font-normal">({m.agentName})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMarking(m.markingCode)}
                      className="p-0.5 text-amber-500 hover:text-rose-600 rounded hover:bg-amber-500/20 transition-colors ml-0.5"
                      title="Hapus agen ini"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] text-center text-xs text-[var(--color-secondary)]">
                Belum ada agen khusus yang ditambahkan. Tarif ini berlaku untuk <strong>semua agen</strong> secara standar.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--color-border)] bg-[var(--color-neutral)]">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            disabled={isSaving || savedSuccess}
            className="min-w-[120px]"
          >
            {isSaving ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : savedSuccess ? (
              <>
                <Check size={14} className="mr-1.5 text-emerald-300" />
                Tersimpan!
              </>
            ) : (
              'Simpan Perubahan'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
