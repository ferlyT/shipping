import { createPortal } from 'react-dom'
import { useToastStore } from '@/stores/toastStore'
import { Toast } from './Toast'

export function ToastContainer() {
  const { toasts } = useToastStore()

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 w-full max-w-sm pointer-events-none font-[var(--font-body)]">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>,
    document.body
  )
}
