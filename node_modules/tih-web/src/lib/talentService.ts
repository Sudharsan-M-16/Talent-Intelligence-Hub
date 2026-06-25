import { supabase, isSupabaseReady } from './supabase'
import type { TalentProfile, Tag, SavedSearch } from '../types/database'

/**
 * Fetch all talent profiles for an organization.
 * Returns null if Supabase is not configured (caller should use demo store instead).
 */
export async function fetchProfiles(orgId: string): Promise<TalentProfile[] | null> {
  if (!isSupabaseReady || !supabase) return null
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchProfiles error:', error); return null }
  return (data ?? []) as TalentProfile[]
}

/**
 * Upsert (insert or update) a talent profile.
 * Returns the saved profile, or null on error.
 */
export async function upsertProfile(profile: TalentProfile): Promise<TalentProfile | null> {
  if (!isSupabaseReady || !supabase) return null
  const { data, error } = await supabase
    .from('talent_profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('upsertProfile error:', error); return null }
  return data as TalentProfile
}

/**
 * Delete a talent profile by id.
 * Returns true on success, false on error.
 */
export async function deleteProfileRemote(id: string): Promise<boolean> {
  if (!isSupabaseReady || !supabase) return false
  const { error } = await supabase
    .from('talent_profiles')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteProfileRemote error:', error); return false }
  return true
}

/**
 * Fetch all tags for an organization.
 * Returns null if Supabase is not configured.
 */
export async function fetchTags(orgId: string): Promise<Tag[] | null> {
  if (!isSupabaseReady || !supabase) return null
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('organization_id', orgId)
    .order('name')
  if (error) { console.error('fetchTags error:', error); return null }
  return (data ?? []) as Tag[]
}

/**
 * Fetch saved searches for a user.
 * Returns null if Supabase is not configured.
 */
export async function fetchSavedSearches(userId: string): Promise<SavedSearch[] | null> {
  if (!isSupabaseReady || !supabase) return null
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchSavedSearches error:', error); return null }
  return (data ?? []) as SavedSearch[]
}

/**
 * Upsert a saved search.
 * Returns true on success, false on error.
 */
export async function upsertSavedSearch(search: SavedSearch): Promise<boolean> {
  if (!isSupabaseReady || !supabase) return false
  const { error } = await supabase
    .from('saved_searches')
    .upsert(search, { onConflict: 'id' })
  if (error) { console.error('upsertSavedSearch error:', error); return false }
  return true
}

/**
 * Delete a saved search by id.
 * Returns true on success, false on error.
 */
export async function deleteSavedSearchRemote(id: string): Promise<boolean> {
  if (!isSupabaseReady || !supabase) return false
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteSavedSearchRemote error:', error); return false }
  return true
}
