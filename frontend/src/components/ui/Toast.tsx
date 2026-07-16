import { useState } from 'react'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { type ToastMessage, useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

interface ToastProps {
  toast: ToastMessage
}

export function Toast({ toast }: ToastProps) {
  const { removeToast } = useToastStore()
  const [isLeaving, setIsLeaving] = useState(false)

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      removeToast(toast.id)
    }, 300) // matches animation duration
  }

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />
  }

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }

  return (
    <div
      className={cn(
        "flex items-start p-4 mb-3 border rounded-lg shadow-sm transition-all duration-300 transform",
        styles[toast.type],
        isLeaving ? "opacity-0 translate-x-full" : "animate-slide-in"
      )}
      style={{
        animation: isLeaving ? 'none' : 'slideIn 0.3s ease-out forwards'
      }}
    >
      <div className="flex-shrink-0 mr-3">
        {icons[toast.type]}
      </div>
      <div className="flex-1 text-sm font-medium pt-0.5">
        {toast.message}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
