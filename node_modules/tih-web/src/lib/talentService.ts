import { supabase } from './supabase'
import type { TalentProfile, Tag, Activity, SavedSearch, TalentFilters } from '../types/database'
import type { User } from '@supabase/supabase-js'

// ─── DB Row type (loose) ──────────────────────────────────────────────────────
type DbRow = Record<string, unknown>

// ─── Field Mapping: TypeScript → DB ──────────────────────────────────────────
// Key differences:
//   TS organization_id   → DB org_id
//   TS domains           → DB industry_domains
//   TS website           → DB website_url
//   TS resume_url        → DB custom_fields.resume_url  (no dedicated column)
//   TS alternate_phone   → DB custom_fields.alternate_phone
//   TS raw_metadata      → merged into DB custom_fields

function profileToDb(profile: Partial<TalentProfile>, orgId: string): DbRow {
  const cf: Record<string, unknown> = {}
  if (profile.resume_url)      cf.resume_url = profile.resume_url
  if (profile.alternate_phone) cf.alternate_phone = profile.alternate_phone
  if (profile.raw_metadata)    Object.assign(cf, profile.raw_metadata)

  const row: DbRow = {
    org_id:                orgId,
    full_name:             profile.full_name ?? '',
    email:                 profile.email ?? null,
    phone:                 profile.phone ?? null,
    talent_type:           profile.talent_type ?? 'Other',
    source:                profile.source ?? 'Manual',
    status:                profile.status ?? 'New',
    organization:          profile.organization ?? null,
    designation:           profile.designation ?? null,
    years_experience:      profile.years_experience ?? null,
    location:              profile.location ?? null,
    availability:          profile.availability ?? null,
    expected_compensation: profile.expected_compensation ?? null,
    primary_skills:        profile.primary_skills ?? [],
    secondary_skills:      profile.secondary_skills ?? [],
    certifications:        profile.certifications ?? [],
    industry_domains:      profile.domains ?? [],
    linkedin_url:          profile.linkedin_url ?? null,
    portfolio_url:         profile.portfolio_url ?? null,
    website_url:           profile.website ?? null,
    notes:                 profile.notes ?? null,
    is_shortlisted:        profile.is_shortlisted ?? false,
    is_favorite:           profile.is_favorite ?? false,
    is_active:             profile.is_active !== false,
    custom_fields:         cf,
  }
  if (profile.id) row.id = profile.id
  return row
}

function dbToProfile(row: DbRow, orgId: string): TalentProfile {
  const cf = (row.custom_fields as Record<string, unknown>) ?? {}
  return {
    id:                    row.id as string,
    organization_id:       orgId,
    full_name:             row.full_name as string,
    email:                 (row.email as string) || undefined,
    phone:                 (row.phone as string) || undefined,
    alternate_phone:       (cf.alternate_phone as string) || undefined,
    talent_type:           (row.talent_type as TalentProfile['talent_type']) ?? 'Other',
    source:                (row.source as TalentProfile['source']) ?? 'Manual',
    status:                (row.status as TalentProfile['status']) ?? 'New',
    organization:          (row.organization as string) || undefined,
    designation:           (row.designation as string) || undefined,
    years_experience:      (row.years_experience as number) ?? undefined,
    location:              (row.location as string) || undefined,
    availability:          (row.availability as string) || undefined,
    expected_compensation: row.expected_compensation != null ? Number(row.expected_compensation) : undefined,
    primary_skills:        (row.primary_skills as string[]) ?? [],
    secondary_skills:      (row.secondary_skills as string[]) ?? [],
    certifications:        (row.certifications as string[]) ?? [],
    domains:               (row.industry_domains as string[]) ?? [],
    linkedin_url:          (row.linkedin_url as string) || undefined,
    portfolio_url:         (row.portfolio_url as string) || undefined,
    website:               (row.website_url as string) || undefined,
    resume_url:            (cf.resume_url as string) || undefined,
    notes:                 (row.notes as string) || undefined,
    overall_rating:        row.overall_rating != null ? Number(row.overall_rating) : undefined,
    is_shortlisted:        (row.is_shortlisted as boolean) ?? false,
    is_favorite:           (row.is_favorite as boolean) ?? false,
    is_active:             (row.is_active as boolean) ?? true,
    raw_metadata:          cf as Record<string, unknown>,
    created_at:            row.created_at as string,
    updated_at:            row.updated_at as string,
  }
}

