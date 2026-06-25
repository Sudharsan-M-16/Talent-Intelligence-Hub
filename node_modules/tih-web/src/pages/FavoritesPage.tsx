import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Eye, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import StatusBadge from '../components/ui/StatusBadge'
import TalentAvatar from '../components/ui/TalentAvatar'
import RatingStars from '../components/ui/RatingStars'
import EmptyState from '../components/ui/EmptyState'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const { profiles } = useTalentStore()

  const favorites = profiles.filter((p) => p.is_favorite && p.is_active)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Favorites</h1>
        <span
          style={{
            padding: '2px 9px',
            background: 'rgba(236,72,153,0.12)',
            border: '1px solid rgba(236,72,153,0.2)',
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            color: '#f472b6',
          }}
        >
          {favorites.length}
        </span>
      </div>

      {favorites.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            description="Star talent profiles to see them here. Click the heart icon on any profile card or detail page."
            action={
              <button onClick={() => navigate('/talent')} className="btn-primary">
                Browse Talent Directory
              </button>
            }
          />
        </div>
      ) : (
        <div className="talent-grid">
          {favorites.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => navigate(`/talent/${p.id}`)}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = 'rgba(236,72,153,0.2)'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.2)'
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Heart indicator */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  color: '#ec4899',
                }}
              >
                <Heart size={14} fill="#ec4899" />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <TalentAvatar name={p.full_name} size={42} />
                <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {p.designation || p.talent_type}
                  </div>
                  {p.organization && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.organization}</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <StatusBadge status={p.status} size="sm" />
                {p.overall_rating && <RatingStars rating={p.overall_rating} size={11} showValue />}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                {p.primary_skills.slice(0, 3).map((s) => (
                  <span key={s} className="skill-chip primary" style={{ fontSize: 10, padding: '2px 7px' }}>{s}</span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', height: 30, fontSize: 12 }}
                  onClick={() => navigate(`/talent/${p.id}`)}
                >
                  <Eye size={12} /> View
                </button>
                <button
                  className="btn-ghost"
                  style={{ height: 30, padding: '0 10px', color: '#ec4899' }}
                  onClick={() => {
                    useTalentStore.getState().toggleFavorite(p.id)
                    toast.success('Removed from favorites')
                  }}
                >
                  <Heart size={12} fill="#ec4899" />
                </button>
                <button
                  className="btn-ghost"
                  style={{ height: 30, padding: '0 10px', color: p.is_shortlisted ? '#fbbf24' : undefined }}
                  onClick={() => {
                    useTalentStore.getState().toggleShortlist(p.id)
                    toast.success(p.is_shortlisted ? 'Removed from shortlist' : 'Shortlisted')
                  }}
                >
                  <Star size={12} fill={p.is_shortlisted ? '#fbbf24' : 'none'} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

