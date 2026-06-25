import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, KanbanSquare, Star, Heart,
  GitCompare, ClipboardList, Search, Settings, ScrollText,
  FileText, Tag, Plus, Filter, Upload, Eye,
  ArrowRight, LogOut, Sparkles, Command, ChevronRight,
  BarChart2, Activity, Zap, RefreshCw, Trash2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3 },
  }),
}

interface PageCardProps {
  icon: React.ElementType
  title: string
  path: string
  description: string
  features: string[]
  index: number
}

function PageCard({ icon: Icon, title, path, description, features, index }: PageCardProps) {
  const navigate = useNavigate()
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      onClick={() => navigate(path)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'rgba(94,106,210,0.10)',
            border: '1px solid rgba(94,106,210,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={15} color="#8a92d8" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif" }}>
              {title}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{path}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{description}</p>
        </div>
        <ChevronRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 10 }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginLeft: 46 }}>
        {features.map((f, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 99,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

interface FeatureRowProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureRow({ icon: Icon, title, description }: FeatureRowProps) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} color="var(--text-muted)" />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</div>
      </div>
    </div>
  )
}

const PAGES: Omit<PageCardProps, 'index'>[] = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    path: '/dashboard',
    description: 'Your command center - shows live stats for every pipeline stage, source distribution, top-rated talent, and a chronological activity feed.',
    features: ['6 stat widgets', 'Pipeline bar chart', 'Source pie chart', 'Top rated list', 'Activity feed', 'Type distribution'],
  },
  {
    icon: Users,
    title: 'Talent Directory',
    path: '/talent',
    description: 'Browse all talent profiles in a sortable table or card grid. Filter by type, source, status, skills, location, and experience. Toggle between table and grid view.',
    features: ['Table & card view', 'Multi-filter', 'Sort columns', '1-click shortlist', '1-click favorite', 'Bulk actions', 'Search bar'],
  },
  {
    icon: KanbanSquare,
    title: 'Kanban Pipeline',
    path: '/kanban',
    description: 'Drag-and-drop board showing every talent card organized by pipeline stage. Move cards between New â†’ Under Review â†’ Shortlisted â†’ Approved â†’ Engaged/Rejected.',
    features: ['Drag-drop cards', '6 columns', 'Count badges', 'Quick navigate', 'Live updates'],
  },
  {
    icon: Star,
    title: 'Shortlisted',
    path: '/shortlisted',
    description: 'Focused view of all profiles marked as shortlisted. Quickly compare and review candidates you\'ve moved forward in the pipeline.',
    features: ['Shortlisted only', 'Remove shortlist', 'Open profile', 'Filter within'],
  },
  {
    icon: Heart,
    title: 'Favorites',
    path: '/favorites',
    description: 'Profiles you\'ve starred for quick access. Use favorites to bookmark talent you want to revisit frequently without affecting pipeline status.',
    features: ['Starred profiles', 'Un-favorite', 'Open profile'],
  },
  {
    icon: GitCompare,
    title: 'Compare',
    path: '/compare',
    description: 'Side-by-side comparison of 2 to 5 talent profiles. Compare skills, experience, compensation expectations, location, rating, and status at a glance.',
    features: ['2-5 profiles', 'Side-by-side rows', 'Skills comparison', 'Rating comparison', 'Remove from compare'],
  },
  {
    icon: ClipboardList,
    title: 'Evaluations',
    path: '/evaluations',
    description: 'Add structured evaluations for any talent profile. Score dimensions like communication, expertise, and culture fit out of 5. Add written feedback.',
    features: ['Score out of 5', 'Multiple metrics', 'Written feedback', 'Multiple evaluators', 'Auto-average rating'],
  },
  {
    icon: Search,
    title: 'Advanced Search',
    path: '/search',
    description: 'Full-text search across all profile fields - name, email, skills, notes, certifications, and organization. Combine with filters and save searches for reuse.',
    features: ['Full-text search', 'Save searches', 'Multi-filter', 'Sort results', 'âŒ˜K shortcut'],
  },
  {
    icon: Settings,
    title: 'Settings',
    path: '/settings',
    description: 'Manage your profile, create and delete talent tags, configure appearance density, and access the danger zone for resetting data.',
    features: ['Profile info', 'Manage tags', 'Tag colors', 'Appearance', 'Reset data', 'Delete all'],
  },
  {
    icon: ScrollText,
    title: 'Audit Log',
    path: '/audit',
    description: 'A timestamped log of every action taken in the system - profile created, updated, shortlisted, evaluated, and status changes. Useful for team accountability.',
    features: ['All actions', 'Timestamps', 'Action type', 'Filter log', 'Click to view profile'],
  },
]

