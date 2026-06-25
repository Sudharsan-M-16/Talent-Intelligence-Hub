import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Tag as TagIcon, Search, Palette, AlertTriangle, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { useTalentStore } from '../store/talentStore'
import { demoProfiles, demoTags } from '../lib/demoData'
import TalentAvatar from '../components/ui/TalentAvatar'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'tags', label: 'Tags', icon: TagIcon },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

const TAG_PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#64748b', '#14b8a6',
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const { user } = useAuthStore()
  const { tags } = useTalentStore()
  const [localTags, setLocalTags] = useState(tags)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    setLocalTags(tags)
  }, [tags])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366f1')
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable')

  const addTag = () => {
    if (!newTagName.trim()) { toast.error('Enter a tag name'); return }
    if (localTags.some((t) => t.name.toLowerCase() === newTagName.toLowerCase())) {
      toast.error('Tag already exists')
      return
    }
    useTalentStore.getState().addTag({
      organization_id: 'demo-org-001',
      name: newTagName.trim(),
      color: newTagColor,
    })
    toast.success(`Tag "${newTagName}" created`)
    setNewTagName('')
    setNewTagColor('#6366f1')
  }

  const deleteTag = (id: string) => {
    useTalentStore.getState().deleteTag(id)
    toast.success('Tag deleted')
  }

  const resetDemo = () => {
    useTalentStore.getState().setProfiles(demoProfiles)
    demoTags.forEach((tag) => {
      if (!useTalentStore.getState().tags.find((t) => t.id === tag.id)) {
        useTalentStore.getState().addTag({ organization_id: tag.organization_id, name: tag.name, color: tag.color })
      }
    })
    // Reset tags directly via setState for full replacement
    useTalentStore.setState({ tags: demoTags })
    toast.success('Data reset to demo state')
  }

  const clearAll = () => {
    useTalentStore.getState().setProfiles([])
    toast.success('All profiles deleted')
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your account and platform preferences</p>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div
          style={{
            width: 180,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 8,
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-bright)' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                marginBottom: 2,
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Profile tab */}
            {activeTab === 'profile' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", marginBottom: 20 }}>Profile</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <TalentAvatar name={user?.full_name || 'User'} size={56} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.email}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, background: 'var(--accent-dim)', color: 'var(--accent-bright)', fontSize: 11, fontWeight: 600, marginTop: 6, textTransform: 'capitalize' }}>
                      {user?.role}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="form-label">Full Name</label>
                    <input className="input-field" defaultValue={user?.full_name || ''} placeholder="Your name" readOnly />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input className="input-field" defaultValue={user?.email || ''} placeholder="your@email.com" readOnly />
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <input className="input-field" defaultValue={user?.role || ''} readOnly style={{ textTransform: 'capitalize', opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="form-label">Organization</label>
                    <input className="input-field" defaultValue="Talent Intelligence Hub" readOnly style={{ opacity: 0.7 }} />
                  </div>
                </div>
                <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Profile details are managed by your administrator. Contact admin to make changes.
                </p>
              </div>
            )}

            {/* Tags tab */}
            {activeTab === 'tags' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", marginBottom: 20 }}>Manage Tags</h2>

                {/* Add new tag */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Create New Tag</div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Tag Name</label>
                      <input
                        className="input-field"
                        placeholder="e.g. AI/ML, Remote, Senior"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        style={{ height: 36 }}
                      />
                    </div>
                    <div>
                      <label className="form-label">Color</label>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                        {TAG_PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewTagColor(c)}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: c,
                              border: newTagColor === c ? `3px solid white` : '2px solid transparent',
                              cursor: 'pointer',
                              boxShadow: newTagColor === c ? `0 0 0 2px ${c}` : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <button onClick={addTag} className="btn-primary" style={{ height: 36, flexShrink: 0 }}>
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {newTagName && (
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 8 }}>Preview:</span>
                      <span style={{ padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${newTagColor}1a`, color: newTagColor, border: `1px solid ${newTagColor}33` }}>
                        {newTagName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Existing tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {localTags.map((tag) => (
                    <div
                      key={tag.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: 9,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color }} />
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${tag.color}1a`,
                            color: tag.color,
                            border: `1px solid ${tag.color}33`,
                          }}
                        >
                          {tag.name}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTag(tag.id)}
                        className="btn-ghost"
                        style={{ color: '#ef4444', padding: '4px 6px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Appearance tab */}
            {activeTab === 'appearance' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", marginBottom: 20 }}>Appearance</h2>

                <div style={{ marginBottom: 24 }}>
                  <label className="form-label" style={{ marginBottom: 12 }}>Theme</label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Dark Mode</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>Always on - designed exclusively for dark mode</div>
                    </div>
                    <div
                      style={{
                        width: 42,
                        height: 24,
                        borderRadius: 99,
                        background: 'var(--accent)',
                        position: 'relative',
                        cursor: 'not-allowed',
                      }}
                    >
                      <div style={{ position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'white' }} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ marginBottom: 12 }}>Density</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['compact', 'comfortable', 'spacious'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => { setDensity(d); toast.success(`Density: ${d}`) }}
                        style={{
                          flex: 1,
                          padding: '12px 8px',
                          borderRadius: 10,
                          border: '1px solid',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          background: density === d ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)',
                          borderColor: density === d ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)',
                          color: density === d ? 'var(--accent-bright)' : 'var(--text-secondary)',
                          fontSize: 13,
                          fontWeight: density === d ? 600 : 400,
                          textAlign: 'center' as const,
                          transition: 'all 0.15s',
                          textTransform: 'capitalize' as const,
                        }}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Danger Zone tab */}
            {activeTab === 'danger' && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <AlertTriangle size={18} color="#ef4444" />
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif" }}>Danger Zone</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      border: '1px solid rgba(239,68,68,0.15)',
                      borderRadius: 10,
                      background: 'rgba(239,68,68,0.04)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Reset to Demo Data</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Restore the default demo talent profiles and tags</div>
                    </div>
                    <button onClick={() => setShowResetConfirm(true)} className="btn-secondary" style={{ height: 34, fontSize: 12, gap: 6 }}>
                      <RefreshCw size={13} /> Reset Data
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 10,
                      background: 'rgba(239,68,68,0.06)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger)' }}>Delete All Profiles</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Permanently delete all talent profiles. This cannot be undone.</div>
                    </div>
                    <button onClick={() => setShowClearConfirm(true)} className="btn-danger" style={{ height: 34, fontSize: 12 }}>
                      <Trash2 size={13} /> Delete All
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset to Demo Data"
        message="Reset all data to demo state? This will remove all your changes and restore the default demo profiles."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => { resetDemo(); setShowResetConfirm(false) }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        open={showClearConfirm}
        title="Delete All Profiles"
        message="Permanently delete ALL talent profiles? This cannot be undone."
        confirmLabel="Delete All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { clearAll(); setShowClearConfirm(false) }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  )
}

