import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Plus, Bell, Command, X, ChevronRight, Sun, Moon, Menu, UserPlus, Star, RefreshCw, Pencil } from 'lucide-react'
import { useTalentStore } from '../../store/talentStore'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import TalentAvatar from '../ui/TalentAvatar'
import type { Activity } from '../../types/database'

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function activityIcon(action: Activity['action']) {
  switch (action) {
    case 'PROFILE_CREATED': return <UserPlus size={14} />
    case 'SHORTLISTED':
    case 'FAVORITED': return <Star size={14} />
    case 'STATUS_CHANGED': return <RefreshCw size={14} />
    case 'PROFILE_UPDATED': return <Pencil size={14} />
    default: return <Bell size={14} />
  }
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/talent': 'Talent Directory',
  '/kanban': 'Pipeline',
  '/shortlisted': 'Shortlisted',
  '/favorites': 'Favorites',
  '/compare': 'Compare',
  '/evaluations': 'Evaluations',
  '/search': 'Search',
  '/settings': 'Settings',
  '/audit': 'Audit Log',
  '/about': 'About & Guide',
}

interface TopbarProps {
  onMenuToggle?: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const profiles = useTalentStore((s) => s.profiles)
  const activities = useTalentStore((s) => s.activities)
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const pageTitle = Object.entries(routeLabels).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || 'TIH'

  const results =
    query.length > 1
      ? profiles
          .filter(
            (p) =>
              p.full_name.toLowerCase().includes(query.toLowerCase()) ||
              p.primary_skills.some((s) => s.toLowerCase().includes(query.toLowerCase())) ||
              p.email?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 6)
      : []

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query) {
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setSearchOpen(false)
      setQuery('')
    }
    if (e.key === 'Escape') {
      setSearchOpen(false)
      setQuery('')
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 'var(--topbar-h)',
        padding: '0 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        flexShrink: 0,
        gap: 16,
        zIndex: 30,
      }}
    >
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Hamburger — only visible on mobile via CSS */}
        <button
          className="mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Open navigation"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 6px', marginRight: 4, borderRadius: 6, alignItems: 'center' }}
        >
          <Menu size={18} />
        </button>
        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Figtree, sans-serif' }}>TIH</span>
        <ChevronRight size={11} color="var(--text-muted)" />
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: "'Figtree', sans-serif",
            letterSpacing: '-0.01em',
          }}
        >
          {pageTitle}
        </span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search talent... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleKeyDown}
            className="input-field"
            style={{ paddingLeft: 32, paddingRight: query ? 32 : 60, height: 34, fontSize: 13 }}
          />
          {query ? (
            <button
              onClick={() => { setQuery(''); setSearchOpen(false) }}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          ) : (
            <div
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
            >
              <Command size={10} />
              <span style={{ fontSize: 10, fontFamily: 'monospace' }}>K</span>
            </div>
          )}
        </div>

        {/* Quick results */}
        {searchOpen && query.length > 1 && (
          <>
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'scaleIn 0.15s ease',
              }}
            >
              {results.length > 0 ? (
                <>
                  {results.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        navigate(`/talent/${p.id}`)
                        setSearchOpen(false)
                        setQuery('')
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                    >
                      <TalentAvatar name={p.full_name} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {p.talent_type} · {p.location || 'No location'}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--accent-bright)', flexShrink: 0 }}>{p.status}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(query)}`)
                      setSearchOpen(false)
                      setQuery('')
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--accent)',
                      textAlign: 'center',
                      fontWeight: 500,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-dim)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    View all results for "{query}"
                  </button>
                </>
              ) : (
                <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                  No results for "{query}"
                </div>
              )}
            </div>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
              onClick={() => { setSearchOpen(false); setQuery('') }}
            />
          </>
        )}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-ghost"
          style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}
          title="Toggle theme"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={() => navigate('/talent/new')}
          className="btn-primary"
          style={{ height: 34, padding: '0 14px', fontSize: 12 }}
        >
          <Plus size={13} />
          <span>Add Talent</span>
        </button>

        <div style={{ position: 'relative' }}>
          {(() => {
            const recentActivities = [...activities]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
            const has24h = activities.some(
              (a) => Date.now() - new Date(a.created_at).getTime() < 86400000
            )
            return (
              <>
                <button
                  className="btn-ghost"
                  style={{ padding: '6px 8px', position: 'relative' }}
                  title="Notifications"
                  aria-label="Notifications"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={16} />
                  {has24h && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        width: 5,
                        height: 5,
                        background: 'var(--accent)',
                        borderRadius: '50%',
                        border: '1.5px solid var(--bg-primary)',
                      }}
                    />
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 300,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100,
                        animation: 'scaleIn 0.15s ease',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)' }}>
                        <span>Notifications</span>
                        <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
                          Mark all read
                        </button>
                      </div>
                      {recentActivities.length === 0 ? (
                        <div style={{ padding: '32px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                          <Bell size={24} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                          You're all caught up!
                        </div>
                      ) : (
                        <div style={{ overflowY: 'auto', maxHeight: 340 }}>
                          {recentActivities.map((activity) => (
                            <div
                              key={activity.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                padding: '10px 14px',
                                borderBottom: '1px solid var(--border)',
                              }}
                            >
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--accent-dim)',
                                color: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {activityIcon(activity.action)}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                  {activity.description}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {relativeTime(activity.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                      onClick={() => setShowNotifications(false)}
                    />
                  </>
                )}
              </>
            )
          })()}
        </div>

        <button
          className="btn-ghost"
          style={{ padding: 2 }}
          onClick={() => navigate('/settings')}
          aria-label="Account settings"
          title="Account settings"
        >
          <TalentAvatar name={user?.full_name || 'U'} size={28} />
        </button>
      </div>
    </header>
  )
}
