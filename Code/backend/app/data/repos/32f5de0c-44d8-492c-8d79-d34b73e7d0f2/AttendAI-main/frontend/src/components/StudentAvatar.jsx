import React, { useState } from 'react'
import { User, ZoomIn } from 'lucide-react'
import { getStudentPhotoUrl } from '../api/client.js'

const SIZE_CLASSES = {
  xs:  { box: 'w-7 h-7 text-xs rounded-lg',        icon: 12 },
  sm:  { box: 'w-9 h-9 text-xs rounded-xl',       icon: 14 },
  md:  { box: 'w-11 h-11 text-sm rounded-xl',     icon: 16 },
  lg:  { box: 'w-14 h-14 text-base rounded-2xl',  icon: 20 },
  xl:  { box: 'w-20 h-20 text-xl rounded-2xl',    icon: 28 },
  '2xl': { box: 'w-28 h-28 text-3xl rounded-3xl', icon: 36 },
}

const COLOR_PALETTES = [
  'from-blue-500 to-indigo-600 text-white',
  'from-emerald-500 to-teal-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-violet-500 to-purple-600 text-white',
  'from-cyan-500 to-blue-600 text-white',
]

export function StudentAvatar({
  student,
  studentId,
  name = '',
  photoUrl,
  size = 'md',
  className = '',
  onClick,
  showZoomBadge = false,
  alt,
}) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const sId = student?.id ?? studentId
  const sName = student?.name ?? name ?? 'Student'
  const src = photoUrl ?? student?.photo_url ?? student?.photoUrl ?? (sId ? getStudentPhotoUrl(sId) : null)

  const initials = sName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST'

  const paletteIndex = Math.abs(
    (sId ?? sName.charCodeAt(0) ?? 0) % COLOR_PALETTES.length
  )
  const palette = COLOR_PALETTES[paletteIndex]

  const sizeConfig = SIZE_CLASSES[size] || SIZE_CLASSES.md

  return (
    <div
      onClick={onClick}
      className={`relative group inline-flex items-center justify-center flex-shrink-0 select-none overflow-hidden transition-all duration-200 ${sizeConfig.box} ${
        onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-500 hover:shadow-md' : ''
      } ${className}`}
      title={sName}
    >
      {src && !imgError ? (
        <>
          {/* Skeleton pulse while image is loading */}
          {!imgLoaded && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
              <User size={sizeConfig.icon} className="text-slate-400" />
            </div>
          )}
          <img
            src={src}
            alt={alt || sName}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {showZoomBadge && onClick && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn size={sizeConfig.icon} />
            </div>
          )}
        </>
      ) : (
        /* Fallback Initial Badge */
        <div
          className={`w-full h-full bg-gradient-to-br ${palette} font-bold flex items-center justify-center tracking-wider shadow-inner`}
        >
          {initials}
        </div>
      )}
    </div>
  )
}

export default StudentAvatar
