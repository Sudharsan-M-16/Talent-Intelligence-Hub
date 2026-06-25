import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollText, ChevronDown, ChevronRight, Filter } from 'lucide-react'
import { demoActivities } from '../lib/demoData'
import { formatDate, formatRelativeTime } from '../lib/utils'
import TalentAvatar from '../components/ui/TalentAvatar'
import { useTalentStore } from '../store/talentStore'

// Generate fake audit entries from demo activities
const FAKE_AUDIT = [
  ...demoActivities.map((act, i) => ({
    id: `audit_${i}`,
    table_name: 'talent_profiles',
    record_id: act.talent_id,
    action: act.action === 'PROFILE_CREATED' ? 'INSERT' : 'UPDATE',
    performed_by: act.actor?.email || 'admin@tih.co',
    performed_by_name: act.actor?.full_name || 'Admin User',
    talent_name: act.talent?.full_name || 'Unknown',
    description: act.description,
    old_data: act.action === 'STATUS_CHANGED' ? { status: 'Under Review' } : undefined,
    new_data: act.action === 'STATUS_CHANGED' ? { status: 'Shortlisted' } : { full_name: act.talent?.full_name },
    created_at: act.created_at,
  })),
  {
    id: 'audit_eval_1',
    table_name: 'evaluations',
    record_id: 'e1',
    action: 'INSERT' as const,
    performed_by: 'admin@tih.co',
    performed_by_name: 'Alex Johnson',
    talent_name: 'Priya Sharma',
    description: 'Evaluation added for Priya Sharma',
    old_data: undefined,
    new_data: { overall_score: 4.75, talent_id: 'p1' },
    created_at: '2024-05-18T10:00:00Z',
  },
  {
    id: 'audit_tag_1',
    table_name: 'tags',
    record_id: 't1',
    action: 'INSERT' as const,
    performed_by: 'admin@tih.co',
    performed_by_name: 'Alex Johnson',
    talent_name: '-',
    description: 'Tag "AI/ML" created',
    old_data: undefined,
    new_data: { name: 'AI/ML', color: '#8b5cf6' },
    created_at: '2024-01-01T00:00:00Z',
  },
]

const ACTION_COLORS: Record<string, string> = {
  INSERT: '#10b981',
  UPDATE: '#6366f1',
  DELETE: '#ef4444',
  STATUS_CHANGED: '#f59e0b',
  APPROVED: '#10b981',
  PROFILE_CREATED: '#06b6d4',
  EVALUATION_ADDED: '#8b5cf6',
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  STATUS_CHANGED: 'Status Changed',
  APPROVED: 'Approved',
  PROFILE_CREATED: 'Profile Created',
  EVALUATION_ADDED: 'Evaluation Added',
}

const PAGE_SIZE = 15

