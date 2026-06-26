import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, AlertTriangle, ChevronRight, Save, CheckCircle, Loader, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentProfile, TalentType, TalentStatus, TalentSource } from '../types/database'
import { DEMO_ORG_ID } from '../lib/demoData'
import { normalizeUrl } from '../lib/utils'
import { uploadFile, isSupabaseReady } from '../lib/supabase'
import ResumeUpload from '../components/ui/ResumeUpload'

const TALENT_TYPES: TalentType[] = ['Trainer', 'Consultant', 'Employee', 'Speaker', 'Mentor', 'Freelancer', 'Contractor', 'Other']
const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']
const SOURCES: TalentSource[] = ['WhatsApp', 'LinkedIn', 'Referral', 'Email', 'Website', 'Job Portal', 'Manual', 'Other']

interface TagInputProps {
  values: string[]
  onChange: (vals: string[]) => void
  placeholder: string
}

function TagInput({ values, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="tag-input-container" onClick={() => inputRef.current?.focus()}>
      {values.map((v) => (
        <span key={v} className="tag-item">
          {v}
          <button type="button" onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="tag-input-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={values.length === 0 ? placeholder : ''}
      />
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: "'Figtree', sans-serif", marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14, marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}

export default function TalentFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profiles, tags } = useTalentStore()
  const isEdit = Boolean(id)
  const existing = isEdit ? profiles.find((p) => p.id === id) : undefined

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: string; name: string } | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  // dragOver no longer needed — handled in ResumeUpload component

  // Resume Supabase upload state
  const [uploadingResume, setUploadingResume] = useState(false)
  const [uploadedResumeFile, setUploadedResumeFile] = useState<string>('')

  // Stable profile ID used for the storage path — either the existing ID or a pre-generated one for new profiles
  const profileIdRef = useRef<string>(id ?? `p${Date.now()}`)

  const [form, setForm] = useState<Partial<TalentProfile>>({
    full_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    talent_type: 'Consultant',
    source: 'LinkedIn',
    status: 'New',
    organization: '',
    designation: '',
    years_experience: undefined,
    location: '',
    availability: '',
    expected_compensation: undefined,
    primary_skills: [],
    secondary_skills: [],
    certifications: [],
    domains: [],
    linkedin_url: '',
    portfolio_url: '',
    website: '',
    notes: '',
    tags: [],
  })

  useEffect(() => {
    if (existing) setForm({ ...existing })
  }, [existing])

  // Warn user before navigating away with unsaved changes
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const setField = <K extends keyof TalentProfile>(key: K, value: TalentProfile[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setIsDirty(true)
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }

  const checkDuplicate = (email?: string, phone?: string) => {
    const emailVal = email ?? ''
    const phoneVal = phone ?? ''
    if (!emailVal && !phoneVal) { setDuplicateWarning(null); return }
    const dup = profiles.find((p) => {
      if (p.id === id) return false
      if (emailVal && p.email && p.email.toLowerCase() === emailVal.toLowerCase()) return true
      if (phoneVal && p.phone && p.phone === phoneVal) return true
      return false
    })
    if (dup) setDuplicateWarning({ id: dup.id, name: dup.full_name })
    else setDuplicateWarning(null)
  }

  const handleResumeFileSelected = async (file: File) => {
    if (!isSupabaseReady) return // Demo mode — skip upload, parsing still happens
    setUploadingResume(true)
    setUploadedResumeFile(file.name)
    try {
      const profileId = profileIdRef.current
      const url = await uploadFile('resumes', `${profileId}/${file.name}`, file)
      if (url) {
        setField('resume_url', url)
        toast.success(`Resume uploaded: ${file.name}`)
      } else {
        toast.error('Resume upload failed — check Supabase storage settings')
      }
    } catch {
      toast.error('Resume upload failed')
    } finally {
      setUploadingResume(false)
    }
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.full_name?.trim()) errs.full_name = 'Full name is required'
    if (form.full_name && form.full_name.length > 200) errs.full_name = 'Name must be 200 characters or fewer'
    if (!form.talent_type) errs.talent_type = 'Talent type is required'
    if (!form.source) errs.source = 'Source is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email address'
    }
    if (form.years_experience !== undefined && form.years_experience !== null) {
      if (form.years_experience < 0 || form.years_experience > 80) {
        errs.years_experience = 'Experience must be between 0 and 80 years'
      }
    }
    if (form.expected_compensation !== undefined && form.expected_compensation !== null) {
      if (form.expected_compensation < 0) {
        errs.expected_compensation = 'Compensation cannot be negative'
      }
    }
    if (form.notes && form.notes.length > 5000) {
      errs.notes = 'Notes must be 5000 characters or fewer'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) { toast.error('Please fix the errors'); return }
    const now = new Date().toISOString()
    // Normalize URLs before saving
    const normalizedForm = {
      ...form,
      linkedin_url: normalizeUrl(form.linkedin_url),
      portfolio_url: normalizeUrl(form.portfolio_url),
      website: normalizeUrl(form.website),
    }
    setIsDirty(false)
    if (isEdit && id) {
      useTalentStore.getState().updateProfile(id, { ...normalizedForm, updated_at: now })
      toast.success('Profile updated!')
      navigate(`/talent/${id}`)
    } else {
      const newProfile: TalentProfile = {
        id: profileIdRef.current,
        organization_id: DEMO_ORG_ID,
        full_name: normalizedForm.full_name!,
        email: normalizedForm.email,
        phone: normalizedForm.phone,
        alternate_phone: normalizedForm.alternate_phone,
        talent_type: normalizedForm.talent_type || 'Other',
        source: normalizedForm.source || 'Manual',
        status: normalizedForm.status || 'New',
        organization: normalizedForm.organization,
        designation: normalizedForm.designation,
        years_experience: normalizedForm.years_experience,
        location: normalizedForm.location,
        availability: normalizedForm.availability,
        expected_compensation: normalizedForm.expected_compensation,
        primary_skills: normalizedForm.primary_skills || [],
        secondary_skills: normalizedForm.secondary_skills || [],
        certifications: normalizedForm.certifications || [],
        domains: normalizedForm.domains || [],
        linkedin_url: normalizedForm.linkedin_url,
        portfolio_url: normalizedForm.portfolio_url,
        website: normalizedForm.website,
        notes: normalizedForm.notes,
        resume_url: normalizedForm.resume_url,
        overall_rating: undefined,
        is_shortlisted: false,
        is_favorite: false,
        is_active: true,
        created_at: now,
        updated_at: now,
        tags: normalizedForm.tags || [],
      }
      useTalentStore.getState().addProfile(newProfile)
      toast.success('Talent profile created!')
      navigate(`/talent/${newProfile.id}`)
    }
  }

  const selectedTagIds = (form.tags || []).map((t) => t.id)

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', paddingBottom: 100 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <button onClick={() => navigate(-1)} className="btn-ghost" style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <ChevronRight size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Talent Directory</span>
        <ChevronRight size={13} color="var(--text-muted)" />
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isEdit ? 'Edit Profile' : 'New Profile'}</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>
          {isEdit ? `Edit: ${existing?.full_name}` : 'Add Talent Profile'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          {isEdit ? 'Update profile information below.' : 'Fill out the form to add a new talent profile.'}
        </p>
      </div>

      {duplicateWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(`/talent/${duplicateWarning.id}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 10, marginBottom: 16,
            fontSize: 13, color: '#fbbf24',
            cursor: 'pointer',
          }}
        >
          <AlertTriangle size={15} />
          A profile with this email/phone already exists: {duplicateWarning.name} — Click to view
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 1. Personal Info */}
        <FormSection title="1. Personal Information">
          <FormGrid>
            <Field label="Full Name" required error={errors.full_name}>
              <input className="input-field" placeholder="e.g. Priya Sharma" value={form.full_name || ''}
                onChange={(e) => setField('full_name', e.target.value)} />
            </Field>
            <Field label="Email">
              <input type="email" className="input-field" placeholder="email@company.com" value={form.email || ''}
                onChange={(e) => setField('email', e.target.value)}
                onBlur={(e) => checkDuplicate(e.target.value, form.phone)} />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Phone">
              <input className="input-field" placeholder="+91-9876543210" value={form.phone || ''}
                onChange={(e) => setField('phone', e.target.value)}
                onBlur={(e) => checkDuplicate(form.email, e.target.value)} />
            </Field>
            <Field label="Alternate Phone">
              <input className="input-field" placeholder="+91-9876543210" value={form.alternate_phone || ''}
                onChange={(e) => setField('alternate_phone', e.target.value)} />
            </Field>
          </FormGrid>
        </FormSection>

        {/* 2. Classification */}
        <FormSection title="2. Classification">
          <FormGrid cols={3}>
            <Field label="Talent Type" required error={errors.talent_type}>
              <select className="input-field" value={form.talent_type || ''} onChange={(e) => setField('talent_type', e.target.value as TalentType)}>
                {TALENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Source" required error={errors.source}>
              <select className="input-field" value={form.source || ''} onChange={(e) => setField('source', e.target.value as TalentSource)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input-field" value={form.status || ''} onChange={(e) => setField('status', e.target.value as TalentStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </FormGrid>
        </FormSection>

        {/* 3. Professional */}
        <FormSection title="3. Professional Details">
          <FormGrid>
            <Field label="Organization">
              <input className="input-field" placeholder="Company or self-employed" value={form.organization || ''}
                onChange={(e) => setField('organization', e.target.value)} />
            </Field>
            <Field label="Designation / Title">
              <input className="input-field" placeholder="e.g. Senior Trainer" value={form.designation || ''}
                onChange={(e) => setField('designation', e.target.value)} />
            </Field>
          </FormGrid>
          <FormGrid cols={3}>
            <Field label="Years of Experience">
              <input type="number" className="input-field" placeholder="e.g. 8" min={0} max={60}
                value={form.years_experience ?? ''}
                onChange={(e) => setField('years_experience', e.target.value ? +e.target.value : undefined)} />
            </Field>
            <Field label="Location">
              <input className="input-field" placeholder="e.g. Bangalore" value={form.location || ''}
                onChange={(e) => setField('location', e.target.value)} />
            </Field>
            <Field label="Availability">
              <input className="input-field" placeholder="e.g. Immediate, 2 weeks" value={form.availability || ''}
                onChange={(e) => setField('availability', e.target.value)} />
            </Field>
          </FormGrid>
          <Field label="Expected Compensation (₹/month)">
            <input type="number" className="input-field" placeholder="e.g. 120000"
              value={form.expected_compensation ?? ''}
              onChange={(e) => setField('expected_compensation', e.target.value ? +e.target.value : undefined)} />
          </Field>
        </FormSection>

        {/* 4. Skills */}
        <FormSection title="4. Skills & Expertise">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Primary Skills (press Enter or comma to add)">
              <TagInput values={form.primary_skills || []} onChange={(v) => setField('primary_skills', v)} placeholder="Python, Machine Learning..." />
            </Field>
            <Field label="Secondary Skills">
              <TagInput values={form.secondary_skills || []} onChange={(v) => setField('secondary_skills', v)} placeholder="TensorFlow, Keras..." />
            </Field>
            <Field label="Certifications">
              <TagInput values={form.certifications || []} onChange={(v) => setField('certifications', v)} placeholder="AWS Solutions Architect, PMP..." />
            </Field>
            <Field label="Domain Expertise">
              <TagInput values={form.domains || []} onChange={(v) => setField('domains', v)} placeholder="FinTech, EdTech, Healthcare..." />
            </Field>
          </div>
        </FormSection>

        {/* 5. Links */}
        <FormSection title="5. Links & URLs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="LinkedIn URL">
              <input type="url" className="input-field" placeholder="https://linkedin.com/in/username" value={form.linkedin_url || ''}
                onChange={(e) => setField('linkedin_url', e.target.value)} />
            </Field>
            <FormGrid>
              <Field label="Portfolio URL">
                <input type="url" className="input-field" placeholder="https://portfolio.example.com" value={form.portfolio_url || ''}
                  onChange={(e) => setField('portfolio_url', e.target.value)} />
              </Field>
              <Field label="Website">
                <input type="url" className="input-field" placeholder="https://website.com" value={form.website || ''}
                  onChange={(e) => setField('website', e.target.value)} />
              </Field>
            </FormGrid>
          </div>
        </FormSection>

        {/* 6. Resume � PDF Auto-Fill */}
        <FormSection title="6. Resume Auto-Fill">
          <ResumeUpload
            onParsed={(parsedFields) => {
              setForm((f) => ({
                ...f,
                ...Object.fromEntries(
                  Object.entries(parsedFields).filter(([, v]) =>
                    v !== undefined && v !== null && v !== '' &&
                    !(Array.isArray(v) && v.length === 0)
                  )
                ),
              }))
            }}
            onFileSelected={handleResumeFileSelected}
          />

          {/* Resume upload status indicator (Supabase mode) */}
          {isSupabaseReady && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              {uploadingResume && (
                <>
                  <span style={{ animation: 'spin 0.8s linear infinite', display: 'flex' }}>
                    <Loader size={13} color="var(--accent)" />
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Uploading {uploadedResumeFile}&hellip;
                  </span>
                </>
              )}
              {!uploadingResume && form.resume_url && uploadedResumeFile && (
                <>
                  <CheckCircle size={13} color="#4cc38a" />
                  <span style={{ color: '#4cc38a', fontWeight: 500 }}>Uploaded</span>
                  <span style={{ color: 'var(--text-muted)' }}>{uploadedResumeFile}</span>
                  <a
                    href={form.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    <ExternalLink size={11} /> View
                  </a>
                </>
              )}
              {!uploadingResume && !form.resume_url && uploadedResumeFile && (
                <span style={{ color: 'var(--text-muted)' }}>Upload failed — form can still be saved</span>
              )}
            </div>
          )}

          {/* Existing resume link (edit mode, before a new file is picked) */}
          {!uploadingResume && !uploadedResumeFile && form.resume_url && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <CheckCircle size={13} color="#4cc38a" />
              <span style={{ color: 'var(--text-secondary)' }}>Resume on file:</span>
              <a
                href={form.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent)', textDecoration: 'none' }}
              >
                <ExternalLink size={11} /> View resume
              </a>
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Upload a PDF to auto-fill name, email, phone, skills, experience and more.
            {isSupabaseReady && ' The file is also saved to cloud storage.'}
          </p>
        </FormSection>

        {/* 7. Tags */}
        {tags.length > 0 && (
          <FormSection title="7. Tags">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id)
                return (
                  <button key={tag.id} type="button"
                    onClick={() => {
                      const cur = form.tags || []
                      setField('tags', selected ? cur.filter((t) => t.id !== tag.id) : [...cur, tag])
                    }}
                    style={{
                      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                      border: '1px solid', cursor: 'pointer', fontFamily: 'inherit',
                      background: selected ? `${tag.color}1a` : 'transparent',
                      borderColor: selected ? `${tag.color}55` : 'var(--border)',
                      color: selected ? tag.color : 'var(--text-secondary)', transition: 'all 0.15s',
                    }}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </FormSection>
        )}

        {/* 8. Notes */}
        <FormSection title="8. Notes">
          <textarea className="input-field" rows={4} placeholder="Additional notes about this talent..."
            value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)}
            style={{ resize: 'vertical' }} />
        </FormSection>
      </form>

      {/* Sticky footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '14px 24px',
        background: 'var(--bg-overlay)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, zIndex: 50,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 'auto' }}>
          {isEdit ? <>Editing: <strong style={{ color: 'var(--text-secondary)' }}>{existing?.full_name}</strong></> : 'New talent profile'}
        </span>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        <button type="submit" onClick={handleSubmit} className="btn-primary">
          <Save size={13} />
          {isEdit ? 'Save Changes' : 'Create Profile'}
        </button>
      </div>
    </div>
  )
}
