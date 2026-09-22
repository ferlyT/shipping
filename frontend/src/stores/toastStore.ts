import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastState {
  toasts: ToastMessage[]
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
}

let lastToastSig = ''
let lastToastSigTime = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const rawMsg = (toast as any).message
    const cleanMessage =
      typeof rawMsg === 'string'
        ? rawMsg
        : rawMsg?.message || (typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : String(rawMsg || ''))

    const now = Date.now()
    const sig = `${toast.type}:${cleanMessage}`
    if (sig === lastToastSig && now - lastToastSigTime < 1000) {
      return
    }
    lastToastSig = sig
    lastToastSigTime = now

    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({ toasts: [...state.toasts, { ...toast, message: cleanMessage, id }] }))
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 3000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}))

// Helper object for easy access
export const toast = {
  success: (message: any) => useToastStore.getState().addToast({ type: 'success', message: typeof message === 'string' ? message : message?.message || JSON.stringify(message) }),
  error: (message: any) => useToastStore.getState().addToast({ type: 'error', message: typeof message === 'string' ? message : message?.message || JSON.stringify(message) }),
  info: (message: any) => useToastStore.getState().addToast({ type: 'info', message: typeof message === 'string' ? message : message?.message || JSON.stringify(message) }),
  warning: (message: any) => useToastStore.getState().addToast({ type: 'warning', message: typeof message === 'string' ? message : message?.message || JSON.stringify(message) }),
}