function tagToDb(tag: Partial<Tag>, orgId: string): DbRow {
  const row: DbRow = {
    org_id: orgId,
    name:   tag.name ?? '',
    color:  tag.color ?? '#6366f1',
  }
  if (tag.id) row.id = tag.id
  return row
}

function dbToTag(row: DbRow, orgId: string): Tag {
  return {
    id:              row.id as string,
    organization_id: orgId,
    name:            row.name as string,
    color:           (row.color as string) ?? '#6366f1',
    created_at:      row.created_at as string,
  }
}

function dbToActivity(row: DbRow, orgId: string): Activity {
  return {
    id:              row.id as string,
    organization_id: orgId,
    talent_id:       (row.talent_id as string) ?? '',
    action:          row.action as string,
    description:     (row.description as string) ?? '',
    created_by:      (row.actor_id as string) ?? 'system',
    created_at:      row.created_at as string,
  }
}

function dbToSavedSearch(row: DbRow): SavedSearch {
  return {
    id:           row.id as string,
    user_id:      (row.user_id as string) ?? '',
    name:         row.name as string,
    filters_json: (row.filters as TalentFilters) ?? {},
    created_at:   row.created_at as string,
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
// Creates an organization + user_profiles row for new Supabase users.
// Requires the `authenticated_create_org` policy from supabase/bootstrap.sql.
// Returns the org_id (existing or newly created), or null on failure.

export async function initOrgAndUser(supabaseUser: User): Promise<string | null> {
  if (!supabase) return null

  // Check if user_profiles row already exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('org_id')
    .eq('id', supabaseUser.id)
    .maybeSingle()

  if (existing?.org_id) return existing.org_id as string

  // org_id may have been stored in user_metadata from a previous session
  const metaOrgId = supabaseUser.user_metadata?.organization_id as string | undefined
  if (metaOrgId) {
    await supabase.from('user_profiles').upsert({
      id:        supabaseUser.id,
      org_id:    metaOrgId,
      full_name: (supabaseUser.user_metadata?.full_name as string)
                 ?? supabaseUser.email?.split('@')[0] ?? 'User',
      email:     supabaseUser.email ?? '',
      role:      'admin',
    })
    return metaOrgId
  }

  // Brand-new user — create org then user_profiles
  const orgName = supabaseUser.user_metadata?.full_name
    ? `${(supabaseUser.user_metadata.full_name as string).split(' ')[0]}'s Org`
    : 'My Organization'
  const slug = `org-${supabaseUser.id.slice(0, 8)}`

  const { data: newOrg, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug, plan: 'free' })
    .select('id')
    .single()

  if (orgErr || !newOrg) {
    console.error('[TIH] Failed to create organization:', orgErr?.message)
    return null
  }

  const orgId = newOrg.id as string

  await supabase.from('user_profiles').upsert({
    id:        supabaseUser.id,
    org_id:    orgId,
    full_name: (supabaseUser.user_metadata?.full_name as string)
               ?? supabaseUser.email?.split('@')[0] ?? 'User',
    email:     supabaseUser.email ?? '',
    role:      'admin',
  })

  // Cache org_id in auth metadata so next login skips bootstrapping
  await supabase.auth.updateUser({ data: { organization_id: orgId } })

  return orgId
}

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

export async function fetchProfiles(orgId: string): Promise<TalentProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('talent_profiles')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) { console.error('[TIH] fetchProfiles:', error.message); return [] }
  return (data ?? []).map((row) => dbToProfile(row as DbRow, orgId))
}

