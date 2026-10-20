/**
 * pages/History.jsx — Attendance session history with expandable detail & deletion.
 */
import React, { useEffect, useState } from 'react'
import {
  CalendarDays, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Filter,
  Trash2, Search, School, UserX,
} from 'lucide-react'
import { getSessions, getSession, deleteSession } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { RowSkeleton } from '../components/Spinner.jsx'
import { StudentAvatar } from '../components/StudentAvatar.jsx'
import { StudentPhotoModal } from '../components/StudentPhotoModal.jsx'
import { ConfirmModal } from '../components/ConfirmModal.jsx'

/* ── Attendance rate bar ──────────────────────────────────────────────────── */
function RateBar({ pct }) {
  const color =
    pct >= 80 ? 'bg-green-500' :
    pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden min-w-[48px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-9 text-right">{pct}%</span>
    </div>
  )
}

/* ── Expanded session detail ──────────────────────────────────────────────── */
function SessionDetail({ sessionId, onViewPhoto }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession(sessionId)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="overflow-x-auto p-4">
        <table className="w-full text-sm">
          <tbody>
            {[0,1,2,3].map(i => <RowSkeleton key={i} cols={4} />)}
          </tbody>
        </table>
      </div>
    )
  }
  if (!data) return <p className="text-xs text-red-500 p-4">Failed to load session details.</p>

  return (
    <div className="p-4 space-y-4">
      {/* Absent students list highlight */}
      {data.absent_students.length > 0 && (
        <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl">
          <div className="text-xs font-bold text-red-800 flex items-center gap-1.5 mb-1">
            <UserX size={14} className="text-red-500" /> Absent Students ({data.absent_students.length}):
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {data.absent_students.map(st => (
              <span key={st.student_id} className="text-xs font-medium text-red-700 bg-white px-2 py-0.5 rounded-md border border-red-200 shadow-2xs">
                {st.name} {st.roll_number ? `(#${st.roll_number})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full records table */}
      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roll No</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Match Confidence</th>
            </tr>
          </thead>
          <tbody>
            {data.records.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 font-medium text-slate-800 capitalize">
                  <div className="flex items-center gap-3">
                    <StudentAvatar
                      studentId={r.student_id}
                      name={r.student_name}
                      size="sm"
                      onClick={() => onViewPhoto?.({ id: r.student_id, name: r.student_name, roll_number: r.roll_number })}
                      showZoomBadge
                    />
                    <span
                      className="cursor-pointer hover:text-primary-600 transition-colors"
                      onClick={() => onViewPhoto?.({ id: r.student_id, name: r.student_name, roll_number: r.roll_number })}
                    >
                      {r.student_name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-500">{r.roll_number ? `#${r.roll_number}` : '—'}</td>
                <td className="px-4 py-2.5">
                  {r.status === 'present' ? (
                    <span className="badge-present"><CheckCircle2 size={10} /> Present</span>
                  ) : (
                    <span className="badge-absent"><XCircle size={10} /> Absent</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.confidence_score != null ? (
                    <span className="text-xs font-semibold text-slate-600">
                      {(r.confidence_score * 100).toFixed(1)}%
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Session card ─────────────────────────────────────────────────────────── */
function SessionCard({ session, onDelete, onViewPhoto }) {
  const [open, setOpen] = useState(false)

  const d = new Date(session.date)
  const dateStr = d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  const createdTimeStr = session.created_at
    ? new Date(session.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : ''

  const pct = session.attendance_percentage ?? 0
  const pctColor =
    pct >= 80 ? 'text-green-600' :
    pct >= 50 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="card overflow-hidden p-0 hover:shadow-card-hover transition-shadow">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        {/* Date & Time */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen(p => !p)}
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={18} className="text-primary-600" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800">{dateStr}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} /> {createdTimeStr || 'Session'}
            </div>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <div className="text-center cursor-pointer" onClick={() => setOpen(p => !p)}>
            <div className="text-base font-bold text-green-600 leading-none">{session.total_present}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Present</div>
          </div>
          <div className="text-center cursor-pointer" onClick={() => setOpen(p => !p)}>
            <div className="text-base font-bold text-red-500 leading-none">{session.total_absent}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Absent</div>
          </div>
          <div className="w-20 hidden sm:block cursor-pointer" onClick={() => setOpen(p => !p)}>
            <RateBar pct={pct} />
          </div>
          <div className={`text-lg font-bold ${pctColor} w-12 text-right cursor-pointer`} onClick={() => setOpen(p => !p)}>
            {pct}%
          </div>
          
          <button
            onClick={() => setOpen(p => !p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            title="Expand session details"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          <button
            onClick={() => onDelete(session)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete session"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 animate-fade-in bg-slate-50/30">
          <SessionDetail sessionId={session.id} onViewPhoto={onViewPhoto} />
        </div>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function History() {
  const { classroom } = useAuth()
  const { toast } = useToast()

  const [sessions, setSessions] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null)

  // Deletion modal
  const [sessionToDelete, setSessionToDelete] = useState(null)
  const [deleting, setDeleting]               = useState(false)

  // Filters
  const [search,         setSearch]         = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  const fetchSessions = () => {
    setLoading(true)
    getSessions()
      .then(data => { setSessions(data); setFiltered(data) })
      .catch(() => toast.error('Failed to load attendance history.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSessions() }, [])

  // Apply filters
  useEffect(() => {
    let out = sessions
    if (filterDateFrom) {
      out = out.filter(s => s.date >= filterDateFrom)
    }
    if (filterDateTo) {
      out = out.filter(s => s.date <= filterDateTo)
    }
    if (search.trim()) {
      out = out.filter(s =>
        s.date.includes(search) ||
        (s.absent_students || []).some(st =>
          st.name.toLowerCase().includes(search.toLowerCase()) ||
          (st.roll_number || '').toLowerCase().includes(search.toLowerCase())
        )
      )
    }
    setFiltered(out)
  }, [sessions, filterDateFrom, filterDateTo, search])

  /* ── Confirm Delete ────────────────────────────────────────────────────── */
  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return
    setDeleting(true)
    try {
      await deleteSession(sessionToDelete.id)
      toast.success('Attendance session deleted.')
      setSessionToDelete(null)
      fetchSessions()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  // Aggregate stats
  const totalPresent = sessions.reduce((a, s) => a + s.total_present, 0)
  const totalRecords = sessions.reduce((a, s) => a + s.total_students, 0)
  const overallRate  = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : null

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Attendance History</h1>
        <p className="page-subtitle">
          Saved attendance sessions for classroom <strong className="text-indigo-600">{classroom?.name}</strong>.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card-sm text-center">
            <div className="text-xl font-bold text-slate-800">{sessions.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Sessions</div>
          </div>
          <div className="card-sm text-center">
            <div className="text-xl font-bold text-green-600">{totalPresent}</div>
            <div className="text-xs text-slate-500 font-medium">Present Records</div>
          </div>
          <div className="card-sm text-center">
            <div className="text-xl font-bold text-primary-600">
              {overallRate != null ? `${overallRate}%` : '—'}
            </div>
            <div className="text-xs text-slate-500 font-medium">Overall Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {sessions.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by date or absent student name..."
                className="input pl-8 py-2 text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div>
              <input
                type="date"
                className="input py-2 text-xs"
                placeholder="From Date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div>
              <input
                type="date"
                className="input py-2 text-xs"
                placeholder="To Date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
              />
            </div>
          </div>
          {filtered.length !== sessions.length && (
            <p className="mt-2 text-xs text-slate-400">
              Showing {filtered.length} of {sessions.length} sessions
            </p>
          )}
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="space-y-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl shadow-card animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Clock size={28} className="text-slate-300" />
          </div>
          {sessions.length === 0 ? (
            <>
              <p className="text-sm font-semibold text-slate-500">No attendance sessions saved yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Use <strong>Take Attendance</strong> to record your classroom's first session.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-500">No sessions match your filters</p>
              <button
                className="btn-secondary mt-4 text-xs"
                onClick={() => { setSearch(''); setFilterDateFrom(''); setFilterDateTo('') }}
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onDelete={setSessionToDelete}
              onViewPhoto={setSelectedStudentForModal}
            />
          ))}
        </div>
      )}

      {/* ── Student Photo Lightbox Modal ─────────────────────────────────── */}
      {selectedStudentForModal && (
        <StudentPhotoModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* ── Deletion Confirmation Modal ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!sessionToDelete}
        title="Delete Attendance Session"
        message={`Are you sure you want to delete the attendance record for ${sessionToDelete?.date}? All present/absent data for this session will be permanently removed.`}
        confirmText="Delete Record"
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
        loading={deleting}
      />
    </div>
  )
}
