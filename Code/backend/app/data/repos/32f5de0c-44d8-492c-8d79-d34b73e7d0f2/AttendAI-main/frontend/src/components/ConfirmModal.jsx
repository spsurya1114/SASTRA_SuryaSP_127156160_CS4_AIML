/**
 * components/ConfirmModal.jsx — Confirmation Dialog Modal for Deletions
 */
import React, { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Spinner } from './Spinner.jsx'

export function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={() => !loading && onCancel()}
      />

      {/* Dialog box */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-scale-in z-10">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md shadow-red-600/20 flex items-center gap-2 transition-all"
          >
            {loading ? <Spinner size={14} /> : null}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
