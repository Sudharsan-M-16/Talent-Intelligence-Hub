import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, CheckCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

// ─── Same violet palette as LoginPage ────────────────────────────────────────
const C = {
  bg:      '#06060f',
  accent:  '#7c3aed',
  border:  'rgba(124,58,237,0.22)',
  borderF: 'rgba(124,58,237,0.65)',
  shadow:  'rgba(124,58,237,0.13)',
  inputBg: 'rgba(255,255,255,0.04)',
  err:     '#f87171',
  errBg:   'rgba(248,113,113,0.08)',
  errBdr:  'rgba(248,113,113,0.2)',
}

function pwStrength(pw: string) {
  if (!pw) return null
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { label: 'Weak',        color: '#f87171', w: '20%' }
  if (s <= 2) return { label: 'Fair',        color: '#fb923c', w: '45%' }
  if (s <= 3) return { label: 'Good',        color: '#facc15', w: '65%' }
  if (s <= 4) return { label: 'Strong',      color: '#34d399', w: '85%' }
  return               { label: 'Very strong',color: '#10b981', w: '100%'}
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [pw,       setPw]       = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCf,   setShowCf]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  const strength = pwStrength(pw)

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: C.inputBg, border: `0.82px solid ${C.border}`,
    borderRadius: 8, padding: '12px 14px', paddingRight: 40,
    color: '#fff', fontSize: 14,
    fontFamily: '"Inter", system-ui, sans-serif',
    outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw !== confirm) { setError('Passwords do not match.'); return }
    if (!supabase) { setError('Supabase is not configured.'); return }

    setLoading(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: pw })
      if (upErr) { setError(upErr.message); return }
      setDone(true)
      toast.success('Password updated successfully!')
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    } catch {
      setError('Something went wrong. Please request a new reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif', padding: '0 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
        style={{ width: '100%', maxWidth: 400 }}>
        {/* Gradient border card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(124,58,237,0.16) 40%, rgba(255,255,255,0) 100%)', borderRadius: 20, padding: 1, boxShadow: 'rgba(124,58,237,0.2) 0 0 40px 0' }}>
          <div style={{ background: 'rgba(7,5,20,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: 19, padding: '36px 32px' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Talent Hub</div>
            </div>

            {done ? (
              /* ── Success state ── */
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1.5px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle size={22} color="#34d399" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Password updated</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', margin: 0 }}>Redirecting you to the dashboard…</p>
              </div>
            ) : (
              /* ── Form ── */
              <>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.025em' }}>Set new password</h2>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px' }}>Choose a strong password for your account.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>New password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => { setPw(e.target.value); setError('') }} placeholder="At least 8 characters" autoComplete="new-password"
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = C.borderF; e.target.style.boxShadow = `${C.shadow} 0 0 0 3px` }}
                        onBlur={e  => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = 'none' }} />
                      <button type="button" aria-label={showPw ? 'Hide' : 'Show'} onClick={() => setShowPw(v => !v)}
                        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {strength && pw && (
                      <div style={{ marginTop: 5 }}>
                        <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: strength.w, background: strength.color, transition: 'width 0.3s ease', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 10.5, color: strength.color, marginTop: 3, display: 'block' }}>{strength.label}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Confirm password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showCf ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} placeholder="Repeat password" autoComplete="new-password"
                        style={inputStyle}
                        onFocus={e => { e.target.style.borderColor = C.borderF; e.target.style.boxShadow = `${C.shadow} 0 0 0 3px` }}
                        onBlur={e  => { e.target.style.borderColor = C.border;  e.target.style.boxShadow = 'none' }} />
                      <button type="button" aria-label={showCf ? 'Hide' : 'Show'} onClick={() => setShowCf(v => !v)}
                        style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                        {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirm && pw && confirm === pw && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <CheckCircle size={11} color="#34d399" />
                        <span style={{ fontSize: 10.5, color: '#34d399' }}>Passwords match</span>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ fontSize: 12, color: C.err, padding: '8px 12px', background: C.errBg, border: `0.82px solid ${C.errBdr}`, borderRadius: 6, overflow: 'hidden' }}>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.01 } : {}}
                    whileTap={!loading ? { scale: 0.99 } : {}}
                    style={{ width: '100%', marginTop: 4, background: C.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '13px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: 'rgba(124,58,237,0.25) 0 0 16px 0', letterSpacing: '-0.01em' }}>
                    {loading
                      ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Updating…</>
                      : 'Update password'}
                  </motion.button>
                </form>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
