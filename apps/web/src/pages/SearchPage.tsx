import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Save, X, Trash2, BookmarkPlus, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentStatus, TalentType, TalentSource, TalentFilters } from '../types/database'
import StatusBadge from '../components/ui/StatusBadge'
import TalentAvatar from '../components/ui/TalentAvatar'
import RatingStars from '../components/ui/RatingStars'

const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']
const TYPES: TalentType[] = ['Trainer', 'Consultant', 'Employee', 'Speaker', 'Mentor', 'Freelancer', 'Contractor', 'Other']
const SOURCES: TalentSource[] = ['WhatsApp', 'LinkedIn', 'Referral', 'Email', 'Website', 'Job Portal', 'Manual', 'Other']

export default function SearchPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profiles } = useTalentStore()
  const [localFilters, setLocalFilters] = useState<TalentFilters>(() => ({
    query: searchParams.get('q') || '',
    status: searchParams.get('status') ? (searchParams.get('status')!.split(',') as TalentStatus[]) : undefined,
    talent_type: searchParams.get('type') ? (searchParams.get('type')!.split(',') as TalentType[]) : undefined,
    source: searchParams.get('source') ? (searchParams.get('source')!.split(',') as TalentSource[]) : undefined,
    min_experience: searchParams.get('minExp') ? Number(searchParams.get('minExp')) : undefined,
    max_experience: searchParams.get('maxExp') ? Number(searchParams.get('maxExp')) : undefined,
    min_rating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
  }))

  // Keep URL in sync with filters so tab reloads restore the search state
  useEffect(() => {
    const params: Record<string, string> = {}
    if (localFilters.query) params.q = localFilters.query
    if (localFilters.status?.length) params.status = localFilters.status.join(',')
    if (localFilters.talent_type?.length) params.type = localFilters.talent_type.join(',')
    if (localFilters.source?.length) params.source = localFilters.source.join(',')
    if (localFilters.min_experience) params.minExp = String(localFilters.min_experience)
    if (localFilters.max_experience) params.maxExp = String(localFilters.max_experience)
    if (localFilters.min_rating) params.minRating = String(localFilters.min_rating)
    setSearchParams(params, { replace: true })
  }, [localFilters, setSearchParams])
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; filters: TalentFilters }>>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const active = profiles.filter((p) => p.is_active)

  const results = active.filter((p) => {
    const f = localFilters
    if (f.query) {
      const q = f.query.toLowerCase()
      if (
        !p.full_name.toLowerCase().includes(q) &&
        !p.email?.toLowerCase().includes(q) &&
        !p.primary_skills.some((s) => s.toLowerCase().includes(q)) &&
        !p.location?.toLowerCase().includes(q) &&
        !p.organization?.toLowerCase().includes(q)
      ) return false
    }
    if (f.status?.length && !f.status.includes(p.status)) return false
    if (f.talent_type?.length && !f.talent_type.includes(p.talent_type)) return false
    if (f.source?.length && !f.source.includes(p.source)) return false
    if (f.min_experience && (p.years_experience || 0) < f.min_experience) return false
    if (f.max_experience && (p.years_experience || 0) > f.max_experience) return false
    if (f.min_rating && (p.overall_rating || 0) < f.min_rating) return false
    return true
  })

  const updateFilter = (key: keyof TalentFilters, value: unknown) => {
    setLocalFilters((f) => ({ ...f, [key]: value || undefined }))
  }

  const toggleArr = <T,>(key: keyof TalentFilters, val: T) => {
    const cur = (localFilters[key] as T[] | undefined) || []
    const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]
    updateFilter(key, next.length ? next : undefined)
  }

  const saveSearch = () => {
    if (!saveName.trim()) { toast.error('Enter a name'); return }
    setSavedSearches((prev) => [
      ...prev,
      { id: `ss${Date.now()}`, name: saveName.trim(), filters: { ...localFilters } },
    ])
    toast.success('Search saved!')
    setSaveName('')
    setShowSaveInput(false)
  }

  const applySearch = (filters: TalentFilters) => {
    setLocalFilters({ ...filters })
    toast.success('Filters applied')
  }

  const hasFilters = Object.values(localFilters).some((v) =>
    v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Advanced Search</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Filter and find talent with precision</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
        {/* Main search area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Big search input */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              style={{ paddingLeft: 42, height: 48, fontSize: 15 }}
              placeholder="Search by name, skill, location, organization..."
              value={localFilters.query || ''}
              onChange={(e) => updateFilter('query', e.target.value)}
              autoFocus
            />
            {localFilters.query && (
              <button
                onClick={() => updateFilter('query', '')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Advanced filters */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Filters</span>
              {hasFilters && (
                <button onClick={() => setLocalFilters({})} className="btn-ghost" style={{ fontSize: 11, color: '#ef4444', gap: 4, height: 26 }}>
                  <X size={11} /> Clear all
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map((s) => {
                    const sel = localFilters.status?.includes(s)
                    return (
                      <button key={s} onClick={() => toggleArr('status', s)}
                        style={{
                          padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                          border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          background: sel ? 'var(--accent-dim)' : 'transparent',
                          borderColor: sel ? 'var(--border-bright)' : 'var(--border)',
                          color: sel ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        }}
                      >{s}</button>
                    )
                  })}
                </div>
              </div>

              {/* Type */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Talent Type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TYPES.map((t) => {
                    const sel = localFilters.talent_type?.includes(t)
                    return (
                      <button key={t} onClick={() => toggleArr('talent_type', t)}
                        style={{
                          padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                          border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          background: sel ? 'var(--accent-dim)' : 'transparent',
                          borderColor: sel ? 'var(--border-bright)' : 'var(--border)',
                          color: sel ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        }}
                      >{t}</button>
                    )
                  })}
                </div>
              </div>

              {/* Source */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Source</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SOURCES.map((src) => {
                    const sel = localFilters.source?.includes(src)
                    return (
                      <button key={src} onClick={() => toggleArr('source', src)}
                        style={{
                          padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                          border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          background: sel ? 'var(--accent-dim)' : 'transparent',
                          borderColor: sel ? 'var(--border-bright)' : 'var(--border)',
                          color: sel ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        }}
                      >{src}</button>
                    )
                  })}
                </div>
              </div>

              {/* Experience & Rating */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="form-label" style={{ marginBottom: 8 }}>Experience (years)</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" className="input-field" style={{ height: 34 }} placeholder="Min"
                      value={localFilters.min_experience ?? ''} min={0}
                      onChange={(e) => updateFilter('min_experience', e.target.value ? +e.target.value : undefined)} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                    <input type="number" className="input-field" style={{ height: 34 }} placeholder="Max"
                      value={localFilters.max_experience ?? ''} min={0}
                      onChange={(e) => updateFilter('max_experience', e.target.value ? +e.target.value : undefined)} />
                  </div>
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: 8 }}>Minimum Rating</div>
                  <select className="input-field" style={{ height: 34 }}
                    value={localFilters.min_rating ?? ''}
                    onChange={(e) => updateFilter('min_rating', e.target.value ? +e.target.value : undefined)}>
                    <option value="">Any rating</option>
                    <option value="3">★ 3.0+</option>
                    <option value="3.5">★ 3.5+</option>
                    <option value="4">★ 4.0+</option>
                    <option value="4.5">★ 4.5+</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> results found
              </span>
              <button
                onClick={() => setShowSaveInput((s) => !s)}
                className="btn-secondary"
                style={{ fontSize: 12, height: 32 }}
              >
                <BookmarkPlus size={13} /> Save Search
              </button>
            </div>

            {showSaveInput && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  className="input-field"
                  style={{ height: 34 }}
                  placeholder="Name this search..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveSearch()}
                  autoFocus
                />
                <button onClick={saveSearch} className="btn-primary" style={{ height: 34, padding: '0 14px', fontSize: 12 }}>
                  <Save size={12} /> Save
                </button>
                <button onClick={() => setShowSaveInput(false)} className="btn-ghost" style={{ height: 34 }}>
                  <X size={13} />
                </button>
              </div>
            )}

            {!hasFilters ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
                <Search size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Start typing to search talent</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Search by name, skill, location, or organization</div>
              </div>
            ) : results.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '32px 20px', textAlign: 'center' }}>
                <Search size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No profiles match your criteria</div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {results.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onClick={() => navigate(`/talent/${p.id}`)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <TalentAvatar name={p.full_name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.full_name}</span>
                        <StatusBadge status={p.status} size="sm" />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {p.talent_type} · {p.location || 'No location'} · {p.years_experience ? `${p.years_experience}y exp` : 'Exp N/A'}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                        {p.primary_skills.slice(0, 3).map((s) => (
                          <span key={s} className="skill-chip primary" style={{ fontSize: 9, padding: '1px 5px' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    {p.overall_rating && <RatingStars rating={p.overall_rating} size={11} showValue />}
                    <button
                      className="btn-ghost"
                      style={{ padding: '5px 8px', flexShrink: 0 }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/talent/${p.id}`) }}
                    >
                      <Eye size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved searches */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, fontFamily: "'Figtree', sans-serif" }}>Saved Searches</div>
            {savedSearches.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No saved searches yet.<br />Use "Save Search" to save your filters.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedSearches.map((ss) => (
                  <div
                    key={ss.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ss.name}</span>
                      <button
                        onClick={() => setSavedSearches((prev) => prev.filter((s) => s.id !== ss.id))}
                        className="btn-ghost"
                        style={{ padding: '2px 4px', color: '#ef4444' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                      {[
                        ss.filters.query && `"${ss.filters.query}"`,
                        ss.filters.status?.length && `Status: ${ss.filters.status.join(', ')}`,
                        ss.filters.talent_type?.length && `Type: ${ss.filters.talent_type.join(', ')}`,
                      ].filter(Boolean).join(' · ') || 'All profiles'}
                    </div>
                    <button
                      onClick={() => applySearch(ss.filters)}
                      className="btn-secondary"
                      style={{ fontSize: 11, height: 26, width: '100%', justifyContent: 'center' }}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

