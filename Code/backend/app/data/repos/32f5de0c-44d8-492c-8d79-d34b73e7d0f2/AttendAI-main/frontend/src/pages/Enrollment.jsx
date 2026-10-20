import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  UserPlus, Upload, X, Image, Trash2, User, Hash,
  CheckCircle2, AlertCircle, Users, Search,
  LayoutGrid, List, ZoomIn, Eye, School, Link2, UserCheck,
} from 'lucide-react'
import { createStudent, deleteStudent, getStudents, getAvailableStudents, enrollExistingStudent } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { Spinner } from '../components/Spinner.jsx'
import { StudentAvatar } from '../components/StudentAvatar.jsx'
import { StudentPhotoModal } from '../components/StudentPhotoModal.jsx'
import { ConfirmModal } from '../components/ConfirmModal.jsx'

/* ── Photo preview thumbnail ──────────────────────────────────────────────── */
function PhotoThumb({ file, onRemove }) {
  const url = URL.createObjectURL(file)
  return (
    <div className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 flex-shrink-0">
      <img src={url} alt={file.name} className="w-full h-full object-cover" onLoad={() => URL.revokeObjectURL(url)} />
      <button
        type="button"
        onClick={onRemove}
        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                   flex items-center justify-center transition-opacity"
        aria-label="Remove photo"
      >
        <X size={16} className="text-white" />
      </button>
    </div>
  )
}

