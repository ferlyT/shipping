import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, RotateCw } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/utils'
import type { BapPhoto } from '../../types/inspection.types'

interface LampiranLightboxProps {
  items: BapPhoto[]
  initialIndex: number
  onClose: () => void
  reportNumber?: string
}

export default function LampiranLightbox({
  items,
  initialIndex,
  onClose,
  reportNumber,
}: LampiranLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  const currentItem = items[currentIndex]
  const currentPhotoUrl = currentItem ? (resolveMediaUrl(currentItem.fdPhotoUrl) || currentItem.fdPhotoUrl) : ''

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
    if (!currentItem || !currentPhotoUrl) return
    const link = document.createElement('a')
    link.href = currentPhotoUrl
    link.download = `${reportNumber || 'bap'}-foto-${currentIndex + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!currentItem) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm select-none"
    >
      {/* Top Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-20 bg-gradient-to-b from-black/70 to-transparent"
      >
        <div className="text-sm font-medium">
          {currentIndex + 1} / {items.length} -{' '}
          {reportNumber ? `${reportNumber} — ` : ''}
          {currentItem.fdCaption || `Foto Pemeriksaan #${currentIndex + 1}`}
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="hover:text-sky-400 p-1.5 rounded transition-colors"
            title="Putar 90° (R)"
          >
            <RotateCw size={20} />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="hover:text-sky-400 p-1.5 rounded transition-colors"
              title="Perkecil (-)"
            >
              <ZoomOut size={20} />
            </button>
            <span className="text-xs font-mono">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, z + 0.25))}
              className="hover:text-sky-400 p-1.5 rounded transition-colors"
              title="Perbesar (+)"
            >
              <ZoomIn size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="hover:text-sky-400 p-1.5 rounded transition-colors"
            title="Unduh Foto"
          >
            <Download size={20} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="hover:text-rose-400 p-1.5 rounded transition-colors ml-2"
            title="Tutup (Esc)"
          >
            <X size={24} />
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
            className="absolute left-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/80 transition z-20"
            title="Foto Sebelumnya"
          >
            <ChevronLeft size={32} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-4 p-2 text-white bg-black/50 rounded-full hover:bg-black/80 transition z-20"
            title="Foto Berikutnya"
          >
            <ChevronRight size={32} />
          </button>
        </>
      )}

      {/* Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full flex items-center justify-center p-8 sm:p-14 overflow-hidden"
      >
        <img
          src={currentPhotoUrl}
          alt={currentItem.fdCaption || 'Foto Pemeriksaan'}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none shadow-2xl"
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          draggable={false}
        />
      </div>
    </div>
  )
}
