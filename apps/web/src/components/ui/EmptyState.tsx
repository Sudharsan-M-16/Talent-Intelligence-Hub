import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

export default function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '28px 16px' : '60px 24px',
        textAlign: 'center',
        gap: compact ? 10 : 16,
      }}
    >
      {Icon && (
        <div
          style={{
            width: compact ? 40 : 56,
            height: compact ? 40 : 56,
            borderRadius: compact ? 10 : 16,
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={compact ? 18 : 24} color="#6366f1" />
        </div>
      )}
      <div>
        <p
          style={{
            fontSize: compact ? 13 : 15,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: "'Syne', sans-serif",
            marginBottom: 6,
          }}
        >
          {title}
        </p>
        {description && (
          <p style={{ fontSize: compact ? 12 : 13, color: 'var(--text-muted)', maxWidth: 360 }}>{description}</p>
        )}
      </div>
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  )
}
