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
    success: 'bg-emerald-50/95 dark:bg-emerald-950/95 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 shadow-xl shadow-emerald-900/10',
    error: 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 shadow-xl shadow-rose-900/10',
    info: 'bg-blue-50/95 dark:bg-blue-950/95 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-xl shadow-blue-900/10',
    warning: 'bg-amber-50/95 dark:bg-amber-950/95 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 shadow-xl shadow-amber-900/10'
  }

  return (
    <div
      className={cn(
        "flex items-start p-3.5 mb-2.5 border rounded-xl shadow-xl backdrop-blur-md transition-all duration-300 transform",
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
