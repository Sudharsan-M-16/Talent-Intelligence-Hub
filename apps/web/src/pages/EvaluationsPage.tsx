import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import { useTalentStore } from '../store/talentStore'
import { demoEvaluations, DEMO_USER_ID } from '../lib/demoData'
import { formatDate } from '../lib/utils'
import TalentAvatar from '../components/ui/TalentAvatar'
import RatingStars from '../components/ui/RatingStars'
import EmptyState from '../components/ui/EmptyState'

const EVAL_METRICS = ['Communication', 'Expertise', 'Professionalism', 'Problem Solving', 'Industry Knowledge', 'Cultural Fit']

const EVAL_TEMPLATES = [
  {
    name: 'Technical Interview',
    description: 'Assess coding, system design, and problem solving',
    metrics: ['Technical Skills', 'Problem Solving', 'System Design', 'Code Quality', 'Communication'],
  },
  {
    name: 'Cultural Fit',
    description: 'Evaluate values alignment and team dynamics',
    metrics: ['Values Alignment', 'Team Collaboration', 'Adaptability', 'Communication', 'Initiative'],
  },
  {
    name: 'Communication Assessment',
    description: 'Measure verbal, written, and presentation skills',
    metrics: ['Verbal Clarity', 'Written Communication', 'Presentation', 'Active Listening', 'Persuasion'],
  },
]

const SCORE_COLORS = ['#ef4444', '#f59e0b', '#fbbf24', '#34d399', '#10b981']
const getScoreColor = (score: number) => {
  if (score >= 4.5) return '#10b981'
  if (score >= 4) return '#34d399'
  if (score >= 3) return '#fbbf24'
  if (score >= 2) return '#f59e0b'
  return '#ef4444'
}

const PAGE_SIZE = 8

