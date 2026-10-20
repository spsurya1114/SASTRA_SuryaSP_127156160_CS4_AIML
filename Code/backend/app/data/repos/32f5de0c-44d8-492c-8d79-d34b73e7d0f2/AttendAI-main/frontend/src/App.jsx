import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Enrollment from './pages/Enrollment.jsx'
import Attendance from './pages/Attendance.jsx'
import History from './pages/History.jsx'
import AdminPortal from './pages/AdminPortal.jsx'
import { Spinner } from './components/Spinner.jsx'


function AppRoutes() {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner size={36} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*"     element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (isAdmin) {
    return (
      <Layout>
        <Routes>
          <Route path="/admin" element={<AdminPortal />} />
          <Route path="*"      element={<Navigate to="/admin" replace />} />
        </Routes>
      </Layout>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Dashboard />} />
        <Route path="/enrollment" element={<Enrollment />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/history"    element={<History />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
