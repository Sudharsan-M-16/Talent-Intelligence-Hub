import { describe, it, expect, beforeEach } from 'vitest'
import { useTalentStore } from '../store/talentStore'
import type { TalentProfile } from '../types/database'

function makeProfile(overrides: Partial<TalentProfile> = {}): TalentProfile {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    organization_id: 'demo-org-001',
    full_name: 'Test User',
    talent_type: 'Trainer',
    source: 'Manual',
    status: 'New',
    primary_skills: ['JavaScript'],
    secondary_skills: [],
    certifications: [],
    domains: [],
    is_shortlisted: false,
    is_favorite: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('talentStore — extended edge cases', () => {
  beforeEach(() => {
    useTalentStore.setState({
      profiles: [],
      savedSearches: [],
      activities: [],
      compareIds: [],
      selectedIds: [],
      filters: {},
    })
  })

  // ── Activity auto-logging ─────────────────────────────────────────────────

  it('logs PROFILE_CREATED activity when addProfile is called', () => {
    const p = makeProfile({ full_name: 'Alice' })
    useTalentStore.getState().addProfile(p)
    const { activities } = useTalentStore.getState()
    const created = activities.find((a) => a.action === 'PROFILE_CREATED' && a.talent_id === p.id)
    expect(created).toBeDefined()
    expect(created?.description).toContain('Alice')
  })

  it('logs STATUS_CHANGED activity when updateStatus is called', () => {
    const p = makeProfile({ status: 'New' })
    useTalentStore.getState().addProfile(p)
    useTalentStore.getState().updateStatus(p.id, 'Approved')
    const { activities } = useTalentStore.getState()
    const statusAct = activities.find((a) => a.action === 'STATUS_CHANGED' && a.talent_id === p.id)
    expect(statusAct).toBeDefined()
    expect(statusAct?.description).toContain('Approved')
  })

  it('logs SHORTLISTED activity only when shortlisting (not unshortlisting)', () => {
    const p = makeProfile({ is_shortlisted: false })
    useTalentStore.setState({ profiles: [p] })
    useTalentStore.getState().toggleShortlist(p.id) // shortlist → should log
    const countAfterShortlist = useTalentStore.getState().activities.filter(
      (a) => a.action === 'SHORTLISTED' && a.talent_id === p.id
    ).length
    expect(countAfterShortlist).toBe(1)

    useTalentStore.getState().toggleShortlist(p.id) // unshortlist → should NOT log again
    const countAfterUnshortlist = useTalentStore.getState().activities.filter(
      (a) => a.action === 'SHORTLISTED' && a.talent_id === p.id
    ).length
    expect(countAfterUnshortlist).toBe(1)
  })

  it('logs FAVORITED activity only when favoriting (not unfavoriting)', () => {
    const p = makeProfile({ is_favorite: false })
    useTalentStore.setState({ profiles: [p] })
    useTalentStore.getState().toggleFavorite(p.id) // favorite → should log
    const countAfterFavorite = useTalentStore.getState().activities.filter(
      (a) => a.action === 'FAVORITED' && a.talent_id === p.id
    ).length
    expect(countAfterFavorite).toBe(1)

    useTalentStore.getState().toggleFavorite(p.id) // unfavorite → should NOT log again
    const countAfterUnfavorite = useTalentStore.getState().activities.filter(
      (a) => a.action === 'FAVORITED' && a.talent_id === p.id
    ).length
    expect(countAfterUnfavorite).toBe(1)
  })

  // ── Filter edge cases ─────────────────────────────────────────────────────

  it('filteredProfiles respects is_shortlisted filter', () => {
    const p1 = makeProfile({ is_shortlisted: true })
    const p2 = makeProfile({ is_shortlisted: false })
    useTalentStore.setState({ profiles: [p1, p2], filters: { is_shortlisted: true } })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(p1.id)
  })

  it('filteredProfiles respects is_favorite filter', () => {
    const p1 = makeProfile({ is_favorite: true })
    const p2 = makeProfile({ is_favorite: false })
    useTalentStore.setState({ profiles: [p1, p2], filters: { is_favorite: true } })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(p1.id)
  })

  it('filteredProfiles filters by min_rating', () => {
    const p1 = makeProfile({ overall_rating: 4.5 })
    const p2 = makeProfile({ overall_rating: 2.0 })
    useTalentStore.setState({ profiles: [p1, p2], filters: { min_rating: 4 } })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(p1.id)
  })

  it('filteredProfiles filters by location (case-insensitive)', () => {
    const p1 = makeProfile({ location: 'Chennai' })
    const p2 = makeProfile({ location: 'Mumbai' })
    useTalentStore.setState({ profiles: [p1, p2], filters: { location: 'chennai' } })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result).toHaveLength(1)
    expect(result[0].location).toBe('Chennai')
  })

  // ── is_active exclusion ───────────────────────────────────────────────────

  it('filteredProfiles only includes is_active profiles', () => {
    const active = makeProfile({ is_active: true, full_name: 'Active User' })
    const inactive = makeProfile({ is_active: false, full_name: 'Inactive User' })
    useTalentStore.setState({ profiles: [active, inactive], filters: {} })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result.some((p) => p.full_name === 'Active User')).toBe(true)
    expect(result.some((p) => p.full_name === 'Inactive User')).toBe(false)
  })

  it('filteredProfiles excludes inactive profiles even when matching other criteria', () => {
    const p = makeProfile({ is_active: false, status: 'Approved', full_name: 'Inactive Approved' })
    useTalentStore.setState({ profiles: [p], filters: { status: ['Approved'] } })
    const result = useTalentStore.getState().filteredProfiles()
    expect(result).toHaveLength(0)
  })
})
