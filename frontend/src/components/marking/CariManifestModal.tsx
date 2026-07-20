import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, PackageSearch } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useQuery } from '@tanstack/react-query'
import { markingApi } from '@/api/endpoints/marking'

interface CariManifestModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (fdMarkingCode: string) => void
}

export function CariManifestModal({ isOpen, onClose, onSelect }: CariManifestModalProps) {
  const [inputCode, setInputCode] = useState('')
  const debouncedInput = useDebounce(inputCode, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch suggestions
  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['marking-suggestions', debouncedInput],
    queryFn: () => markingApi.list({ page: 1, limit: 15, search: debouncedInput }),
    enabled: isOpen && debouncedInput.length > 0,
    staleTime: 1000 * 60 * 5, // 5 mins
  })

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setInputCode('')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Deduplicate results by fdMarkingCode
  const suggestions = searchResults?.data?.data
    ? Array.from(new Map(searchResults.data.data.map((item: any) => [item.fdMarkingCode, item])).values())
    : []

  const handleSelect = (code: string) => {
    onSelect(code)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputCode.trim()) {
      handleSelect(inputCode.trim().toUpperCase())
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[88dvh] sm:max-h-[600px] bg-[var(--color-surface)] rounded-t-2xl sm:rounded-[var(--radius-xl)] shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 border border-[var(--color-border)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar - mobile only, signals draggable bottom sheet */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-neutral)] shrink-0">
          <div className="flex items-center gap-2">
            <PackageSearch className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-primary)]" />
            <h2 className="text-base sm:text-lg font-bold font-[var(--font-display)] text-[var(--color-primary)]">Cari Manifest</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1 -mr-2 sm:mr-0 hover:bg-[var(--color-surface)] rounded-md transition-colors text-[var(--color-secondary)] hover:text-[var(--color-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <div className="px-4 pt-3 pb-2 sm:p-6 sm:pb-4 shrink-0">
          <label htmlFor="markingCodeInput" className="block text-xs sm:text-sm font-medium text-[var(--color-primary)] mb-1.5 sm:mb-2">
            Ketik Marking Code, B/L, AWB, atau Container
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              id="markingCodeInput"
              type="text"
              autoComplete="off"
              className="w-full px-3 py-2.5 sm:px-4 sm:py-3 bg-[var(--color-neutral)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-sm sm:text-base text-[var(--color-primary)] placeholder-[var(--color-secondary)]/50 uppercase transition-all"
              placeholder="Contoh: 26GZ..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Suggestions - grows to fill available sheet height, no fixed cap on mobile */}
        {debouncedInput && (
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
            {suggestions.length > 0 ? (
              <ul className="space-y-0.5">
                {suggestions.map((item: any) => (
                  <li key={item.fdMarkingCode}>
                    <button
                      onClick={() => handleSelect(item.fdMarkingCode)}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 hover:bg-[var(--color-neutral)] active:bg-[var(--color-neutral)] rounded-[var(--radius-md)] transition-colors text-left"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-sm sm:text-base text-[var(--color-primary)] truncate">
                          {item.fdMarkingCode}
                        </span>
                        <span className="shrink-0 flex items-center gap-1.5 text-[10px] sm:text-xs text-[var(--color-secondary)]/70 whitespace-nowrap">
                          {item.fdBranchCode && <span>{item.fdBranchCode}</span>}
                          {item.fdLoadDate && (
                            <span>{new Date(item.fdLoadDate).toLocaleDateString('id-ID')}</span>
                          )}
                        </span>
                      </div>
                      {item.fdConsignee && (
                        <span className="block text-xs text-[var(--color-secondary)] mt-0.5 truncate">
                          {item.fdConsignee}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : !isFetching ? (
              <div className="px-4 py-8 text-center text-[var(--color-secondary)] text-sm">
                Marking code tidak ditemukan
              </div>
            ) : null}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[var(--color-neutral)] border-t border-[var(--color-border)] flex justify-end gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
          <button
            onClick={onClose}
            className="px-3.5 py-2 sm:px-4 sm:py-2 bg-[var(--color-surface)] hover:bg-[var(--color-neutral)] text-[var(--color-secondary)] text-xs sm:text-sm font-bold rounded-[var(--radius-md)] border border-[var(--color-border)] transition-colors"
          >
            Tutup
          </button>
          <button
            disabled={!inputCode.trim()}
            onClick={() => handleSelect(inputCode.trim().toUpperCase())}
            className="px-3.5 py-2 sm:px-4 sm:py-2 bg-[var(--color-primary)] hover:opacity-90 text-white text-xs sm:text-sm font-bold rounded-[var(--radius-md)] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cari
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}