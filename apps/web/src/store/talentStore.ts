import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TalentProfile, Tag, TalentFilters, SavedSearch, Activity } from '../types/database'
import { demoProfiles, demoTags } from '../lib/demoData'

interface TalentStore {
  profiles: TalentProfile[]
  tags: Tag[]
  filters: TalentFilters
  selectedIds: string[]
  compareIds: string[]
  viewMode: 'table' | 'grid' | 'kanban'
  savedSearches: SavedSearch[]
  activities: Activity[]

  // Actions
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
      profiles: demoProfiles,
      tags: demoTags,
      filters: {},
      selectedIds: [],
      compareIds: [],
      viewMode: 'table',
      savedSearches: [],
      activities: [],

      setProfiles: (profiles) => set({ profiles }),

      addProfile: (profile) => {
        set((s) => ({ profiles: [profile, ...s.profiles] }))
        get().addActivity({
          organization_id: 'demo-org-001',
          talent_id: profile.id,
          action: 'PROFILE_CREATED',
          description: `New profile added for ${profile.full_name} via ${profile.source}`,
          created_by: 'demo-user-001',
        })
      },

      addProfiles: (profiles) =>
        set((s) => ({ profiles: [...profiles, ...s.profiles] })),

      updateProfile: (id, updates) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
          ),
        })),

      deleteProfile: (id) =>
        set((s) => ({
          profiles: s.profiles.filter((p) => p.id !== id),
          compareIds: s.compareIds.filter((cid) => cid !== id),
          selectedIds: s.selectedIds.filter((sid) => sid !== id),
        })),

      toggleShortlist: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        const wasShortlisted = profile?.is_shortlisted ?? false
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, is_shortlisted: !p.is_shortlisted } : p
          ),
        }))
        if (!wasShortlisted) {
          get().addActivity({
            organization_id: 'demo-org-001',
            talent_id: id,
            action: 'SHORTLISTED',
            description: 'Profile shortlisted',
            created_by: 'demo-user-001',
          })
        }
      },

      toggleFavorite: (id) => {
        const profile = get().profiles.find((p) => p.id === id)
        const wasFavorite = profile?.is_favorite ?? false
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, is_favorite: !p.is_favorite } : p
          ),
        }))
        if (!wasFavorite) {
          get().addActivity({
            organization_id: 'demo-org-001',
            talent_id: id,
            action: 'FAVORITED',
            description: 'Profile added to favorites',
            created_by: 'demo-user-001',
          })
        }
      },

      setFilters: (filters) => set({ filters }),

      clearFilters: () => set({ filters: {} }),

      setSelectedIds: (ids) => set({ selectedIds: ids }),

      toggleCompare: (id) =>
        set((s) => {
          const exists = s.compareIds.includes(id)
          if (exists) return { compareIds: s.compareIds.filter((i) => i !== id) }
          if (s.compareIds.length >= 5) return s
          return { compareIds: [...s.compareIds, id] }
        }),

      clearCompare: () => set({ compareIds: [] }),

      setViewMode: (mode) => set({ viewMode: mode }),

      updateStatus: (id, status) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
          ),
        }))
        get().addActivity({
          organization_id: 'demo-org-001',
          talent_id: id,
          action: 'STATUS_CHANGED',
          description: `Status changed to ${status}`,
          created_by: 'demo-user-001',
        })
      },

      saveSearch: (name, filters) => {
        const search: SavedSearch = {
          id: crypto.randomUUID(),
          user_id: 'demo-user-001',
          name,
          filters_json: filters,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ savedSearches: [...s.savedSearches, search] }))
      },

      deleteSavedSearch: (id) =>
        set((s) => ({ savedSearches: s.savedSearches.filter((ss) => ss.id !== id) })),

      addActivity: (activity) => {
        const newActivity: Activity = {
          ...activity,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ activities: [newActivity, ...s.activities] }))
      },

      bulkUpdateStatus: (ids, status) => {
        set((s) => ({
          profiles: s.profiles.map((p) =>
            ids.includes(p.id) ? { ...p, status, updated_at: new Date().toISOString() } : p
          ),
        }))
        ids.forEach((id) => {
          get().addActivity({
            organization_id: 'demo-org-001',
            talent_id: id,
            action: 'STATUS_CHANGED',
            description: `Status changed to ${status}`,
            created_by: 'demo-user-001',
          })
        })
      },

      addTag: (tag) => {
        const newTag: Tag = {
          ...tag,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        }
        set((s) => ({ tags: [...s.tags, newTag] }))
      },

      updateTag: (id, updates) =>
        set((s) => ({
          tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTag: (id) =>
        set((s) => ({ tags: s.tags.filter((t) => t.id !== id) })),

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
        if (filters.is_favorite) result = result.filter((p) => p.is_favorite)

        return result
      },
    }),
    {
      name: 'tih-talent-store-v2',
      partialize: (s) => ({
        profiles: s.profiles,
        tags: s.tags,
        viewMode: s.viewMode,
        savedSearches: s.savedSearches,
        activities: s.activities,
      }),
      /**
       * merge: guards persisted data against schema corruption.
       * Falls back to current (default) state if persisted value is absent or malformed.
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
            : current.profiles,
          tags: Array.isArray(p?.tags) && p.tags.length > 0 ? p.tags : current.tags,
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
        }
      },
    }
  )
)
