/**
 * pages/Dashboard.jsx — Classroom Dashboard with stats & recent sessions.
 */
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Brain, CalendarCheck, TrendingUp,
  ArrowRight, Clock, CheckCircle2, XCircle, Camera, School,
} from 'lucide-react'
import { getStats, getSessions, getStudents } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { CardSkeleton } from '../components/Spinner.jsx'
import { StudentAvatar } from '../components/StudentAvatar.jsx'
import { StudentPhotoModal } from '../components/StudentPhotoModal.jsx'

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
  return (
    <div className="stat-card group hover:shadow-card-hover transition-shadow duration-200">
      <div className={`stat-icon-wrap ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label uppercase tracking-wide">{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

/* ── Session row ──────────────────────────────────────────────────────────── */
function SessionRow({ session }) {
  const pct = session.attendance_percentage ?? 0
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 group">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
        <CalendarCheck size={18} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 truncate">
          Attendance Session
        </div>
        <div className="text-xs text-slate-400">
          {new Date(session.date).toLocaleDateString('en-IN', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          })}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-slate-800">
          {session.total_present}/{session.total_students}
        </div>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${color}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-500">{pct}%</span>
        </div>
      </div>
    </div>
  )
}

/* ── Quick action card ────────────────────────────────────────────────────── */
function QuickAction({ to, icon: Icon, label, desc, color }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                  hover:shadow-card-hover hover:-translate-y-0.5 ${color}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs opacity-70 truncate">{desc}</div>
      </div>
      <ArrowRight size={16} className="ml-auto flex-shrink-0 opacity-50" />
    </Link>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { classroom } = useAuth()
  const [stats, setStats]       = useState(null)
  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null)

  useEffect(() => {
    Promise.all([getStats(), getSessions(), getStudents()])
      .then(([s, sess, st]) => {
        setStats(s)
        setSessions(sess.slice(0, 5))
        setStudents(st.slice(0, 8))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const greeting =
    now.getHours() < 12 ? 'Good morning' :
    now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="page-title flex items-center gap-2">
            {greeting} 👋
          </h1>
          <p className="page-subtitle">
            Overview for Classroom <strong className="text-indigo-600">{classroom?.name}</strong> · {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <Link to="/attendance" className="btn-primary text-xs px-4 py-2 flex items-center gap-2">
            <Camera size={15} /> Take Attendance
          </Link>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Enrolled Students"
            value={stats?.total_students ?? 0}
            sub={`${stats?.total_embeddings ?? 0} face vectors stored`}
            iconBg="bg-primary-100"
            iconColor="text-primary-600"
          />
          <StatCard
            icon={CalendarCheck}
            label="Total Sessions"
            value={stats?.total_sessions ?? 0}
            sub={stats?.last_session_date
              ? `Last: ${new Date(stats.last_session_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}`
              : 'No sessions yet'}
            iconBg="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Last Session Rate"
            value={stats?.last_session_rate != null
              ? `${stats.last_session_rate}%`
              : '—'}
            sub={stats?.last_session_present != null
              ? `${stats.last_session_present} Present, ${stats.last_session_absent} Absent`
              : 'Attendance percentage'}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
          <StatCard
            icon={School}
            label="Classroom Account"
            value={classroom?.name || '—'}
            sub="Isolated Classroom Data"
            iconBg="bg-indigo-100"
            iconColor="text-indigo-600"
          />
        </div>
      )}

      {/* Enrolled Students Roster Showcase */}
      {!loading && students.length > 0 && (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Users size={16} className="text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Classroom Roster</h2>
            </div>
            <Link to="/enrollment" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all ({stats?.total_students ?? students.length}) <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {students.map(s => (
              <div
                key={s.id}
                onClick={() => setSelectedStudentForModal(s)}
                className="flex flex-col items-center p-2.5 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:shadow-card-hover transition-all duration-200 cursor-pointer group text-center"
              >
                <StudentAvatar
                  student={s}
                  size="lg"
                  showZoomBadge
                  className="mb-2 ring-2 ring-white shadow-sm"
                />
                <div className="text-xs font-bold text-slate-800 truncate w-full capitalize group-hover:text-primary-600 transition-colors">
                  {s.name}
                </div>
                <div className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                  {s.roll_number ? `#${s.roll_number}` : 'Enrolled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sessions */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Recent Attendance Sessions</h2>
            <Link to="/history" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0,1,2].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Clock size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No sessions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">Take photo attendance for your classroom</p>
              <Link to="/attendance" className="btn-primary mt-4 text-xs px-4 py-2">
                <Camera size={14} /> Take Attendance
              </Link>
            </div>
          ) : (
            sessions.map(s => <SessionRow key={s.id} session={s} />)
          )}
        </div>

        {/* Quick actions */}
        <div className="card">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              to="/attendance"
              icon={Camera}
              label="Take Attendance"
              desc="Upload group photo"
              color="border-primary-200 bg-primary-50 text-primary-700"
            />
            <QuickAction
              to="/enrollment"
              icon={Users}
              label="Enroll Student"
              desc="Add new student + face photo"
              color="border-green-200 bg-green-50 text-green-700"
            />
            <QuickAction
              to="/history"
              icon={CalendarCheck}
              label="View History"
              desc="Browse past sessions & details"
              color="border-amber-200 bg-amber-50 text-amber-700"
            />
          </div>

          {!loading && stats && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={13} className="text-green-500" />
                {stats.total_students} student{stats.total_students !== 1 ? 's' : ''} in {classroom?.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Brain size={13} className="text-primary-500" />
                {stats.total_embeddings} face embedding{stats.total_embeddings !== 1 ? 's' : ''} stored
              </div>
              {stats.last_session_rate != null && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <TrendingUp size={13} className="text-amber-500" />
                  {stats.last_session_rate}% rate in last session
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Student Photo Lightbox Modal ─────────────────────────────────── */}
      {selectedStudentForModal && (
        <StudentPhotoModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}
    </div>
  )
}
