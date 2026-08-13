import { createPortal } from 'react-dom'
import { X, ClipboardList } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { ManifestList } from './ManifestList'
import type { Marking } from '../types/marking.types'

export function BatchManifestModal({
  selectedManifestRow,
  manifestBatchDetail,
  onClose,
}: {
  selectedManifestRow: Marking | null
  manifestBatchDetail: Marking | null
  onClose: () => void
}) {
  const { t } = useTranslation()

  if (!selectedManifestRow || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1000px] m-auto bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Panel */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E4E1DA] bg-[var(--color-surface)] sticky top-0 z-10">
          <div className="flex items-center gap-[14px]">
            <div className="w-[38px] h-[38px] rounded-[var(--radius-md)] border border-[#E4E1DA] bg-[var(--color-neutral)] flex items-center justify-center text-[1.1rem] sm:text-[1.15rem] md:text-[1.2rem] text-[var(--color-tertiary)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="font-[var(--font-display)] font-semibold text-[1.1rem] sm:text-[1.2rem] md:text-[1.3rem] tracking-[-0.01em] leading-tight text-[var(--color-primary)]">
                {selectedManifestRow.fdMarkingCode}
              </div>
              <div className="flex items-center gap-2">
                <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-secondary)] mt-[2px] leading-tight">
                  {t('marking.batchManifestList')}
                </div>
                {manifestBatchDetail?.fdListType === 2 && manifestBatchDetail?.fdContNo && (
                  <>
                    <span className="text-[var(--color-border)] text-xs sm:text-[13px] md:text-[14px] mt-[2px]">•</span>
                    <div className="font-[var(--font-label)] text-[0.65rem] sm:text-[0.7rem] tracking-[0.08em] uppercase text-[var(--color-tertiary)] mt-[2px] leading-tight font-bold bg-[var(--color-tertiary)]/10 px-1.5 py-0.5 rounded-md">
                      CONT: {manifestBatchDetail.fdContNo} {manifestBatchDetail.fdContSize ? `(${manifestBatchDetail.fdContSize.trim()})` : ''}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[1.2rem] sm:text-[1.25rem] md:text-[1.3rem] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <ManifestList markingCode={selectedManifestRow.fdMarkingCode} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
