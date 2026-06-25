import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import PageLoader from './components/ui/PageLoader'
import { useAuthStore } from './store/authStore'

// Lazy-loaded page components for code splitting
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

/** Wrap each route page in an error boundary that resets when the route changes */
function RouteErrorBoundary({ children, name }: { children: React.ReactNode; name: string }) {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={`${name}:${location.pathname}`}>
      {children}
    </ErrorBoundary>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
          <RouteErrorBoundary name="dashboard">
            <DashboardPage />
          </RouteErrorBoundary>
        } />
        <Route path="talent" element={
          <RouteErrorBoundary name="talent">
            <TalentListPage />
          </RouteErrorBoundary>
        } />
        <Route path="bulk-profiles" element={
          <RouteErrorBoundary name="bulk-profiles">
            <BulkProfilesPage />
          </RouteErrorBoundary>
        } />
        <Route path="talent/new" element={
          <RouteErrorBoundary name="talent-new">
            <TalentFormPage />
          </RouteErrorBoundary>
        } />
        <Route path="talent/:id" element={
          <RouteErrorBoundary name="talent-detail">
            <TalentDetailPage />
          </RouteErrorBoundary>
        } />
        <Route path="talent/:id/edit" element={
          <RouteErrorBoundary name="talent-edit">
            <TalentFormPage />
          </RouteErrorBoundary>
        } />
        <Route path="talent/:id/print" element={
          <RouteErrorBoundary name="talent-print">
            <TalentPrintPage />
          </RouteErrorBoundary>
        } />
        <Route path="kanban" element={
          <RouteErrorBoundary name="kanban">
            <KanbanPage />
          </RouteErrorBoundary>
        } />
        <Route path="evaluations" element={
          <RouteErrorBoundary name="evaluations">
            <EvaluationsPage />
          </RouteErrorBoundary>
        } />
        <Route path="evaluations/new" element={
          <RouteErrorBoundary name="evaluations-new">
            <EvaluationsPage />
          </RouteErrorBoundary>
        } />
        <Route path="compare" element={
          <RouteErrorBoundary name="compare">
            <ComparePage />
          </RouteErrorBoundary>
        } />
        <Route path="search" element={
          <RouteErrorBoundary name="search">
            <SearchPage />
          </RouteErrorBoundary>
        } />
        <Route path="favorites" element={
          <RouteErrorBoundary name="favorites">
            <FavoritesPage />
          </RouteErrorBoundary>
        } />
        <Route path="shortlisted" element={
          <RouteErrorBoundary name="shortlisted">
            <ShortlistedPage />
          </RouteErrorBoundary>
        } />
        <Route path="settings" element={
          <RouteErrorBoundary name="settings">
            <SettingsPage />
          </RouteErrorBoundary>
        } />
        <Route path="audit" element={
          <RouteErrorBoundary name="audit">
            <AuditPage />
          </RouteErrorBoundary>
        } />
        <Route path="about" element={
          <RouteErrorBoundary name="about">
            <AboutPage />
          </RouteErrorBoundary>
        } />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader fullScreen />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
