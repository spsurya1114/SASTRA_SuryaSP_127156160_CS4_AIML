/**
 * pages/Attendance.jsx — AI Photo Attendance for current classroom
 */
import React, {
  useEffect, useRef, useState,
} from 'react'
import {
  Camera, RefreshCw, CheckCircle2, XCircle,
  Users, AlertTriangle, CalendarDays,
  ChevronDown, ChevronUp, Info, Loader2, School, Percent,
} from 'lucide-react'
import { captureAttendance, confirmAttendance, getStudents } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { StudentAvatar } from '../components/StudentAvatar.jsx'
import { StudentPhotoModal } from '../components/StudentPhotoModal.jsx'

/* ── Bounding box colors ─────────────────────────────────────────────────── */
const COLORS = {
  high:      '#22c55e',   // green-500
  low:       '#f59e0b',   // amber-500
  unmatched: '#ef4444',   // red-500
}

/* ── Canvas drawing helper ────────────────────────────────────────────────── */
function drawBoxes(canvas, img, recognized, unmatched) {
  if (!canvas) return
  canvas.width  = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const lw    = Math.max(2, Math.round(img.naturalWidth / 500))
  const fSize = Math.max(13, Math.round(img.naturalWidth / 80))
  ctx.font = `bold ${fSize}px Inter, sans-serif`

  const drawOne = (bbox, label, color, dashed = false) => {
    const [x1, y1, x2, y2] = bbox
    const bw = x2 - x1, bh = y2 - y1

    ctx.save()
    if (dashed) ctx.setLineDash([Math.max(6, lw * 3), Math.max(4, lw * 2)])
    ctx.strokeStyle = color
    ctx.lineWidth   = lw
    ctx.shadowColor = color
    ctx.shadowBlur  = 8
    ctx.strokeRect(x1, y1, bw, bh)
    ctx.restore()

    const pad    = { x: 8, y: 5 }
    const tw     = ctx.measureText(label).width
    const lbW    = tw + pad.x * 2
    const lbH    = fSize + pad.y * 2
    const lbY    = y1 - lbH - 2 >= 0 ? y1 - lbH - 2 : y2 + 2

    ctx.fillStyle   = color
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur  = 0

    const r = 6
    ctx.beginPath()
    ctx.moveTo(x1 + r, lbY)
    ctx.lineTo(x1 + lbW - r, lbY)
    ctx.quadraticCurveTo(x1 + lbW, lbY,          x1 + lbW, lbY + r)
    ctx.lineTo(x1 + lbW, lbY + lbH - r)
    ctx.quadraticCurveTo(x1 + lbW, lbY + lbH,    x1 + lbW - r, lbY + lbH)
    ctx.lineTo(x1 + r,   lbY + lbH)
    ctx.quadraticCurveTo(x1,       lbY + lbH,     x1, lbY + lbH - r)
    ctx.lineTo(x1,       lbY + r)
    ctx.quadraticCurveTo(x1,       lbY,            x1 + r, lbY)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x1 + pad.x, lbY + lbH - pad.y)
  }

  recognized.forEach(face => {
    const color = COLORS[face.confidence_level] || COLORS.low
    const pct   = (face.confidence * 100).toFixed(0)
    drawOne(face.bbox, `${face.name}  ${pct}%`, color)
  })

  unmatched.forEach(face => {
    drawOne(face.bbox, 'Unknown', COLORS.unmatched, true)
  })
}

