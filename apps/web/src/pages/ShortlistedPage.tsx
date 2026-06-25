import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Eye, CheckCircle, Download, X, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentStatus } from '../types/database'
import StatusBadge from '../components/ui/StatusBadge'
import TalentAvatar from '../components/ui/TalentAvatar'
import RatingStars from '../components/ui/RatingStars'
import EmptyState from '../components/ui/EmptyState'

const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']

const STATUS_COLORS: Record<string, string> = {
  'New': '#60a5fa',
  'Under Review': '#fbbf24',
  'Shortlisted': '#a78bfa',
  'Approved': '#34d399',
  'Engaged': '#22d3ee',
  'Rejected': '#f87171',
}

export default function ShortlistedPage() {
  const navigate = useNavigate()
  const { profiles } = useTalentStore()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null)

  const shortlisted = profiles.filter((p) => p.is_shortlisted && p.is_active)

  const toggle = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === shortlisted.length ? [] : shortlisted.map((p) => p.id))
  }

  const moveToApproved = () => {
    selectedIds.forEach((id) => useTalentStore.getState().updateStatus(id, 'Approved'))
    toast.success(`Moved ${selectedIds.length} profiles to Approved`)
    setSelectedIds([])
  }

  const statusDist = STATUSES.map((s) => ({
    status: s,
    count: shortlisted.filter((p) => p.status === s).length,
  })).filter((x) => x.count > 0)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Shortlisted</h1>
          <span
            style={{
              padding: '2px 9px',
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              color: '#fbbf24',
            }}
          >
            {shortlisted.length}
          </span>
        </div>
      </div>

      {/* Status distribution */}
      {statusDist.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {statusDist.map(({ status, count }) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[status] }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{status}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_COLORS[status] }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 9, marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--accent-bright)', fontWeight: 500 }}>{selectedIds.length} selected</span>
            <div style={{ flex: 1 }} />
            <button className="btn-secondary" style={{ height: 30, fontSize: 12 }} onClick={moveToApproved}>
              <CheckCircle size={12} /> Move to Approved
            </button>
            <button className="btn-secondary" style={{ height: 30, fontSize: 12 }} onClick={() => toast.success('Export coming soon')}>
              <Download size={12} /> Export
            </button>
            <button className="btn-ghost" style={{ height: 30 }} onClick={() => setSelectedIds([])}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {shortlisted.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <EmptyState
            icon={Star}
            title="No shortlisted profiles"
            description="Shortlist talent profiles from the directory by clicking the star icon."
            action={
              <button onClick={() => navigate('/talent')} className="btn-primary">
                Browse Talent Directory
              </button>
            }
          />
        </div>
      ) : (
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
              gridTemplateColumns: '40px 1fr 120px 130px 80px 80px 100px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={selectedIds.length === shortlisted.length && shortlisted.length > 0} onChange={toggleAll} />
            </div>
            {['Name', 'Type', 'Status', 'Rating', 'Exp.', 'Actions'].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {shortlisted.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 120px 130px 80px 80px 100px',
                padding: '10px 16px',
                borderBottom: i < shortlisted.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggle(p.id)} />
              </div>

              {/* Name */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 9 }}
                onClick={() => navigate(`/talent/${p.id}`)}
              >
                <TalentAvatar name={p.full_name} size={30} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.designation || p.location || '-'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.talent_type}</div>

              {/* Status with quick-change */}
              <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setStatusMenuId(statusMenuId === p.id ? null : p.id)}
                >
                  <StatusBadge status={p.status} size="sm" />
                  <ChevronDown size={10} color="var(--text-muted)" />
                </button>
                {statusMenuId === p.id && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-bright)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        zIndex: 20,
                        minWidth: 130,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                    >
                      {STATUSES.map((s) => (
                        <button key={s}
                          onClick={() => {
                            useTalentStore.getState().updateStatus(p.id, s)
                            toast.success(`Status â†’ ${s}`)
                            setStatusMenuId(null)
                          }}
                          style={{
                            display: 'block', width: '100%', padding: '8px 12px',
                            background: p.status === s ? 'rgba(99,102,241,0.08)' : 'none',
                            border: 'none', cursor: 'pointer', textAlign: 'left',
                            fontSize: 12, color: p.status === s ? 'var(--accent-bright)' : 'var(--text-secondary)',
                            fontFamily: 'inherit', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={(e) => { if (p.status !== s) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          onMouseLeave={(e) => { if (p.status !== s) e.currentTarget.style.background = 'none' }}
                        >{s}</button>
                      ))}
                    </div>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setStatusMenuId(null)} />
                  </>
                )}
              </div>

              <div>
                {p.overall_rating
                  ? <RatingStars rating={p.overall_rating} size={11} showValue />
                  : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>
                }
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {p.years_experience != null ? `${p.years_experience}y` : '-'}
              </div>

              <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button className="btn-ghost" style={{ padding: '4px 6px' }} onClick={() => navigate(`/talent/${p.id}`)}>
                  <Eye size={13} />
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: '4px 6px', color: '#fbbf24' }}
                  onClick={() => {
                    useTalentStore.getState().toggleShortlist(p.id)
                    toast.success('Removed from shortlist')
                  }}
                >
                  <Star size={13} fill="#fbbf24" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

