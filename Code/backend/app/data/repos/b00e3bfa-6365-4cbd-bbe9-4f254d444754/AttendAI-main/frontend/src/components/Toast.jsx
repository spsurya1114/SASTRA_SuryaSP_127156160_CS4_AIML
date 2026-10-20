/**
 * components/Toast.jsx
 *
 * Global toast/snackbar system.
 * Usage:
 *   const { toast } = useToast()
 *   toast.success('Student enrolled!')
 *   toast.error('Failed to detect faces.')
 */
import React, { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

/* ── Context ─────────────────────────────────────────────────────────────── */
const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

/* ── Config per type ─────────────────────────────────────────────────────── */
const VARIANTS = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon_color: 'text-green-500',
    text: 'text-green-800',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon_color: 'text-red-500',
    text: 'text-red-800',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon_color: 'text-amber-500',
    text: 'text-amber-800',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon_color: 'text-blue-500',
    text: 'text-blue-800',
  },
}

/* ── Single toast item ────────────────────────────────────────────────────── */
function ToastItem({ id, type, message, onDismiss }) {
  const v = VARIANTS[type] || VARIANTS.info
  const Icon = v.icon

  return (
    <div
      className={`flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border shadow-lg
                  ${v.bg} ${v.border} animate-slide-up`}
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${v.icon_color}`} />
      <p className={`flex-1 text-sm font-medium leading-snug ${v.text}`}>{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/* ── Provider ─────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
  }, [dismiss])

  const toast = {
    success: (msg, dur)  => push('success', msg, dur),
    error:   (msg, dur)  => push('error',   msg, dur),
    warning: (msg, dur)  => push('warning', msg, dur),
    info:    (msg, dur)  => push('info',    msg, dur),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal-like fixed container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
