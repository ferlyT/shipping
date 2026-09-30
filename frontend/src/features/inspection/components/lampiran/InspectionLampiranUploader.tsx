import React, { useState, useCallback, useEffect } from 'react'
import { UploadCloud } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { useInspectionMutations } from '../../hooks/useInspectionReports'

interface LampiranUploaderProps {
  reportId: number
  onUploadSuccess: () => void
  currentPhotoCount: number
}

export default function InspectionLampiranUploader({
  reportId,
  onUploadSuccess,
  currentPhotoCount,
}: LampiranUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadText, setUploadText] = useState('Mengunggah foto...')

  const { uploadPhotoMutation } = useInspectionMutations()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const handleMultipleFiles = async (files: FileList | File[]) => {
    if (isUploading) return

    const remainingSlots = Math.max(0, 10 - currentPhotoCount)
    if (remainingSlots <= 0) {
      toast.error('Maksimal 10 foto per Berita Acara Pemeriksaan.')
      return
    }

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > 5 * 1024 * 1024) return false
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) return false
      return true
    })

    if (validFiles.length !== Array.from(files).length) {
      toast.error('Beberapa file diabaikan karena ukurannya >5MB atau format bukan gambar (JPG/PNG/WebP).')
    }

    if (validFiles.length === 0) return

    const filesToUpload = validFiles.slice(0, remainingSlots)
    if (validFiles.length > remainingSlots) {
      toast.warning(`Hanya ${remainingSlots} foto yang diunggah karena batas maksimal 10 foto.`)
    }

    setIsUploading(true)
    setProgress(0)

    let hasError = false

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      setUploadText(`Mengunggah & mencetak watermark ${i + 1} dari ${filesToUpload.length}...`)

      try {
        const base64 = await fileToBase64(file)
        await uploadPhotoMutation.mutateAsync({
          reportId,
          photoBase64: base64,
          caption: file.name,
        })
        const percent = Math.round(((i + 1) * 100) / filesToUpload.length)
        setProgress(percent)
      } catch (err: any) {
        hasError = true
        toast.error(err.response?.data?.error || err.message || `Gagal mengunggah ${file.name}`)
      }
    }

    if (!hasError) {
      toast.success('Foto berhasil diunggah dengan watermark!')
    }

    onUploadSuccess()
    setIsUploading(false)
    setProgress(0)
    setUploadText('Mengunggah foto...')
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleMultipleFiles(e.dataTransfer.files)
      }
    },
    [currentPhotoCount, isUploading]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files)
      e.target.value = ''
    }
  }

  // Ctrl+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isUploading) return

      // Ignore paste if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault()
        handleMultipleFiles(e.clipboardData.files)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  })

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-all ${
          isDragging
            ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10'
            : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUploading || currentPhotoCount >= 10}
        />

        {!isUploading ? (
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-10 h-10 text-[var(--color-secondary)]/70 mb-2" />
            <p className="text-[0.92rem] font-medium text-[var(--color-primary)]">
              Drag & drop, klik untuk pilih, atau tekan{' '}
              <strong className="text-[var(--color-tertiary)] font-bold">CTRL+V</strong> untuk paste gambar
            </p>
            <p className="text-[0.72rem] text-[var(--color-secondary)] mt-1">
              Mendukung format JPG, PNG, WebP hingga 5MB. Watermark resmi dicetak otomatis pada gambar ({currentPhotoCount}/10 foto).
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <div className="flex justify-between text-[0.75rem] font-medium mb-1.5 text-[var(--color-primary)]">
              <span>{uploadText}</span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-[var(--color-neutral)] rounded-full h-2.5 overflow-hidden border border-[var(--color-border)]">
              <div
                className="bg-[var(--color-tertiary)] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