/* ── Student toggle row ───────────────────────────────────────────────────── */
function StudentToggle({ studentId, name, rollNumber, confidence, confidenceLevel, status, onToggle, onViewPhoto }) {
  const isPresent = status === 'present'
  const pct = confidence ? (confidence * 100).toFixed(0) : null
  const levelColor =
    confidenceLevel === 'high'
      ? 'text-green-600 bg-green-50'
      : confidenceLevel === 'low'
      ? 'text-amber-600 bg-amber-50'
      : 'text-slate-500 bg-slate-100'

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150
                     ${isPresent ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/30'}`}>
      <StudentAvatar
        studentId={studentId}
        name={name}
        size="md"
        onClick={() => onViewPhoto?.({ id: studentId, name, roll_number: rollNumber })}
        showZoomBadge
      />

      <div className="flex-1 min-w-0">
        <div
          className="text-sm font-semibold text-slate-800 capitalize cursor-pointer hover:text-primary-600 transition-colors truncate"
          onClick={() => onViewPhoto?.({ id: studentId, name, roll_number: rollNumber })}
        >
          {name}
        </div>
        {rollNumber && (
          <div className="text-xs text-slate-400">Roll: #{rollNumber}</div>
        )}
      </div>

      {pct && (
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${levelColor}`}>
          {pct}% Match
        </span>
      )}

      {/* Toggle */}
      <button
        onClick={() => onToggle(studentId)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    transition-all duration-150
                    ${isPresent
                      ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                      : 'bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700'
                    }`}
        aria-label={isPresent ? 'Mark absent' : 'Mark present'}
      >
        {isPresent
          ? <><CheckCircle2 size={12} /> Present</>
          : <><XCircle size={12} /> Absent</>}
      </button>
    </div>
  )
}

/* ── Drop zone ────────────────────────────────────────────────────────────── */
function DropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const accept = (files) => {
    const img = [...files].find(f => f.type.startsWith('image/'))
    if (img) onFile(img)
  }

  return (
    <div
      className={`drop-zone h-56 ${dragging ? 'active' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      onDragOver={(e) => { if (!disabled) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { if (!disabled) { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files) } }}
      onClick={() => { if (!disabled) inputRef.current?.click() }}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
        <Camera size={28} className="text-primary-500" />
      </div>
      <p className="text-base font-semibold text-slate-700">
        Upload Classroom Group Photo
      </p>
      <p className="text-sm text-slate-400 mt-1">
        Drag & drop a classroom photo or click to browse
      </p>
      <p className="text-xs text-slate-300 mt-2">JPG, PNG · up to 20 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => accept(e.target.files)}
        disabled={disabled}
      />
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function Attendance() {
  const { classroom } = useAuth()
  const { toast } = useToast()
  const canvasRef = useRef(null)
  const imgObjURL = useRef(null)

  const [file,       setFile]       = useState(null)
  const [preview,    setPreview]    = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result,     setResult]     = useState(null)
  const [statuses,   setStatuses]   = useState({}) // { student_id: 'present'|'absent' }

  // Enrolled students roster
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [loadingEnrolled,  setLoadingEnrolled]  = useState(true)

  // Confirm form
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0,10))
  const [confirming,  setConfirming]  = useState(false)
  const [confirmed,   setConfirmed]   = useState(false)

  // Unmatched accordion
  const [unmatchedOpen, setUnmatchedOpen] = useState(false)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null)

  useEffect(() => {
    getStudents()
      .then(setEnrolledStudents)
      .catch(() => toast.error('Failed to load enrolled roster.'))
      .finally(() => setLoadingEnrolled(false))
  }, [])

  /* ── File selected ────────────────────────────────────────────────────── */
  const handleFile = (f) => {
    if (imgObjURL.current) URL.revokeObjectURL(imgObjURL.current)
    const url = URL.createObjectURL(f)
    imgObjURL.current = url
    setFile(f)
    setPreview(url)
    setResult(null)
    setStatuses({})
    setConfirmed(false)

    const cv = canvasRef.current
    if (cv) { cv.width = 0; cv.height = 0 }
  }

  /* ── Analyze ──────────────────────────────────────────────────────────── */
  const handleAnalyze = async () => {
    if (!file) return
    if (enrolledStudents.length === 0) {
      toast.error('No students are enrolled in this classroom. Please enroll students first.')
      return
    }

    setProcessing(true)
    const fd = new FormData()
    fd.append('file', file)

    try {
      const data = await captureAttendance(fd)
      setResult(data)

      // Recognized enrolled students = PRESENT
      // Enrolled students not recognized = ABSENT
      const init = {}
      const recognizedIds = new Set(data.recognized.map(r => r.student_id))

      enrolledStudents.forEach(s => {
        init[s.id] = recognizedIds.has(s.id) ? 'present' : 'absent'
      })

      setStatuses(init)

      toast.success(
        `Detected ${data.total_faces} face${data.total_faces !== 1 ? 's' : ''} — ` +
        `${data.recognized.length} recognized.`
      )

      await drawOnCanvas(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const drawOnCanvas = (data) => new Promise((resolve) => {
    const img = new Image()
    img.src = imgObjURL.current
    img.onload = () => {
      drawBoxes(canvasRef.current, img, data.recognized, data.unmatched)
      resolve()
    }
    img.onerror = resolve
  })

  const toggleStatus = (studentId) => {
    setStatuses(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }))
  }

  /* ── Confirm & Save ───────────────────────────────────────────────────── */
  const handleConfirm = async () => {
    if (!result) return

    const records = enrolledStudents.map(s => {
      const rec = result.recognized.find(r => r.student_id === s.id)
      return {
        student_id:       s.id,
        status:           statuses[s.id] || 'absent',
        confidence_score: rec ? rec.confidence : null,
      }
    })

    const payload = {
      date: sessionDate,
      records,
    }

    setConfirming(true)
    try {
      await confirmAttendance(payload)
      toast.success('Attendance session saved successfully! ✅')
      setConfirmed(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setConfirming(false)
    }
  }

  /* ── Reset ───────────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (imgObjURL.current) URL.revokeObjectURL(imgObjURL.current)
    imgObjURL.current = null
    setFile(null); setPreview(null); setResult(null)
    setStatuses({}); setConfirmed(false)
    const cv = canvasRef.current
    if (cv) { cv.width = 0; cv.height = 0 }
  }

  const totalEnrolled = enrolledStudents.length
  const presentCount  = Object.values(statuses).filter(s => s === 'present').length
  const absentCount   = totalEnrolled - presentCount
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Take AI Photo Attendance</h1>
        <p className="page-subtitle">
          Upload a group photo — AI detects and recognizes students enrolled in <strong className="text-indigo-600">{classroom?.name}</strong>.
        </p>
      </div>

      {/* ── Roster check banner if empty ─────────────────────────────────── */}
      {!loadingEnrolled && totalEnrolled === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">No Enrolled Students</h3>
            <p className="text-xs text-amber-700 mt-0.5">
              Please enroll students in classroom <strong>{classroom?.name}</strong> before taking attendance.
            </p>
          </div>
        </div>
      )}

      {/* ── Upload & Analyze area ────────────────────────────────────────── */}
      {!result && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Camera size={16} className="text-primary-600" />
              Classroom Photo
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-900 rounded-lg text-xs font-semibold">
              <School size={14} className="text-indigo-600" />
              <span>{classroom?.name}</span>
            </div>
          </div>

          {!file ? (
            <DropZone onFile={handleFile} disabled={processing || totalEnrolled === 0} />
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center">
                <img
                  src={preview}
                  alt="Selected classroom photo"
                  className="max-h-64 object-contain w-full"
                />
                {processing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={36} className="text-white animate-spin" />
                    <p className="text-white font-semibold text-sm">Analyzing faces against {classroom?.name} roster…</p>
                    <p className="text-white/60 text-xs">InsightFace AI processing in progress</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="btn-primary flex-1 justify-center"
                  onClick={handleAnalyze}
                  disabled={processing}
                  id="analyze-btn"
                >
                  {processing
                    ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
                    : <><Camera size={16} /> Analyze Photo</>}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleReset}
                  disabled={processing}
                >
                  <RefreshCw size={16} /> Change Photo
                </button>
              </div>

              <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <Info size={14} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-indigo-900">
                  Faces are matched exclusively against students enrolled in <strong>{classroom?.name}</strong>. Unknown faces will not be stored.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recognition Results ──────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-sm text-center">
              <div className="text-2xl font-bold text-slate-800">{result.total_faces}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Total Faces Detected</div>
            </div>
            <div className="card-sm text-center">
              <div className="text-2xl font-bold text-green-600">{presentCount} / {totalEnrolled}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Present Students</div>
            </div>
            <div className="card-sm text-center">
              <div className="text-2xl font-bold text-red-500">{absentCount}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Absent Students</div>
            </div>
            <div className="card-sm text-center">
              <div className="text-2xl font-bold text-primary-600">{attendanceRate}%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Attendance Rate</div>
            </div>
          </div>

          {/* Canvas with Bounding Boxes */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-slate-700">AI Detection Result Overlay</h2>
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> High Confidence ≥70%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Low Confidence 50–70%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Unknown Person
                </span>
              </div>
            </div>
            <div className="overflow-auto bg-slate-900 max-h-[520px] flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>

          {/* Breakdown lists: Present & Absent Enrolled Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Present Students */}
            <div className="card border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <h2 className="text-base font-semibold text-slate-800">Present Students</h2>
                </div>
                <span className="badge-present">{presentCount} Present</span>
              </div>
              {presentCount === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No enrolled students were recognized in this photo.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {enrolledStudents
                    .filter(s => statuses[s.id] === 'present')
                    .map(s => {
                      const rec = result.recognized.find(r => r.student_id === s.id)
                      return (
                        <StudentToggle
                          key={s.id}
                          studentId={s.id}
                          name={s.name}
                          rollNumber={s.roll_number}
                          confidence={rec?.confidence}
                          confidenceLevel={rec?.confidence_level}
                          status="present"
                          onToggle={toggleStatus}
                          onViewPhoto={setSelectedStudentForModal}
                        />
                      )
                    })}
                </div>
              )}
            </div>

            {/* Absent Students */}
            <div className="card border-red-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-red-500" />
                  <h2 className="text-base font-semibold text-slate-800">Absent Students</h2>
                </div>
                <span className="badge-absent">{absentCount} Absent</span>
              </div>
              {absentCount === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">All enrolled students are present! 🎉</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {enrolledStudents
                    .filter(s => statuses[s.id] === 'absent')
                    .map(s => (
                      <StudentToggle
                        key={s.id}
                        studentId={s.id}
                        name={s.name}
                        rollNumber={s.roll_number}
                        status="absent"
                        onToggle={toggleStatus}
                        onViewPhoto={setSelectedStudentForModal}
                      />
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Unmatched Faces Warning Accordion */}
          {result.unmatched.length > 0 && (
            <div className="card border-amber-200 bg-amber-50/50">
              <button
                className="w-full flex items-center gap-2 text-left"
                onClick={() => setUnmatchedOpen(p => !p)}
              >
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-900">
                  {result.unmatched.length} Unknown / Non-Enrolled Face{result.unmatched.length !== 1 ? 's' : ''} Detected
                </span>
                <span className="ml-auto text-amber-700">
                  {unmatchedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
              {unmatchedOpen && (
                <p className="mt-3 text-xs text-amber-800 leading-relaxed">
                  {result.unmatched.length} face{result.unmatched.length !== 1 ? 's were' : ' was'} detected in the photo but did not match any student enrolled in <strong>{classroom?.name}</strong>.
                  These appear as <span className="font-semibold text-red-600">red dashed boxes</span> in the photo.
                  <strong> Note:</strong> Unknown persons are <em>never</em> added to the database automatically. You must explicitly enroll new students via the Enrollment page.
                </p>
              )}
            </div>
          )}

          {/* Confirm & Save Section */}
          {!confirmed ? (
            <div className="card">
              <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary-600" />
                Save Attendance Session
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label" htmlFor="att-date">
                    <CalendarDays size={13} className="inline mr-1" />Session Date
                  </label>
                  <input
                    id="att-date"
                    type="date"
                    className="input"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">
                    <Percent size={13} className="inline mr-1" />Calculated Attendance Rate
                  </label>
                  <div className="input bg-slate-50 text-slate-700 font-bold flex items-center justify-between">
                    <span>{presentCount} Present / {totalEnrolled} Enrolled</span>
                    <span className="text-primary-600">{attendanceRate}%</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="btn-primary flex-1 justify-center"
                  id="confirm-attendance-btn"
                  onClick={handleConfirm}
                  disabled={confirming}
                >
                  {confirming
                    ? <><Loader2 size={16} className="animate-spin" /> Saving Session…</>
                    : <><CheckCircle2 size={16} /> Save Attendance</>}
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleReset}
                  disabled={confirming}
                >
                  <RefreshCw size={16} /> New Photo
                </button>
              </div>
            </div>
          ) : (
            <div className="card border-green-200 bg-green-50 flex flex-col items-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-base font-bold text-green-800">Attendance Session Saved!</h3>
              <p className="text-sm text-green-700 mt-1">
                {presentCount} present out of {totalEnrolled} students ({attendanceRate}%) saved for {sessionDate} in <strong>{classroom?.name}</strong>.
              </p>
              <button className="btn-primary mt-4" onClick={handleReset}>
                <Camera size={16} /> Take Another Attendance
              </button>
            </div>
          )}
        </div>
      )}

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
