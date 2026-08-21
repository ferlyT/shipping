import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Tag, Plus, Building2, AlertCircle, Check, Loader2, Plane, Ship, FileSpreadsheet, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { priceListApi } from '../services/priceList.service'
import type { ItemMarking } from '../types'

interface MarkingManagerModalProps {
  isOpen: boolean
  onClose: () => void
  uploadId: number
  uploadDescription: {
    title?: string
    fileName?: string
    effectiveDate?: string
    custCode?: string
    custName?: string
  }
  initialMarkings?: ItemMarking[]
  onSave: (markings: { markingCode: string; agentName?: string; mode?: string }[]) => Promise<void>
}

export const MarkingManagerModal: React.FC<MarkingManagerModalProps> = ({
  isOpen,
  onClose,
  uploadId: _uploadId,
  uploadDescription,
  initialMarkings = [],
  onSave,
}) => {
  const [markings, setMarkings] = useState<ItemMarking[]>(initialMarkings)
  const [newCode, setNewCode] = useState('')
  const [newAgentName, setNewAgentName] = useState('')
  const [newMode, setNewMode] = useState<'BY SEA' | 'BY AIR'>('BY SEA')
  const [branchOptions, setBranchOptions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setMarkings(initialMarkings)
      setNewCode('')
      setNewAgentName('')
      setNewMode('BY SEA')
      setError(null)
      setSavedSuccess(false)

      // Fetch distinct branches from price list items
      priceListApi
        .getBranches()
        .then((res) => {
          const raw = res.data as any
          const data = raw?.data ?? raw
          if (Array.isArray(data)) {
            setBranchOptions(data)
          }
        })
        .catch(() => {
          // Fallback options
          setBranchOptions(['GZ', 'YW', 'SGC', 'FOSHAN'])
        })
    }
  }, [isOpen, initialMarkings])

  if (!isOpen || typeof document === 'undefined') return null

  const handleAddMarking = () => {
    const cleanCode = newCode.trim().toUpperCase()
    if (!cleanCode) return

    const modeVal = newMode
    if (
      markings.some(
        (m) =>
          m.markingCode.toUpperCase() === cleanCode &&
          (m.mode || 'BY SEA') === modeVal
      )
    ) {
      setError(`Kode marking "${cleanCode}" (${modeVal === 'BY AIR' ? 'Udara' : 'Laut'}) sudah ada di daftar.`)
      return
    }

    setMarkings((prev) => [
      ...prev,
      {
        markingCode: cleanCode,
        agentName: newAgentName.trim() || null,
        mode: modeVal,
      },
    ])
    setNewCode('')
    setNewAgentName('')
    setError(null)
  }

  const handleRemoveMarking = (codeToRemove: string, modeToRemove?: string | null) => {
    setMarkings((prev) =>
      prev.filter(
        (m) =>
          !(
            m.markingCode.toUpperCase() === codeToRemove.toUpperCase() &&
            (m.mode || 'BY SEA') === (modeToRemove || 'BY SEA')
          )
      )
    )
    setError(null)
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    setError(null)
    try {
      let finalMarkings = [...markings]
      const cleanCode = newCode.trim().toUpperCase()
      const modeVal = newMode

      if (cleanCode) {
        if (
          !finalMarkings.some(
            (m) =>
              m.markingCode.toUpperCase() === cleanCode &&
              (m.mode || 'BY SEA') === modeVal
          )
        ) {
          finalMarkings.push({
            markingCode: cleanCode,
            agentName: newAgentName.trim() || null,
            mode: modeVal,
          })
        }
      }

      await onSave(
        finalMarkings.map((m) => ({
          markingCode: m.markingCode,
          agentName: m.agentName || undefined,
          mode: m.mode || 'BY SEA',
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
          {/* Upload Info Banner */}
          <div className="p-3.5 rounded-xl bg-[var(--color-neutral)]/50 border border-[var(--color-border)] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[var(--color-primary)]">
                <FileSpreadsheet size={14} className="text-amber-500 shrink-0" />
                <span className="truncate max-w-[240px]">{uploadDescription.fileName || uploadDescription.title || `Price List Upload #${_uploadId}`}</span>
              </div>
              {uploadDescription.effectiveDate && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-secondary)]">
                  <Calendar size={12} />
                  <span>{formatDate(uploadDescription.effectiveDate)}</span>
                </div>
              )}
            </div>
            {uploadDescription.custCode && (
              <p className="text-[11px] text-[var(--color-tertiary)] font-medium">
                Customer: <span className="font-semibold">{uploadDescription.custCode}</span> {uploadDescription.custName ? `— ${uploadDescription.custName}` : ''}
              </p>
            )}
          </div>


          {/* Form Input Tambah Agen (Urutan: Mode -> Branch -> Kode Marking) */}
          <div className="space-y-3 p-3.5 rounded-xl bg-[var(--color-neutral)] border border-[var(--color-border)]">
            {/* 1. Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] inline-flex items-center justify-center text-[9px] font-bold text-[var(--color-tertiary)]">1</span>
                Pilih Mode Pengiriman
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMode('BY SEA')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    newMode === 'BY SEA'
                      ? 'bg-[var(--color-surface)] border-blue-500 text-blue-500 shadow-xs font-bold ring-1 ring-blue-500/20'
                      : 'bg-[var(--color-surface)]/60 border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Ship size={14} /> Laut (BY SEA)
                </button>
                <button
                  type="button"
                  onClick={() => setNewMode('BY AIR')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    newMode === 'BY AIR'
                      ? 'bg-[var(--color-surface)] border-sky-500 text-sky-500 shadow-xs font-bold ring-1 ring-sky-500/20'
                      : 'bg-[var(--color-surface)]/60 border-[var(--color-border)] text-[var(--color-secondary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  <Plane size={14} /> Udara (BY AIR)
                </button>
              </div>
            </div>

            {/* 2. Branch / Nama Agen */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] inline-flex items-center justify-center text-[9px] font-bold text-[var(--color-tertiary)]">2</span>
                Branch / Nama Agen
              </label>
              <input
                type="text"
                list="agent-branch-datalist"
                placeholder="Pilih atau ketik Branch (mis. GZ, HK, SG)"
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
              <datalist id="agent-branch-datalist">
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch} />
                ))}
              </datalist>

              {/* Quick Branch Suggestions */}
              {branchOptions.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-[var(--color-secondary)] flex items-center gap-1">
                    <Building2 size={11} /> Shortcut:
                  </span>
                  {branchOptions.map((branch) => (
                    <button
                      key={branch}
                      type="button"
                      onClick={() => setNewAgentName(branch)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-colors cursor-pointer ${
                        newAgentName === branch
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                          : 'bg-[var(--color-surface)] text-[var(--color-secondary)] hover:text-[var(--color-primary)] border-[var(--color-border)]'
                      }`}
                    >
                      {branch}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Kode Marking */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-secondary)] flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] inline-flex items-center justify-center text-[9px] font-bold text-[var(--color-tertiary)]">3</span>
                Kode Marking
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik Kode Marking (mis. GZC, AIRGZ)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMarking()
                    }
                  }}
                  className="flex-1 h-9 px-3 text-xs font-semibold rounded-lg bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase placeholder:normal-case font-mono"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddMarking}
                  className="h-9 px-4 text-xs shrink-0"
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
                <span className="text-[11px] text-[var(--color-secondary)] italic">Belum ada agen khusus. Tarif berlaku standar.</span>
              )}
            </div>

            {markings.length > 0 ? (
              <div className="flex flex-wrap gap-2 p-3 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-xl min-h-[70px] max-h-[160px] overflow-y-auto">
                {markings.map((m, idx) => (
                  <div
                    key={`${m.markingCode}-${m.mode || 'BY SEA'}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-2xs group"
                  >
                    <span>{m.markingCode}</span>
                    {m.agentName && (
                      <span className="text-[10px] text-[var(--color-secondary)] font-normal">({m.agentName})</span>
                    )}
                    {m.mode === 'BY AIR' ? (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-medium border border-sky-500/40 text-sky-500">
                        <Plane size={9} /> Udara
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-medium border border-blue-500/40 text-blue-500">
                        <Ship size={9} /> Laut
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveMarking(m.markingCode, m.mode)}
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
