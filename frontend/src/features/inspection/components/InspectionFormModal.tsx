import { useState, useEffect, useRef } from 'react'
import { X, Plane, Ship, AlertCircle, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useInspectionMarkingLookup } from '../hooks/useInspectionReports'
import type {
  InspectionReport,
  CreateInspectionPayload,
  UpdateInspectionPayload,
  LookupMarkingEntry,
} from '../types/inspection.types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateInspectionPayload | UpdateInspectionPayload) => Promise<void>
  initialData?: InspectionReport | null
  isLoading?: boolean
}

export function InspectionFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: Props) {
  const { t } = useTranslation()

  // Form states
  const [fdListType, setFdListType] = useState<number>(2) // 1 = Udara, 2 = Laut
  const [fdReportDate, setFdReportDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [markingSearch, setMarkingSearch] = useState<string>('')
  const [fdMarkingCode, setFdMarkingCode] = useState<string>('')
  const [fdMarkingNo, setFdMarkingNo] = useState<string>('')
  const [fdListCode, setFdListCode] = useState<string>('')
  const [fdTerima, setFdTerima] = useState<string>('')
  const [fdNamaCustomer, setFdNamaCustomer] = useState<string>('')
  const [fdKeterangan, setFdKeterangan] = useState<string>('')
  const [fdStatus, setFdStatus] = useState<'1' | '2'>('1')

  // Autocomplete UI state
  const [showDropdown, setShowDropdown] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Query lookup suggestions
  const { data: lookupData, isLoading: isLookupLoading } = useInspectionMarkingLookup(
    markingSearch,
    fdListType
  )
  const suggestions = lookupData?.data || []

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFdListType(Number(initialData.fdListType) || 2)
        setFdReportDate(
          new Date(initialData.fdReportDate).toISOString().split('T')[0]
        )
        const code = (initialData.fdMarkingCode || '').trim()
        setFdMarkingCode(code)
        setMarkingSearch(code)
        setFdMarkingNo((initialData.fdMarkingNo || '').trim())
        setFdListCode((initialData.fdListCode || '').trim())
        setFdTerima((initialData.fdTerima || '').trim())
        setFdNamaCustomer(initialData.fdNamaCustomer || '')
        setFdKeterangan(initialData.fdKeterangan || '')
        setFdStatus(initialData.fdStatus || '1')
      } else {
        setFdListType(2)
        setFdReportDate(new Date().toISOString().split('T')[0])
        setFdMarkingCode('')
        setMarkingSearch('')
        setFdMarkingNo('')
        setFdListCode('')
        setFdTerima('')
        setFdNamaCustomer('')
        setFdKeterangan('')
        setFdStatus('1')
      }
      setShowDropdown(false)
      setErrorMsg(null)
    }
  }, [isOpen, initialData])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectSuggestion = (item: LookupMarkingEntry) => {
    const code = item.fdMarkingCode.trim()
    setFdMarkingCode(code)
    setMarkingSearch(code)
    setFdNamaCustomer(item.fdCustName?.trim() || '')
    setFdMarkingNo(item.fdMarkingNo?.trim() || '')
    setFdListCode(item.fdListCode?.trim() || '')
    setFdTerima(item.fdTerima?.trim() || '')
    if (item.fdListType) {
      setFdListType(Number(item.fdListType))
    }
    setShowDropdown(false)
    setErrorMsg(null)
  }

  const handleClearMarking = () => {
    setMarkingSearch('')
    setFdMarkingCode('')
    setFdMarkingNo('')
    setFdListCode('')
    setFdTerima('')
    setFdNamaCustomer('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const finalMarkingCode = (fdMarkingCode.trim() || markingSearch.trim())

    // Validation: Semua kolom wajib diisi!
    if (!fdReportDate) {
      setErrorMsg('Tanggal Pemeriksaan wajib diisi')
      return
    }
    if (!finalMarkingCode) {
      setErrorMsg('Kode Marking wajib diisi')
      return
    }
    if (!fdMarkingNo.trim()) {
      setErrorMsg('Nomor Marking wajib diisi')
      return
    }
    if (!fdListCode.trim()) {
      setErrorMsg('List Code wajib diisi')
      return
    }
    if (!fdTerima.trim()) {
      setErrorMsg('Nomor Resi (Terima) wajib diisi')
      return
    }
    if (!fdNamaCustomer.trim()) {
      setErrorMsg('Nama Customer wajib diisi')
      return
    }
    if (!fdKeterangan.trim()) {
      setErrorMsg('Keterangan Pemeriksaan wajib diisi')
      return
    }

    const payload: CreateInspectionPayload = {
      fdReportDate: new Date(fdReportDate).toISOString(),
      fdListType,
      fdMarkingCode: finalMarkingCode,
      fdMarkingNo: fdMarkingNo.trim(),
      fdListCode: fdListCode.trim(),
      fdTerima: fdTerima.trim(),
      fdNamaCustomer: fdNamaCustomer.trim(),
      fdKeterangan: fdKeterangan.trim(),
      fdStatus,
    }

    try {
      await onSubmit(payload)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Gagal menyimpan data BAP')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Modal.Header
        title={initialData ? t('bap.edit') : t('bap.create')}
        subtitle={
          initialData
            ? `${initialData.fdReportNumber} • ${initialData.fdNamaCustomer}`
            : 'Lengkapi semua formulir Berita Acara Pemeriksaan fisik kargo di bawah ini'
        }
      />

      <form onSubmit={handleSubmit}>
        <Modal.Body className="space-y-4 py-3 text-xs sm:text-sm">
          {errorMsg ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-secondary)] bg-[var(--color-neutral)] px-3 py-1.5 rounded border border-[var(--color-border)]">
              <span className="text-red-500 font-bold">*</span> Semua kolom formulir di bawah ini <b>wajib diisi</b>.
            </div>
          )}

          {/* Row 1: Moda & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Moda */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
                {t('bap.mode')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFdListType(1)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    fdListType === 1
                      ? 'bg-sky-500/15 border-sky-500 text-sky-500 shadow-xs'
                      : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  <Plane size={14} />
                  <span>Udara (Air)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFdListType(2)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    fdListType === 2
                      ? 'bg-blue-500/15 border-blue-500 text-blue-500 shadow-xs'
                      : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                  }`}
                >
                  <Ship size={14} />
                  <span>Laut (Sea)</span>
                </button>
              </div>
            </div>

            {/* Tanggal Pemeriksaan */}
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
                {t('bap.reportDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={fdReportDate}
                onChange={(e) => setFdReportDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)]"
              />
            </div>
          </div>

          {/* Row 2: Marking Code with Autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
              {t('bap.markingCode')} <span className="text-red-500">*</span>
              <span className="text-[10px] text-[var(--color-secondary)] lowercase font-normal ml-1">
                (ketik untuk mencari saran dari master kargo)
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={markingSearch}
                onChange={(e) => {
                  setMarkingSearch(e.target.value)
                  setFdMarkingCode(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Contoh: HL-01 atau ketik kode marking..."
                className="w-full pl-3 pr-8 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] font-mono font-bold"
              />
              {markingSearch ? (
                <button
                  type="button"
                  onClick={handleClearMarking}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] p-0.5"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && markingSearch.trim().length >= 2 && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg divide-y divide-[var(--color-border)]">
                {isLookupLoading ? (
                  <div className="p-3 text-center text-xs text-[var(--color-secondary)] flex items-center justify-center gap-2">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Mencari data kargo...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[var(--color-secondary)]">
                    Tidak ditemukan saran kargo. Tekan Enter untuk menggunakan kode ini sebagai kargo baru.
                  </div>
                ) : (
                  suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className="p-2.5 hover:bg-[var(--color-neutral)] cursor-pointer text-xs transition-colors flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-[var(--color-primary)] flex items-center gap-2">
                          <span>{item.fdMarkingCode}</span>
                          {item.fdMarkingNo ? (
                            <span className="text-[10px] text-[var(--color-secondary)] font-normal">
                              #{item.fdMarkingNo}
                            </span>
                          ) : null}
                          {item.fdListCode ? (
                            <span className="text-[10px] px-1 py-0.2 bg-[var(--color-neutral)] rounded text-[var(--color-secondary)] font-mono border">
                              {item.fdListCode}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-[var(--color-secondary)] truncate max-w-sm">
                          {item.fdCustName}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-[var(--color-secondary)]">
                          {item.fdTerima || 'Tanpa Resi'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Row 3: Nama Customer */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
              {t('bap.customer')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={fdNamaCustomer}
              onChange={(e) => setFdNamaCustomer(e.target.value)}
              placeholder="Nama customer pemilik kargo..."
              className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] font-medium"
            />
          </div>

          {/* Row 4: 3 Kolom Detail (No. Marking, List Code, No. Resi) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
                {t('bap.markingNo')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fdMarkingNo}
                onChange={(e) => setFdMarkingNo(e.target.value)}
                placeholder="Contoh: 15 / M-01..."
                className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
                {t('bap.listCode')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fdListCode}
                onChange={(e) => setFdListCode(e.target.value)}
                placeholder="Contoh: L-2601..."
                className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
                {t('bap.resi')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fdTerima}
                onChange={(e) => setFdTerima(e.target.value)}
                placeholder="Contoh: EXP-889123..."
                className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] font-mono"
              />
            </div>
          </div>

          {/* Row 5: Keterangan Pemeriksaan */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
              {t('bap.notes')} <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={fdKeterangan}
              onChange={(e) => setFdKeterangan(e.target.value)}
              placeholder="Catatan hasil pemeriksaan fisik kargo (kondisi kardus, segel, lakban, basah/penyok, selisih isi, dsb)..."
              className="w-full px-3 py-2 text-xs bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-lg text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-tertiary)] resize-none"
            />
          </div>

          {/* Row 6: Status BAP */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-secondary)] uppercase tracking-wider mb-1.5">
              {t('bap.status')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFdStatus('1')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                  fdStatus === '1'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-500 shadow-xs'
                    : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                }`}
              >
                Draft (Pemeriksaan Berjalan)
              </button>
              <button
                type="button"
                onClick={() => setFdStatus('2')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                  fdStatus === '2'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 shadow-xs'
                    : 'border-[var(--color-border)] text-[var(--color-secondary)] hover:bg-[var(--color-neutral)]'
                }`}
              >
                Selesai (Pemeriksaan Tuntas)
              </button>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className="flex items-center justify-end gap-2 w-full">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
              {t('common.save')}
            </Button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