export default function AuditPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState('')
  const [filterTable, setFilterTable] = useState('')
  const [page, setPage] = useState(1)

  const storeActivities = useTalentStore((s) => s.activities)

  // Merge store activities (real user actions) with static demo entries, deduplicated by id
  const allAuditEntries = useMemo(() => {
    const staticIds = new Set(FAKE_AUDIT.map((a) => a.id))
    const storeEntries = storeActivities
      .filter((act) => !staticIds.has(act.id))
      .map((act, i) => ({
        id: act.id,
        table_name: 'talent_profiles',
        record_id: act.talent_id,
        action: act.action,
        performed_by: act.created_by,
        performed_by_name: act.actor?.full_name || 'Admin',
        talent_name: act.talent?.full_name || 'Unknown',
        description: act.description,
        old_data: undefined as Record<string, unknown> | undefined,
        new_data: undefined as Record<string, unknown> | undefined,
        created_at: act.created_at,
        _storeIndex: i,
      }))
    return [...FAKE_AUDIT, ...storeEntries]
  }, [storeActivities])

  const tables = [...new Set(allAuditEntries.map((a) => a.table_name))]
  const actions = [...new Set(allAuditEntries.map((a) => a.action))]

  const filtered = allAuditEntries
    .filter((a) => !filterAction || a.action === filterAction)
    .filter((a) => !filterTable || a.table_name === filterTable)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Audit Log</h1>
            <span
              style={{
                padding: '2px 9px',
                background: 'var(--accent-dim)',
                border: '1px solid var(--border-bright)',
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--accent-bright)',
              }}
            >
              {filtered.length}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Track all changes and activity in the platform</p>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Filter size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Filter:</span>

        <select
          className="input-field"
          style={{ height: 32, width: 150 }}
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
        >
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>

        <select
          className="input-field"
          style={{ height: 32, width: 160 }}
          value={filterTable}
          onChange={(e) => { setFilterTable(e.target.value); setPage(1) }}
        >
          <option value="">All Tables</option>
          {tables.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {(filterAction || filterTable) && (
          <button
            className="btn-ghost"
            style={{ height: 32, fontSize: 11, color: '#ef4444' }}
            onClick={() => { setFilterAction(''); setFilterTable(''); setPage(1) }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Audit log table */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '20px 160px 100px 120px 100px 1fr 40px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
          }}
        >
          {['', 'Date', 'Action', 'Table', 'User', 'Description', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {h}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No audit entries match the current filters.
          </div>
        ) : (
          paginated.map((entry, i) => (
            <div key={entry.id}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 160px 100px 120px 100px 1fr 40px',
                  padding: '11px 16px',
                  borderBottom: expandedId === entry.id || i === paginated.length - 1 ? 'none' : '1px solid var(--border)',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  background: expandedId === entry.id ? 'var(--accent-dim)' : 'transparent',
                }}
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                onMouseEnter={(e) => { if (expandedId !== entry.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseLeave={(e) => { if (expandedId !== entry.id) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Expand indicator */}
                <div>
                  {expandedId === entry.id
                    ? <ChevronDown size={12} color="#6366f1" />
                    : <ChevronRight size={12} color="var(--text-muted)" />
                  }
                </div>

                {/* Date */}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(entry.created_at)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatRelativeTime(entry.created_at)}</div>
                </div>

                {/* Action badge */}
                <div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${ACTION_COLORS[entry.action] || '#64748b'}1a`,
                      color: ACTION_COLORS[entry.action] || '#64748b',
                      border: `1px solid ${ACTION_COLORS[entry.action] || '#64748b'}33`,
                    }}
                  >
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </div>

                {/* Table */}
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {entry.table_name}
                </div>

                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TalentAvatar name={entry.performed_by_name} size={20} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.performed_by_name}
                  </span>
                </div>

                {/* Description */}
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.description}
                </div>

                {/* Record ID */}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.record_id.slice(0, 8)}
                </div>
              </div>

              {/* Expanded diff */}
              <AnimatePresence>
                {expandedId === entry.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', borderBottom: '1px solid var(--border)' }}
                  >
                    <div
                      style={{
                        padding: '12px 16px 16px 36px',
                        background: 'var(--accent-dim)',
                        display: 'grid',
                        gridTemplateColumns: entry.old_data ? '1fr 1fr' : '1fr',
                        gap: 12,
                      }}
                    >
                      {entry.old_data && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Before</div>
                          <pre
                            style={{
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              background: 'rgba(239,68,68,0.05)',
                              border: '1px solid rgba(239,68,68,0.1)',
                              borderRadius: 7,
                              padding: '10px 12px',
                              margin: 0,
                              overflow: 'auto',
                              fontFamily: 'monospace',
                              lineHeight: 1.6,
                            }}
                          >
                            {JSON.stringify(entry.old_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.new_data && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>After</div>
                          <pre
                            style={{
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              background: 'rgba(16,185,129,0.05)',
                              border: '1px solid rgba(16,185,129,0.1)',
                              borderRadius: 7,
                              padding: '10px 12px',
                              margin: 0,
                              overflow: 'auto',
                              fontFamily: 'monospace',
                              lineHeight: 1.6,
                            }}
                          >
                            {JSON.stringify(entry.new_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'transparent',
                color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              return p <= totalPages ? (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 30, height: 30, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: p === page ? 'var(--accent-dim)' : 'transparent',
                    color: p === page ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 12, cursor: 'pointer', fontWeight: p === page ? 600 : 400,
                  }}
                >
                  {p}
                </button>
              ) : null
            })}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'transparent',
                color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                fontSize: 12, cursor: page === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

