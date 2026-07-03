import { useEffect } from 'react'
import { Button } from './Button'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3 text-red-600">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold font-[var(--font-display)] text-[var(--color-primary)]">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-[var(--color-secondary)]">{message}</p>
        </div>
        
        <div className="flex justify-end gap-3 p-5 bg-gray-50 border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
