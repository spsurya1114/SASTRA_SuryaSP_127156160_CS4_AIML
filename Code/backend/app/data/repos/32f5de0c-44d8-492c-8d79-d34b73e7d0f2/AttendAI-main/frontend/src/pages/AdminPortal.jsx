/**
 * pages/AdminPortal.jsx — Dedicated Admin Portal for Attendance History & Management
 */
import React, { useEffect, useState } from 'react'
import {
  ShieldCheck, School, Users, CalendarDays, Filter,
  Search, BarChart2, CheckCircle2, UserX,
  ChevronDown, ChevronUp, Clock, RotateCcw,
} from 'lucide-react'
import {
  getAdminStats,
  getAdminHistory,
  getAdminClassrooms,
  getAdminStudents,
  getAdminSession,
} from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Spinner, RowSkeleton } from '../components/Spinner.jsx'
import { StudentAvatar } from '../components/StudentAvatar.jsx'
import { StudentPhotoModal } from '../components/StudentPhotoModal.jsx'

/* ── Rate Bar ───────────────────────────────────────────────────────────── */
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

/* ── Session Detail for Admin (uses admin endpoint, no 401 unauth redirect) ── */
function AdminSessionDetail({ sessionId, onViewPhoto }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAdminSession(sessionId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="overflow-x-auto p-4">
        <table className="w-full text-sm">
          <tbody>
            {[0, 1, 2].map(i => <RowSkeleton key={i} cols={4} />)}
          </tbody>
        </table>
      </div>
    )
  }
  if (error || !data) {
    return <p className="text-xs text-red-500 p-4">Failed to load session details: {error}</p>
  }

  return (
    <div className="p-4 space-y-4">
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

      <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
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
                    <span className="badge-absent"><UserX size={10} /> Absent</span>
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

/* ── Admin Session Card ─────────────────────────────────────────────────── */
function AdminSessionCard({ session, onViewPhoto }) {
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
    <div className="card overflow-hidden p-0 hover:shadow-card-hover transition-all border border-slate-200/80">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        {/* Date & Classroom */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen(p => !p)}
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 border border-amber-100">
            <CalendarDays size={18} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">{dateStr}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                <School size={11} /> {session.classroom_name}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Clock size={11} /> Recorded at {createdTimeStr || 'Session'}
            </div>
          </div>
        </div>

        {/* Stats */}
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
            type="button"
            onClick={() => setOpen(p => !p)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={open ? "Collapse details" : "Expand session details"}
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 animate-fade-in bg-slate-50/50">
          <AdminSessionDetail sessionId={session.id} onViewPhoto={onViewPhoto} />
        </div>
      )}
    </div>
  )
}

