import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PageLoader from '../components/ui/PageLoader'

/**
 * Landing page for all Supabase auth redirects:
 * - Google OAuth callback
 * - Email verification link
 * - Magic link sign-in
 *
 * Supabase JS v2 automatically exchanges the URL code/hash for a session.
 * The onAuthStateChange subscription in authStore.ts handles the session
 * (including org bootstrap via resolveUser). We only need to navigate
 * after the event fires.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) {
      navigate('/login', { replace: true })
      return
    }

    // Supabase exchanges the code from the URL automatically on getSession()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Session already available — authStore subscription will set user + org.
        // Navigate to dashboard; ProtectedRoute shows PageLoader until auth resolves.
        navigate('/dashboard', { replace: true })
      } else {
        // Session not yet available — wait for the onAuthStateChange event
        // (code exchange may still be in-flight)
      }
    })

    // Also subscribe so we catch the async code exchange case
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        navigate('/dashboard', { replace: true })
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return <PageLoader fullScreen />
}
