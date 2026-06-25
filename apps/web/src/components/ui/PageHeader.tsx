import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  badge?: string | number
}

export default function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', fontFamily: "'Syne', sans-serif" }}>
            {title}
          </h1>
          {badge !== undefined && (
            <span
              style={{
                padding: '2px 9px',
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                color: '#818cf8',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}

