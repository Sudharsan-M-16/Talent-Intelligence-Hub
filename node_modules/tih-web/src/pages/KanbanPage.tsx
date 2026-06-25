import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, DragOverlay, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentProfile, TalentStatus } from '../types/database'
import RatingStars from '../components/ui/RatingStars'
import TalentAvatar from '../components/ui/TalentAvatar'
import { InlineErrorBoundary } from '../components/ErrorBoundary'

const COLUMNS: { status: TalentStatus; color: string; bg: string }[] = [
  { status: 'New', color: '#60a5fa', bg: 'rgba(59,130,246,0.08)' },
  { status: 'Under Review', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)' },
  { status: 'Shortlisted', color: '#a78bfa', bg: 'rgba(139,92,246,0.08)' },
  { status: 'Approved', color: '#34d399', bg: 'rgba(16,185,129,0.08)' },
  { status: 'Engaged', color: '#22d3ee', bg: 'rgba(6,182,212,0.08)' },
  { status: 'Rejected', color: '#f87171', bg: 'rgba(239,68,68,0.08)' },
]

const VALID_STATUSES = COLUMNS.map((c) => c.status)

interface KanbanCardProps {
  profile: TalentProfile
  isDragging?: boolean
  onClick?: () => void
}

function KanbanCard({ profile, isDragging, onClick }: KanbanCardProps) {
  return (
    <div
      className="kanban-card"
      role="button"
      aria-label={`${profile.full_name} — ${profile.talent_type}, ${profile.status}`}
      tabIndex={0}
      style={isDragging ? { opacity: 0.35, cursor: 'grabbing' } : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <TalentAvatar name={profile.full_name} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.full_name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.talent_type}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
        {profile.primary_skills.slice(0, 2).map((s) => (
          <span key={s} className="skill-chip primary" style={{ fontSize: 9, padding: '1px 5px' }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {profile.overall_rating ? (
          <RatingStars rating={profile.overall_rating} size={10} showValue />
        ) : (
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>No rating</span>
        )}
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{profile.source}</span>
      </div>
    </div>
  )
}

function SortableCard({ profile, onClick }: { profile: TalentProfile; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: profile.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <KanbanCard profile={profile} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}

// Droppable column wrapper - this is what makes columns accept drops
function DroppableColumn({
  status, color, bg, cards, onCardClick,
}: {
  status: TalentStatus
  color: string
  bg: string
  cards: TalentProfile[]
  onCardClick: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      className="kanban-col"
      role="region"
      aria-label={`${status} column — ${cards.length} profiles`}
      style={{ minWidth: 252, maxWidth: 252 }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 2px 12px',
          borderBottom: `2px solid ${color}33`,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Figtree, sans-serif' }}>{status}</span>
        </div>
        <span
          style={{
            minWidth: 20, height: 20, borderRadius: 99,
            background: bg, border: `1px solid ${color}33`,
            color, fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
          }}
        >
          {cards.length}
        </span>
      </div>

      {/* Droppable cards area */}
      <SortableContext id={status} items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          style={{
            flex: 1, overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            borderRadius: 8,
            minHeight: 80,
            background: isOver ? `${color}10` : undefined,
            transition: 'background 0.15s ease',
          }}
        >
          {cards.map((profile) => (
            <SortableCard
              key={profile.id}
              profile={profile}
              onClick={() => onCardClick(profile.id)}
            />
          ))}
          {cards.length === 0 && (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center', fontSize: 12,
                color: isOver ? color : '#334155',
                border: `1px dashed ${isOver ? color + '55' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8, marginTop: 4,
                transition: 'all 0.15s ease',
              }}
            >
              {isOver ? 'â†“ Drop here' : 'Drop cards here'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanPage() {
  const navigate = useNavigate()
  const { profiles } = useTalentStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const active = profiles.filter((p) => p.is_active)
  const byStatus = (status: TalentStatus) => active.filter((p) => p.status === status)
  const activeProfile = activeId ? active.find((p) => p.id === activeId) : null

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return

    const draggedId = active.id as string
    const overId = over.id as string

    // Determine target status:
    // Case 1: dropped directly onto a column (over.id is a status string like "New")
    // Case 2: dropped onto another card (over.id is a UUID) - find that card's status
    let targetStatus: TalentStatus | null = null

    if (VALID_STATUSES.includes(overId as TalentStatus)) {
      targetStatus = overId as TalentStatus
    } else {
      const overProfile = active ? profiles.find((p) => p.id === overId) : null
      if (overProfile) targetStatus = overProfile.status
    }

    if (!targetStatus) return

    const profile = profiles.find((p) => p.id === draggedId)
    if (!profile || profile.status === targetStatus) return

    useTalentStore.getState().updateStatus(draggedId, targetStatus)
    toast.success(`${profile.full_name} â†’ ${targetStatus}`)
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>Pipeline</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            {active.length} profiles · Drag cards to change status
          </p>
        </div>
        <button onClick={() => navigate('/talent/new')} className="btn-primary">
          + Add Talent
        </button>
      </div>

      {/* Board */}
      <InlineErrorBoundary label="Kanban board">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            role="region"
            aria-label="Talent pipeline board"
            style={{ display: 'flex', gap: 14, overflowX: 'auto', flex: 1, paddingBottom: 8 }}
          >
            {COLUMNS.map(({ status, color, bg }) => (
              <DroppableColumn
                key={status}
                status={status}
                color={color}
                bg={bg}
                cards={byStatus(status)}
                onCardClick={(id) => navigate(`/talent/${id}`)}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeProfile && (
              <div style={{ width: 252, opacity: 0.9, transform: 'rotate(2deg)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                <KanbanCard profile={activeProfile} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </InlineErrorBoundary>
    </div>
  )
}




