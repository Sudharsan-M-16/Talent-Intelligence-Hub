import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, UserPlus, Clock, Star, CheckCircle,
  Zap, TrendingUp, Activity, Award, ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useTalentStore } from '../store/talentStore'
import { useAuthStore } from '../store/authStore'
import type { TalentStatus } from '../types/database'
import { demoActivities } from '../lib/demoData'
import { formatRelativeTime } from '../lib/utils'
import TalentAvatar from '../components/ui/TalentAvatar'
import RatingStars from '../components/ui/RatingStars'
import { InlineErrorBoundary } from '../components/ErrorBoundary'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

const SOURCE_COLORS: Record<string, string> = {
  LinkedIn: '#4f8ef7',
  Referral: '#e09030',
  WhatsApp: '#25c760',
  'Job Portal': '#3ab87a',
  Email: '#9078e8',
  Manual: '#6b7280',
  Website: '#22a4c0',
  Other: '#7a7a8a',
}

const TYPE_COLORS: Record<string, string> = {
  Trainer: '#5e6ad2',
  Consultant: '#e09030',
  Employee: '#3ab87a',
  Speaker: '#22a4c0',
  Mentor: '#d060a8',
  Freelancer: '#9078e8',
  Contractor: '#e04850',
  Other: '#6b7280',
}

const STATUS_COLORS: Record<string, string> = {
  'New': '#5fa0f0',
  'Under Review': '#d4902c',
  'Shortlisted': '#9c7ce8',
  'Approved': '#3ab87a',
  'Engaged': '#22a4c0',
  'Rejected': '#d84850',
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {value}
    </motion.span>
  )
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip" style={{ padding: '9px 13px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, fontFamily: 'Figtree, sans-serif' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
        {payload[0].value}
      </div>
    </div>
  )
}

