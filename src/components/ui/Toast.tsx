import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const colorMap = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        const colors = colorMap[toast.type]
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border ${colors} shadow-lg backdrop-blur-md animate-[slideInRight_0.3s_ease-out] min-w-[280px] max-w-[420px]`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-[13px] font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
