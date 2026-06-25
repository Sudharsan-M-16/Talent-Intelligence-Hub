import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, KanbanSquare, Star, Heart,
  GitCompare, ClipboardList, Search, Settings, ScrollText,
  Sparkles, ChevronLeft, ChevronRight, LogOut, FileSpreadsheet,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTalentStore } from '../../store/talentStore'
import TalentAvatar from '../ui/TalentAvatar'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  isMobile?: boolean
  mobileOpen?: boolean
  onMobileToggle?: () => void
}

interface NavItem {
  label: string
  icon: React.ElementType
  to: string
  badgeFn?: () => number
}

interface NavSection {
  title: string
  items: NavItem[]
}

export default function Sidebar({ collapsed, onToggle, isMobile = false, mobileOpen = false, onMobileToggle }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const profiles = useTalentStore((s) => s.profiles)
  const navigate = useNavigate()

  const shortlistedCount = profiles.filter((p) => p.is_shortlisted && p.is_active).length
  const favoritesCount = profiles.filter((p) => p.is_favorite && p.is_active).length

  const sections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
        { label: 'Talent Directory', icon: Users, to: '/talent' },
        { label: 'Bulk Profiles', icon: FileSpreadsheet, to: '/bulk-profiles' },
      ],
    },
    {
      title: 'PIPELINE',
      items: [
        { label: 'Kanban', icon: KanbanSquare, to: '/kanban' },
        { label: 'Shortlisted', icon: Star, to: '/shortlisted', badgeFn: () => shortlistedCount },
        { label: 'Favorites', icon: Heart, to: '/favorites', badgeFn: () => favoritesCount },
      ],
    },
    {
      title: 'INTEL',
      items: [
        { label: 'Compare', icon: GitCompare, to: '/compare' },
        { label: 'Evaluations', icon: ClipboardList, to: '/evaluations' },
        { label: 'Search', icon: Search, to: '/search' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Settings', icon: Settings, to: '/settings' },
        { label: 'Audit Log', icon: ScrollText, to: '/audit' },
      ],
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 55,
          }}
          onClick={onMobileToggle}
        />
      )}
    <motion.aside
      animate={
        isMobile
          ? { x: mobileOpen ? 0 : -240, width: 240 }
          : { x: 0, width: collapsed ? 64 : 240 }
      }
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: isMobile ? 60 : 40,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          borderBottom: '1px solid var(--border)',
          minHeight: 56,
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={15} color="#fff" />
        </div>

        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              style={{ overflow: 'hidden', flex: 1 }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'Figtree', sans-serif",
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}
              >
                Talent Hub
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
                Intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Collapse toggle — hidden on mobile */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          right: -10,
          top: 28,
          transform: 'translateY(-50%)',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: '1px solid var(--border-bright)',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          zIndex: 50,
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent-dim)'
          e.currentTarget.style.borderColor = 'var(--accent-dim)'
          e.currentTarget.style.color = 'var(--accent-bright)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-primary)'
          e.currentTarget.style.borderColor = 'var(--border-bright)'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {sections.map((section) => (
          <div key={section.title}>
            <AnimatePresence>
              {(!collapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    fontFamily: 'Figtree, sans-serif',
                    padding: '0 8px',
                    marginBottom: 4,
                  }}
                >
                  {section.title}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {section.items.map((item) => {
                const badgeCount = item.badgeFn ? item.badgeFn() : 0
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }: { isActive: boolean }) => `sidebar-item${isActive ? ' active' : ''}`}
                    title={collapsed ? item.label : undefined}
                    style={collapsed && !isMobile ? { justifyContent: 'center', padding: '8px 0' } : undefined}
                    onClick={isMobile ? onMobileToggle : undefined}
                  >
                    <item.icon
                      size={15}
                      className="sidebar-icon"
                      style={{ flexShrink: 0 }}
                    />
                    <AnimatePresence>
                      {(!collapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          style={{ flex: 1, whiteSpace: 'nowrap' }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {(!collapsed || isMobile) && badgeCount > 0 && (
                      <span
                        style={{
                          minWidth: 17,
                          height: 17,
                          borderRadius: 99,
                          background: 'var(--accent-dim)',
                          color: 'var(--accent-bright)',
                          fontSize: 10,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 5px',
                        }}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/about')}
          title="User Guide & Profile"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <TalentAvatar name={user?.full_name || 'User'} size={30} />
        </button>
        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'Figtree, sans-serif',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.full_name || 'User'}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'Figtree, sans-serif', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                Administrator
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {(!collapsed || isMobile) && (
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 5,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
      </div>
    </motion.aside>
    </>
  )
}
