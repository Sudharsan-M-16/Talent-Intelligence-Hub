import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import type { TalentProfile, Tag, TalentFilters, SavedSearch, Activity } from '../types/database'
import { demoProfiles, demoTags } from '../lib/demoData'
import { supabase, isSupabaseReady } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

let _realtimeChannel: RealtimeChannel | null = null

import {
  fetchProfiles,
  fetchTags,
  fetchActivities,
  fetchSavedSearches,
  createProfileInDb,
  updateProfileInDb,
  softDeleteProfile,
  bulkUpdateStatusInDb,
  createTagInDb,
  updateTagInDb,
  deleteTagInDb,
  logActivityInDb,
  createSavedSearchInDb,
  deleteSavedSearchInDb,
} from '../lib/talentService'

// The one account whose org gets seeded with demo profiles on first login
const SEED_EMAIL = 'sudhum16@gmail.com'

interface TalentStore {
  profiles: TalentProfile[]
  tags: Tag[]
  filters: TalentFilters
  selectedIds: string[]
  compareIds: string[]
  viewMode: 'table' | 'grid' | 'kanban'
  savedSearches: SavedSearch[]
  activities: Activity[]

  // Supabase context (set after login — not persisted to localStorage)
  orgId: string | null
  userId: string | null
  isLoadingData: boolean

  // Actions
  setOrgContext: (orgId: string, userId: string) => void
  loadFromSupabase: (orgId: string, userId: string, userEmail?: string) => Promise<void>

  setProfiles: (profiles: TalentProfile[]) => void
  addProfile: (profile: TalentProfile) => void
  addProfiles: (profiles: TalentProfile[]) => void
  updateProfile: (id: string, updates: Partial<TalentProfile>) => void
  deleteProfile: (id: string) => void
  toggleShortlist: (id: string) => void
  toggleFavorite: (id: string) => void
  setFilters: (filters: TalentFilters) => void
  clearFilters: () => void
  setSelectedIds: (ids: string[]) => void
  toggleCompare: (id: string) => void
  clearCompare: () => void
  setViewMode: (mode: 'table' | 'grid' | 'kanban') => void
  updateStatus: (id: string, status: TalentProfile['status']) => void
  saveSearch: (name: string, filters: TalentFilters) => void
  deleteSavedSearch: (id: string) => void
  addActivity: (activity: Omit<Activity, 'id' | 'created_at'>) => void
  bulkUpdateStatus: (ids: string[], status: TalentProfile['status']) => void
  addTag: (tag: Omit<Tag, 'id' | 'created_at'>) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  deleteTag: (id: string) => void

  // Computed
  filteredProfiles: () => TalentProfile[]
}

