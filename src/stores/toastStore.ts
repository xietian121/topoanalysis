import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (message: string, type?: ToastItem['type'], duration?: number) => void
  removeToast: (id: string) => void
}

let toastId = 0
function nextId() {
  return `toast_${Date.now()}_${++toastId}`
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  addToast: (message, type = 'success', duration = 2500) => {
    const id = nextId()
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
