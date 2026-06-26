import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { isSupabaseReady } from '../lib/supabase'

// ─── Color palette (violet/indigo — isolated to login page only) ───────────────
const C = {
  bg:          '#06060f',
  accent:      '#7c3aed',
  accentHov:   '#6d28d9',
  accentGlow:  'rgba(124,58,237,0.22)',
  accentFocus: 'rgba(124,58,237,0.65)',
  accentShadow:'rgba(124,58,237,0.13)',
  border:      'rgba(124,58,237,0.22)',
  borderFoc:   'rgba(124,58,237,0.65)',
  inputBg:     'rgba(255,255,255,0.04)',
  hint:        '#6366f1',
  hintBg:      'rgba(99,102,241,0.06)',
  hintBorder:  'rgba(99,102,241,0.16)',
  err:         '#f87171',
  errBg:       'rgba(248,113,113,0.08)',
  errBorder:   'rgba(248,113,113,0.2)',
  statVal:     '#7c3aed',
}

// ─── WebGL Perspective Grid ───────────────────────────────────────────────────
const VS = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FS = `
  precision mediump float;
  uniform float u_t;
  uniform vec2  u_mouse;
  uniform vec2  u_res;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 m  = (u_mouse / u_res - 0.5) * 0.035;
    uv += m;

    // Background #06060f — very dark blue-violet
    vec3 bg = vec3(0.024, 0.024, 0.059);

    float pulse = 1.0 + 0.035 * sin(u_t * 0.42);
    float depth = clamp(uv.y, 0.001, 1.0);
    float pz    = 1.0 / (1.0 - depth * 0.82);

    vec2 pg = vec2(
      (uv.x - 0.5) * pz * pulse * 1.1,
       pz           * pulse * 0.28
    );

    float sz   = 1.0;
    vec2  cell = abs(fract(pg / sz + 0.5) - 0.5) * sz;
    float lx   = smoothstep(0.05, 0.01, cell.x);
    float ly   = smoothstep(0.05, 0.01, cell.y);
    float grid = max(lx, ly);

    float dFade = depth * depth * depth;
    float eFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);
    float fade  = dFade * eFade;

    // Violet #7c3aed = vec3(0.486, 0.227, 0.929)
    vec3 violet = vec3(0.486, 0.227, 0.929);
    float line  = grid * fade * 0.45;
    float glow  = pow(depth, 4.0) * eFade * 0.02;

    gl_FragColor = vec4(bg + violet * (line + glow), 1.0);
  }
`

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src); gl.compileShader(s); return s
}

function useWebGLGrid(ref: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return

    const resize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize(); window.addEventListener('resize', resize)

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VS))
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog); gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uT = gl.getUniformLocation(prog, 'u_t')
    const uM = gl.getUniformLocation(prog, 'u_mouse')
    const uR = gl.getUniformLocation(prog, 'u_res')

    let mx = 0, my = 0
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    window.addEventListener('mousemove', onMove)

    let raf: number
    const t0 = performance.now()
    const tick = () => {
      gl.uniform1f(uT, (performance.now() - t0) / 1000)
      gl.uniform2f(uM, mx, my)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [ref])
}

// ─── Password strength ─────────────────────────────────────────────────────────
function pwStrength(pw: string) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8)          score++
  if (pw.length >= 12)         score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { label: 'Weak',        color: '#f87171', width: '20%' }
  if (score <= 2) return { label: 'Fair',        color: '#fb923c', width: '45%' }
  if (score <= 3) return { label: 'Good',        color: '#facc15', width: '65%' }
  if (score <= 4) return { label: 'Strong',      color: '#34d399', width: '85%' }
  return               { label: 'Very strong',   color: '#10b981', width: '100%' }
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: C.inputBg,
  border: `0.82px solid ${C.border}`,
  borderRadius: 8, padding: '12px 14px',
  color: '#fff', fontSize: 14,
  fontFamily: '"Inter", system-ui, sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
}

