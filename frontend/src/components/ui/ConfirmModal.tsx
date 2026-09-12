import { useModalEscape } from '@/hooks/useModalEscape'
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
  useModalEscape(isOpen, onCancel)
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-slideUp">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-[15px] font-bold font-[var(--font-label)] uppercase tracking-wide text-[var(--color-primary)]">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-xs leading-relaxed text-[var(--color-secondary)]">{message}</p>
        </div>
        
        <div className="flex justify-end gap-2.5 px-5 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-xs font-semibold px-3.5 py-1.5"
          >
            {cancelText}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className="text-xs font-semibold px-3.5 py-1.5"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