export default function EvaluationsPage() {
  const navigate = useNavigate()
  const { profiles } = useTalentStore()
  const [evals, setEvals] = useState(demoEvaluations)
  const [showForm, setShowForm] = useState(false)
  const [selectedTalentId, setSelectedTalentId] = useState('')
  const [metrics, setMetrics] = useState<Record<string, number>>(
    Object.fromEntries(EVAL_METRICS.map((m) => [m, 3]))
  )
  const [activeMetrics, setActiveMetrics] = useState<string[]>(EVAL_METRICS)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [page, setPage] = useState(1)

  const active = profiles.filter((p) => p.is_active)

  const enriched = evals.map((ev) => ({
    ...ev,
    talent: active.find((p) => p.id === ev.talent_id),
  }))

  const handleSubmit = () => {
    if (!selectedTalentId) { toast.error('Select a talent profile'); return }
    const score = Object.values(metrics).reduce((a, b) => a + b, 0) / activeMetrics.length
    const newEval = {
      id: `e${Date.now()}`,
      organization_id: 'demo-org-001',
      talent_id: selectedTalentId,
      evaluator_id: DEMO_USER_ID,
      metrics,
      overall_score: Math.round(score * 10) / 10,
      feedback,
      created_at: new Date().toISOString(),
    }
    setEvals((prev) => [...prev, newEval])
    useTalentStore.getState().updateProfile(selectedTalentId, { overall_rating: newEval.overall_score })
    toast.success('Evaluation submitted!')
    setShowForm(false)
    setSelectedTalentId('')
    setFeedback('')
    setMetrics(Object.fromEntries(EVAL_METRICS.map((m) => [m, 3])))
    setActiveMetrics(EVAL_METRICS)
    setSelectedTemplate(null)
    setPage(1)
  }

  const totalPages = Math.ceil(enriched.length / PAGE_SIZE)
  const paginated = enriched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Score distribution
  const distribution = [
    { range: '1-2', count: enriched.filter((e) => e.overall_score < 2).length },
    { range: '2-3', count: enriched.filter((e) => e.overall_score >= 2 && e.overall_score < 3).length },
    { range: '3-4', count: enriched.filter((e) => e.overall_score >= 3 && e.overall_score < 4).length },
    { range: '4-5', count: enriched.filter((e) => e.overall_score >= 4).length },
  ]

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Evaluations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{enriched.length} evaluations across {new Set(evals.map((e) => e.talent_id)).size} profiles</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary">
          <Plus size={13} /> New Evaluation
        </button>
      </div>

      {/* New Eval form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-bright)',
            borderRadius: 14,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, fontFamily: "'Figtree', sans-serif" }}>
            New Evaluation
          </h3>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Select Talent Profile</label>
            <select
              className="input-field"
              value={selectedTalentId}
              onChange={(e) => setSelectedTalentId(e.target.value)}
            >
              <option value="">- Select a talent -</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.talent_type})</option>
              ))}
            </select>
          </div>
          {/* Template selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Template</label>
              {EVAL_TEMPLATES.map((tpl) => {
                const active = selectedTemplate === tpl.name
                return (
                  <button
                    key={tpl.name}
                    type="button"
                    title={tpl.description}
                    onClick={() => {
                      setSelectedTemplate(tpl.name)
                      setActiveMetrics(tpl.metrics)
                      setMetrics(Object.fromEntries(tpl.metrics.map((m) => [m, 3])))
                    }}
                    style={{
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      borderRadius: 20,
                      padding: '4px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'Figtree, sans-serif',
                      background: active ? 'var(--accent-dim)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tpl.name}
                  </button>
                )
              })}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setActiveMetrics(EVAL_METRICS)
                    setMetrics(Object.fromEntries(EVAL_METRICS.map((m) => [m, 3])))
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    padding: '0 4px',
                    fontFamily: 'Figtree, sans-serif',
                    textDecoration: 'underline',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {activeMetrics.map((metric) => (
              <div key={metric}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="form-label">{metric}</label>
                  <span style={{ fontSize: 13, color: getScoreColor(metrics[metric] ?? 3), fontWeight: 600 }}>{(metrics[metric] ?? 3)}/5</span>
                </div>
                <input
                  type="range" min={1} max={5} step={0.5}
                  value={metrics[metric] ?? 3}
                  onChange={(e) => setMetrics((m) => ({ ...m, [metric]: +e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Feedback</label>
            <textarea
              className="input-field" rows={3}
              placeholder="Share your observations and notes..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubmit} className="btn-primary">Submit Evaluation</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Evaluations list */}
        <div>
          {enriched.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              <EmptyState
                icon={ClipboardList}
                title="No evaluations yet"
                description="Start evaluating talent profiles to build your assessment database."
                action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={13} />Add First Evaluation</button>}
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paginated.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {ev.talent && (
                          <>
                            <TalentAvatar name={ev.talent.full_name} size={36} />
                            <div>
                              <button
                                onClick={() => navigate(`/talent/${ev.talent_id}`)}
                                style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}
                              >
                                {ev.talent.full_name}
                              </button>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{ev.talent.talent_type} · {formatDate(ev.created_at)}</div>
                            </div>
                          </>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: getScoreColor(ev.overall_score), fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                          {ev.overall_score.toFixed(1)}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 5.0</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 12 }}>
                      {Object.entries(ev.metrics).map(([key, val]) => (
                        <div key={key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{val}/5</span>
                          </div>
                          <div className="metric-bar-track">
                            <div className="metric-bar-fill" style={{ width: `${(val / 5) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {ev.feedback && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        "{ev.feedback}"
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, enriched.length)} of {enriched.length} evaluations
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
            </>
          )}
        </div>

        {/* Score distribution sidebar */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, fontFamily: "'Figtree', sans-serif" }}>Score Distribution</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={distribution} barCategoryGap="25%">
                <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.map((_, i) => (
                    <Cell key={i} fill={SCORE_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Quick Stats</div>
              {[
                { label: 'Total Evaluations', value: enriched.length },
                {
                  label: 'Avg. Score',
                  value: enriched.length > 0
                    ? (enriched.reduce((a, b) => a + b.overall_score, 0) / enriched.length).toFixed(1)
                    : '-',
                },
                {
                  label: 'Profiles Evaluated',
                  value: new Set(evals.map((e) => e.talent_id)).size,
                },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

