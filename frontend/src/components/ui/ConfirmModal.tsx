import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

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
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <Modal.Header
        title={title}
        icon={
          <div className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        }
        onClose={isLoading ? undefined : onCancel}
      />
      <Modal.Body>
        <p className="text-xs leading-relaxed text-[var(--color-secondary)]">{message}</p>
      </Modal.Body>
      <Modal.Footer>
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
      </Modal.Footer>
    </Modal>
  )
}

