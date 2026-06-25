import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

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

    // Subtle pointer parallax
    vec2 m = (u_mouse / u_res - 0.5) * 0.035;
    uv += m;

    // Background: #0A0400
    vec3 bg = vec3(0.039, 0.016, 0.0);

    // Breathing scale
    float pulse = 1.0 + 0.035 * sin(u_t * 0.42);

    // Perspective projection — grid converges to vanishing point at top-center
    float depth = clamp(uv.y, 0.001, 1.0);
    float pz    = 1.0 / (1.0 - depth * 0.82);

    vec2 pg = vec2(
      (uv.x - 0.5) * pz * pulse * 1.1,
       pz           * pulse * 0.28
    );

    // Grid lines
    float sz   = 1.0;
    vec2  cell = abs(fract(pg / sz + 0.5) - 0.5) * sz;
    float lx   = smoothstep(0.05, 0.01, cell.x);
    float ly   = smoothstep(0.05, 0.01, cell.y);
    float grid = max(lx, ly);

    // Fade: near=visible, far=ghost; hard edge-kill
    float dFade = depth * depth * depth;
    float eFade = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x);
    float fade  = dFade * eFade;

    // Orange grid + ambient glow
    vec3 orange  = vec3(1.0, 0.541, 0.0);            // #FF8A00
    float line   = grid * fade * 0.48;
    float glow   = pow(depth, 4.0) * eFade * 0.022;

    gl_FragColor = vec4(bg + orange * (line + glow), 1.0);
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
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   VS))
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(prog); gl.useProgram(prog)

    // Full-screen triangle (covers clip space with 3 vertices)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uT   = gl.getUniformLocation(prog, 'u_t')
    const uM   = gl.getUniformLocation(prog, 'u_mouse')
    const uRes = gl.getUniformLocation(prog, 'u_res')

    let mx = 0, my = 0
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    window.addEventListener('mousemove', onMove)

    let raf: number
    const t0 = performance.now()
    const tick = () => {
      gl.uniform1f(uT,   (performance.now() - t0) / 1000)
      gl.uniform2f(uM,   mx, my)
      gl.uniform2f(uRes, canvas.width, canvas.height)
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

// ─── Stats strip ─────────────────────────────────────────────────────────────
const STATS = [
  { v: '10K+',    l: 'Profiles tracked'  },
  { v: '<500ms',  l: 'Search latency'    },
  { v: '100%',    l: 'Private & secure'  },
]

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { label: 'AI-powered resume parsing', color: '#FF8A00' },
  { label: 'Kanban pipeline & evaluations', color: '#10B981' },
  { label: 'Bulk import & smart deduplication', color: '#C4FF0A' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate  = useNavigate()
  const { login } = useAuthStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useWebGLGrid(canvasRef as React.RefObject<HTMLCanvasElement>)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email || 'demo@tih.ai', pw || 'demo')
      navigate('/dashboard')
    } catch {
      setError('Invalid credentials — or just click Sign in for demo mode.')
    } finally {
      setLoading(false)
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.04)',
    border: '0.82px solid rgba(255,138,0,0.22)',
    borderRadius: 8,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 14,
    fontFamily: '"Inter", system-ui, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#0A0400',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* ── WebGL canvas ────────────────────────────────────── */}
      <canvas ref={canvasRef} style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, display: 'block',
      }} />

      {/* ── DOM fallback (shown if canvas is black / JS off) ─ */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,138,0,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Card ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 860, margin: '0 auto', padding: '0 20px' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          /* gradient border shell */
          background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,138,0,0.14) 40%, rgba(255,255,255,0) 100%)',
          borderRadius: 24,
          padding: 1,
          boxShadow: [
            'rgba(255,138,0,0.18) 0px 0px 40px 0px',
            'rgba(255,138,0,0.06) 0px 0px 80px 0px',
          ].join(', '),
        }}>

          {/* ── LEFT — brand panel ─────────────────────────── */}
          <div style={{
            background: 'rgba(12, 6, 0, 0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '23px 0 0 23px',
            padding: '44px 40px',
            display: 'flex', flexDirection: 'column',
            borderRight: '0.82px solid rgba(255,138,0,0.1)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* ambient top-left glow */}
            <div style={{
              position: 'absolute', top: -80, left: -80, width: 280, height: 280,
              background: 'radial-gradient(circle, rgba(255,138,0,0.09) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#FF8A00',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: 'rgba(255,138,0,0.4) 0px 0px 14px 0px',
              }}>
                <Sparkles size={15} color="#0A0400" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Talent Hub</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Intelligence</div>
              </div>
            </div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginTop: 48 }}
            >
              <h1 style={{
                fontSize: 36, fontWeight: 600, lineHeight: '40px',
                letterSpacing: '-0.03em', color: '#fff', margin: 0,
              }}>
                Intelligence for your{' '}
                <span style={{ color: '#FF8A00' }}>talent pipeline.</span>
              </h1>
              <p style={{ marginTop: 14, fontSize: 14, color: 'rgba(255,255,255,0.42)', lineHeight: '22px' }}>
                One unified workspace — sourcing, evaluation, shortlisting, and comparison. Built for modern recruiting teams.
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.4 }}
              style={{ display: 'flex', gap: 28, marginTop: 40 }}
            >
              {STATS.map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#FF8A00', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: '0.03em' }}>{s.l}</div>
                </div>
              ))}
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.44, duration: 0.4 }}
              style={{ marginTop: 'auto', paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: f.color, flexShrink: 0,
                    boxShadow: `0 0 6px ${f.color}80`,
                  }} />
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}>{f.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT — login form ──────────────────────────── */}
          <div style={{
            background: 'rgba(10, 4, 0, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '0 23px 23px 0',
            padding: '44px 40px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0, marginBottom: 6, letterSpacing: '-0.025em' }}>
                Welcome back
              </h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                Sign in to your workspace to continue.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  autoComplete="email"
                  style={inputBase}
                  onFocus={e => {
                    e.target.style.borderColor = 'rgba(255,138,0,0.65)'
                    e.target.style.boxShadow   = 'rgba(255,138,0,0.12) 0px 0px 0px 3px'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,138,0,0.22)'
                    e.target.style.boxShadow   = 'none'
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pw}
                    onChange={e => { setPw(e.target.value); setError('') }}
                    autoComplete="current-password"
                    style={{ ...inputBase, paddingRight: 40 }}
                    onFocus={e => {
                      e.target.style.borderColor = 'rgba(255,138,0,0.65)'
                      e.target.style.boxShadow   = 'rgba(255,138,0,0.12) 0px 0px 0px 3px'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'rgba(255,138,0,0.22)'
                      e.target.style.boxShadow   = 'none'
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(v => !v)}
                    style={{
                      position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      fontSize: 12, color: '#FF6B6B',
                      padding: '8px 12px',
                      background: 'rgba(255,107,107,0.08)',
                      border: '0.82px solid rgba(255,107,107,0.2)',
                      borderRadius: 6, overflow: 'hidden',
                    }}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01, boxShadow: 'rgba(255,138,0,0.35) 0px 0px 20px 0px' } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                style={{
                  width: '100%', marginTop: 6,
                  background: loading ? 'rgba(255,138,0,0.55)' : '#FF8A00',
                  color: '#0A0400', border: 'none', borderRadius: 12,
                  padding: '13px', fontSize: 14, fontWeight: 600,
                  fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '-0.01em',
                  boxShadow: 'rgba(255,138,0,0.2) 0px 0px 15px 0px',
                  transition: 'background 0.15s ease',
                }}
              >
                {loading
                  ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(10,4,0,0.3)', borderTopColor: '#0A0400', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Signing in…</>
                  : <><span>Sign in</span><ArrowRight size={14} /></>
                }
              </motion.button>
            </form>

            {/* Demo hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              style={{
                marginTop: 20,
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.05)',
                border: '0.82px solid rgba(16,185,129,0.15)',
                borderRadius: 8,
              }}
            >
              <p style={{ fontSize: 12, color: 'rgba(16,185,129,0.75)', margin: 0, lineHeight: '18px' }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Demo mode:</span>{' '}
                Enter any email and password — or leave blank and just click Sign in.
              </p>
            </motion.div>

            {/* Bottom text */}
            <p style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center' }}>
              Talent Intelligence Hub · Built for modern recruiting
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
