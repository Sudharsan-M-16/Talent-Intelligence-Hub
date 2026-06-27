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

// Bootstrap org and return a fully-populated AuthUser.
// Fast path for returning users: if org_id is already in user_metadata we skip
// the DB round-trip (initOrgAndUser) entirely — shaves ~1s off every reload.
async function resolveUser(sbUser: User): Promise<AuthUser> {
  const mapped = mapSupabaseUser(sbUser)
  if (mapped.organization_id) return mapped      // returning user — already bootstrapped
  const orgId = await initOrgAndUser(sbUser)     // first-ever login — create org
  return { ...mapped, organization_id: orgId ?? 'demo-org-001' }
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

// True once init() has resolved the session. After this point isLoading must
// never go true again — background token refreshes must be silent.
let initDone = false

// Read cache synchronously at module load — before any React render.
// This makes isLoading: false immediately when a session exists, eliminating
// the PageLoader flash on tab switch / page reload.
const _bootUser = readUserCache()

export const useAuthStore = create<AuthStore>()((set) => ({
  user: _bootUser,
  isAuthenticated: !!_bootUser,
  isLoading: !_bootUser,  // false instantly when cache exists

  init: async () => {
    if (!isSupabaseReady || !supabase) {
      set({ isLoading: false })
      initDone = true
      return
    }

    // Instantly restore from cache — zero loading screen for returning users.
    const cached = readUserCache()
    if (cached) set({ user: cached, isAuthenticated: true, isLoading: false })

    if (authSubscription) authSubscription.unsubscribe()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only handle explicit new sign-ins (Google OAuth, email link, or fresh login).
      // TOKEN_REFRESHED / SIGNED_OUT / INITIAL_SESSION are intentionally ignored:
      //   - TOKEN_REFRESHED: SDK handles it silently; no UI change needed.
      //   - SIGNED_OUT: fires spuriously on every tab-focus token check; real logout
      //     is done via logout() which clears state directly.
      //   - INITIAL_SESSION: handled by getSession() below.
      if (event !== 'SIGNED_IN') return
      if (!session?.user) return

      // Only show loading screen if we have no user AND init hasn't completed yet.
      // After initDone, all auth events must be silent to prevent tab-switch flash.
      const hasUser = !!useAuthStore.getState().user
      if (!hasUser && !initDone) set({ isLoading: true })
      const user = await resolveUser(session.user)
      writeUserCache(user)
      set({ user, isAuthenticated: true, isLoading: false })
    })
    authSubscription = subscription

    // Verify cache. getSession() also refreshes an expired access token if the
    // refresh token is still valid. Returns null only when truly logged out.
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const user = await resolveUser(session.user)
        writeUserCache(user)
        set({ user, isAuthenticated: true, isLoading: false })
      } else if (!cached) {
        // Only clear session if we had no cached user — avoids logging out on
        // a transient network failure during the initial getSession() call.
        clearUserCache()
        set({ user: null, isAuthenticated: false, isLoading: false })
      } else {
        // Had a cached user but getSession returned null: could be expired or
        // a network hiccup. Stay authenticated from cache; next API call will
        // fail if truly expired, at which point logout() can be called.
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    } finally {
      initDone = true
    }
  },

  login: async (email, password) => {
    // Do NOT touch isLoading here — setting it true would cause AuthRoute to
    // unmount LoginPage (replacing it with PageLoader), which resets all local
    // component state (including the error message) before it can be displayed.
    // LoginPage manages its own button-level loading spinner independently.

    if (isSupabaseReady && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      if (data.user) {
        const user = await resolveUser(data.user)
        set({ user, isAuthenticated: true })
        return
      }
    }

    // Demo fallback: any email/password works when Supabase is not configured
    await new Promise((r) => setTimeout(r, 500))
    set({ isAuthenticated: true, user: DEMO_ADMIN_USER })
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
