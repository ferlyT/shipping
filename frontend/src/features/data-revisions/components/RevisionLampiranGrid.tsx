import { useState, useRef } from 'react'
import {
  FileText,
  Trash2,
  Download,
  Eye,
  UploadCloud,
  File,
} from 'lucide-react'
import type { RevisionLampiranItem } from '../types/data-revisions.types'
import RevisionGalleryModal from './RevisionGalleryModal'

interface RevisionLampiranGridProps {
  lampiran: RevisionLampiranItem[]
  onUpload?: (file: File, keterangan?: string) => void
  onDelete?: (id: number) => void
  isUploading?: boolean
  isDeleting?: boolean
  canEdit?: boolean
}

export default function RevisionLampiranGrid({
  lampiran = [],
  onUpload,
  onDelete,
  isUploading = false,
  isDeleting = false,
  canEdit = true,
}: RevisionLampiranGridProps) {
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [keterangan, setKeterangan] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpload) return
    for (let i = 0; i < files.length; i++) {
      onUpload(files[i], keterangan || undefined)
    }
    setKeterangan('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDragging(false)
      dragCounter.current = 0
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const isImage = (mime: string) => mime.startsWith('image/')
  const isPdf = (mime: string) => mime === 'application/pdf'

  return (
    <div className="space-y-5">
      {/* Drag & Drop Upload Zone */}
      {canEdit && onUpload && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all duration-200 text-center ${
            isDragging
              ? 'border-primary bg-primary/10 shadow-lg ring-4 ring-primary/20 scale-[1.01]'
              : 'border-border/80 hover:border-primary/50 bg-card/40'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3 max-w-lg mx-auto">
            <div
              className={`p-4 rounded-2xl transition-transform duration-300 ${
                isDragging
                  ? 'bg-primary text-primary-foreground scale-110 shadow-md animate-bounce'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              <UploadCloud size={32} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {isDragging
                  ? 'Lepaskan file di sini untuk mengunggah!'
                  : 'Tarik & Lepas File di Sini, atau Klik untuk Memilih'}
              </p>
              <p className="text-xs text-muted-foreground">
                Mendukung berkas foto scan form fisik (PNG, JPG, WebP) atau dokumen PDF (maks. 10MB per file).
              </p>
            </div>

            {/* Controls */}
            <div className="w-full pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan/Keterangan file (opsional)..."
                className="form-input text-xs py-2 px-3.5 w-full sm:w-64 rounded-xl border-border/70"
                onClick={(e) => e.stopPropagation()}
              />

              <label
                className={`btn btn-primary text-xs py-2.5 px-5 rounded-xl cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform ${
                  isUploading ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{isUploading ? 'Mengunggah...' : 'Pilih Berkas'}</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  multiple
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Grid List */}
      {lampiran.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground/60 text-xs border border-border/40 rounded-xl bg-card/20">
          Belum ada berkas lampiran yang diunggah.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {lampiran.map((item, idx) => {
            const img = isImage(item.fdMimeType)
            const pdf = isPdf(item.fdMimeType)
            const fileUrl = item.fdPath

            return (
              <div
                key={item.fdId}
                className="group relative card p-3 flex flex-col justify-between border-border/60 hover:border-primary/60 transition-all rounded-xl shadow-xs hover:shadow-md text-left overflow-hidden bg-surface"
              >
                {/* Thumbnail */}
                <div
                  className="w-full aspect-[4/3] rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center overflow-hidden cursor-pointer relative"
                  onClick={() => setGalleryIndex(idx)}
                >
                  {img ? (
                    <img
                      src={fileUrl}
                      alt={item.fdNamaFile}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : pdf ? (
                    <div className="flex flex-col items-center gap-1.5 text-rose-500">
                      <FileText size={36} />
                      <span className="text-[0.68rem] font-bold font-mono uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        PDF
                      </span>
                    </div>
                  ) : (
                    <File size={36} className="text-muted-foreground" />
                  )}

                  {/* Overlay button */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="p-2 rounded-lg bg-surface text-foreground shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Lihat Pratinjau"
                    >
                      <Eye size={15} />
                    </button>
                    <a
                      href={fileUrl}
                      download={item.fdNamaFile}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg bg-surface text-foreground shadow-md hover:scale-110 transition-transform cursor-pointer"
                      title="Unduh Berkas"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-2.5 space-y-0.5">
                  <p
                    className="text-xs font-semibold text-foreground truncate"
                    title={item.fdNamaFile}
                  >
                    {item.fdNamaFile}
                  </p>
                  <div className="text-[0.68rem] text-muted-foreground flex justify-between items-center font-mono">
                    <span>{formatFileSize(item.fdUkuranBytes)}</span>
                    <span className="truncate max-w-[70px] text-right">
                      {item.fdUploadedBy}
                    </span>
                  </div>
                  {item.fdKeterangan && (
                    <p className="text-[0.68rem] text-muted-foreground/80 italic truncate pt-0.5">
                      "{item.fdKeterangan}"
                    </p>
                  )}
                </div>

                {/* Delete button */}
                {canEdit && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Hapus file lampiran "${item.fdNamaFile}"?`)) {
                        onDelete(item.fdId)
                      }
                    }}
                    disabled={isDeleting}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                    title="Hapus file"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Gallery Lightbox Modal */}
      <RevisionGalleryModal
        items={lampiran}
        initialIndex={galleryIndex ?? 0}
        isOpen={galleryIndex !== null}
        onClose={() => setGalleryIndex(null)}
      />
    </div>
  )
}