const headingStyle: React.CSSProperties = { fontSize: 22, fontWeight: 600, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.025em' }
const subStyle: React.CSSProperties     = { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }
const ghostBtn: React.CSSProperties     = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.38)', padding: 0, fontFamily: 'inherit' }
const panelAnim = { initial: { opacity: 0, x: 14 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -14 }, transition: { duration: 0.2, ease: 'easeInOut' as const } }

// ─── Micro-components ─────────────────────────────────────────────────────────
function Spinner() {
  return <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>{children}</label>
}

function PwToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={onToggle}
      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          style={{ fontSize: 12, color: C.err, padding: '8px 12px', background: C.errBg, border: `0.82px solid ${C.errBorder}`, borderRadius: 6, overflow: 'hidden' }}>
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ flex: 1, height: '0.82px', background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>or</span>
      <div style={{ flex: 1, height: '0.82px', background: 'rgba(255,255,255,0.08)' }} />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

const STATS    = [{ v: '10K+', l: 'Profiles tracked' }, { v: '<500ms', l: 'Search latency' }, { v: '100%', l: 'Secure & private' }]
const FEATURES = [{ label: 'AI-powered resume parsing', color: C.accent }, { label: 'Kanban pipeline & evaluations', color: '#6366f1' }, { label: 'Bulk import & smart deduplication', color: '#818cf8' }]

type View = 'login' | 'signup' | 'forgot' | 'check-email'