const PieTooltip = ({
  active, payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{payload[0].name}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
        {payload[0].value}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profiles } = useTalentStore()
  const storeActivities = useTalentStore((s) => s.activities)
  const setFilters = useTalentStore((s) => s.setFilters)
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const goFiltered = (status?: TalentStatus) => {
    // Reset all filters and encode the status in the URL so TalentListPage
    // reliably applies it even when the component is already mounted.
    setFilters({ status: status ? [status] : undefined })
    navigate(status ? `/talent?status=${encodeURIComponent(status)}` : '/talent')
  }

  // Fall back to demoActivities if store has no real activities
  const activities = (storeActivities ?? []).length > 0 ? (storeActivities ?? []) : demoActivities

  const active = useMemo(() => profiles.filter((p) => p.is_active), [profiles])
  const stats = useMemo(() => ({
    total: active.length,
    new: active.filter((p) => p.status === 'New').length,
    underReview: active.filter((p) => p.status === 'Under Review').length,
    shortlisted: active.filter((p) => p.status === 'Shortlisted').length,
    approved: active.filter((p) => p.status === 'Approved').length,
    engaged: active.filter((p) => p.status === 'Engaged').length,
    rejected: active.filter((p) => p.status === 'Rejected').length,
  }), [active])

  const topRated = useMemo(() => [...active]
    .filter((p) => p.overall_rating)
    .sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))
    .slice(0, 5), [active])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const statCards: Array<{
    label: string; value: number; icon: React.ElementType
    color: string; accent: string; onClick: () => void
  }> = [
    { label: 'Total Talent',  value: stats.total,       icon: Users,       color: '#7880d8', accent: 'rgba(94,106,210,0.12)', onClick: () => goFiltered() },
    { label: 'New Profiles',  value: stats.new,          icon: UserPlus,    color: '#5fa0f0', accent: 'rgba(95,160,240,0.10)', onClick: () => goFiltered('New') },
    { label: 'Under Review',  value: stats.underReview,  icon: Clock,       color: '#d4902c', accent: 'rgba(212,144,44,0.10)', onClick: () => goFiltered('Under Review') },
    { label: 'Shortlisted',   value: stats.shortlisted,  icon: Star,        color: '#9c7ce8', accent: 'rgba(156,124,232,0.10)', onClick: () => navigate('/shortlisted') },
    { label: 'Approved',      value: stats.approved,     icon: CheckCircle, color: '#3ab87a', accent: 'rgba(58,184,122,0.10)', onClick: () => goFiltered('Approved') },
    { label: 'Engaged',       value: stats.engaged,      icon: Zap,         color: '#22a4c0', accent: 'rgba(34,164,192,0.10)', onClick: () => goFiltered('Engaged') },
  ]

  const sourceCounts = useMemo(() => active.reduce<Record<string, number>>((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1
    return acc
  }, {}), [active])
  const sourceData = useMemo(() => Object.entries(sourceCounts).map(([source, count]) => ({ source, count })), [sourceCounts])

  const typeCounts = useMemo(() => active.reduce<Record<string, number>>((acc, p) => {
    acc[p.talent_type] = (acc[p.talent_type] || 0) + 1
    return acc
  }, {}), [active])

  const pipelineData = useMemo(() => [
    { name: 'New',          value: stats.new,          fill: STATUS_COLORS['New'] },
    { name: 'Under Review', value: stats.underReview,  fill: STATUS_COLORS['Under Review'] },
    { name: 'Shortlisted',  value: stats.shortlisted,  fill: STATUS_COLORS['Shortlisted'] },
    { name: 'Approved',     value: stats.approved,     fill: STATUS_COLORS['Approved'] },
    { name: 'Engaged',      value: stats.engaged,      fill: STATUS_COLORS['Engaged'] },
    { name: 'Rejected',     value: stats.rejected,     fill: STATUS_COLORS['Rejected'] },
  ], [stats])

  const cardBase: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '18px 20px',
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] as const }}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            {dateStr}
          </p>
          <h1 style={{
            fontSize: 20,
            fontWeight: 600,
            fontFamily: "'Figtree', sans-serif",
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
          }}>
            {greeting},{' '}
            <span style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>
              {user?.full_name?.split(' ')[0] || 'there'}
            </span>
          </h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
            Here's what's happening in your talent pipeline today.
          </p>
        </div>
        <button onClick={() => navigate('/talent/new')} className="btn-primary" style={{ gap: 7 }}>
          <UserPlus size={14} /> Add Talent
        </button>
      </motion.div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            onClick={card.onClick}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 13,
              padding: '16px 18px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
            }}
            whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', borderColor: 'var(--border-bright)' }}
          >
            {/* Accent glow top edge */}
            <div style={{
              position: 'absolute',
              top: 0, left: '15%', right: '15%',
              height: 1,
              background: `linear-gradient(90deg, transparent, ${card.color}50, transparent)`,
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: card.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={15} color={card.color} />
              </div>
              <ArrowUpRight size={12} color="var(--text-muted)" />
            </div>

            <div style={{
              fontSize: 26,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              color: card.color,
              lineHeight: 1,
              marginBottom: 6,
              letterSpacing: '-0.03em',
            }}>
              <AnimatedNumber value={card.value} />
            </div>
            <div style={{
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 500,
              letterSpacing: '-0.005em',
            }}>
              {card.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14, marginBottom: 14 }}>

        {/* Pipeline */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" style={{ ...cardBase, minHeight: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Figtree', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Pipeline Overview
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Talent by stage</div>
            </div>
            <button onClick={() => navigate('/kanban')} className="btn-ghost" style={{ fontSize: 11, gap: 4, color: 'var(--text-muted)' }}>
              View Board <ChevronRight size={11} />
            </button>
          </div>
          <InlineErrorBoundary label="Pipeline chart">
            <ResponsiveContainer width="100%" height={196}>
              <BarChart data={pipelineData} layout="vertical" barCategoryGap="28%">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Figtree, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.025)' }} />
                <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={16}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </InlineErrorBoundary>
        </motion.div>

        {/* Source distribution */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible" style={cardBase}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Figtree', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Sources
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Where talent comes from</div>
          </div>
          <InlineErrorBoundary label="Sources chart">
            <ResponsiveContainer width="100%" height={152}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={66}
                  paddingAngle={3}
                  dataKey="count" nameKey="source"
                  strokeWidth={0}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={index} fill={SOURCE_COLORS[entry.source] || '#7a7a8a'} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </InlineErrorBoundary>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', marginTop: 4 }}>
            {sourceData.map((s) => (
              <div key={s.source} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: SOURCE_COLORS[s.source] || '#7a7a8a', flexShrink: 0 }} />
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'Figtree, sans-serif' }}>
                  {s.source}
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 3, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {s.count}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Recent Activity */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Figtree', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Recent Activity
            </div>
            <Activity size={13} color="var(--text-muted)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[...activities].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((act) => {
              const actionColors: Record<string, string> = {
                STATUS_CHANGED: '#5e6ad2',
                APPROVED: '#3ab87a',
                PROFILE_CREATED: '#22a4c0',
                EVALUATION_ADDED: '#e09030',
              }
              const dotColor = actionColors[act.action] || 'var(--text-muted)'
              return (
                <div key={act.id} className="timeline-item">
                  <div
                    className="timeline-dot"
                    style={{
                      background: `${dotColor}14`,
                      border: `1px solid ${dotColor}28`,
                    }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: 5 }}>
                    <div
                      style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45, cursor: 'pointer' }}
                      onClick={() => navigate(`/talent/${act.talent_id}`)}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{act.talent?.full_name}</span>{' '}
                      <span>{act.description.replace(act.talent?.full_name || '', '').trim()}</span>
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatRelativeTime(act.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Top Rated */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible" style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Figtree', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Top Rated
            </div>
            <Award size={13} color="#e09030" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {topRated.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.13s ease',
                }}
                onClick={() => navigate(`/talent/${p.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.032)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-muted)',
                  width: 18,
                  textAlign: 'center',
                  fontWeight: 600,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <TalentAvatar name={p.full_name} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.full_name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.designation || p.talent_type}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <RatingStars rating={p.overall_rating || 0} size={10} />
                  <div style={{
                    fontSize: 11,
                    color: '#e09030',
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {p.overall_rating?.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
            {topRated.length === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                No rated profiles yet
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Type Distribution ───────────────────────────────────────────── */}
      <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" style={cardBase}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: "'Figtree', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Talent Type Distribution
          </div>
          <button onClick={() => navigate('/talent')} className="btn-ghost" style={{ fontSize: 11, gap: 4, color: 'var(--text-muted)' }}>
            <TrendingUp size={11} /> View All
          </button>
        </div>
        {/* Segmented bar */}
        <div style={{ display: 'flex', gap: 3, height: 7, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div
                key={type}
                title={`${type}: ${count}`}
                style={{
                  flex: count,
                  background: TYPE_COLORS[type] || '#6b7280',
                  opacity: 0.82,
                  transition: 'opacity 0.13s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.82' }}
              />
            ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 18px' }}>
          {Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: TYPE_COLORS[type] || '#6b7280', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Figtree, sans-serif' }}>
                  {type}
                  <span style={{ marginLeft: 4, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 10.5 }}>
                    {count}
                  </span>
                </span>
              </div>
            ))}
        </div>
      </motion.div>
    </div>
  )
}