export const useTalentStore = create<TalentStore>()(
  persist(
    (set, get) => ({
      profiles:      [],
      tags:          [],
      filters:       {},
      selectedIds:   [],
      compareIds:    [],
      viewMode:      'table',
      savedSearches: [],
      activities:    [],
      orgId:         null,
      userId:        null,
      isLoadingData: false,

      // ─── Supabase Context ──────────────────────────────────────────────────

      setOrgContext: (orgId, userId) => set({ orgId, userId }),

      loadFromSupabase: async (orgId, userId, userEmail?) => {
        if (!isSupabaseReady) return
        set({ isLoadingData: true, orgId, userId })
        try {
          const [profiles, tags, activities, savedSearches] = await Promise.all([
            fetchProfiles(orgId),
            fetchTags(orgId),
            fetchActivities(orgId),
            fetchSavedSearches(orgId, userId),
          ])

          if (profiles.length === 0) {
            const localProfiles = get().profiles

            if (localProfiles.length > 0) {
              // Supabase is empty but the browser cache has profiles — migrate them up.
              // This handles the case where the user had demo data in localStorage before
              // Supabase was connected. Runs silently; failures are non-fatal.
              await Promise.all(localProfiles.map((p) => {
                const { id: _id, ...rest } = p
                return createProfileInDb(
                  { ...rest, id: crypto.randomUUID(), organization_id: orgId },
                  orgId
                ).catch(() => null)
              }))
              const [migratedProfiles, migratedTags, migratedActivities] = await Promise.all([
                fetchProfiles(orgId),
                fetchTags(orgId),
                fetchActivities(orgId),
              ])
              set({ profiles: migratedProfiles.length > 0 ? migratedProfiles : localProfiles, tags: migratedTags.length > 0 ? migratedTags : tags, activities: migratedActivities, savedSearches })
            } else if (userEmail === SEED_EMAIL) {
              // Primary demo account — seed Supabase with the built-in demo profiles
              // so this account always has data regardless of localStorage state.
              await Promise.all(demoProfiles.map((p) => {
                const { id: _id, ...rest } = p
                return createProfileInDb(
                  { ...rest, id: crypto.randomUUID(), organization_id: orgId },
                  orgId
                ).catch(() => null)
              }))
              await Promise.all(demoTags.map((t) =>
                createTagInDb(
                  { name: t.name, color: t.color, organization_id: orgId },
                  orgId
                ).catch(() => null)
              ))
              const [seededProfiles, seededTags, seededActivities] = await Promise.all([
                fetchProfiles(orgId),
                fetchTags(orgId),
                fetchActivities(orgId),
              ])
              set({
                profiles: seededProfiles.length > 0 ? seededProfiles : demoProfiles,
                tags: seededTags.length > 0 ? seededTags : demoTags,
                activities: seededActivities,
                savedSearches,
              })
            } else {
              // New user — start with a clean blank slate.
              set({ profiles: [], tags: [], activities: [], savedSearches })
            }
          } else {
            set({ profiles, tags, activities, savedSearches })
          }

          // Set up real-time subscriptions so changes in other tabs/devices refresh local state
          if (_realtimeChannel) {
            supabase?.removeChannel(_realtimeChannel)
            _realtimeChannel = null
          }
          if (supabase) {
            _realtimeChannel = supabase
              .channel(`tih-org-${orgId}`)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'talent_profiles', filter: `org_id=eq.${orgId}` }, async () => {
                const updated = await fetchProfiles(orgId)
                set({ profiles: updated })
              })
              .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log', filter: `org_id=eq.${orgId}` }, async () => {
                const updated = await fetchActivities(orgId)
                set({ activities: updated })
              })
              .on('postgres_changes', { event: '*', schema: 'public', table: 'tags', filter: `org_id=eq.${orgId}` }, async () => {
                const updated = await fetchTags(orgId)
                set({ tags: updated })
              })
              .subscribe()
          }
        } catch (err) {
          console.error('[TIH] loadFromSupabase failed:', err)
        } finally {
          set({ isLoadingData: false })
        }
      },

      // ─── Profile Actions ───────────────────────────────────────────────────

      setProfiles: (profiles) => set({ profiles }),

      addProfile: (profile) => {
        // Optimistic update
        set((s) => ({ profiles: [profile, ...s.profiles] }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          createProfileInDb(profile, orgId).then((saved) => {
            if (!saved) {
              set((s) => ({ profiles: s.profiles.filter((p) => p.id !== profile.id) }))
              toast.error('Failed to save profile. Please try again.')
            }
            // DB trigger auto-logs PROFILE_CREATED in activity_log
          })
        } else {
          // Demo mode — log locally
          get().addActivity({
            organization_id: orgId ?? 'demo-org-001',
            talent_id:       profile.id,
            action:          'PROFILE_CREATED',
            description:     `New profile added for ${profile.full_name} via ${profile.source}`,
            created_by:      userId ?? 'demo-user-001',
          })
        }
      },

      addProfiles: (profiles) =>
        set((s) => ({ profiles: [...profiles, ...s.profiles] })),

      updateProfile: (id, updates) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          ),
        }))

        const { orgId } = get()
        if (isSupabaseReady && orgId) {
          updateProfileInDb(id, updates, orgId).then((ok) => {
            if (!ok) toast.error('Failed to update profile.')
          })
        }
      },

      deleteProfile: (id) => {
        const prev = get().profiles
        set((s) => ({
          profiles:    s.profiles.filter((p) => p.id !== id),
          compareIds:  s.compareIds.filter((cid) => cid !== id),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
        }))

        if (isSupabaseReady) {
          softDeleteProfile(id).then((ok) => {
            if (!ok) {
              set({ profiles: prev })
              toast.error('Failed to delete profile.')
            }
          })
        }
      },

      toggleShortlist: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        const wasShortlisted = profile?.is_shortlisted ?? false
        const newVal = !wasShortlisted

        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, is_shortlisted: newVal } : p
          ),
        }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          updateProfileInDb(id, { is_shortlisted: newVal }, orgId).then((ok) => {
            if (!ok) {
              set((s) => ({
                profiles: s.profiles.map((p) =>
                  p.id === id ? { ...p, is_shortlisted: wasShortlisted } : p
                ),
              }))
              toast.error('Failed to update shortlist status.')
              return
            }
            if (newVal && userId) {
              logActivityInDb(orgId, userId, {
                organization_id: orgId,
                talent_id:       id,
                action:          'SHORTLISTED',
                description:     'Profile shortlisted',
                created_by:      userId,
              })
            }
          })
        } else if (newVal) {
          get().addActivity({
            organization_id: orgId ?? 'demo-org-001',
            talent_id:       id,
            action:          'SHORTLISTED',
            description:     'Profile shortlisted',
            created_by:      userId ?? 'demo-user-001',
          })
        }
      },

      toggleFavorite: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        const wasFavorite = profile?.is_favorite ?? false
        const newVal = !wasFavorite

        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, is_favorite: newVal } : p
          ),
        }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          updateProfileInDb(id, { is_favorite: newVal }, orgId).then((ok) => {
            if (!ok) {
              set((s) => ({
                profiles: s.profiles.map((p) =>
                  p.id === id ? { ...p, is_favorite: wasFavorite } : p
                ),
              }))
              toast.error('Failed to update favorite status.')
              return
            }
            if (newVal && userId) {
              logActivityInDb(orgId, userId, {
                organization_id: orgId,
                talent_id:       id,
                action:          'FAVORITED',
                description:     'Profile added to favorites',
                created_by:      userId,
              })
            }
          })
        } else if (newVal) {
          get().addActivity({
            organization_id: orgId ?? 'demo-org-001',
            talent_id:       id,
            action:          'FAVORITED',
            description:     'Profile added to favorites',
            created_by:      userId ?? 'demo-user-001',
          })
        }
      },

      setFilters:     (filters) => set({ filters }),
      clearFilters:   () => set({ filters: {} }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),

      toggleCompare: (id) =>
        set((s) => {
          const exists = s.compareIds.includes(id)
          if (exists) return { compareIds: s.compareIds.filter((i) => i !== id) }
          if (s.compareIds.length >= 5) return s
          return { compareIds: [...s.compareIds, id] }
        }),

      clearCompare: () => set({ compareIds: [] }),
      setViewMode:  (mode) => set({ viewMode: mode }),

      updateStatus: (id, status) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
          ),
        }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          // DB trigger (trg_log_status_change) auto-logs STATUS_CHANGED
          updateProfileInDb(id, { status }, orgId).then((ok) => {
            if (!ok) toast.error('Failed to update status.')
          })
        } else {
          get().addActivity({
            organization_id: orgId ?? 'demo-org-001',
            talent_id:       id,
            action:          'STATUS_CHANGED',
            description:     `Status changed to ${status}`,
            created_by:      userId ?? 'demo-user-001',
          })
        }
      },

      saveSearch: (name, filters) => {
        const search: SavedSearch = {
          id:           crypto.randomUUID(),
          user_id:      get().userId ?? 'demo-user-001',
          name,
          filters_json: filters,
          created_at:   new Date().toISOString(),
        }
        set((s) => ({ savedSearches: [...s.savedSearches, search] }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId && userId) {
          createSavedSearchInDb(orgId, userId, name, filters).then((saved) => {
            if (!saved) {
              set((s) => ({ savedSearches: s.savedSearches.filter((ss) => ss.id !== search.id) }))
              toast.error('Failed to save search.')
            } else {
              // Replace temp id with DB-generated id
              set((s) => ({
                savedSearches: s.savedSearches.map((ss) =>
                  ss.id === search.id ? saved : ss
                ),
              }))
            }
          })
        }
      },

      deleteSavedSearch: (id) => {
        const prev = get().savedSearches
        set((s) => ({ savedSearches: s.savedSearches.filter((ss) => ss.id !== id) }))

        if (isSupabaseReady) {
          deleteSavedSearchInDb(id).then((ok) => {
            if (!ok) {
              set({ savedSearches: prev })
              toast.error('Failed to delete saved search.')
            }
          })
        }
      },

      addActivity: (activity) => {
        const newActivity: Activity = {
          ...activity,
          id:         crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ activities: [newActivity, ...s.activities] }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          logActivityInDb(orgId, userId ?? '', activity)
        }
      },

      bulkUpdateStatus: (ids, status) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            ids.includes(p.id) ? { ...p, status, updated_at: new Date().toISOString() } : p
          ),
        }))

        const { orgId, userId } = get()
        if (isSupabaseReady && orgId) {
          // DB trigger logs STATUS_CHANGED for each updated row automatically
          bulkUpdateStatusInDb(ids, status).then((ok) => {
            if (!ok) toast.error('Failed to update some statuses.')
          })
        } else {
          ids.forEach((id) => {
            get().addActivity({
              organization_id: orgId ?? 'demo-org-001',
              talent_id:       id,
              action:          'STATUS_CHANGED',
              description:     `Status changed to ${status}`,
              created_by:      userId ?? 'demo-user-001',
            })
          })
        }
      },

      // ─── Tag Actions ───────────────────────────────────────────────────────

      addTag: (tag) => {
        const tempId = crypto.randomUUID()
        const newTag: Tag = {
          ...tag,
          id:         tempId,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ tags: [...s.tags, newTag] }))

        const { orgId } = get()
        if (isSupabaseReady && orgId) {
          createTagInDb(tag, orgId).then((saved) => {
            if (!saved) {
              set((s) => ({ tags: s.tags.filter((t) => t.id !== tempId) }))
              toast.error('Failed to create tag.')
            } else {
              // Replace temp id with DB-generated id
              set((s) => ({
                tags: s.tags.map((t) => (t.id === tempId ? saved : t)),
              }))
            }
          })
        }
      },

      updateTag: (id, updates) => {
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }))
        if (isSupabaseReady) {
          updateTagInDb(id, updates).then((ok) => {
            if (!ok) toast.error('Failed to update tag.')
          })
        }
      },

      deleteTag: (id) => {
        const prev = get().tags
        set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }))
        if (isSupabaseReady) {
          deleteTagInDb(id).then((ok) => {
            if (!ok) {
              set({ tags: prev })
              toast.error('Failed to delete tag.')
            }
          })
        }
      },

      // ─── Computed ──────────────────────────────────────────────────────────

      /**
       * Returns only is_active profiles that pass all active filter criteria.
       * Filters are cumulative (AND logic). Skills filter uses OR (any skill matches).
       */
      filteredProfiles: () => {
        const { profiles, filters } = get()
        let result = profiles.filter((p) => p.is_active)

        if (filters.query) {
          const q = filters.query.toLowerCase()
          result = result.filter(
            (p) =>
              p.full_name.toLowerCase().includes(q) ||
              p.email?.toLowerCase().includes(q) ||
              p.phone?.includes(q) ||
              p.primary_skills.some((s) => s.toLowerCase().includes(q)) ||
              p.secondary_skills.some((s) => s.toLowerCase().includes(q)) ||
              p.organization?.toLowerCase().includes(q) ||
              p.location?.toLowerCase().includes(q) ||
              p.certifications.some((c) => c.toLowerCase().includes(q)) ||
              p.notes?.toLowerCase().includes(q)
          )
        }
        if (filters.talent_type?.length)
          result = result.filter((p) => filters.talent_type!.includes(p.talent_type))
        if (filters.status?.length)
          result = result.filter((p) => filters.status!.includes(p.status))
        if (filters.source?.length)
          result = result.filter((p) => filters.source!.includes(p.source))
        if (filters.location)
          result = result.filter((p) =>
            p.location?.toLowerCase().includes(filters.location!.toLowerCase())
          )
        if (filters.min_experience !== undefined)
          result = result.filter((p) => (p.years_experience || 0) >= filters.min_experience!)
        if (filters.max_experience !== undefined)
          result = result.filter((p) => (p.years_experience || 0) <= filters.max_experience!)
        if (filters.min_rating !== undefined)
          result = result.filter((p) => (p.overall_rating || 0) >= filters.min_rating!)
        if (filters.skills?.length)
          result = result.filter((p) =>
            filters.skills!.some(
              (s) =>
                p.primary_skills.some((ps) => ps.toLowerCase().includes(s.toLowerCase())) ||
                p.secondary_skills.some((ss) => ss.toLowerCase().includes(s.toLowerCase()))
            )
          )
        if (filters.is_shortlisted) result = result.filter((p) => p.is_shortlisted)
        if (filters.is_favorite)    result = result.filter((p) => p.is_favorite)

        return result
      },
    }),
    {
      name: 'tih-talent-store-v3',
      // orgId, userId, isLoadingData are NOT persisted (session-derived from auth)
      partialize: (s) => ({
        profiles:      s.profiles,
        tags:          s.tags,
        viewMode:      s.viewMode,
        savedSearches: s.savedSearches,
        activities:    s.activities,
        filters:       s.filters,
      }),
      /**
       * Validate persisted data against schema; fall back to defaults if malformed.
       */
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<typeof current>
        return {
          ...current,
          profiles: Array.isArray(p?.profiles) && p.profiles.length > 0
            ? p.profiles.filter(
                (x): x is TalentProfile =>
                  x != null &&
                  typeof x === 'object' &&
                  typeof (x as TalentProfile).id === 'string' &&
                  typeof (x as TalentProfile).full_name === 'string'
              )
            : [],
          tags: Array.isArray(p?.tags) && p.tags.length > 0 ? p.tags : [],
          viewMode: p?.viewMode ?? current.viewMode,
          savedSearches: Array.isArray(p?.savedSearches)
            ? p.savedSearches.filter(
                (x) => x != null && typeof x === 'object' && typeof (x as SavedSearch).id === 'string'
              )
            : current.savedSearches,
          activities: Array.isArray(p?.activities)
            ? p.activities.filter(
                (x) => x != null && typeof x === 'object' && typeof (x as Activity).id === 'string'
              )
            : current.activities,
          filters: p?.filters != null && typeof p.filters === 'object' ? p.filters : current.filters,
        }
      },
    }
  )
)
