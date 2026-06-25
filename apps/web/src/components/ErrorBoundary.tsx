import React from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  resetKey?: string
}
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TIH Error:', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0f',
          padding: 32,
        }}>
          <div style={{
            maxWidth: 520,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>&#9888;&#65039;</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8, fontFamily: 'Figtree, sans-serif' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20, fontFamily: 'Figtree, sans-serif' }}>
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                style={{
                  padding: '10px 20px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'Figtree, sans-serif',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => { window.location.href = '/dashboard' }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: 'Figtree, sans-serif',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/** Lightweight inline error boundary for high-risk sections */
interface InlineProps {
  children: ReactNode
  label?: string
}
interface InlineState { hasError: boolean }

export class InlineErrorBoundary extends React.Component<InlineProps, InlineState> {
  state: InlineState = { hasError: false }

  static getDerivedStateFromError(): InlineState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TIH Section Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--danger)' }}>&#9888;</span>
          {this.props.label ?? 'This section'} failed to load.{' '}
          <button
            onClick={() => window.location.reload()}
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: 0 }}
          >
            Refresh
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
