import type { TalentProfile } from '../../types/database'

interface Props {
  profile: TalentProfile
  size?: 'sm' | 'md'
}

function countFilled(profile: TalentProfile): number {
  let count = 0
  if (profile.full_name?.trim()) count++
  if (profile.email?.trim()) count++
  if (profile.phone?.trim()) count++
  if (profile.talent_type) count++
  if (profile.source) count++
  if (profile.organization?.trim()) count++
  if (profile.designation?.trim()) count++
  if (profile.years_experience !== undefined && profile.years_experience !== null) count++
  if (profile.location?.trim()) count++
  if (profile.primary_skills.length > 0) count++
  if (profile.secondary_skills.length > 0) count++
  if (profile.linkedin_url?.trim()) count++
  if (profile.resume_url?.trim()) count++
  if (profile.overall_rating !== undefined && profile.overall_rating !== null) count++
  return count
}

const TOTAL = 14

export default function ProfileCompleteness({ profile, size = 'md' }: Props) {
  const filled = countFilled(profile)
  const score = filled / TOTAL
  const pct = Math.round(score * 100)

  const radius = size === 'sm' ? 10 : 16
  const strokeWidth = size === 'sm' ? 2 : 3
  const svgSize = (radius + strokeWidth) * 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - score)

  const ringColor =
    pct < 50
      ? 'var(--warning)'
      : pct < 80
      ? 'var(--accent)'
      : 'var(--success)'

  const numSize = size === 'sm' ? 9 : 11

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="var(--border-bright)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
        />
      </svg>

      {/* Percentage centered over SVG */}
      <div
        style={{
          marginTop: -(svgSize + 4),
          width: svgSize,
          height: svgSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: numSize,
          fontWeight: 600,
          color: ringColor,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {pct}%
      </div>

      {size === 'md' && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: "'Figtree', sans-serif",
            marginTop: 2,
            whiteSpace: 'nowrap',
          }}
        >
          {filled}/{TOTAL} fields
        </div>
      )}
    </div>
  )
}
