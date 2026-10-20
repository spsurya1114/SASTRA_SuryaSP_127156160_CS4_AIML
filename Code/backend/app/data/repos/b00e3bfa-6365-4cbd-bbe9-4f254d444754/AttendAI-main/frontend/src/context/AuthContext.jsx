/**
 * context/AuthContext.jsx — Classroom & Admin Authentication Context
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { getMe, getAdminMe, loginClassroom, loginAdmin, registerClassroom } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('attendai_token'))
  const [userRole, setUserRole] = useState(() => localStorage.getItem('attendai_role') || 'classroom')
  const [classroom, setClassroom] = useState(() => {
    const saved = localStorage.getItem('attendai_classroom')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('attendai_admin')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Verify stored token on initial load
  useEffect(() => {
    if (token) {
      if (userRole === 'admin') {
        getAdminMe()
          .then((data) => {
            setAdmin(data)
            localStorage.setItem('attendai_admin', JSON.stringify(data))
          })
          .catch(() => handleLogout())
          .finally(() => setLoading(false))
      } else {
        getMe()
          .then((data) => {
            setClassroom(data)
            localStorage.setItem('attendai_classroom', JSON.stringify(data))
          })
          .catch(() => handleLogout())
          .finally(() => setLoading(false))
      }
    } else {
      setLoading(false)
    }
  }, [])

  // Global unauthorized listener
  useEffect(() => {
    const handleUnauth = () => handleLogout()
    window.addEventListener('attendai:unauthorized', handleUnauth)
    return () => window.removeEventListener('attendai:unauthorized', handleUnauth)
  }, [])

  const handleLogin = async (name, password) => {
    const res = await loginClassroom(name, password)
    const { access_token, classroom: clsData } = res
    localStorage.setItem('attendai_token', access_token)
    localStorage.setItem('attendai_role', 'classroom')
    localStorage.setItem('attendai_classroom', JSON.stringify(clsData))
    localStorage.removeItem('attendai_admin')
    setToken(access_token)
    setUserRole('classroom')
    setClassroom(clsData)
    setAdmin(null)
    return clsData
  }

  const handleAdminLogin = async (username, password) => {
    const res = await loginAdmin(username, password)
    const { access_token, admin: adminData } = res
    localStorage.setItem('attendai_token', access_token)
    localStorage.setItem('attendai_role', 'admin')
    localStorage.setItem('attendai_admin', JSON.stringify(adminData))
    localStorage.removeItem('attendai_classroom')
    setToken(access_token)
    setUserRole('admin')
    setAdmin(adminData)
    setClassroom(null)
    return adminData
  }

  const handleRegister = async (name, password) => {
    const res = await registerClassroom(name, password)
    const { access_token, classroom: clsData } = res
    localStorage.setItem('attendai_token', access_token)
    localStorage.setItem('attendai_role', 'classroom')
    localStorage.setItem('attendai_classroom', JSON.stringify(clsData))
    localStorage.removeItem('attendai_admin')
    setToken(access_token)
    setUserRole('classroom')
    setClassroom(clsData)
    setAdmin(null)
    return clsData
  }

  const handleLogout = () => {
    localStorage.removeItem('attendai_token')
    localStorage.removeItem('attendai_role')
    localStorage.removeItem('attendai_classroom')
    localStorage.removeItem('attendai_admin')
    setToken(null)
    setUserRole('classroom')
    setClassroom(null)
    setAdmin(null)
  }

  const isAdmin = userRole === 'admin' && !!admin

  return (
    <AuthContext.Provider
      value={{
        token,
        classroom,
        admin,
        userRole,
        isAdmin,
        loading,
        isAuthenticated: !!token && (isAdmin || !!classroom),
        login: handleLogin,
        loginAdmin: handleAdminLogin,
        register: handleRegister,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