/* ── Main Admin Component ─────────────────────────────────────────────────── */
export default function AdminPortal() {
  const { admin } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab]   = useState('history') // 'history' | 'classrooms' | 'students'
  const [stats, setStats]           = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // History Tab state
  const [history, setHistory]       = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [classroomsList, setClassroomsList] = useState([])

  // History Filters
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [filterDateFrom, setFilterDateFrom]           = useState('')
  const [filterDateTo, setFilterDateTo]               = useState('')
  const [searchQuery, setSearchQuery]                 = useState('')

  // Classrooms Tab state
  const [classroomsData, setClassroomsData]   = useState([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)

  // Students Tab state
  const [studentsData, setStudentsData]       = useState([])
  const [loadingStudents, setLoadingStudents]   = useState(false)

  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null)

  const fetchStats = () => {
    setLoadingStats(true)
    getAdminStats()
      .then(setStats)
      .catch(() => toast.error('Failed to load admin stats.'))
      .finally(() => setLoadingStats(false))
  }

  const fetchHistory = () => {
    setLoadingHistory(true)
    const params = {}
    if (selectedClassroomId) params.classroom_id = selectedClassroomId
    if (filterDateFrom) params.date_from = filterDateFrom
    if (filterDateTo) params.date_to = filterDateTo

    getAdminHistory(params)
      .then(setHistory)
      .catch(() => toast.error('Failed to load attendance history.'))
      .finally(() => setLoadingHistory(false))
  }

  const fetchClassrooms = () => {
    setLoadingClassrooms(true)
    getAdminClassrooms()
      .then(data => { setClassroomsData(data); setClassroomsList(data) })
      .catch(() => toast.error('Failed to load classrooms.'))
      .finally(() => setLoadingClassrooms(false))
  }

  const fetchStudents = () => {
    setLoadingStudents(true)
    getAdminStudents()
      .then(setStudentsData)
      .catch(() => toast.error('Failed to load global students.'))
      .finally(() => setLoadingStudents(false))
  }

  useEffect(() => {
    fetchStats()
    fetchClassrooms()
    fetchHistory()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
    if (activeTab === 'classrooms') fetchClassrooms()
    if (activeTab === 'students') fetchStudents()
  }, [activeTab, selectedClassroomId, filterDateFrom, filterDateTo])

  // Filter history by search text
  const filteredHistory = history.filter(s => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.classroom_name.toLowerCase().includes(q) ||
      s.date.includes(q) ||
      (s.absent_students || []).some(st =>
        st.name.toLowerCase().includes(q) ||
        (st.roll_number || '').toLowerCase().includes(q)
      )
    )
  })

  // Group sessions BY CLASSROOM for clean separation
  const historyByClassroom = filteredHistory.reduce((acc, sess) => {
    const key = sess.classroom_name || 'Unassigned'
    if (!acc[key]) acc[key] = []
    acc[key].push(sess)
    return acc
  }, {})

  const resetHistoryFilters = () => {
    setSelectedClassroomId('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearchQuery('')
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Admin Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
              <ShieldCheck size={14} className="text-amber-600" /> Admin Portal
            </span>
          </div>
          <h1 className="page-title mt-1">System Attendance History & Analytics</h1>
          <p className="page-subtitle">
            Authenticated as administrator <strong className="text-amber-700">{admin?.username}</strong>.
          </p>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <School size={20} />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-800">{stats?.total_classrooms ?? '—'}</div>
            <div className="text-xs font-medium text-slate-400">Total Classrooms</div>
          </div>
        </div>

        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-800">{stats?.total_students ?? '—'}</div>
            <div className="text-xs font-medium text-slate-400">Global Students</div>
          </div>
        </div>

        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-800">{stats?.total_sessions ?? '—'}</div>
            <div className="text-xs font-medium text-slate-400">Recorded Sessions</div>
          </div>
        </div>

        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={20} />
          </div>
          <div>
            <div className="text-xl font-extrabold text-primary-600">
              {stats?.overall_rate != null ? `${stats.overall_rate}%` : '—'}
            </div>
            <div className="text-xs font-medium text-slate-400">System Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex bg-slate-200/70 p-1 rounded-2xl border border-slate-200 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarDays size={14} /> Attendance History
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('classrooms')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'classrooms'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <School size={14} /> Classrooms Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'students'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={14} /> All Students
        </button>
      </div>

      {/* ── TAB 1: Attendance History Separated by Classes ───────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Classroom Quick Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
              <School size={13} /> Classrooms:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClassroomId('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                selectedClassroomId === ''
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Classrooms ({stats?.total_classrooms || 0})
            </button>
            {classroomsList.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassroomId(String(c.id))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                  selectedClassroomId === String(c.id)
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {c.name} ({c.session_count} sessions)
              </button>
            ))}
          </div>

          {/* Filters Control Bar */}
          <div className="card">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Filter History Records</span>
              </div>
              {(selectedClassroomId || filterDateFrom || filterDateTo || searchQuery) && (
                <button
                  type="button"
                  onClick={resetHistoryFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search classroom, student or roll..."
                  className="input pl-9 py-2 text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Classroom Dropdown */}
              <div>
                <select
                  className="input py-2 text-xs"
                  value={selectedClassroomId}
                  onChange={e => setSelectedClassroomId(e.target.value)}
                >
                  <option value="">Filter by Classroom (All)</option>
                  {classroomsList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <input
                  type="date"
                  title="From Date"
                  className="input py-2 text-xs"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <input
                  type="date"
                  title="To Date"
                  className="input py-2 text-xs"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Session List Grouped / Separated by Classrooms */}
          {loadingHistory ? (
            <div className="space-y-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white rounded-2xl shadow-card animate-pulse" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="card flex flex-col items-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Clock size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No attendance sessions found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting your filters above.</p>
              <button
                type="button"
                onClick={resetHistoryFilters}
                className="btn-secondary mt-3 text-xs px-3 py-1.5"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(historyByClassroom).map(([clsName, sessions]) => (
                <div key={clsName} className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <School size={14} />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Classroom: {clsName}</h3>
                    <span className="badge-primary text-xs ml-auto">{sessions.length} Sessions</span>
                  </div>

                  <div className="space-y-3">
                    {sessions.map(s => (
                      <AdminSessionCard
                        key={s.id}
                        session={s}
                        onViewPhoto={setSelectedStudentForModal}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Classrooms Overview ──────────────────────────────────── */}
      {activeTab === 'classrooms' && (
        <div className="card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Classrooms Roster & Metrics</h2>
          {loadingClassrooms ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <RowSkeleton key={i} cols={4} />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classroom Name</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrolled Students</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sessions</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {classroomsData.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                        <School size={16} className="text-indigo-600" />
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="badge-primary">{c.student_count} Students</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 font-semibold">
                        {c.session_count}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">
                        {c.attendance_rate != null ? `${c.attendance_rate}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Global Students Directory ────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">All Institution Students</h2>
          {loadingStudents ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <RowSkeleton key={i} cols={4} />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roll Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Enrolled Classrooms</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Embeddings</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsData.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                        <div className="flex items-center gap-3">
                          <StudentAvatar
                            student={s}
                            size="sm"
                            onClick={() => setSelectedStudentForModal(s)}
                            showZoomBadge
                          />
                          <span
                            className="cursor-pointer hover:text-primary-600 transition-colors font-semibold"
                            onClick={() => setSelectedStudentForModal(s)}
                          >
                            {s.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{s.roll_number ? `#${s.roll_number}` : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {s.enrolled_classrooms.map((cName, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
                              {cName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="badge-primary">{s.embedding_count} vectors</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Photo Lightbox Modal ────────────────────────────────────────── */}
      {selectedStudentForModal && (
        <StudentPhotoModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}
    </div>
  )
}
