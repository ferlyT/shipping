import { useRef, useState } from 'react'
import { Camera, Trash2, Upload } from 'lucide-react'
import { getInitials, resolveMediaUrl } from '@/lib/utils'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from '@/stores/toastStore'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

interface AvatarUploadProps {
  avatarUrl: string | null | undefined
  fullName: string
  onUpload: (file: File) => Promise<any>
  onDelete: () => Promise<any>
  isUploading: boolean
  isDeleting: boolean
}

export function AvatarUpload({
  avatarUrl,
  fullName,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: AvatarUploadProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi format
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('profile.invalidImageType'))
      return
    }

    // Validasi ukuran (3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setImgError(false)

    try {
      await onUpload(file)
    } finally {
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExecuteDelete = async () => {
    try {
      await onDelete()
      setImgError(false)
      setIsConfirmDeleteOpen(false)
    } catch {
      // Handled by hook error handler
    }
  }

  const currentDisplayUrl = previewUrl || resolveMediaUrl(avatarUrl)
  const isLoading = isUploading || isDeleting

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--color-surface)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Avatar Display with Hover Overlay */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[var(--color-border)] bg-[var(--color-neutral)] flex items-center justify-center shadow-inner relative">
            {currentDisplayUrl && !imgError ? (
              <img
                src={currentDisplayUrl}
                alt={fullName || 'Avatar'}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--color-neutral)] text-[var(--color-tertiary)] font-bold text-2xl sm:text-3xl select-none">
                {fullName ? getInitials(fullName) : 'US'}
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-xs">
                <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              </div>
            )}

            {/* Hover Camera Icon */}
            {!isLoading && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                title={t('profile.changePhoto')}
              >
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-semibold mt-1">{t('profile.change')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--color-tertiary)] text-[var(--color-on-primary)] shadow-md hover:brightness-110 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer border-2 border-[var(--color-surface)]"
            title={t('profile.uploadPhoto')}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info & Action Buttons */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
          <h3 className="font-[var(--font-display)] text-base sm:text-lg font-semibold text-[var(--color-primary)]">
            {t('profile.avatarSection')}
          </h3>
          <p className="text-xs text-[var(--color-secondary)] mt-1 max-w-sm">
            {t('profile.avatarHint')}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-4">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              isLoading={isUploading}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{currentDisplayUrl ? t('profile.changePhoto') : t('profile.uploadPhoto')}</span>
            </Button>

            {avatarUrl && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={isLoading}
                isLoading={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('profile.deletePhoto')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Removing Avatar */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title={t('profile.deletePhotoTitle')}
        message={t('profile.deletePhotoConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleExecuteDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
        isLoading={isDeleting}
      />
    </>
  )
}
