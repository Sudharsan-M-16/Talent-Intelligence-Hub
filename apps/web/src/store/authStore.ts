import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseReady } from '../lib/supabase'

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: 'admin'
  organization_id: string
  organization_name: string
  avatar_url?: string
}

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: AuthUser) => void
}

// Single admin user — no role-based access, everyone is admin
const ADMIN_USER: AuthUser = {
  id: 'admin-user-001',
  email: 'admin@tih.co',
  full_name: 'Admin',
  role: 'admin',
  organization_id: 'demo-org-001',
  organization_name: 'Talent Intelligence Hub',
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Login: tries Supabase auth if ready, falls back to demo auto-login
      login: async (email, password) => {
        set({ isLoading: true })
        if (isSupabaseReady && supabase) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (!error && data.user) {
              const supabaseUser: AuthUser = {
                id: data.user.id,
                email: data.user.email ?? email,
                full_name: (data.user.user_metadata?.full_name as string | undefined) ?? 'Admin',
                role: 'admin',
                organization_id: (data.user.user_metadata?.organization_id as string | undefined) ?? 'demo-org-001',
                organization_name: (data.user.user_metadata?.organization_name as string | undefined) ?? 'Talent Intelligence Hub',
                avatar_url: data.user.user_metadata?.avatar_url as string | undefined,
              }
              set({ isLoading: false, isAuthenticated: true, user: supabaseUser })
              return
            }
          } catch {
            // Fall through to demo login
          }
        }
        // Demo fallback — always succeeds
        await new Promise((r) => setTimeout(r, 600))
        set({
          isLoading: false,
          isAuthenticated: true,
          user: ADMIN_USER,
        })
      },

      logout: () => {
        if (isSupabaseReady && supabase) {
          supabase.auth.signOut().catch(() => {})
        }
        set({ user: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user, isAuthenticated: true }),
    }),
    {
      name: 'auth-storage', // saves to localStorage
    }
  )
)
