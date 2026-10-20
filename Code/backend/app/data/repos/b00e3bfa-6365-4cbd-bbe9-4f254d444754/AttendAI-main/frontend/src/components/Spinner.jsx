/**
 * components/Spinner.jsx — Reusable loading indicators.
 */
import React from 'react'
import { Loader2 } from 'lucide-react'

/* ── Inline spinner ──────────────────────────────────────────────────────── */
export function Spinner({ size = 20, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-primary-500 ${className}`}
    />
  )
}

/* ── Full-page overlay spinner ───────────────────────────────────────────── */
export function PageSpinner({ label = 'Processing…' }) {
  return (
    <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-50
                    flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary-100 border-t-primary-500 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-600 animate-pulse">{label}</p>
    </div>
  )
}

/* ── Card skeleton ───────────────────────────────────────────────────────── */
export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded" />
        <div className="h-3 bg-slate-200 rounded w-5/6" />
      </div>
    </div>
  )
}

/* ── Table row skeleton ───────────────────────────────────────────────────── */
export function RowSkeleton({ cols = 4 }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-slate-200 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}
