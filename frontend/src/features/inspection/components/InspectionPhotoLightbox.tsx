import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  User,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
} from 'lucide-react'
import { useModalEscape } from '@/hooks/useModalEscape'
import type { BapPhoto } from '../types/inspection.types'

interface Props {
  isOpen: boolean
  photos: BapPhoto[]
  initialIndex: number
  onClose: () => void
  reportNumber?: string
}

export function InspectionPhotoLightbox({
  isOpen,
  photos,
  initialIndex,
  onClose,
  reportNumber,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setCurrentIndex(initialIndex)
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }, [initialIndex, isOpen])

  // Reset transforms when switching photo
  const resetTransform = useCallback(() => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }, [])

  const handlePrev = useCallback(() => {
    resetTransform()
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))
  }, [photos.length, resetTransform])

  const handleNext = useCallback(() => {
    resetTransform()
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))
  }, [photos.length, resetTransform])

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setZoom((z) => Math.min(z + 0.35, 3.5))
  }

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setZoom((z) => {
      const nextZ = Math.max(z - 0.35, 1)
      if (nextZ === 1) setPan({ x: 0, y: 0 })
      return nextZ
    })
  }

  const handleRotate = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRotation((r) => (r + 90) % 360)
  }

  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    const currentPhoto = photos[currentIndex]
    if (!currentPhoto) return
    const link = document.createElement('a')
    link.href = currentPhoto.fdPhotoUrl
    link.download = `${reportNumber || 'bap'}-foto-${currentIndex + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        handleRotate()
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleZoomOut()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        handleDownload()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNext, handlePrev])

  useModalEscape(isOpen, onClose)

  if (!isOpen || photos.length === 0) return null

  const currentPhoto = photos[currentIndex] || photos[0]

  // Pan event handlers when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || zoom <= 1) return
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-black/95 p-3 sm:p-5 backdrop-blur-md animate-fadeIn select-none overflow-hidden"
    >
      {/* Top Floating Glass Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-3 sm:px-4 bg-[#0A0F1D]/80 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md"
      >
        {/* Info & Counter */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-semibold min-w-0">
          <span className="bg-sky-500/20 text-sky-400 font-mono text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full border border-sky-500/30 shrink-0">
            {currentIndex + 1} / {photos.length}
          </span>

          <div className="min-w-0">
            <span className="font-mono text-xs sm:text-sm text-white font-bold tracking-wide truncate block">
              {reportNumber ? `${reportNumber} — Foto #${currentIndex + 1}` : `Foto #${currentIndex + 1}`}
            </span>
            <div className="hidden sm:flex items-center gap-2 text-white/50 text-[11px]">
              <span className="flex items-center gap-1">
                <User size={11} /> {currentPhoto.fdUploadedBy}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />{' '}
                {new Date(currentPhoto.fdCreatedAt).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Perbesar (+)"
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 transition-colors border border-white/10"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            title="Perkecil (-)"
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors border border-white/10"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={handleRotate}
            title="Putar 90° (R)"
            className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/90 transition-colors border border-white/10"
          >
            <RotateCw size={15} />
          </button>
          {(zoom > 1 || rotation !== 0) && (
            <button
              type="button"
              onClick={resetTransform}
              title="Reset Tampilan"
              className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors border border-amber-500/30"
            >
              <RefreshCw size={15} />
            </button>
          )}

          <div className="w-px h-5 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={handleDownload}
            title="Unduh Foto Resolusi Penuh (D)"
            className="p-1.5 sm:p-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 transition-colors border border-sky-500/30"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Tutup (Esc)"
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-white/90 hover:text-red-300 transition-colors border border-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 w-full max-w-6xl flex items-center justify-center my-2 sm:my-3 overflow-hidden ${
          zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        {/* Subtle Ambient Glow Behind Image */}
        <div
          className="absolute inset-8 rounded-3xl opacity-25 filter blur-3xl pointer-events-none transition-all duration-500"
          style={{
            backgroundImage: `url(${currentPhoto.fdPhotoUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* The Cargo Photo Image with Watermark */}
        <img
          src={currentPhoto.fdPhotoUrl}
          alt={`Foto BAP ${currentPhoto.fdId}`}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging.current ? 'none' : 'transform 200ms ease-out',
          }}
          className="max-h-[68vh] sm:max-h-[72vh] max-w-[92vw] sm:max-w-full object-contain rounded-xl shadow-2xl z-10"
        />

        {/* Navigation Arrow Previous */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            title="Foto Sebelumnya (Panah Kiri)"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-110 shadow-xl backdrop-blur-xs"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Navigation Arrow Next */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            title="Foto Berikutnya (Panah Kanan)"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all hover:scale-110 shadow-xl backdrop-blur-xs"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Bottom Floating Thumbnails Dock & Caption */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl flex flex-col items-center gap-2"
      >
        {currentPhoto.fdCaption ? (
          <div className="text-center text-white/90 text-xs px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-xs max-w-md truncate">
            "{currentPhoto.fdCaption}"
          </div>
        ) : null}

        {/* Filmstrip Strip Thumbnails */}
        {photos.length > 1 && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 rounded-2xl bg-[#0A0F1D]/80 border border-white/10 backdrop-blur-md shadow-2xl max-w-full overflow-x-auto scrollbar-none">
            {photos.map((photo, idx) => {
              const isActive = idx === currentIndex
              return (
                <button
                  key={photo.fdId}
                  type="button"
                  onClick={() => {
                    resetTransform()
                    setCurrentIndex(idx)
                  }}
                  className={`relative shrink-0 w-12 sm:w-16 h-10 sm:h-12 rounded-lg overflow-hidden transition-all duration-150 ${
                    isActive
                      ? 'ring-2 ring-sky-500 scale-105 shadow-md shadow-sky-500/20'
                      : 'opacity-50 hover:opacity-100 ring-1 ring-white/10'
                  }`}
                >
                  <img
                    src={photo.fdPhotoUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white bg-black/70 px-1 rounded">
                    #{idx + 1}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
