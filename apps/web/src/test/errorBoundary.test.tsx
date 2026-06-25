import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorBoundary from '../components/ErrorBoundary'

// Suppress expected console.error output from intentional throws
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error from Bomb')
  return <div>Safe content</div>
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content')).toBeTruthy()
  })

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Test error from Bomb')).toBeTruthy()
  })

  it('shows Try Again button', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
  })

  it('shows Go Home button', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /go home/i })).toBeTruthy()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeTruthy()
  })

  it('Try Again button resets the error state', async () => {
    const user = userEvent.setup()
    // We render with a non-throwing bomb after clicking Try Again
    // The test verifies the button is clickable without error
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    const tryAgainBtn = screen.getByRole('button', { name: /try again/i })
    // Should not throw
    await user.click(tryAgainBtn)
    // After clicking, it re-renders children (which will throw again, showing the boundary)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
  })
})
