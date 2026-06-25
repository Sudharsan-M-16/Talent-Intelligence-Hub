import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Star, Heart, GitCompare, Edit3, Trash2, Share2,
  Mail, Phone, MapPin, Building2, Briefcase, DollarSign, Calendar,
  Clock, ExternalLink, Award, Globe, Linkedin, Tag as TagIcon,
  Plus, ChevronRight, Activity, Download, Eye,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import { demoActivities, demoEvaluations, DEMO_USER_ID } from '../lib/demoData'
import { formatDate, formatRelativeTime, formatCurrency, safeUrl } from '../lib/utils'
import StatusBadge from '../components/ui/StatusBadge'
import RatingStars from '../components/ui/RatingStars'
import TalentAvatar from '../components/ui/TalentAvatar'
import ProfileCompleteness from '../components/ui/ProfileCompleteness'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ResumePreview from '../components/ui/ResumePreview'
import type { TalentStatus, TalentProfile } from '../types/database'

const TABS = ['Overview', 'Evaluations', 'Activity', 'Notes'] as const
type Tab = typeof TABS[number]

const EVAL_METRICS = [
  'Communication', 'Expertise', 'Professionalism',
  'Problem Solving', 'Industry Knowledge', 'Cultural Fit',
]

const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']

export default function TalentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profiles, tags } = useTalentStore()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [showEvalForm, setShowEvalForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [evalMetrics, setEvalMetrics] = useState<Record<string, number>>(
    Object.fromEntries(EVAL_METRICS.map((m) => [m, 3]))
  )
  const [evalFeedback, setEvalFeedback] = useState('')
  const [localEvals, setLocalEvals] = useState(demoEvaluations)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showResume, setShowResume] = useState(false)

  const profile = profiles.find((p) => p.id === id)
  const activities = demoActivities.filter((a) => a.talent_id === id)
  const evaluations = localEvals.filter((e) => e.talent_id === id)

  if (!profile) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', paddingTop: 80 }}>
        <p>Profile not found.</p>
        <button onClick={() => navigate('/talent')} className="btn-primary" style={{ marginTop: 16 }}>
          Back to directory
        </button>
      </div>
    )
  }

  const handleToggleShortlist = () => {
    useTalentStore.getState().toggleShortlist(profile.id)
    toast.success(profile.is_shortlisted ? 'Removed from shortlist' : 'Shortlisted')
  }

  const handleToggleFavorite = () => {
    useTalentStore.getState().toggleFavorite(profile.id)
    toast.success(profile.is_favorite ? 'Removed from favorites' : 'Added to favorites')
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    const deletedProfile = profile
    useTalentStore.getState().deleteProfile(deletedProfile.id)
    setShowDeleteConfirm(false)
    toast(
      (t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {`${deletedProfile.full_name} deleted.`}
          <button
            onClick={() => {
              useTalentStore.getState().addProfile(deletedProfile as TalentProfile)
              toast.dismiss(t.id)
            }}
            style={{
              color: 'var(--accent)',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 5000 }
    )
    navigate('/talent')
  }

  const handleStatusChange = (status: TalentStatus) => {
    useTalentStore.getState().updateStatus(profile.id, status)
    toast.success(`Status changed to ${status}`)
    setShowStatusMenu(false)
  }

  const handleAddEval = () => {
    const score = Object.values(evalMetrics).reduce((a, b) => a + b, 0) / EVAL_METRICS.length
    const newEval = {
      id: `e${Date.now()}`,
      organization_id: profile.organization_id,
      talent_id: profile.id,
      evaluator_id: DEMO_USER_ID,
      metrics: evalMetrics,
      overall_score: Math.round(score * 10) / 10,
      feedback: evalFeedback,
      created_at: new Date().toISOString(),
    }
    setLocalEvals((prev) => [...prev, newEval])
    const newRating = Math.round(score * 10) / 10
    useTalentStore.getState().updateProfile(profile.id, { overall_rating: newRating })
    toast.success('Evaluation submitted')
    setShowEvalForm(false)
    setEvalFeedback('')
    setEvalMetrics(Object.fromEntries(EVAL_METRICS.map((m) => [m, 3])))
  }

  const infoRow = (icon: React.ElementType, label: string, value: string | undefined | null) => {
    if (!value) return null
    const Icon = icon
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={13} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 1 }}>{label}</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      {/* Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost"
          style={{ gap: 6, padding: '6px 10px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <ChevronRight size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Talent Directory</span>
        <ChevronRight size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{profile.full_name}</span>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            background: 'linear-gradient(135deg, var(--accent-dim) 0%, rgba(139,92,246,0.05) 100%)',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <TalentAvatar name={profile.full_name} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", marginBottom: 4, letterSpacing: '-0.01em' }}>
                  {profile.full_name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {profile.designation && (
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{profile.designation}</span>
                  )}
                  {profile.organization && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{profile.organization}</span>
                    </>
                  )}
                  {profile.location && (
                    <>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {profile.location}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <StatusBadge status={profile.status} />
                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 500,
                      background: 'rgba(255,255,255,0.06)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {profile.talent_type}
                  </span>
                  {profile.overall_rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <RatingStars rating={profile.overall_rating} size={13} showValue />
                    </div>
                  )}
                </div>
              </div>

              {/* Profile completeness + Action bar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                <ProfileCompleteness profile={profile} size="md" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => navigate(`/talent/${profile.id}/edit`)} className="btn-secondary" style={{ fontSize: 12, height: 34 }}>
                  <Edit3 size={13} /> Edit
                </button>
                <button
                  onClick={handleToggleShortlist}
                  className="btn-secondary"
                  style={{ fontSize: 12, height: 34, color: profile.is_shortlisted ? '#fbbf24' : undefined }}
                >
                  <Star size={13} fill={profile.is_shortlisted ? '#fbbf24' : 'none'} />
                  {profile.is_shortlisted ? 'Shortlisted' : 'Shortlist'}
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className="btn-secondary"
                  style={{ fontSize: 12, height: 34, color: profile.is_favorite ? '#ec4899' : undefined }}
                >
                  <Heart size={13} fill={profile.is_favorite ? '#ec4899' : 'none'} />
                </button>
                <button
                  onClick={() => { useTalentStore.getState().toggleCompare(profile.id); toast.success('Added to compare') }}
                  className="btn-secondary"
                  style={{ fontSize: 12, height: 34 }}
                >
                  <GitCompare size={13} />
                </button>

                {safeUrl(profile.resume_url) && (
                  <>
                    <button
                      onClick={() => setShowResume(true)}
                      className="btn-secondary"
                      style={{ fontSize: 12, height: 34 }}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <a
                      href={safeUrl(profile.resume_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: 12, height: 34, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Download size={13} /> Resume
                    </a>
                  </>
                )}

                {/* Status change */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: 12, height: 34, gap: 5 }}
                    onClick={() => setShowStatusMenu((s) => !s)}
                  >
                    Change Status <ChevronRight size={11} style={{ transform: showStatusMenu ? 'rotate(90deg)' : 'none', transition: '0.15s' }} />
                  </button>
                  {showStatusMenu && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-bright)',
                          borderRadius: 10,
                          overflow: 'hidden',
                          zIndex: 20,
                          minWidth: 140,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          animation: 'scaleIn 0.12s ease',
                        }}
                      >
                        {STATUSES.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(s)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '9px 14px',
                              background: profile.status === s ? 'var(--accent-dim)' : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                              fontSize: 13,
                              color: profile.status === s ? 'var(--accent-bright)' : 'var(--text-secondary)',
                              fontFamily: 'inherit',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={(e) => { if (profile.status !== s) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            onMouseLeave={(e) => { if (profile.status !== s) e.currentTarget.style.background = 'none' }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowStatusMenu(false)} />
                    </>
                  )}
                </div>

                <button onClick={handleDelete} className="btn-danger" style={{ fontSize: 12, height: 34 }} aria-label="Delete profile">
                  <Trash2 size={13} />
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Profile"
        message={`Are you sure you want to delete ${profile.full_name}'s profile? You can undo this action immediately after.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-item${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Evaluations' && evaluations.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 99,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent-bright)',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {evaluations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* Contact */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {infoRow(Mail, 'Email', profile.email)}
                {infoRow(Phone, 'Phone', profile.phone)}
                {infoRow(Phone, 'Alt Phone', profile.alternate_phone)}
                {infoRow(MapPin, 'Location', profile.location)}
              </div>
            </div>

            {/* Professional */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Professional</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {infoRow(Briefcase, 'Type', profile.talent_type)}
                {infoRow(Building2, 'Organization', profile.organization)}
                {infoRow(Award, 'Designation', profile.designation)}
                {infoRow(Clock, 'Experience', profile.years_experience ? `${profile.years_experience} years` : undefined)}
              </div>
            </div>

            {/* Compensation */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Availability</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {infoRow(Calendar, 'Availability', profile.availability)}
                {infoRow(DollarSign, 'Expected Comp.', profile.expected_compensation ? formatCurrency(profile.expected_compensation) : undefined)}
                {infoRow(Globe, 'Source', profile.source)}
              </div>
            </div>
          </div>

          {/* Skills */}
          {(profile.primary_skills.length > 0 || profile.secondary_skills.length > 0) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Skills</div>
              {profile.primary_skills.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Primary Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.primary_skills.map((s) => (
                      <span key={s} className="skill-chip primary" style={{ fontSize: 12, padding: '4px 10px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.secondary_skills.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Secondary Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.secondary_skills.map((s) => (
                      <span key={s} className="skill-chip secondary" style={{ fontSize: 12, padding: '4px 10px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Certifications & Domains & Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {profile.certifications.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Certifications</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profile.certifications.map((c) => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={12} color="#f59e0b" />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              {profile.domains.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Domains</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {profile.domains.map((d) => (
                      <span
                        key={d}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 99,
                          fontSize: 11,
                          background: 'rgba(6,182,212,0.08)',
                          color: '#22d3ee',
                          border: '1px solid rgba(6,182,212,0.15)',
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {profile.tags && profile.tags.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {profile.tags.map((t) => (
                      <span
                        key={t.id}
                        style={{
                          padding: '3px 9px',
                          borderRadius: 99,
                          fontSize: 11,
                          background: `${t.color}1a`,
                          color: t.color,
                          border: `1px solid ${t.color}33`,
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Links */}
          {(safeUrl(profile.linkedin_url) || safeUrl(profile.portfolio_url) || safeUrl(profile.website)) && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Links</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {safeUrl(profile.linkedin_url) && (
                  <a href={safeUrl(profile.linkedin_url)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 12, height: 34, textDecoration: 'none', gap: 6 }}>
                    <Linkedin size={13} color="#60a5fa" /> LinkedIn
                  </a>
                )}
                {safeUrl(profile.portfolio_url) && (
                  <a href={safeUrl(profile.portfolio_url)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 12, height: 34, textDecoration: 'none', gap: 6 }}>
                    <Globe size={13} /> Portfolio
                  </a>
                )}
                {safeUrl(profile.website) && (
                  <a href={safeUrl(profile.website)} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 12, height: 34, textDecoration: 'none', gap: 6 }}>
                    <ExternalLink size={13} /> Website
                  </a>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Evaluations Tab */}
      {activeTab === 'Evaluations' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setShowEvalForm((s) => !s)} className="btn-primary">
              <Plus size={13} /> Add Evaluation
            </button>
          </div>

          {showEvalForm && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, fontFamily: "'Figtree', sans-serif" }}>New Evaluation</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {EVAL_METRICS.map((metric) => (
                  <div key={metric}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label className="form-label">{metric}</label>
                      <span style={{ fontSize: 13, color: 'var(--accent-bright)', fontWeight: 600 }}>{evalMetrics[metric]}/5</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={evalMetrics[metric]}
                      onChange={(e) => setEvalMetrics((m) => ({ ...m, [metric]: +e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Feedback</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Share your observations..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddEval} className="btn-primary">Submit Evaluation</button>
                <button onClick={() => setShowEvalForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {evaluations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              No evaluations yet. Be the first to evaluate this talent.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {evaluations.map((ev) => (
                <div key={ev.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TalentAvatar name="Evaluator" size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Alex Johnson</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(ev.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--warning)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {ev.overall_score.toFixed(1)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/5</span>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 12 }}>
                    {Object.entries(ev.metrics).map(([key, val]) => (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{val}/5</span>
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
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Activity Tab */}
      {activeTab === 'Activity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
              No activity recorded yet.
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              {activities.map((act) => (
                <div key={act.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-bright)' }}>
                    <Activity size={12} color="var(--accent)" />
                  </div>
                  <div style={{ flex: 1, paddingTop: 5 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{act.description}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                      {act.actor?.full_name || act.actor?.email} · {formatRelativeTime(act.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Notes Tab */}
      {activeTab === 'Notes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {profile.notes && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.notes}</div>
            </div>
          )}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, fontFamily: "'Figtree', sans-serif" }}>Add Note</div>
            <textarea
              className="input-field"
              rows={4}
              placeholder="Add a note about this talent..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ marginBottom: 12, resize: 'vertical' }}
            />
            <button
              className="btn-primary"
              disabled={!noteText.trim()}
              onClick={() => {
                const existing = profile.notes ? profile.notes + '\n\n' : ''
                useTalentStore.getState().updateProfile(profile.id, { notes: existing + noteText })
                toast.success('Note saved')
                setNoteText('')
              }}
            >
              Save Note
            </button>
          </div>
        </motion.div>
      )}

      {/* Resume preview side panel */}
      <AnimatePresence>
        {showResume && (
          <ResumePreview
            resumeUrl={profile.resume_url ?? undefined}
            onClose={() => setShowResume(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
