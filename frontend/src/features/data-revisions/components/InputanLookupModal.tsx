import { useState, useEffect, useRef } from 'react'
import { Search, X, Hash, Check, AlertTriangle, Lock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { dataRevisionsApi } from '../services/data-revisions.service'
import { useDebounce } from '@/hooks/useDebounce'

interface InputanLookupModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (data: {
    fdNoInputan: string
    fdCustCode?: string
    fdCustName?: string
    fdSpMark?: string
    fdQtyVolWgt?: string
  }) => void
  title?: string
  isTargetCancel?: boolean
}

export default function InputanLookupModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Pilih fdListCode',
  isTargetCancel = false,
}: InputanLookupModalProps) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(search, 200)

  useEffect(() => {
    if (!isOpen) return
    let active = true

    const fetchListCodes = async () => {
      setIsLoading(true)
      try {
        const res = await dataRevisionsApi.lookupListCode(debouncedSearch)
        if (active) {
          setItems(res.data || [])
        }
      } catch {
        if (active) setItems([])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchListCodes()
    return () => {
      active = false
    }
  }, [debouncedSearch, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setSearch('')
      setItems([])
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="max-h-[88vh] flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl"
      zIndex="z-[105]"
    >
      <Modal.Header
        icon={
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isTargetCancel
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/20'
            }`}
          >
            <Hash size={16} strokeWidth={2.2} />
          </div>
        }
        title={title}
        subtitle={
          isTargetCancel
            ? 'Pilih fdListCode yang akan dibatalkan — fdCancel = 1'
            : 'Cari Pelanggan, No. Resi, Marking, atau No. Inputan'
        }
        onClose={onClose}
      />

      {/* Search Bar */}
      <div className="px-4 py-3 shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] pointer-events-none"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari customer, no resi, marking, inputan..."
            className="w-full pl-9 pr-8 py-2 text-sm font-mono font-semibold rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 placeholder:font-sans placeholder:font-normal placeholder:text-[var(--color-secondary)]/70 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors p-0.5"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <p className="text-[0.68rem] text-[var(--color-secondary)] mt-1.5 ml-0.5 leading-none">
          Index scan aktif — hasil instan tanpa delay
        </p>
      </div>

      {/* List Results */}
      <Modal.Body className="overflow-y-auto flex-1 min-h-0 p-2 divide-y divide-[var(--color-border)]/40">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer h-14 rounded-xl border border-[var(--color-border)]/40"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
              <Search size={18} className="text-[var(--color-secondary)]" strokeWidth={1.8} />
            </div>
            <p className="text-xs font-semibold text-[var(--color-primary)]">
              {search ? `Tidak ditemukan "${search}"` : 'Ketik nomor untuk mulai pencarian'}
            </p>
            <p className="text-[0.7rem] text-[var(--color-secondary)]">
              {search ? 'Periksa kembali nomor inputan.' : 'Minimal 2 digit nomor inputan.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, idx) => {
              const listCode = (item.fdListCode || '').trim()
              const custName = (item.fdCustName || '').trim()
              const custCode = (item.fdCustCode || '').trim()
              const marking = `${(item.fdMarkingCode || '').trim()} / ${(item.fdMarkingNo || '').trim()}`
              const pack = Number(item.fdJmlPack || 0)
              const m3 = Number(item.fdM3 || 0).toFixed(4)
              const berat = Number(item.fdJmlBerat || 0).toFixed(1)
              const qtyVolWgt = `${pack} Colly / ${m3} m3 / ${berat} kgs`
              const isCancelled = item.fdCancel === 1
              const hasBill = Boolean(item.hasBill)
              const isGiven = Boolean(item.isGiven)
              const isCancelBlocked = isTargetCancel && (hasBill || isGiven)

              return (
                <button
                  key={`${listCode}-${idx}`}
                  type="button"
                  disabled={isCancelBlocked}
                  onClick={() => {
                    if (isCancelBlocked) return
                    onSelect({
                      fdNoInputan: listCode,
                      fdCustCode: custCode || undefined,
                      fdCustName: custName || undefined,
                      fdSpMark: marking !== ' / ' ? marking : undefined,
                      fdQtyVolWgt: qtyVolWgt,
                    })
                    onClose()
                  }}
                  className={`
                    w-full px-3 py-2.5 rounded-xl text-left transition-all duration-100
                    flex items-center justify-between gap-3 group border
                    ${
                      isCancelBlocked
                        ? 'opacity-65 cursor-not-allowed bg-amber-500/5 border-amber-500/25'
                        : isCancelled
                        ? 'bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 cursor-pointer'
                        : 'hover:bg-[var(--color-surface-hover)] border-transparent hover:border-[var(--color-border)] cursor-pointer'
                    }
                  `}
                  title={
                    isCancelBlocked
                      ? `TERKUNCI: ${item.cancelBlockReason || 'Tidak dapat dibatalkan'}`
                      : undefined
                  }
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Row 1: listCode + badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-sm font-bold tracking-wider text-[var(--color-primary)]">
                        {listCode}
                      </span>

                      {item.fdTerima && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shrink-0">
                          Resi: {item.fdTerima}
                        </span>
                      )}

                      {isCancelBlocked ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/35 shrink-0">
                          <Lock size={10} strokeWidth={2.2} />
                          {hasBill && isGiven
                            ? `Ada Bill (${item.fdInvNo}) + Diserahkan (fdGive=1)`
                            : hasBill
                            ? `Ada Bill (${item.fdInvNo})`
                            : `Sudah Diserahkan (fdGive=1)`}
                        </span>
                      ) : (
                        <>
                          {hasBill && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/25 shrink-0">
                              Bill: {item.fdInvNo}
                            </span>
                          )}
                          {isGiven && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                              fdGive=1
                            </span>
                          )}
                        </>
                      )}

                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                          <AlertTriangle size={10} strokeWidth={2.2} />
                          fdCancel=1
                        </span>
                      )}
                      {custName && (
                        <span className="text-xs font-semibold text-[var(--color-primary)] truncate">
                          {custName}
                        </span>
                      )}
                      {custCode && (
                        <span className="text-[0.68rem] text-[var(--color-secondary)] font-mono shrink-0">
                          ({custCode})
                        </span>
                      )}
                    </div>

                    {/* Row 2: Marking + Volume */}
                    <div className="text-[0.7rem] text-[var(--color-secondary)] flex flex-wrap gap-x-3 gap-y-0.5">
                      {marking !== ' / ' && (
                        <span>
                          Marking:{' '}
                          <strong className="text-[var(--color-primary)] font-mono">{marking}</strong>
                        </span>
                      )}
                      <span>
                        Vol:{' '}
                        <strong className="text-[var(--color-primary)] font-mono">{qtyVolWgt}</strong>
                      </span>
                    </div>

                    {/* Row 3: Peringatan jika terkunci proteksi */}
                    {isCancelBlocked && (
                      <div className="text-[0.67rem] text-amber-400/90 font-medium flex items-center gap-1 pt-0.5">
                        <Lock size={10} strokeWidth={2.2} className="shrink-0" />
                        <span>Tidak dapat dibatalkan: {item.cancelBlockReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Affordance icon */}
                  <div className="shrink-0">
                    {isCancelBlocked ? (
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                        <Lock size={14} strokeWidth={2.2} />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Check size={15} strokeWidth={2.5} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer className="justify-between bg-[var(--color-surface)] border-t border-[var(--color-border)] px-4 py-2.5">
        <span className="text-xs text-[var(--color-secondary)]">
          {isLoading ? (
            <span>Memindai database tbEntryList...</span>
          ) : (
            <>
              <strong className="font-semibold text-[var(--color-primary)] tabular-nums">{items.length}</strong>{' '}
              hasil ditemukan
            </>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isTargetCancel && (
            <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 mr-2">
              <AlertTriangle size={12} strokeWidth={2} /> Target: fdCancel = 1
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}