/* ── Drop zone ────────────────────────────────────────────────────────────── */
function PhotoDropZone({ files, onAdd, onRemove }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    onAdd(dropped)
  }, [onAdd])

  const handleChange = (e) => onAdd(Array.from(e.target.files))

  return (
    <div>
      <div
        className={`drop-zone ${dragging ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
          <Upload size={22} className="text-primary-500" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Drop reference photos here or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">JPG, PNG — face photo for recognition</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <PhotoThumb key={i} file={f} onRemove={() => onRemove(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Student List Row ────────────────────────────────────────────────────────── */
function StudentRow({ student, onDelete, onViewPhoto }) {
  return (
    <div className="card-sm flex items-center gap-3 group hover:shadow-card-hover transition-all duration-200">
      <StudentAvatar
        student={student}
        size="md"
        onClick={() => onViewPhoto(student)}
        showZoomBadge
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold text-slate-800 capitalize cursor-pointer hover:text-primary-600 transition-colors truncate"
          onClick={() => onViewPhoto(student)}
        >
          {student.name}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {student.roll_number && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Hash size={10} className="text-slate-400" /> {student.roll_number}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onViewPhoto(student)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          title="View reference photo"
        >
          <Eye size={15} />
        </button>
        <span className="badge-primary" title={`${student.embedding_count} face embeddings`}>
          <Image size={10} /> {student.embedding_count}
        </span>
        <button
          onClick={() => onDelete(student)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-90 group-hover:opacity-100"
          aria-label="Delete student"
          title="Remove student from classroom"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/* ── Student Grid Card ───────────────────────────────────────────────────────── */
function StudentGridCard({ student, onDelete, onViewPhoto }) {
  return (
    <div className="card-sm flex flex-col items-center text-center p-4 group hover:shadow-card-hover transition-all duration-200 relative">
      <button
        onClick={() => onDelete(student)}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-90 group-hover:opacity-100"
        title="Remove student from classroom"
      >
        <Trash2 size={15} />
      </button>
      <div className="my-2">
        <StudentAvatar
          student={student}
          size="xl"
          onClick={() => onViewPhoto(student)}
          showZoomBadge
          className="shadow-sm border-2 border-white ring-2 ring-slate-100"
        />
      </div>
      <h3
        className="text-sm font-bold text-slate-800 capitalize truncate w-full cursor-pointer hover:text-primary-600 transition-colors mt-1"
        onClick={() => onViewPhoto(student)}
      >
        {student.name}
      </h3>
      {student.roll_number && (
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
          #{student.roll_number}
        </span>
      )}
      <button
        onClick={() => onViewPhoto(student)}
        className="mt-3 w-full py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-primary-50 text-slate-600 hover:text-primary-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-100"
      >
        <ZoomIn size={13} /> View Photo
      </button>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Enrollment() {
  const { classroom } = useAuth()
  const { toast } = useToast()

  // Form state
  const [name,       setName]       = useState('')
  const [rollNumber, setRollNumber] = useState('')
  const [photos,     setPhotos]     = useState([])
  const [errors,     setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Available existing students state
  const [availableStudents, setAvailableStudents] = useState([])
  const [loadingAvailable, setLoadingAvailable]   = useState(false)
  const [showExistingModal, setShowExistingModal] = useState(false)
  const [enrollingId, setEnrollingId]             = useState(null)

  // Students list state
  const [students, setStudents]       = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [viewMode, setViewMode]       = useState('grid') // 'grid' | 'list'
  const [search, setSearch]           = useState('')
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null)

  // Deletion confirmation modal state
  const [studentToDelete, setStudentToDelete] = useState(null)
  const [deleting, setDeleting]               = useState(false)

  const fetchStudents = () => {
    setLoadingList(true)
    getStudents()
      .then(setStudents)
      .catch(() => toast.error('Failed to load enrolled students.'))
      .finally(() => setLoadingList(false))
  }

  const fetchAvailable = () => {
    setLoadingAvailable(true)
    getAvailableStudents()
      .then(setAvailableStudents)
      .catch(() => toast.error('Failed to load available students.'))
      .finally(() => setLoadingAvailable(false))
  }

  useEffect(() => { fetchStudents() }, [])

  /* ── Submit standard form ───────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrors({ name: 'Student name is required.' })
      return
    }

    const fd = new FormData()
    fd.append('name', name.trim())
    if (rollNumber.trim()) fd.append('roll_number', rollNumber.trim())
    photos.forEach(p => fd.append('photos', p))

    setSubmitting(true)
    try {
      await createStudent(fd)
      toast.success(`${name.trim()} enrolled into ${classroom?.name} successfully!`)
      setName(''); setRollNumber(''); setPhotos([]); setErrors({})
      fetchStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Enroll Existing Student ────────────────────────────────────────────── */
  const handleEnrollExisting = async (st) => {
    setEnrollingId(st.id)
    try {
      await enrollExistingStudent(st.id)
      toast.success(`${st.name} enrolled into ${classroom?.name}!`)
      fetchStudents()
      fetchAvailable()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEnrollingId(null)
    }
  }

  /* ── Delete Confirmation ──────────────────────────────────────────────────── */
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return
    setDeleting(true)
    try {
      await deleteStudent(studentToDelete.id)
      toast.success(`${studentToDelete.name} removed from ${classroom?.name}.`)
      setStudentToDelete(null)
      fetchStudents()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const addPhotos = (newFiles) => setPhotos(prev => [...prev, ...newFiles])
  const removePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx))

  // Filtered students list
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Enrolled Students Roster</h1>
        <p className="page-subtitle">
          Manage enrolled students for classroom <strong className="text-indigo-600">{classroom?.name}</strong>.
        </p>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Enroll form ───────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                <UserPlus size={16} className="text-primary-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-800">Enroll Student</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Classroom Indicator */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2 text-xs font-semibold text-indigo-900">
                <School size={15} className="text-indigo-600" />
                <span>Enrolling into Classroom: <strong>{classroom?.name}</strong></span>
              </div>

              {/* Name */}
              <div>
                <label className="label" htmlFor="enroll-name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="enroll-name"
                    type="text"
                    className={`input pl-9 ${errors.name ? 'input-error' : ''}`}
                    placeholder="e.g. Alice Johnson"
                    value={name}
                    onChange={e => { setName(e.target.value); setErrors(p => ({...p, name: undefined})) }}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.name}
                  </p>
                )}
              </div>

              {/* Roll number */}
              <div>
                <label className="label" htmlFor="enroll-roll">Roll / Student ID</label>
                <div className="relative">
                  <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="enroll-roll"
                    type="text"
                    className={`input pl-9 ${errors.rollNumber ? 'input-error' : ''}`}
                    placeholder="e.g. 101"
                    value={rollNumber}
                    onChange={e => { setRollNumber(e.target.value); setErrors(p => ({...p, rollNumber: undefined})) }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students and roll numbers are strictly bound to a single classroom.
                </p>


              </div>

              {/* Photos */}
              <div>
                <label className="label">
                  Reference Photos
                </label>
                <PhotoDropZone files={photos} onAdd={addPhotos} onRemove={removePhoto} />
                {errors.photos && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.photos}
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="enroll-submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={submitting}
              >
                {submitting ? (
                  <><Spinner size={16} /> Enrolling…</>
                ) : (
                  <><CheckCircle2 size={16} /> Enroll Student</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Students list ─────────────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Header with controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users size={16} className="text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-slate-800">Enrolled Roster</h2>
                {students.length > 0 && (
                  <span className="badge-primary">{students.length} Total</span>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    viewMode === 'grid'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid size={15} /> Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="List view"
                >
                  <List size={15} /> List
                </button>
              </div>
            </div>

            {/* Search Bar */}
            {students.length > 0 && (
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search enrolled students by name or roll number..."
                  className="input pl-9 py-2 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}

            {/* Main Roster Body */}
            {loadingList ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Users size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">No students enrolled yet</p>
                <p className="text-xs text-slate-400 mt-1">Use the form on the left or enroll existing students to {classroom?.name}.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center bg-slate-50 rounded-2xl">
                <p className="text-sm font-medium text-slate-500">No matching students found</p>
                <button
                  onClick={() => setSearch('')}
                  className="btn-secondary mt-2 text-xs px-3 py-1.5"
                >
                  Clear Search
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredStudents.map(s => (
                  <StudentGridCard
                    key={s.id}
                    student={s}
                    onDelete={setStudentToDelete}
                    onViewPhoto={setSelectedStudentForModal}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredStudents.map(s => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    onDelete={setStudentToDelete}
                    onViewPhoto={setSelectedStudentForModal}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal for Enrolling Existing System Students ────────────────── */}
      {showExistingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-800">Enroll Existing Student</h3>
              </div>
              <button
                onClick={() => setShowExistingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Select any student already in the institution system to enroll them into <strong>{classroom?.name}</strong> without re-uploading photos.
            </p>

            <div className="flex-1 overflow-y-auto pr-1 my-2 space-y-2">
              {loadingAvailable ? (
                <div className="space-y-2 py-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : availableStudents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-400">
                  All system students are already enrolled in this classroom or no other students exist.
                </div>
              ) : (
                availableStudents.map(st => (
                  <div key={st.id} className="p-3 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <StudentAvatar student={st} size="md" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate capitalize">{st.name}</div>
                        {st.roll_number && (
                          <div className="text-[10px] text-slate-400">Roll #{st.roll_number}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnrollExisting(st)}
                      disabled={enrollingId === st.id}
                      className="btn-primary py-1.5 px-3 text-xs flex-shrink-0"
                    >
                      {enrollingId === st.id ? <Spinner size={13} /> : <UserPlus size={13} />} Enroll
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowExistingModal(false)}
                className="btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox Modal ────────────────────────────────────────── */}
      {selectedStudentForModal && (
        <StudentPhotoModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}

      {/* ── Confirmation Modal for Student Deletion ─────────────────────── */}
      <ConfirmModal
        isOpen={!!studentToDelete}
        title="Remove Enrolled Student"
        message={`Are you sure you want to remove '${studentToDelete?.name}' from ${classroom?.name}?`}
        confirmText="Remove Student"
        onConfirm={confirmDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
        loading={deleting}
      />
    </div>
  )
}