export async function createProfileInDb(
  profile: TalentProfile,
  orgId: string
): Promise<TalentProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('talent_profiles')
    .insert(profileToDb(profile, orgId))
    .select()
    .single()

  if (error) { console.error('[TIH] createProfile:', error.message); return null }
  return dbToProfile(data as DbRow, orgId)
}

export async function updateProfileInDb(
  id: string,
  updates: Partial<TalentProfile>,
  orgId: string
): Promise<boolean> {
  if (!supabase) return false
  const dbUpdates = profileToDb(updates, orgId)
  delete dbUpdates['id']
  delete dbUpdates['org_id']

  const { error } = await supabase
    .from('talent_profiles')
    .update(dbUpdates)
    .eq('id', id)

  if (error) { console.error('[TIH] updateProfile:', error.message); return false }
  return true
}

export async function softDeleteProfile(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('talent_profiles')
    .update({ is_active: false })
    .eq('id', id)

  if (error) { console.error('[TIH] softDelete:', error.message); return false }
  return true
}

export async function bulkUpdateStatusInDb(
  ids: string[],
  status: TalentProfile['status']
): Promise<boolean> {
  if (!supabase || ids.length === 0) return false
  const { error } = await supabase
    .from('talent_profiles')
    .update({ status })
    .in('id', ids)

  if (error) { console.error('[TIH] bulkUpdateStatus:', error.message); return false }
  return true
}

// ─── Tag CRUD ─────────────────────────────────────────────────────────────────

export async function fetchTags(orgId: string): Promise<Tag[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) { console.error('[TIH] fetchTags:', error.message); return [] }
  return (data ?? []).map((row) => dbToTag(row as DbRow, orgId))
}

export async function createTagInDb(
  tag: Omit<Tag, 'id' | 'created_at'>,
  orgId: string
): Promise<Tag | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tags')
    .insert(tagToDb(tag, orgId))
    .select()
    .single()

  if (error) { console.error('[TIH] createTag:', error.message); return null }
  return dbToTag(data as DbRow, orgId)
}

export async function updateTagInDb(id: string, updates: Partial<Tag>): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('tags')
    .update({ name: updates.name, color: updates.color })
    .eq('id', id)

  if (error) { console.error('[TIH] updateTag:', error.message); return false }
  return true
}

export async function deleteTagInDb(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) { console.error('[TIH] deleteTag:', error.message); return false }
  return true
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function fetchActivities(orgId: string, limit = 100): Promise<Activity[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('[TIH] fetchActivities:', error.message); return [] }
  return (data ?? []).map((row) => dbToActivity(row as DbRow, orgId))
}

export async function logActivityInDb(
  orgId: string,
  actorId: string,
  activity: Omit<Activity, 'id' | 'created_at'>
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('activity_log').insert({
    org_id:      orgId,
    talent_id:   activity.talent_id || null,
    actor_id:    actorId || null,
    action:      activity.action,
    description: activity.description,
    meta:        {},
  })
  if (error) console.error('[TIH] logActivity:', error.message)
}

// ─── Saved Searches ───────────────────────────────────────────────────────────

export async function fetchSavedSearches(
  orgId: string,
  userId: string
): Promise<SavedSearch[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) { console.error('[TIH] fetchSavedSearches:', error.message); return [] }
  return (data ?? []).map(dbToSavedSearch)
}

export async function createSavedSearchInDb(
  orgId: string,
  userId: string,
  name: string,
  filters: TalentFilters
): Promise<SavedSearch | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('saved_searches')
    .insert({ org_id: orgId, user_id: userId, name, filters, is_shared: false })
    .select()
    .single()

  if (error) { console.error('[TIH] createSavedSearch:', error.message); return null }
  return dbToSavedSearch(data as DbRow)
}

export async function deleteSavedSearchInDb(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('saved_searches').delete().eq('id', id)
  if (error) { console.error('[TIH] deleteSavedSearch:', error.message); return false }
  return true
}
