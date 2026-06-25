import type { TalentStatus } from '../../types/database'

interface StatusBadgeProps {
  status: TalentStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<TalentStatus, { label: string; className: string; dot: string }> = {
  'New': { label: 'New', className: 'status-new', dot: '#60a5fa' },
  'Under Review': { label: 'Under Review', className: 'status-under-review', dot: '#fbbf24' },
  'Shortlisted': { label: 'Shortlisted', className: 'status-shortlisted', dot: '#a78bfa' },
  'Approved': { label: 'Approved', className: 'status-approved', dot: '#34d399' },
  'Engaged': { label: 'Engaged', className: 'status-engaged', dot: '#22d3ee' },
  'Rejected': { label: 'Rejected', className: 'status-rejected', dot: '#f87171' },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status] || { label: status, className: '', dot: '#94a3b8' }
  const pad = size === 'sm' ? '2px 7px' : '3px 9px'
  const fs = size === 'sm' ? '10px' : '11px'

  return (
    <span
      className={`badge ${cfg.className}`}
      style={{ padding: pad, fontSize: fs, transition: 'all 0.2s ease' }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: cfg.dot,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  )
}
