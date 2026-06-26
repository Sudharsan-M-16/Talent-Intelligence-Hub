import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useThemeStore } from '../../store/themeStore'
import { useAuthStore } from '../../store/authStore'
import { useTalentStore } from '../../store/talentStore'
import { isSupabaseReady } from '../../lib/supabase'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarWidth = collapsed ? 64 : 240
  const theme = useThemeStore((s) => s.theme)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const loadFromSupabase = useTalentStore((s) => s.loadFromSupabase)
  const dataLoadedForRef = useRef<string | null>(null)

  // Load all data from Supabase once per authenticated session.
  // Re-runs when the user's org changes (e.g. after first-time org bootstrap).
  useEffect(() => {
    const orgId = user?.organization_id
    if (!isAuthenticated || !orgId || !isSupabaseReady) return
    if (dataLoadedForRef.current === orgId) return
    dataLoadedForRef.current = orgId
    loadFromSupabase(orgId, user.id)
  }, [isAuthenticated, user?.organization_id, user?.id, loadFromSupabase])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleMobileToggle = () => setMobileOpen((o) => !o)

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      {/* Skip navigation link for keyboard/screen reader users */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          zIndex: 9999,
          padding: '8px 16px',
          background: 'var(--accent)',
          color: '#fff',
          fontFamily: 'Figtree, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 6,
          textDecoration: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '8px'
          e.currentTarget.style.left = '8px'
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-9999px'
          e.currentTarget.style.left = '-9999px'
        }}
      >
        Skip to main content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileToggle={handleMobileToggle}
      />

      {/* Main content shifts with sidebar */}
      <motion.div
        animate={{ marginLeft: isMobile ? 0 : sidebarWidth }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <Topbar onMenuToggle={handleMobileToggle} />
        <main
          id="main-content"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--bg-base)',
          }}
        >
          <Outlet />
        </main>
      </motion.div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-bright)',
            borderRadius: '8px',
            fontSize: '13px',
            boxShadow: 'var(--shadow-lg)',
            fontFamily: "'Figtree', sans-serif",
          },
          success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-elevated)' } },
          error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--bg-elevated)' } },
        }}
      />
    </div>
  )
}
