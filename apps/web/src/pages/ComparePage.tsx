import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, GitCompare, Eye, Star, MapPin, Briefcase, DollarSign, Clock, Award, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import { formatCurrency } from '../lib/utils'
import TalentAvatar from '../components/ui/TalentAvatar'
import StatusBadge from '../components/ui/StatusBadge'
import RatingStars from '../components/ui/RatingStars'
import EmptyState from '../components/ui/EmptyState'

export default function ComparePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profiles, compareIds } = useTalentStore()

  // Mount: sync URL → store (only when store is empty)
  useEffect(() => {
    const urlIds = searchParams.get('ids')
    if (urlIds && useTalentStore.getState().compareIds.length === 0) {
      urlIds.split(',').filter(Boolean).forEach((id) => {
        useTalentStore.getState().toggleCompare(id)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync store → URL whenever compareIds changes
  useEffect(() => {
    if (compareIds.length > 0) {
      setSearchParams({ ids: compareIds.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [compareIds, setSearchParams])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied!')
  }

  const compared = compareIds.map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as typeof profiles

  if (compared.length < 2) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", marginBottom: 24, letterSpacing: '-0.01em' }}>
          Compare Talent
        </h1>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <EmptyState
            icon={GitCompare}
            title="Select talent to compare"
            description={
              compared.length === 0
                ? 'Go to the Talent Directory and click the compare icon on at least 2 profiles.'
                : 'Select one more profile from the directory to start comparing.'
            }
            action={
              <button onClick={() => navigate('/talent')} className="btn-primary">
                Browse Talent Directory
              </button>
            }
          />
        </div>
        {compared.length === 1 && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--border-bright)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <TalentAvatar name={compared[0].full_name} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{compared[0].full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>In compare - add one more</div>
            </div>
            <button
              className="btn-ghost"
              style={{ marginLeft: 'auto', color: '#ef4444' }}
              onClick={() => useTalentStore.getState().toggleCompare(compared[0].id)}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Find best values for numeric fields
  const bestExp = Math.max(...compared.map((p) => p.years_experience || 0))
  const bestRating = Math.max(...compared.map((p) => p.overall_rating || 0))
  const lowestComp = Math.min(...compared.filter((p) => p.expected_compensation).map((p) => p.expected_compensation!))

  type AttrRow = {
    label: string
    render: (p: (typeof compared)[0]) => React.ReactNode
    isBest?: (p: (typeof compared)[0]) => boolean
  }

  const rows: AttrRow[] = [
    {
      label: 'Profile',
      render: (p) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
          <TalentAvatar name={p.full_name} size={52} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif" }}>{p.full_name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p.designation || p.talent_type}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => navigate(`/talent/${p.id}`)} className="btn-secondary" style={{ height: 28, fontSize: 11 }}>
              <Eye size={11} /> View
            </button>
            <button
              onClick={() => useTalentStore.getState().toggleCompare(p.id)}
              className="btn-ghost"
              style={{ height: 28, fontSize: 11, color: '#ef4444' }}
            >
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      ),
    },
    {
      label: 'Status',
      render: (p) => <StatusBadge status={p.status} size="sm" />,
    },
    {
      label: 'Type',
      render: (p) => <span style={{ fontSize: 13 }}>{p.talent_type}</span>,
    },
    {
      label: 'Experience',
      render: (p) => (
        <span style={{ fontSize: 13, fontWeight: p.years_experience === bestExp ? 700 : 400, color: p.years_experience === bestExp ? '#34d399' : undefined }}>
          {p.years_experience ? `${p.years_experience} years` : '-'}
        </span>
      ),
      isBest: (p) => p.years_experience === bestExp && bestExp > 0,
    },
    {
      label: 'Location',
      render: (p) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.location || '-'}</span>,
    },
    {
      label: 'Compensation',
      render: (p) => (
        <span style={{ fontSize: 13, color: p.expected_compensation === lowestComp ? '#34d399' : undefined, fontWeight: p.expected_compensation === lowestComp ? 700 : 400 }}>
          {p.expected_compensation ? formatCurrency(p.expected_compensation) : '-'}
        </span>
      ),
      isBest: (p) => !!p.expected_compensation && p.expected_compensation === lowestComp,
    },
    {
      label: 'Rating',
      render: (p) => p.overall_rating ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <RatingStars rating={p.overall_rating} size={13} showValue />
        </div>
      ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Not rated</span>,
      isBest: (p) => !!p.overall_rating && p.overall_rating === bestRating,
    },
    {
      label: 'Primary Skills',
      render: (p) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {p.primary_skills.length > 0
            ? p.primary_skills.map((s) => <span key={s} className="skill-chip primary" style={{ fontSize: 10, padding: '2px 7px' }}>{s}</span>)
            : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
        </div>
      ),
    },
    {
      label: 'Certifications',
      render: (p) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {p.certifications.length > 0
            ? p.certifications.map((c) => <span key={c} style={{ fontSize: 11, color: '#f59e0b' }}>ðŸ… {c}</span>)
            : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
        </div>
      ),
    },
    {
      label: 'Domains',
      render: (p) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {p.domains.length > 0
            ? p.domains.map((d) => (
                <span key={d} style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, background: 'rgba(6,182,212,0.08)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.15)' }}>
                  {d}
                </span>
              ))
            : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
        </div>
      ),
    },
    {
      label: 'Source',
      render: (p) => <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.source}</span>,
    },
    {
      label: 'Availability',
      render: (p) => <span style={{ fontSize: 13 }}>{p.availability || '-'}</span>,
    },
    {
      label: 'Tags',
      render: (p) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {p.tags && p.tags.length > 0
            ? p.tags.map((t) => (
                <span key={t.id} style={{ padding: '2px 7px', borderRadius: 99, fontSize: 10, background: `${t.color}1a`, color: t.color, border: `1px solid ${t.color}33` }}>
                  {t.name}
                </span>
              ))
            : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>-</span>}
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>
            Compare Talent
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {compared.length} profiles · Green highlights = best value
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {compared.length < 5 && (
            <button onClick={() => navigate('/talent')} className="btn-secondary">
              + Add More
            </button>
          )}
          <button onClick={handleCopyLink} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={13} /> Copy link
          </button>
          <button onClick={() => useTalentStore.getState().clearCompare()} className="btn-ghost" style={{ color: '#ef4444' }}>
            Clear All
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <div key={row.label} className="compare-row">
            <div className="compare-label">{row.label}</div>
            {compared.map((p) => (
              <div
                key={p.id}
                className={`compare-cell${row.isBest && row.isBest(p) ? ' best' : ''}`}
              >
                {row.render(p)}
              </div>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

