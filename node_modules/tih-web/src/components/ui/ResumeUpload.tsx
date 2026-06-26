import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, Loader, AlertCircle, Sparkles, Cpu } from 'lucide-react'
import { parseResumeFromFile, parsedToProfile } from '../../lib/pdfParser'
import type { ParsedResume } from '../../lib/pdfParser'
import type { TalentProfile } from '../../types/database'
import toast from 'react-hot-toast'

interface ResumeUploadProps {
  onParsed: (fields: Partial<TalentProfile>, rawText: string) => void
  onFileSelected?: (file: File) => void
  className?: string
}

type Status = 'idle' | 'reading' | 'parsing' | 'done' | 'error'

const hasApiKey = !!(import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY)

function FieldBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 99,
        background: 'rgba(76,195,138,0.10)', color: '#4cc38a',
        border: '1px solid rgba(76,195,138,0.18)',
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      {label}
    </span>
  )
}

export default function ResumeUpload({ onParsed, onFileSelected }: ResumeUploadProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'doc'].includes(ext ?? '')) {
      toast.error('Upload a PDF or DOCX file')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large (max 15 MB)')
      return
    }

    // Notify parent immediately so Supabase upload can begin in parallel
    onFileSelected?.(file)

    setFileName(file.name)
    setStatus('reading')
    setError('')

    try {
      setStatus('parsing')
      const result = await parseResumeFromFile(file)
      setParsed(result)
      setStatus('done')
      const profile = parsedToProfile(result)
      onParsed(profile, result.rawText)

      const fieldCount = Object.values(profile).filter((v) =>
        v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
      ).length

      toast.success(
        `${result.parseMode === 'ai' ? '✦ AI' : 'Heuristic'} parsed ${fieldCount} fields from ${file.name}`,
        { duration: 4000 }
      )
    } catch (e) {
      setStatus('error')
      const msg = e instanceof Error ? e.message : 'Failed to parse file'
      setError(msg)
      toast.error('Could not parse the file — fill manually or try a different file.')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const reset = () => {
    setStatus('idle')
    setFileName('')
    setParsed(null)
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {/* Mode indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Auto-Fill from Resume
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600,
            background: hasApiKey ? 'rgba(94,106,210,0.10)' : 'rgba(255,255,255,0.05)',
            color: hasApiKey ? '#8a92d8' : '#4f4f5a',
            border: `1px solid ${hasApiKey ? 'rgba(94,106,210,0.2)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {hasApiKey ? <Sparkles size={9} /> : <Cpu size={9} />}
          {hasApiKey ? 'AI Mode (Groq)' : 'Heuristic Mode'}
        </div>
      </div>

      {!hasApiKey && (
        <div
          style={{
            marginBottom: 10, padding: '8px 12px', borderRadius: 8, fontSize: 11,
            background: 'rgba(240,160,64,0.07)', border: '1px solid rgba(240,160,64,0.18)',
            color: '#c8943a', lineHeight: 1.5,
          }}
        >
          Add <code style={{ fontFamily: 'monospace', background: 'rgba(240,160,64,0.12)', padding: '1px 4px', borderRadius: 3 }}>VITE_GROQ_API_KEY</code> to{' '}
          <code style={{ fontFamily: 'monospace', background: 'rgba(240,160,64,0.12)', padding: '1px 4px', borderRadius: 3 }}>.env.local</code> to enable AI parsing (90%+ accuracy).
          Currently running heuristic mode.
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Idle ── */}
        {status === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`upload-zone${isDragging ? ' dragging' : ''}`}
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'rgba(94,106,210,0.08)', border: '1px solid rgba(94,106,210,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Upload size={20} color="#7c7de8" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7', marginBottom: 4 }}>
                  Drop resume here or <span style={{ color: '#7c7de8', cursor: 'pointer' }}>browse files</span>
                </div>
                <div style={{ fontSize: 11, color: '#4f4f5a' }}>
                  {hasApiKey
                    ? 'AI extracts name, email, phone, skills, experience, and all fields'
                    : 'Extracts name, email, phone, skills, experience, certifications'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['PDF', 'DOCX'].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10, color: '#3a3a46', background: 'rgba(255,255,255,0.04)',
                      padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {t}
                  </span>
                ))}
                <span
                  style={{
                    fontSize: 10, color: '#3a3a46', background: 'rgba(255,255,255,0.04)',
                    padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  Max 15 MB
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {(status === 'reading' || status === 'parsing') && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '22px 20px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 12,
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{ animation: 'spin 0.8s linear infinite', display: 'flex' }}>
              <Loader size={20} color="#7c7de8" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e4e4e7' }}>
                {status === 'reading' ? 'Reading file…' : hasApiKey ? 'AI parsing via Groq…' : 'Extracting fields…'}
              </div>
              <div style={{ fontSize: 11, color: '#4f4f5a', marginTop: 2 }}>{fileName}</div>
            </div>
          </motion.div>
        )}

        {/* ── Done ── */}
        {status === 'done' && parsed && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '14px 16px',
              background: 'rgba(76,195,138,0.05)',
              border: '1px solid rgba(76,195,138,0.18)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle size={15} color="#4cc38a" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4cc38a' }}>
                  Parsed successfully
                </span>
                <span
                  style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 99, fontWeight: 600,
                    background: parsed.parseMode === 'ai' ? 'rgba(94,106,210,0.12)' : 'rgba(255,255,255,0.06)',
                    color: parsed.parseMode === 'ai' ? '#8a92d8' : '#4f4f5a',
                    border: `1px solid ${parsed.parseMode === 'ai' ? 'rgba(94,106,210,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {parsed.parseMode === 'ai' ? '✦ AI' : 'heuristic'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  style={{ fontSize: 11, color: '#4f4f5a', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Replace
                </button>
                <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f4f5a', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <FileText size={11} color="#4f4f5a" />
              <span style={{ fontSize: 11, color: '#4f4f5a' }}>{fileName}</span>
            </div>

            {/* Extracted fields grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[
                parsed.full_name        && `👤 ${parsed.full_name}`,
                parsed.email            && `✉ ${parsed.email}`,
                parsed.phone            && `📞 ${parsed.phone}`,
                parsed.location         && `📍 ${parsed.location}`,
                parsed.designation      && `💼 ${parsed.designation}`,
                parsed.organization     && `🏢 ${parsed.organization}`,
                parsed.years_experience != null && `⏱ ${parsed.years_experience}y exp`,
                parsed.education        && `🎓 ${parsed.education.slice(0, 40)}`,
                parsed.linkedin_url     && `🔗 LinkedIn`,
                parsed.portfolio_url    && `💻 Portfolio`,
                parsed.primary_skills.length > 0 && `🛠 ${parsed.primary_skills.slice(0, 4).join(', ')}`,
                parsed.secondary_skills.length > 0 && `+ ${parsed.secondary_skills.length} more skills`,
                parsed.certifications.length > 0 && `🏆 ${parsed.certifications.length} cert${parsed.certifications.length > 1 ? 's' : ''}`,
                parsed.industry_domains.length > 0 && `🏷 ${parsed.industry_domains.join(', ')}`,
              ]
                .filter(Boolean)
                .map((item, i) => <FieldBadge key={i} label={item as string} />)}
            </div>

            {parsed.summary && (
              <div
                style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: 11, color: '#6b7280', lineHeight: 1.5, fontStyle: 'italic',
                }}
              >
                {parsed.summary}
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              style={{ display: 'none' }}
              onChange={(e) => { reset(); setTimeout(() => e.target.files?.[0] && processFile(e.target.files[0]), 50) }}
            />
          </motion.div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '14px 16px',
              background: 'rgba(229,72,77,0.05)',
              border: '1px solid rgba(229,72,77,0.2)',
              borderRadius: 12,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}
          >
            <AlertCircle size={15} color="#e5484d" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#f87171', marginBottom: 4 }}>
                Parse failed — fill in manually or try another file
              </div>
              <div style={{ fontSize: 11, color: '#4f4f5a' }}>{error}</div>
            </div>
            <button type="button" onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f4f5a' }}>
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
