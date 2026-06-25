import { getInitials } from '../../lib/utils'

interface TalentAvatarProps {
  name: string
  size?: number
  imageUrl?: string
  className?: string
}

function getAvatarGradient(name: string): string {
  const first = (name[0] || 'A').toUpperCase()
  const code = first.charCodeAt(0) - 65 // 0-25
  if (code <= 5) return 'linear-gradient(135deg, #7c3aed, #a855f7)' // A-F: purple
  if (code <= 11) return 'linear-gradient(135deg, #2563eb, #3b82f6)' // G-L: blue
  if (code <= 17) return 'linear-gradient(135deg, #059669, #10b981)' // M-R: green
  return 'linear-gradient(135deg, #d97706, #f59e0b)' // S-Z: amber
}

export default function TalentAvatar({ name, size = 36, imageUrl, className = '' }: TalentAvatarProps) {
  const initials = getInitials(name)
  const gradient = getAvatarGradient(name)
  const fontSize = Math.max(10, Math.floor(size * 0.36))

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: fontSize,
        fontFamily: "'Syne', sans-serif",
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  )
}

