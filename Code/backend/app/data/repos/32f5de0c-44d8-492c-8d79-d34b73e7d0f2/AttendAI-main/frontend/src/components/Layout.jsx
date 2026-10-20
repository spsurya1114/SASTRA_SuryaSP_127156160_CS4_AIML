import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Camera,
  ClipboardList,
  Menu,
  X,
  Brain,
  ChevronRight,
  LogOut,
  School,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const CLASSROOM_NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/enrollment', label: 'Enrolled Students', icon: UserPlus },
  { to: '/attendance', label: 'Take Attendance', icon: Camera },
  { to: '/history',    label: 'Attendance History', icon: ClipboardList },
]

const ADMIN_NAV_ITEMS = [
  { to: '/admin', label: 'Admin Portal', icon: BarChart3, end: true },
]

/* ── Sidebar nav link ─────────────────────────────────────────────────────── */
function SideNavLink({ item, onClick }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
         transition-all duration-150 group
         ${isActive
           ? 'bg-primary-600 text-white shadow-md shadow-primary-900/20'
           : 'text-slate-400 hover:text-white hover:bg-white/10'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="flex-shrink-0" />
          <span className="flex-1">{item.label}</span>
          {isActive && <ChevronRight size={14} className="opacity-60" />}
        </>
      )}
    </NavLink>
  )
}

/* ── Bottom nav link (mobile) ─────────────────────────────────────────────── */
function BottomNavLink({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-2 flex-1
         text-xs font-medium transition-colors duration-150
         ${isActive ? 'text-primary-600' : 'text-slate-400'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary-50' : ''}`}>
            <Icon size={20} />
          </span>
          <span className="text-[10px] font-semibold">{item.label.split(' ')[0]}</span>
        </>
      )}
    </NavLink>
  )
}

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
function Sidebar({ onClose, classroom, admin, isAdmin, logout }) {
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : CLASSROOM_NAV_ITEMS

  return (
    <aside className="flex flex-col h-full bg-slate-900 text-white select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-900/30">
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight">AttendAI</div>
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
            Photo Attendance
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Account Badge */}
      <div className="mx-4 my-4 p-3 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
        }`}>
          {isAdmin ? <ShieldCheck size={18} /> : <School size={18} />}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            {isAdmin ? 'System Role' : 'Classroom'}
          </div>
          <div className="text-sm font-bold text-white truncate">
            {isAdmin ? `Admin (${admin?.username})` : (classroom?.name || 'Classroom')}
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <SideNavLink key={item.to} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

/* ── Layout ───────────────────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const { classroom, admin, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : CLASSROOM_NAV_ITEMS

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-shrink-0 md:w-64 lg:w-72">
        <div className="w-full">
          <Sidebar classroom={classroom} admin={admin} isAdmin={isAdmin} logout={logout} />
        </div>
      </div>

      {/* ── Mobile overlay sidebar ──────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 animate-slide-up">
            <Sidebar onClose={() => setMobileOpen(false)} classroom={classroom} admin={admin} isAdmin={isAdmin} logout={logout} />
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
        {/* Top Header (Desktop & Mobile) */}
        <header className="flex items-center justify-between px-4 md:px-8 py-3.5 bg-white border-b border-slate-100 shadow-sm flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <Brain size={15} className="text-white" />
              </div>
              <span className="text-base font-bold text-slate-900 tracking-tight">AttendAI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Account Display */}
            {isAdmin ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                <ShieldCheck size={14} className="text-amber-600" />
                <span>Admin ({admin?.username})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-bold">
                <School size={14} className="text-indigo-600" />
                <span>{classroom?.name}</span>
              </div>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-24 md:pb-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100
                        flex items-stretch safe-area-inset-bottom z-40 shadow-[0_-1px_6px_rgb(0,0,0,0.06)]">
          {navItems.map((item) => (
            <BottomNavLink key={item.to} item={item} />
          ))}
        </nav>
      </div>
    </div>
  )
}

