import React, { Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import PageLoader from './components/ui/PageLoader'
import { useAuthStore } from './store/authStore'

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const DashboardPage    = React.lazy(() => import('./pages/DashboardPage'))
const TalentListPage   = React.lazy(() => import('./pages/TalentListPage'))
const TalentDetailPage = React.lazy(() => import('./pages/TalentDetailPage'))
const TalentFormPage   = React.lazy(() => import('./pages/TalentFormPage'))
const BulkProfilesPage = React.lazy(() => import('./pages/BulkProfilesPage'))
const KanbanPage       = React.lazy(() => import('./pages/KanbanPage'))
const EvaluationsPage  = React.lazy(() => import('./pages/EvaluationsPage'))
const ComparePage      = React.lazy(() => import('./pages/ComparePage'))
const SearchPage       = React.lazy(() => import('./pages/SearchPage'))
const FavoritesPage    = React.lazy(() => import('./pages/FavoritesPage'))
const ShortlistedPage  = React.lazy(() => import('./pages/ShortlistedPage'))
const SettingsPage     = React.lazy(() => import('./pages/SettingsPage'))
const AuditPage        = React.lazy(() => import('./pages/AuditPage'))
const AboutPage        = React.lazy(() => import('./pages/AboutPage'))
const TalentPrintPage  = React.lazy(() => import('./pages/TalentPrintPage'))
const AuthCallbackPage = React.lazy(() => import('./pages/AuthCallbackPage'))
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'))

// ── Auth guards ────────────────────────────────────────────────────────────────

/** Blocks access to protected routes while session is loading or user is not authenticated */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)
  if (isLoading) return <PageLoader fullScreen />
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Redirects authenticated users away from /login so they never see it after sign-in */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading       = useAuthStore((s) => s.isLoading)
  if (isLoading) return <PageLoader fullScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ── Session initializer ────────────────────────────────────────────────────────

/**
 * Calls authStore.init() once on mount. This restores any existing Supabase session
 * from localStorage and subscribes to auth state changes for the lifetime of the app.
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const init         = useAuthStore((s) => s.init)
  const initialized  = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      init()
    }
  }, [init])

  return <>{children}</>
}

// ── Route-level error boundaries ───────────────────────────────────────────────

function RouteErrorBoundary({ children, name }: { children: React.ReactNode; name: string }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={`${name}:${location.pathname}`}>
      {children}
    </ErrorBoundary>
  )
}

// ── Route tree ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/auth/callback" element={<Suspense fallback={<PageLoader fullScreen />}><AuthCallbackPage /></Suspense>} />
      <Route path="/reset-password" element={<Suspense fallback={<PageLoader fullScreen />}><ResetPasswordPage /></Suspense>} />

      {/* Protected app shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={
          <RouteErrorBoundary name="dashboard"><DashboardPage /></RouteErrorBoundary>
        } />
        <Route path="talent" element={
          <RouteErrorBoundary name="talent"><TalentListPage /></RouteErrorBoundary>
        } />
        <Route path="bulk-profiles" element={
          <RouteErrorBoundary name="bulk-profiles"><BulkProfilesPage /></RouteErrorBoundary>
        } />
        <Route path="talent/new" element={
          <RouteErrorBoundary name="talent-new"><TalentFormPage /></RouteErrorBoundary>
        } />
        <Route path="talent/:id" element={
          <RouteErrorBoundary name="talent-detail"><TalentDetailPage /></RouteErrorBoundary>
        } />
        <Route path="talent/:id/edit" element={
          <RouteErrorBoundary name="talent-edit"><TalentFormPage /></RouteErrorBoundary>
        } />
        <Route path="talent/:id/print" element={
          <RouteErrorBoundary name="talent-print"><TalentPrintPage /></RouteErrorBoundary>
        } />
        <Route path="kanban" element={
          <RouteErrorBoundary name="kanban"><KanbanPage /></RouteErrorBoundary>
        } />
        <Route path="evaluations" element={
          <RouteErrorBoundary name="evaluations"><EvaluationsPage /></RouteErrorBoundary>
        } />
        <Route path="evaluations/new" element={
          <RouteErrorBoundary name="evaluations-new"><EvaluationsPage /></RouteErrorBoundary>
        } />
        <Route path="compare" element={
          <RouteErrorBoundary name="compare"><ComparePage /></RouteErrorBoundary>
        } />
        <Route path="search" element={
          <RouteErrorBoundary name="search"><SearchPage /></RouteErrorBoundary>
        } />
        <Route path="favorites" element={
          <RouteErrorBoundary name="favorites"><FavoritesPage /></RouteErrorBoundary>
        } />
        <Route path="shortlisted" element={
          <RouteErrorBoundary name="shortlisted"><ShortlistedPage /></RouteErrorBoundary>
        } />
        <Route path="settings" element={
          <RouteErrorBoundary name="settings"><SettingsPage /></RouteErrorBoundary>
        } />
        <Route path="audit" element={
          <RouteErrorBoundary name="audit"><AuditPage /></RouteErrorBoundary>
        } />
        <Route path="about" element={
          <RouteErrorBoundary name="about"><AboutPage /></RouteErrorBoundary>
        } />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthInitializer>
          <Suspense fallback={<PageLoader fullScreen />}>
            <AppRoutes />
          </Suspense>
        </AuthInitializer>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
