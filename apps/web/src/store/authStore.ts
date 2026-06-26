import { create } from 'zustand'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { initOrgAndUser } from '../lib/talentService'
import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'admin'
  organization_id: string
  organization_name: string
  avatar_url?: string
  provider?: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

// Demo-mode user — used when Supabase is not configured
export const DEMO_ADMIN_USER: AuthUser = {
  id: 'admin-user-001',
  email: 'admin@tih.co',
  full_name: 'Admin',
  role: 'admin',
  organization_id: 'demo-org-001',
  organization_name: 'Talent Intelligence Hub',
}

function mapSupabaseUser(sbUser: User): AuthUser {
  const meta = sbUser.user_metadata ?? {}
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    full_name:
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      sbUser.email?.split('@')[0] ||
      'User',
    role: 'admin',
    // org_id from metadata is the fast path; initOrgAndUser fills it properly on first login
    organization_id: (meta.organization_id as string | undefined) ?? '',
    organization_name: (meta.organization_name as string | undefined) ?? 'Talent Intelligence Hub',
    avatar_url:
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined),
    provider: sbUser.app_metadata?.provider as string | undefined,
  }
}

// Bootstrap org and return a fully-populated AuthUser
async function resolveUser(sbUser: User): Promise<AuthUser> {
  const mapped = mapSupabaseUser(sbUser)
  // Ensure the org exists; gets or creates it and updates user_metadata
  const orgId = await initOrgAndUser(sbUser)
  return { ...mapped, organization_id: orgId ?? mapped.organization_id ?? 'demo-org-001' }
}

const USER_CACHE_KEY = 'tih-auth-user-v1'

function readUserCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    return parsed?.id ? parsed : null
  } catch { return null }
}

function writeUserCache(user: AuthUser) {
  try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)) } catch {}
}

function clearUserCache() {
  try { localStorage.removeItem(USER_CACHE_KEY) } catch {}
}

let authSubscription: { unsubscribe: () => void } | null = null
// Debounce handle for SIGNED_OUT: Google OAuth token refresh fires SIGNED_OUT
// immediately followed by SIGNED_IN. We delay acting on SIGNED_OUT so the
// incoming SIGNED_IN can cancel it — preventing a spurious logout flash.
let signedOutTimer: ReturnType<typeof setTimeout> | null = null

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // true until init() completes — prevents login flash

  init: async () => {
    if (!isSupabaseReady || !supabase) {
      set({ isLoading: false })
      return
    }

    // Optimistic restore: show the app immediately from cache while we verify
    // the session in the background. Eliminates the flash of the login page on
    // tab reload (Chrome tab eviction) caused by the async getSession() round-trip.
    const cached = readUserCache()
    if (cached) {
      set({ user: cached, isAuthenticated: true, isLoading: false })
    }

    if (authSubscription) authSubscription.unsubscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // These are silent background operations — no UI change needed.
      if (event === 'INITIAL_SESSION') return
      if (event === 'TOKEN_REFRESHED') return

      if (session?.user) {
        // Cancel any pending sign-out that was waiting to see if a sign-in followed.
        if (signedOutTimer) { clearTimeout(signedOutTimer); signedOutTimer = null }
        // Never show a loading screen if we already have a user in state.
        // resolveUser() runs silently in the background for already-authenticated users.
        const hasUser = !!useAuthStore.getState().user
        if (!hasUser) set({ isLoading: true })
        const user = await resolveUser(session.user)
        writeUserCache(user)
        set({ user, isAuthenticated: true, isLoading: false })
      } else if (event === 'SIGNED_OUT') {
        // Debounce: Google OAuth refresh emits SIGNED_OUT then SIGNED_IN within ~200ms.
        // Wait 1.5s before acting — if SIGNED_IN arrives first, cancel the timer.
        if (signedOutTimer) clearTimeout(signedOutTimer)
        signedOutTimer = setTimeout(() => {
          signedOutTimer = null
          clearUserCache()
          set({ user: null, isAuthenticated: false, isLoading: false })
        }, 1500)
      }
    })
    authSubscription = subscription

    // Verify the session. getSession() refreshes an expired access token if the
    // refresh token is still valid. If it returns null, the cache was stale.
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const user = await resolveUser(session.user)
        writeUserCache(user)
        set({ user, isAuthenticated: true, isLoading: false })
      } else {
        clearUserCache()
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch {
      if (!readUserCache()) set({ isLoading: false })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true })

    if (isSupabaseReady && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { set({ isLoading: false }); throw new Error(error.message) }
      if (data.user) {
        const user = await resolveUser(data.user)
        set({ user, isAuthenticated: true, isLoading: false })
        return
      }
    }

    // Demo fallback: any email/password works when Supabase is not configured
    await new Promise((r) => setTimeout(r, 500))
    set({ isLoading: false, isAuthenticated: true, user: DEMO_ADMIN_USER })
  },

  signup: async (email, password, fullName) => {
    if (!isSupabaseReady || !supabase) {
      throw new Error('Account creation requires Supabase. Configure VITE_SUPABASE_URL to enable.')
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw new Error(error.message)
    // If email confirmation is on, user won't be signed in yet — caller shows "check email" view
  },

  loginWithGoogle: async () => {
    if (!isSupabaseReady || !supabase) {
      throw new Error('Google sign-in requires Supabase. Configure VITE_SUPABASE_URL to enable.')
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) throw new Error(error.message)
  },

  forgotPassword: async (email) => {
    if (!isSupabaseReady || !supabase) {
      throw new Error('Password reset requires Supabase to be configured.')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw new Error(error.message)
  },

  logout: async () => {
    clearUserCache()
    if (isSupabaseReady && supabase) {
      await supabase.auth.signOut().catch(() => {})
    }
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user, isAuthenticated: true }),
}))