const FEATURES: FeatureRowProps[] = [
  {
    icon: Plus,
    title: 'Adding Talent Manually',
    description: 'Click "Add Talent" in the top bar or sidebar. Fill in 8 sections: Personal Info, Classification (type & source), Professional details, Skills, Links, Resume upload, Tags, and Notes. Hit "Create Profile" at the bottom.',
  },
  {
    icon: Upload,
    title: 'Resume Auto-Fill (PDF Parser)',
    description: 'In the "Add Talent" form, scroll to Section 6 - Resume Auto-Fill. Drop a PDF onto the upload zone. The parser extracts name, email, phone, location, LinkedIn, job title, current company, skills, experience, and certifications automatically.',
  },
  {
    icon: Tag,
    title: 'Tags System',
    description: 'Tags are flexible labels you create in Settings â†’ Tags. Apply multiple tags to any profile (e.g. "AI/ML", "Remote", "Senior", "Enterprise"). Filter the talent directory by tags to quickly find grouped profiles.',
  },
  {
    icon: Search,
    title: 'Search & Saved Searches',
    description: 'Use âŒ˜K (or Ctrl+K) to open the global search spotlight anywhere. In the Search page, build complex filter combinations and save them with a name for instant reuse later.',
  },
  {
    icon: Filter,
    title: 'Filtering the Directory',
    description: 'Open the Talent Directory and click the Filters button. Filter by talent type, source channel, pipeline status, location, years of experience range, minimum rating, and specific tags. Filters stack - use multiple at once.',
  },
  {
    icon: GitCompare,
    title: 'Comparing Profiles',
    description: 'In the Talent Directory, check the checkbox on 2-5 profiles, then click "Compare Selected". Or open individual profiles and use the Compare button. The compare table shows all key fields side-by-side.',
  },
  {
    icon: BarChart2,
    title: 'Evaluating Talent',
    description: 'Open any talent profile, go to the Evaluations tab, and click "Add Evaluation". Score each dimension (Communication, Technical Skill, Cultural Fit, etc.) from 1-5. The overall rating auto-averages across all evaluations.',
  },
  {
    icon: Activity,
    title: 'Activity Timeline',
    description: 'Every talent profile has an Activity tab showing a chronological log of everything that happened - created, status changed, evaluated, shortlisted, favorited, etc. Useful for seeing the full history at a glance.',
  },
  {
    icon: Eye,
    title: 'View Modes',
    description: 'The Talent Directory supports two views: Table (compact rows with sortable columns, ideal for scanning many profiles) and Grid (card-based view showing more detail, ideal for visual browsing).',
  },
  {
    icon: FileText,
    title: 'Duplicate Detection',
    description: 'When adding a new profile, TIH checks for duplicates based on email address, phone number, and LinkedIn URL. If a match is found, a warning appears so you can review the existing record before saving.',
  },
  {
    icon: RefreshCw,
    title: 'Reset Demo Data',
    description: 'Go to Settings â†’ Danger Zone â†’ Reset to Demo Data to restore the 10 sample profiles if you\'ve deleted or modified them during testing.',
  },
  {
    icon: Trash2,
    title: 'Deleting Profiles',
    description: 'Open a talent profile and use the â‹¯ actions menu â†’ Delete Profile. You\'ll see a confirmation dialog. Deleted profiles are removed permanently from local storage.',
  },
]

const SHORTCUTS = [
  { keys: ['âŒ˜', 'K'], description: 'Open global search spotlight' },
  { keys: ['â†‘', 'â†“'], description: 'Navigate search results' },
  { keys: ['â†µ'], description: 'Open selected result / submit search' },
  { keys: ['Esc'], description: 'Close search / dismiss modal' },
]

export default function AboutPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 28px 80px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 40 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#5e6ad2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: "'Figtree', sans-serif",
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              TIH Platform - User Guide
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Talent Intelligence Hub · Version 1.0
            </div>
          </div>
        </div>

        {/* Account card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#5e6ad2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {user?.email} · {user?.organization_name || 'TIH'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/settings')}
              className="btn-secondary"
              style={{ height: 32, fontSize: 12 }}
            >
              <Settings size={12} />
              Settings
            </button>
            <button
              onClick={handleLogout}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 12px',
                borderRadius: 8,
                background: 'rgba(229,72,77,0.08)',
                border: '1px solid rgba(229,72,77,0.18)',
                color: 'var(--danger)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(229,72,77,0.15)'
                e.currentTarget.style.borderColor = 'rgba(229,72,77,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(229,72,77,0.08)'
                e.currentTarget.style.borderColor = 'rgba(229,72,77,0.18)'
              }}
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </div>
      </motion.div>

      {/* What is TIH */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ marginBottom: 36 }}
      >
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          About
        </h2>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '18px 20px',
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Talent Intelligence Hub (TIH)</strong> is a centralized
            talent repository and evaluation platform. It helps teams collect, organize, evaluate, compare,
            and manage talent profiles sourced from WhatsApp, LinkedIn, referrals, email, job portals, and
            manual submissions - all in one place.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '10px 0 0' }}>
            TIH supports any talent category: Trainers, Consultants, Employees, Speakers, Mentors,
            Freelancers, and Contractors. All data is stored locally in your browser and is ready to
            connect to a Supabase backend whenever you're ready.
          </p>
        </div>
      </motion.div>

      {/* Pages Guide */}
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Pages Guide
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PAGES.map((page, i) => (
            <PageCard key={page.path} {...page} index={i} />
          ))}
        </div>
      </div>

      {/* Features & How-to */}
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Features & How-to
        </h2>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '0 20px',
          }}
        >
          {FEATURES.map((f, i) => (
            <div key={i} style={{ borderBottom: i < FEATURES.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <FeatureRow {...f} />
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 12,
          }}
        >
          Keyboard Shortcuts
        </h2>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 20px',
                borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.description}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 22,
                      height: 22,
                      padding: '0 6px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 5,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
        }}
      >
        {[
          { label: 'Add Talent', path: '/talent/new', icon: Plus },
          { label: 'View Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { label: 'Open Kanban', path: '/kanban', icon: KanbanSquare },
        ].map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '10px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <link.icon size={13} />
            {link.label}
            <ArrowRight size={11} />
          </button>
        ))}
      </motion.div>

      {/* Footer */}
      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={12} color="var(--text-muted)" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            TIH v1.0 · Built with React + TypeScript + Supabase
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Command size={10} color="var(--text-muted)" />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Press ⌘K to search anywhere</span>
        </div>
      </div>
    </div>
  )
}


