import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
  ExternalLink,
  FileText,
  File,
  Image as ImageIcon,
  Crop as CropIcon,
  Check,
  RefreshCw,
  Sliders,
} from 'lucide-react'
import { dataRevisionsApi } from '../services/data-revisions.service'
import type { RevisionLampiranItem } from '../types/data-revisions.types'

interface RevisionGalleryModalProps {
  items: RevisionLampiranItem[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
  onItemUpdated?: (updatedItem: RevisionLampiranItem) => void
}

export default function RevisionGalleryModal({
  items = [],
  initialIndex = 0,
  isOpen,
  onClose,
  onItemUpdated,
}: RevisionGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Crop states
  const [isCropMode, setIsCropMode] = useState(false)
  // cropBox dalam persentase (0 - 100) terhadap gambar
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 })
  const [cropPreset, setCropPreset] = useState<'free' | '1:1' | '4:3' | '16:9' | 'a4'>('free')
  const [isSavingCrop, setIsSavingCrop] = useState(false)
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now())

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Dragging crop state
  const dragRef = useRef<{
    isDragging: boolean
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | null
    startX: number
    startY: number
    initialBox: { x: number; y: number; width: number; height: number }
  }>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    initialBox: { x: 10, y: 10, width: 80, height: 80 },
  })

  // Reset zoom, rotation & crop saat switch foto atau close
  useEffect(() => {
    setCurrentIndex(Math.max(0, Math.min(initialIndex, items.length - 1)))
    setZoom(1)
    setRotation(0)
    setIsCropMode(false)
    setCropBox({ x: 10, y: 10, width: 80, height: 80 })
  }, [initialIndex, isOpen, items.length])

  const currentItem = items[currentIndex]

  const handleNext = useCallback(() => {
    if (items.length <= 1 || isCropMode) return
    setCurrentIndex((prev) => (prev + 1) % items.length)
    setZoom(1)
    setRotation(0)
    setIsCropMode(false)
  }, [items.length, isCropMode])

  const handlePrev = useCallback(() => {
    if (items.length <= 1 || isCropMode) return
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
    setZoom(1)
    setRotation(0)
    setIsCropMode(false)
  }, [items.length, isCropMode])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCropMode) {
          setIsCropMode(false)
        } else {
          onClose()
        }
      } else if (!isCropMode) {
        if (e.key === 'ArrowRight') {
          handleNext()
        } else if (e.key === 'ArrowLeft') {
          handlePrev()
        } else if (e.key === '+' || e.key === '=') {
          setZoom((z) => Math.min(z + 0.25, 3))
        } else if (e.key === '-') {
          setZoom((z) => Math.max(z - 0.25, 0.5))
        } else if (e.key === 'r' || e.key === 'R') {
          setRotation((r) => (r + 90) % 360)
        } else if (e.key === '0') {
          setZoom(1)
          setRotation(0)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNext, handlePrev, onClose, isCropMode])

  // Helper resolusi URL dengan cache busting jika baru saja dicrop
  const getImgSrc = (path: string) => {
    if (!path) return ''
    return path.includes('?') ? `${path}&t=${cacheBuster}` : `${path}?t=${cacheBuster}`
  }

  // Terapkan preset aspek rasio crop
  const applyPreset = (preset: 'free' | '1:1' | '4:3' | '16:9' | 'a4') => {
    setCropPreset(preset)
    if (preset === 'free') return

    let ratio = 1
    if (preset === '1:1') ratio = 1
    else if (preset === '4:3') ratio = 4 / 3
    else if (preset === '16:9') ratio = 16 / 9
    else if (preset === 'a4') ratio = 1 / 1.414 // Vertikal A4

    const w = 70
    const h = Math.min(90, Math.max(20, w / ratio))
    setCropBox({
      x: (100 - w) / 2,
      y: (100 - h) / 2,
      width: w,
      height: h,
    })
  }

  // Mouse handlers untuk resize & drag crop box
  const handleMouseDown = (e: React.MouseEvent, dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw') => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      isDragging: true,
      dragType,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current.isDragging || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const deltaXPercent = ((moveEvent.clientX - dragRef.current.startX) / rect.width) * 100
      const deltaYPercent = ((moveEvent.clientY - dragRef.current.startY) / rect.height) * 100
      const { initialBox, dragType: dt } = dragRef.current

      if (dt === 'move') {
        const newX = Math.max(0, Math.min(100 - initialBox.width, initialBox.x + deltaXPercent))
        const newY = Math.max(0, Math.min(100 - initialBox.height, initialBox.y + deltaYPercent))
        setCropBox((prev) => ({ ...prev, x: newX, y: newY }))
      } else if (dt === 'se') {
        const newW = Math.max(10, Math.min(100 - initialBox.x, initialBox.width + deltaXPercent))
        const newH = Math.max(10, Math.min(100 - initialBox.y, initialBox.height + deltaYPercent))
        setCropBox((prev) => ({ ...prev, width: newW, height: newH }))
      } else if (dt === 'nw') {
        const newX = Math.max(0, Math.min(initialBox.x + initialBox.width - 10, initialBox.x + deltaXPercent))
        const newY = Math.max(0, Math.min(initialBox.y + initialBox.height - 10, initialBox.y + deltaYPercent))
        const newW = initialBox.width - (newX - initialBox.x)
        const newH = initialBox.height - (newY - initialBox.y)
        setCropBox({ x: newX, y: newY, width: newW, height: newH })
      } else if (dt === 'ne') {
        const newY = Math.max(0, Math.min(initialBox.y + initialBox.height - 10, initialBox.y + deltaYPercent))
        const newW = Math.max(10, Math.min(100 - initialBox.x, initialBox.width + deltaXPercent))
        const newH = initialBox.height - (newY - initialBox.y)
        setCropBox((prev) => ({ ...prev, y: newY, width: newW, height: newH }))
      } else if (dt === 'sw') {
        const newX = Math.max(0, Math.min(initialBox.x + initialBox.width - 10, initialBox.x + deltaXPercent))
        const newW = initialBox.width - (newX - initialBox.x)
        const newH = Math.max(10, Math.min(100 - initialBox.y, initialBox.height + deltaYPercent))
        setCropBox((prev) => ({ ...prev, x: newX, width: newW, height: newH }))
      }
    }

    const handleMouseUp = () => {
      dragRef.current.isDragging = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Simpan crop ke Server (Sharp Engine)
  const handleSaveCrop = async () => {
    if (!currentItem?.fdId) return
    setIsSavingCrop(true)

    try {
      const res = await dataRevisionsApi.cropLampiran(currentItem.fdId, {
        rotate: rotation,
        crop: {
          x: cropBox.x / 100,
          y: cropBox.y / 100,
          width: cropBox.width / 100,
          height: cropBox.height / 100,
        },
        isRatio: true,
      })

      const updated = res.data || res
      if (updated) {
        currentItem.fdPath = updated.fdPath || currentItem.fdPath
        currentItem.fdUkuranBytes = updated.fdUkuranBytes || currentItem.fdUkuranBytes
        onItemUpdated?.(updated)
      }

      setCacheBuster(Date.now())
      setZoom(1)
      setRotation(0)
      setIsCropMode(false)
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan hasil crop!')
    } finally {
      setIsSavingCrop(false)
    }
  }

  // Unduh potongan langsung via Canvas HTML5 (Client-side)
  const handleDownloadCrop = () => {
    if (!imageRef.current) return
    const img = imageRef.current
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const realW = img.naturalWidth || img.width
    const realH = img.naturalHeight || img.height

    const cropX = (cropBox.x / 100) * realW
    const cropY = (cropBox.y / 100) * realH
    const cropW = (cropBox.width / 100) * realW
    const cropH = (cropBox.height / 100) * realH

    canvas.width = cropW
    canvas.height = cropH

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    const link = document.createElement('a')
    link.download = `crop-${currentItem.fdNamaFile || 'image.jpg'}`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  if (!isOpen || !currentItem) return null

  const isImage = (mime: string) => mime?.startsWith('image/')
  const isPdf = (mime: string) => mime === 'application/pdf'

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const isImg = isImage(currentItem.fdMimeType)
  const isDocPdf = isPdf(currentItem.fdMimeType)

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] bg-black/92 backdrop-blur-md flex flex-col justify-between animate-in fade-in select-none"
      onClick={onClose}
    >
      {/* ── Top Bar / Header ── */}
      <div
        className="w-full bg-black/60 border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Info Nama File & Counter */}
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <div className="p-2 rounded-lg bg-white/10 text-white shrink-0">
            {isImg ? (
              <ImageIcon size={18} className="text-sky-400" />
            ) : isDocPdf ? (
              <FileText size={18} className="text-rose-400" />
            ) : (
              <File size={18} className="text-zinc-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate" title={currentItem.fdNamaFile}>
                {currentItem.fdNamaFile}
              </h3>
              <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-mono font-medium shrink-0">
                {currentIndex + 1} / {items.length}
              </span>
              {isCropMode && (
                <span className="text-[0.7rem] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  Mode Potong (Crop)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
              <span>{formatFileSize(Number(currentItem.fdUkuranBytes) || 0)}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">Oleh: {currentItem.fdUploadedBy}</span>
              {currentItem.fdUploadedAt && (
                <>
                  <span>•</span>
                  <span>{new Date(currentItem.fdUploadedAt).toLocaleDateString('id-ID')}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {isImg && (
            <>
              {/* Zoom Controls */}
              {!isCropMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1)
                      setRotation(0)
                    }}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer font-mono text-xs px-2.5"
                    title="Reset Zoom & Rotasi (100%)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={17} />
                  </button>
                </>
              )}

              {/* Rotate Controls */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Putar Kiri 90°"
              >
                <RotateCcw size={17} />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Putar Kanan 90° (R)"
              >
                <RotateCw size={17} />
              </button>

              <div className="h-5 w-px bg-white/15 mx-1" />

              {/* Tombol Crop Toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsCropMode(!isCropMode)
                  setZoom(1)
                }}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isCropMode
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
                title="Mode Potong Gambar (Crop)"
              >
                <CropIcon size={16} />
                <span className="hidden sm:inline">{isCropMode ? 'Batal Crop' : 'Potong (Crop)'}</span>
              </button>

              <div className="h-5 w-px bg-white/15 mx-1 hidden sm:block" />
            </>
          )}

          {/* Unduh */}
          <a
            href={currentItem.fdPath}
            download={currentItem.fdNamaFile}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Unduh Berkas Asli"
          >
            <Download size={17} />
          </a>

          {/* Buka Tab Baru */}
          <a
            href={currentItem.fdPath}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Buka di Tab Baru"
          >
            <ExternalLink size={17} />
          </a>

          <div className="h-5 w-px bg-white/15 mx-1" />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-300 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Sub-toolbar Khusus Mode Crop ── */}
      {isCropMode && isImg && (
        <div
          className="w-full bg-zinc-900/90 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between flex-wrap gap-2 z-10 animate-in slide-in-from-top-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preset Rasio */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
              <Sliders size={13} /> Rasio:
            </span>
            {(['free', '1:1', '4:3', '16:9', 'a4'] as const).map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => applyPreset(pr)}
                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase transition-colors cursor-pointer ${
                  cropPreset === pr
                    ? 'bg-amber-400 text-black'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                }`}
              >
                {pr === 'free' ? 'Bebas' : pr}
              </button>
            ))}
          </div>

          {/* Aksi Crop */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCrop}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Unduh hasil crop ke komputer"
            >
              <Download size={14} /> Unduh Hasil
            </button>

            <button
              type="button"
              disabled={isSavingCrop}
              onClick={handleSaveCrop}
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isSavingCrop ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Check size={14} /> Terapkan & Simpan
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Main View Area with Prev / Next Navigation ── */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Previous */}
        {items.length > 1 && !isCropMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handlePrev()
            }}
            className="absolute left-3 sm:left-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Foto Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Content Viewer */}
        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
          {isImg ? (
            <div
              ref={containerRef}
              className="relative flex items-center justify-center select-none"
              style={{
                transform: !isCropMode ? `scale(${zoom}) rotate(${rotation}deg)` : `rotate(${rotation}deg)`,
                transition: dragRef.current.isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
            >
              <img
                ref={imageRef}
                src={getImgSrc(currentItem.fdPath)}
                alt={currentItem.fdNamaFile}
                className="max-h-[70vh] sm:max-h-[74vh] max-w-[90vw] object-contain rounded-lg shadow-2xl pointer-events-auto"
                draggable={false}
              />

              {/* ── Interaktif Crop Overlay ── */}
              {isCropMode && (
                <div className="absolute inset-0 pointer-events-auto">
                  {/* Backdrop gelap di luar kotak crop */}
                  <div className="absolute inset-0 bg-black/50" />

                  {/* Kotak Crop Interaktif */}
                  <div
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    className="absolute border-2 border-amber-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move z-10"
                  >
                    {/* Grid Garis 3x3 (Rule of Thirds) */}
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-r border-b border-amber-300" />
                      <div className="border-b border-amber-300" />
                      <div className="border-r border-amber-300" />
                      <div className="border-r border-amber-300" />
                      <div />
                    </div>

                    {/* Handle Resize Sudut */}
                    {/* NW */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'nw')}
                      className="absolute -top-2 -left-2 w-4 h-4 bg-amber-400 border border-white rounded-full cursor-nwse-resize z-20"
                    />
                    {/* NE */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'ne')}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 border border-white rounded-full cursor-nesw-resize z-20"
                    />
                    {/* SE */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'se')}
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-400 border border-white rounded-full cursor-nwse-resize z-20"
                    />
                    {/* SW */}
                    <div
                      onMouseDown={(e) => handleMouseDown(e, 'sw')}
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-amber-400 border border-white rounded-full cursor-nesw-resize z-20"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : isDocPdf ? (
            <div className="w-full max-w-4xl h-[72vh] rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900">
              <iframe
                src={currentItem.fdPath}
                title={currentItem.fdNamaFile}
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-zinc-900/80 rounded-2xl border border-white/10 max-w-md space-y-3">
              <File size={56} className="mx-auto text-zinc-500" />
              <p className="text-sm font-semibold text-white">
                Pratinjau tidak didukung untuk tipe file ini.
              </p>
              <a
                href={currentItem.fdPath}
                download={currentItem.fdNamaFile}
                className="btn btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer"
              >
                <Download size={14} /> Unduh Berkas
              </a>
            </div>
          )}
        </div>

        {/* Tombol Next */}
        {items.length > 1 && !isCropMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-3 sm:right-6 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
            title="Foto Berikutnya (Panah Kanan)"
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Caption Overlay */}
        {currentItem.fdKeterangan && !isCropMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-md px-4 py-2 rounded-xl bg-black/75 border border-white/15 text-xs text-white text-center shadow-lg backdrop-blur-sm pointer-events-none">
            "{currentItem.fdKeterangan}"
          </div>
        )}
      </div>

      {/* ── Bottom Thumbnail Strip ── */}
      {items.length > 1 && !isCropMode && (
        <div
          className="w-full bg-black/70 border-t border-white/10 px-4 py-2.5 flex items-center justify-center overflow-x-auto gap-2.5 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it, idx) => {
            const active = idx === currentIndex
            const isThumbImg = isImage(it.fdMimeType)

            return (
              <button
                key={it.fdId || idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx)
                  setZoom(1)
                  setRotation(0)
                  setIsCropMode(false)
                }}
                className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  active
                    ? 'border-primary ring-2 ring-primary/40 scale-105 opacity-100'
                    : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/40'
                }`}
                title={it.fdNamaFile}
              >
                {isThumbImg ? (
                  <img
                    src={getImgSrc(it.fdPath)}
                    alt={it.fdNamaFile}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-rose-400">
                    <FileText size={20} />
                  </div>
                )}
                {active && (
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
