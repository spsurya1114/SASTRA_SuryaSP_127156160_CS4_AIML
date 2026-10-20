import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Lock, User, PlusCircle, LogIn, Sparkles, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Spinner } from '../components/Spinner.jsx'

export default function Login() {
  const { login, loginAdmin, register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register' | 'admin'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!username.trim()) {
      setErrorMsg(mode === 'admin' ? 'Admin username is required.' : 'Classroom name is required.')
      return
    }
    if (!password) {
      setErrorMsg('Password is required.')
      return
    }
    if (mode === 'register' && password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'admin') {
        const adm = await loginAdmin(username.trim(), password)
        toast.success(`Logged in as Admin (${adm.username})`)
        navigate('/admin')
      } else if (mode === 'login') {
        const cls = await login(username.trim(), password)
        toast.success(`Welcome back, ${cls.name}!`)
        navigate('/')
      } else {
        const cls = await register(username.trim(), password)
        toast.success(`Classroom '${cls.name}' created successfully!`)
        navigate('/')
      }
    } catch (err) {
      setErrorMsg(err.message)
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-primary-500/25 mb-3">
            <Brain size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            AttendAI
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
            Classroom Photo Attendance Management
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg('') }}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={13} /> Classroom Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg('') }}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle size={13} /> New Classroom
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin'); setErrorMsg('') }}
              className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'admin'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={13} /> Admin Portal
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2 animate-fade-in">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                {mode === 'admin' ? 'Admin Username' : 'Classroom Name / Username'} <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={mode === 'admin' ? 'e.g. admin' : 'e.g. CS-A'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-50 ${
                mode === 'admin'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                  : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 shadow-primary-600/30'
              }`}
            >
              {submitting ? (
                <><Spinner size={18} /> Processing…</>
              ) : mode === 'admin' ? (
                <><ShieldAlert size={18} /> Enter Admin Portal</>
              ) : mode === 'login' ? (
                <><LogIn size={18} /> Enter Classroom Dashboard</>
              ) : (
                <><Sparkles size={18} /> Create Classroom & Login</>
              )}
            </button>
          </form>

          {/* Footer isolation badge */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-green-400" />
            <span>{mode === 'admin' ? 'Global System Admin Access' : 'Isolated Classroom Data Security'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