// ─── Main component ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, signup, loginWithGoogle, forgotPassword } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [view,    setView]    = useState<View>('login')
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [confirm, setConfirm] = useState('')
  const [name,    setName]    = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [showCf,  setShowCf]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [checkMsg,setCheckMsg]= useState('')

  useWebGLGrid(canvasRef as React.RefObject<HTMLCanvasElement>)

  const clearErr = () => setError('')
  const goView = (v: View) => { setView(v); clearErr() }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault(); clearErr(); setLoading(true)
    try {
      await login(email || 'demo@tih.ai', pw || 'demo')
      // AuthRoute in App.tsx will redirect to /dashboard once isAuthenticated becomes true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault(); clearErr()
    if (!name.trim())    { setError('Please enter your full name.'); return }
    if (pw.length < 8)   { setError('Password must be at least 8 characters.'); return }
    if (pw !== confirm)  { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await signup(email, pw, name.trim())
      setCheckMsg(`We sent a verification link to ${email}. Click it to activate your account.`)
      goView('check-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally { setLoading(false) }
  }

  const doForgot = async (e: React.FormEvent) => {
    e.preventDefault(); clearErr()
    if (!email) { setError('Please enter your email address.'); return }
    setLoading(true)
    try {
      await forgotPassword(email)
      setCheckMsg(`Password reset link sent to ${email}. Check your inbox.`)
      goView('check-email')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link.')
    } finally { setLoading(false) }
  }

  const doGoogle = async () => {
    clearErr(); setLoading(true)
    try { await loginWithGoogle() }
    catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed.'); setLoading(false) }
  }

  // ── Shared input renderer ────────────────────────────────────────────────────
  const Input = ({ id, type, placeholder, value, onChange, pr }: {
    id: string; type: string; placeholder: string
    value: string; onChange: (v: string) => void; pr?: number
  }) => (
    <input
      id={id} type={type} placeholder={placeholder}
      value={value}
      onChange={e => { onChange(e.target.value); clearErr() }}
      autoComplete={id}
      style={{ ...inputBase, ...(pr ? { paddingRight: pr } : {}) }}
      onFocus={e => { e.target.style.borderColor = C.accentFocus; e.target.style.boxShadow = `${C.accentShadow} 0 0 0 3px` }}
      onBlur={e  => { e.target.style.borderColor = C.border;      e.target.style.boxShadow = 'none' }}
    />
  )

  const SubmitBtn = ({ label, disabled }: { label: string; disabled?: boolean }) => (
    <motion.button type="submit" disabled={disabled || loading}
      whileHover={(!disabled && !loading) ? { scale: 1.01, boxShadow: `${C.accent}55 0 0 22px 0` } : {}}
      whileTap={(!disabled && !loading) ? { scale: 0.99 } : {}}
      style={{ width: '100%', marginTop: 6, background: C.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: (disabled || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.01em', boxShadow: `${C.accentGlow} 0 0 16px 0`, transition: 'background 0.15s ease', opacity: (disabled && !loading) ? 0.5 : 1 }}
    >
      {loading ? <><Spinner /> Processing…</> : <><span>{label}</span><ArrowRight size={14} /></>}
    </motion.button>
  )

  const strength = view === 'signup' ? pwStrength(pw) : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, display: 'block' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 28, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>

        {/* Gradient border shell */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(124,58,237,0.16) 40%, rgba(255,255,255,0) 100%)', borderRadius: 24, padding: 1, boxShadow: 'rgba(124,58,237,0.22) 0 0 44px 0, rgba(124,58,237,0.07) 0 0 90px 0' }}>

          {/* ── LEFT — brand ───────────────────────────────────────────── */}
          <div style={{ background: 'rgba(7,5,18,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '23px 0 0 23px', padding: '44px 40px', display: 'flex', flexDirection: 'column', borderRight: '0.82px solid rgba(124,58,237,0.1)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -80, left: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `${C.accent}70 0 0 14px 0` }}>
                <Sparkles size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Talent Hub</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Intelligence</div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }} style={{ marginTop: 48 }}>
              <h1 style={{ fontSize: 36, fontWeight: 600, lineHeight: '40px', letterSpacing: '-0.03em', color: '#fff', margin: 0 }}>
                Intelligence for your{' '}
                <span style={{ color: C.accent }}>talent pipeline.</span>
              </h1>
              <p style={{ marginTop: 14, fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: '22px' }}>
                One unified workspace — sourcing, evaluation, shortlisting, and comparison.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.32, duration: 0.4 }} style={{ display: 'flex', gap: 28, marginTop: 40 }}>
              {STATS.map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.statVal, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.44, duration: 0.4 }} style={{ marginTop: 'auto', paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.color, flexShrink: 0, boxShadow: `0 0 6px ${f.color}80` }} />
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>{f.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT — auth forms ──────────────────────────────────────── */}
          <div style={{ background: 'rgba(7,5,20,0.93)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '0 23px 23px 0', padding: '44px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 520 }}>
            <AnimatePresence mode="wait">

              {/* ── CHECK EMAIL ── */}
              {view === 'check-email' && (
                <motion.div key="check" {...panelAnim}>
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${C.accent}22`, border: `1.5px solid ${C.accent}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <Mail size={24} color={C.accent} />
                    </div>
                    <h2 style={headingStyle}>Check your email</h2>
                    <p style={{ ...subStyle, marginBottom: 28, marginTop: 8 }}>{checkMsg}</p>
                    <button onClick={() => goView('login')} style={{ background: 'none', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: 8, color: 'rgba(255,255,255,0.55)', padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                      ← Back to sign in
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── LOGIN ── */}
              {view === 'login' && (
                <motion.div key="login" {...panelAnim}>
                  <div style={{ marginBottom: 26 }}>
                    <h2 style={headingStyle}>Welcome back</h2>
                    <p style={subStyle}>Sign in to your workspace.</p>
                  </div>

                  {/* Google */}
                  <button type="button" onClick={doGoogle} disabled={loading || !isSupabaseReady}
                    title={!isSupabaseReady ? 'Requires Supabase configuration' : undefined}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '0.82px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 13.5, fontWeight: 500, cursor: (!isSupabaseReady || loading) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s ease', opacity: !isSupabaseReady ? 0.4 : 1, marginBottom: 14 }}
                    onMouseEnter={e => { if (isSupabaseReady) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <Divider />

                  <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <FieldLabel>Email address</FieldLabel>
                      <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
                    </div>
                    <div>
                      <FieldLabel>Password</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <Input id="current-password" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={pw} onChange={setPw} pr={40} />
                        <PwToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
                      </div>
                    </div>
                    <ErrorMsg msg={error} />
                    <SubmitBtn label="Sign in" />
                  </form>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
                    <button onClick={() => goView('forgot')} style={ghostBtn}>Forgot password?</button>
                    <button onClick={() => goView('signup')} style={ghostBtn}>Create account →</button>
                  </div>

                  {!isSupabaseReady && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      style={{ marginTop: 16, padding: '9px 13px', background: C.hintBg, border: `0.82px solid ${C.hintBorder}`, borderRadius: 8 }}>
                      <p style={{ fontSize: 11.5, color: `${C.hint}cc`, margin: 0, lineHeight: '18px' }}>
                        <span style={{ color: C.hint, fontWeight: 600 }}>Demo mode:</span>{' '}
                        Leave blank and click Sign in, or enter any email + password.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ── SIGN UP ── */}
              {view === 'signup' && (
                <motion.div key="signup" {...panelAnim}>
                  <div style={{ marginBottom: 22 }}>
                    <h2 style={headingStyle}>Create your account</h2>
                    <p style={subStyle}>Join Talent Intelligence Hub — free to start.</p>
                  </div>
                  <form onSubmit={doSignup} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    <div>
                      <FieldLabel>Full name</FieldLabel>
                      <Input id="name" type="text" placeholder="Alex Johnson" value={name} onChange={setName} />
                    </div>
                    <div>
                      <FieldLabel>Email address</FieldLabel>
                      <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
                    </div>
                    <div>
                      <FieldLabel>Password</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <Input id="new-password" type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" value={pw} onChange={setPw} pr={40} />
                        <PwToggle show={showPw} onToggle={() => setShowPw(v => !v)} />
                      </div>
                      {strength && pw && (
                        <div style={{ marginTop: 5 }}>
                          <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: strength.width, background: strength.color, transition: 'width 0.3s ease, background 0.3s ease', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 10.5, color: strength.color, marginTop: 3, display: 'block' }}>{strength.label}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Confirm password</FieldLabel>
                      <div style={{ position: 'relative' }}>
                        <Input id="confirm-password" type={showCf ? 'text' : 'password'} placeholder="Repeat password" value={confirm} onChange={setConfirm} pr={40} />
                        <PwToggle show={showCf} onToggle={() => setShowCf(v => !v)} />
                      </div>
                      {confirm && pw && confirm === pw && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <CheckCircle size={11} color="#34d399" />
                          <span style={{ fontSize: 10.5, color: '#34d399' }}>Passwords match</span>
                        </div>
                      )}
                    </div>
                    <ErrorMsg msg={error} />
                    <SubmitBtn label="Create account" disabled={!isSupabaseReady} />
                    {!isSupabaseReady && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', margin: '2px 0 0' }}>Requires Supabase · see SETUP.md</p>}
                  </form>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button onClick={() => goView('login')} style={ghostBtn}>← Back to sign in</button>
                  </div>
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD ── */}
              {view === 'forgot' && (
                <motion.div key="forgot" {...panelAnim}>
                  <div style={{ marginBottom: 26 }}>
                    <h2 style={headingStyle}>Reset password</h2>
                    <p style={subStyle}>Enter your email and we'll send you a reset link.</p>
                  </div>
                  <form onSubmit={doForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <FieldLabel>Email address</FieldLabel>
                      <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
                    </div>
                    <ErrorMsg msg={error} />
                    <SubmitBtn label="Send reset link" disabled={!isSupabaseReady} />
                    {!isSupabaseReady && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', textAlign: 'center', margin: '2px 0 0' }}>Requires Supabase · see SETUP.md</p>}
                  </form>
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button onClick={() => goView('login')} style={ghostBtn}>← Back to sign in</button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
          Talent Intelligence Hub · Built for modern recruiting teams
        </p>
      </motion.div>
    </div>
  )
}

