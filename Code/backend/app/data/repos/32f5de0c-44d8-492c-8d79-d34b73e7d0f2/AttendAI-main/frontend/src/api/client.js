/**
 * api/client.js — Axios instance + typed helpers for all API calls.
 * Base URL /api is proxied by Vite dev server to http://localhost:8000
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120_000,   // 2 min — InsightFace can be slow on first run
})

// Request interceptor — attach JWT Authorization token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('attendai_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — unwrap data or re-throw clean error, handling 401 unauth
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Don't auto-redirect on login attempt failure
      if (!err.config?.url?.includes('/auth/login') && !err.config?.url?.includes('/auth/register')) {
        localStorage.removeItem('attendai_token')
        localStorage.removeItem('attendai_classroom')
        window.dispatchEvent(new Event('attendai:unauthorized'))
      }
    }
    const detail =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      'An unexpected error occurred.'
    return Promise.reject(new Error(Array.isArray(detail) ? detail[0]?.msg : detail))
  },
)

// ─── Authentication ──────────────────────────────────────────────────────────

export const loginClassroom = (name, password) =>
  api.post('/auth/login', { name, password }).then((r) => r.data)

export const registerClassroom = (name, password) =>
  api.post('/auth/register', { name, password }).then((r) => r.data)

export const getMe = () =>
  api.get('/auth/me').then((r) => r.data)

export const loginAdmin = (username, password) =>
  api.post('/auth/admin/login', { username, password }).then((r) => r.data)

export const getAdminMe = () =>
  api.get('/auth/admin/me').then((r) => r.data)

// ─── Students ─────────────────────────────────────────────────────────────────

export const getStudents = () =>
  api.get('/students').then((r) => r.data)

export const getAvailableStudents = () =>
  api.get('/students/available').then((r) => r.data)

export const enrollExistingStudent = (id) =>
  api.post(`/students/${id}/enroll`).then((r) => r.data)

export const createStudent = (formData) =>
  api.post('/students', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const deleteStudent = (id) =>
  api.delete(`/students/${id}`).then((r) => r.data)

export const getStudentPhotoUrl = (id) => {
  const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  return `${cleanBase}/students/${id}/photo`
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export const captureAttendance = (formData, threshold) => {
  const url = threshold != null ? `/attendance/capture?threshold=${threshold}` : '/attendance/capture'
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const confirmAttendance = (payload) =>
  api.post('/attendance/confirm', payload).then((r) => r.data)

export const getSessions = () =>
  api.get('/attendance/sessions').then((r) => r.data)

export const getSession = (id) =>
  api.get(`/attendance/${id}`).then((r) => r.data)

export const deleteSession = (id) =>
  api.delete(`/attendance/${id}`).then((r) => r.data)

export const getStats = () =>
  api.get('/attendance/stats').then((r) => r.data)

// ─── Admin Portal ─────────────────────────────────────────────────────────────

export const getAdminStats = () =>
  api.get('/admin/stats').then((r) => r.data)

export const getAdminHistory = (params = {}) => {
  const query = new URLSearchParams()
  if (params.classroom_id) query.append('classroom_id', params.classroom_id)
  if (params.date_from) query.append('date_from', params.date_from)
  if (params.date_to) query.append('date_to', params.date_to)
  const qs = query.toString()
  return api.get(qs ? `/admin/history?${qs}` : '/admin/history').then((r) => r.data)
}

export const getAdminClassrooms = () =>
  api.get('/admin/classrooms').then((r) => r.data)

export const getAdminStudents = () =>
  api.get('/admin/students').then((r) => r.data)

export const getAdminSession = (id) =>
  api.get(`/admin/sessions/${id}`).then((r) => r.data)

export default api


