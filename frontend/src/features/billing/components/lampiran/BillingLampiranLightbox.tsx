import { useState, useEffect, useCallback } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCw,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { resolveMediaUrl } from '@/lib/utils'
import type { BillingAttachment } from '../../types/billing.types'

interface BillingLampiranLightboxProps {
  items: BillingAttachment[]
  initialIndex: number
  onClose: () => void
  invNo?: string
}

export default function BillingLampiranLightbox({
  items,
  initialIndex,
  onClose,
  invNo,
}: BillingLampiranLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const currentItem = items[currentIndex]
  const currentFileUrl = currentItem
    ? resolveMediaUrl(currentItem.fdFileUrl) || currentItem.fdFileUrl
    : ''
  const isPdf =
    currentItem?.fdFileType?.toLowerCase() === 'application/pdf' ||
    currentItem?.fdFileName?.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoom(1)
    setRotation(0)
  }, [initialIndex])

  const handlePrev = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1))
  }, [items.length])

  const handleNext = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0))
  }, [items.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'r' || e.key === 'R') setRotation((r) => (r + 90) % 360)
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3.5, z + 0.25))
      if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(0.5, z - 0.25))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, onClose])

  const handleDownload = () => {
    if (!currentItem || !currentFileUrl) return
    const link = document.createElement('a')
    link.href = currentFileUrl
    link.download = currentItem.fdFileName || `${invNo || 'invoice'}-lampiran-${currentIndex + 1}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!currentItem) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-sm select-none"
    >
      {/* Top Header Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/80 to-transparent"
      >
        <div className="text-xs sm:text-sm font-medium truncate max-w-[60vw]">
          <span className="text-white/60">
            {currentIndex + 1} / {items.length}
          </span>{' '}
          • {invNo ? `${invNo} — ` : ''}
          <span className="font-semibold text-white">{currentItem.fdFileName}</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="hover:text-emerald-400 p-1.5 rounded transition-colors"
                title="Putar 90° (R)"
              >
                <RotateCw size={18} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="hover:text-emerald-400 p-1.5 rounded transition-colors"
                  title="Perkecil (-)"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="text-[11px] font-mono min-w-[38px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.5, z + 0.25))}
                  className="hover:text-emerald-400 p-1.5 rounded transition-colors"
                  title="Perbesar (+)"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
            </>
          )}

          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-400 p-1.5 rounded transition-colors flex items-center gap-1 text-xs"
            title="Buka di Tab Baru"
          >
            <ExternalLink size={18} />
          </a>

          <button
            type="button"
            onClick={handleDownload}
            className="hover:text-emerald-400 p-1.5 rounded transition-colors"
            title="Unduh Berkas"
          >
            <Download size={18} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="hover:text-rose-400 p-1.5 rounded transition-colors ml-1"
            title="Tutup (Esc)"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            className="absolute left-3 sm:left-6 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full transition z-20"
            title="Lampiran Sebelumnya"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-3 sm:right-6 p-2 text-white bg-black/50 hover:bg-black/80 rounded-full transition z-20"
            title="Lampiran Berikutnya"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Main Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full flex items-center justify-center p-6 sm:p-14 overflow-hidden"
      >
        {isPdf ? (
          <div className="w-full max-w-4xl h-[82vh] bg-neutral-900 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
            <div className="bg-neutral-800 px-4 py-2 flex items-center justify-between text-xs text-neutral-300 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                <span className="font-semibold">{currentItem.fdFileName}</span>
              </div>
              <a
                href={currentFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
              >
                <span>Buka di tab baru</span>
                <ExternalLink size={13} />
              </a>
            </div>
            <iframe
              src={`${currentFileUrl}#toolbar=1`}
              title={currentItem.fdFileName}
              className="w-full flex-1 border-0 bg-white"
            />
          </div>
        ) : (
          <img
            src={currentFileUrl}
            alt={currentItem.fdFileName || 'Lampiran Invoice'}
            className="max-w-full max-h-full object-contain transition-transform duration-200 select-none shadow-2xl rounded-sm"
            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
            draggable={false}
          />
        )}
      </div>
    </div>
  )
}
