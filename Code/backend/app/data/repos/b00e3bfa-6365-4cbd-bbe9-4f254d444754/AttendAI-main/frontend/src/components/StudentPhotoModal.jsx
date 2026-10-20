import React, { useEffect, useState } from 'react'
import { X, Hash, BookOpen, Image as ImageIcon, Calendar, User, CheckCircle2 } from 'lucide-react'
import { getStudentPhotoUrl } from '../api/client.js'

export function StudentPhotoModal({ student, onClose }) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!student) return null

  const photoUrl = student.photo_url || (student.id ? getStudentPhotoUrl(student.id) : null)
  const dateStr = student.created_at
    ? new Date(student.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const initials = student.name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
              <User size={15} className="text-primary-600" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Student Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Photo Container */}
        <div className="relative w-full h-72 bg-slate-950 flex items-center justify-center overflow-hidden">
          {!imgError ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center text-slate-500 text-sm">
                  Loading photo...
                </div>
              )}
              <img
                src={photoUrl}
                alt={student.name}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-white">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center font-bold text-3xl mb-3 shadow-lg">
                {initials}
              </div>
              <p className="text-xs text-slate-400">Reference Photo Unavailable</p>
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 capitalize tracking-tight">
                {student.name}
              </h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {student.class_section && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
                    <BookOpen size={11} /> {student.class_section}
                  </span>
                )}
                {student.roll_number && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    <Hash size={11} /> Roll: {student.roll_number}
                  </span>
                )}
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 size={13} /> Enrolled
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <ImageIcon size={13} className="text-primary-500" /> Reference Vectors
              </div>
              <div className="text-base font-bold text-slate-800">
                {student.embedding_count ?? 1} embedding{(student.embedding_count ?? 1) !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                <Calendar size={13} className="text-amber-500" /> Enrolled On
              </div>
              <div className="text-base font-bold text-slate-800">
                {dateStr || 'Recent'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default StudentPhotoModal
