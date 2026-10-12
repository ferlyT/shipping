import React, { useState, useCallback, useEffect } from 'react'
import { UploadCloud } from 'lucide-react'
import { toast } from '@/stores/toastStore'
import { useBillingAttachmentMutations } from '../../hooks/useBillingAttachments'

interface BillingLampiranUploaderProps {
  invNo: string
  onUploadSuccess: () => void
  currentCount: number
}

const MAX_FILES = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function BillingLampiranUploader({
  invNo,
  onUploadSuccess,
  currentCount,
}: BillingLampiranUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadText, setUploadText] = useState('Mengunggah berkas...')

  const { uploadAttachmentMutation } = useBillingAttachmentMutations(invNo)

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

    const remainingSlots = Math.max(0, MAX_FILES - currentCount)
    if (remainingSlots <= 0) {
      toast.error(`Maksimal ${MAX_FILES} lampiran per invoice.`)
      return
    }

    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_FILE_SIZE) return false
      const type = file.type.toLowerCase()
      const isAllowedType =
        ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'].includes(type) ||
        /\.(jpe?g|png|webp|pdf)$/i.test(file.name)
      return isAllowedType
    })

    if (validFiles.length !== Array.from(files).length) {
      toast.error('Beberapa file diabaikan karena ukurannya >10MB atau format bukan Gambar/PDF.')
    }

    if (validFiles.length === 0) return

    const filesToUpload = validFiles.slice(0, remainingSlots)
    if (validFiles.length > remainingSlots) {
      toast.warning(`Hanya ${remainingSlots} berkas yang diunggah karena batas maksimal ${MAX_FILES} berkas.`)
    }

    setIsUploading(true)
    setProgress(0)

    let hasError = false

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      setUploadText(`Mengunggah berkas ${i + 1} dari ${filesToUpload.length} (${file.name})...`)

      try {
        const base64 = await fileToBase64(file)
        await uploadAttachmentMutation.mutateAsync({
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type || undefined,
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
      toast.success('Lampiran invoice berhasil diunggah!')
    }

    onUploadSuccess()
    setIsUploading(false)
    setProgress(0)
    setUploadText('Mengunggah berkas...')
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
    [currentCount, isUploading]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files)
      e.target.value = ''
    }
  }

  // Ctrl+V paste support for screenshot / images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isUploading) return

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
        className={`relative border-2 border-dashed rounded-xl p-5 sm:p-7 text-center transition-all ${
          isDragging
            ? 'border-[var(--color-tertiary)] bg-[var(--color-tertiary)]/10'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-tertiary)]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isUploading || currentCount >= MAX_FILES}
        />

        {!isUploading ? (
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-[var(--color-neutral)] flex items-center justify-center mb-2.5 border border-[var(--color-border)]">
              <UploadCloud className="w-6 h-6 text-[var(--color-tertiary)]" />
            </div>
            <p className="text-[0.88rem] font-medium text-[var(--color-primary)]">
              Tarik & lepas berkas ke sini, klik untuk memilih, atau tekan{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-neutral)] border border-[var(--color-border)] font-mono text-xs text-[var(--color-primary)]">
                CTRL+V
              </kbd>{' '}
              untuk menempelkan gambar
            </p>
            <p className="text-[0.72rem] text-[var(--color-secondary)] mt-1">
              Mendukung Gambar (JPG, PNG, WebP) & Dokumen PDF hingga 10MB ({currentCount}/{MAX_FILES} berkas).
            </p>
          </div>
        ) : (
          <div className="py-2">
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
