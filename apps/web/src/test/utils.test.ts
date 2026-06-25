import { describe, it, expect } from 'vitest'
import { formatRelativeTime, formatCurrency, cn, safeUrl, normalizeUrl } from '../lib/utils'

describe('utils', () => {
  it('formatRelativeTime returns "just now" for very recent timestamps', () => {
    const result = formatRelativeTime(new Date().toISOString())
    expect(result).toBe('just now')
  })

  it('formatRelativeTime returns "Xh ago" for timestamps a few hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const result = formatRelativeTime(twoHoursAgo)
    expect(result).toBe('2h ago')
  })

  it('formatRelativeTime returns "Xd ago" for timestamps a few days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const result = formatRelativeTime(threeDaysAgo)
    expect(result).toBe('3d ago')
  })

  it('formatRelativeTime returns "Xm ago" for minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const result = formatRelativeTime(fiveMinutesAgo)
    expect(result).toBe('5m ago')
  })

  it('formatCurrency formats numbers with currency symbol', () => {
    const result = formatCurrency(120000)
    // Should include some form of the number
    expect(result).toContain('1')
    expect(result).not.toBe('—')
  })

  it('formatCurrency returns em dash for 0 or undefined', () => {
    expect(formatCurrency(0)).toBe('—')
    expect(formatCurrency(undefined)).toBe('—')
  })

  it('cn joins classNames correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('cn ignores falsy values', () => {
    expect(cn('foo', false && 'bar', undefined, null, '')).toBe('foo')
  })

  it('cn merges tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })
})

describe('safeUrl', () => {
  it('accepts https:// URLs', () => {
    expect(safeUrl('https://example.com')).toBe('https://example.com')
  })

  it('accepts http:// URLs', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com')
  })

  it('rejects javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
  })

  it('rejects data: URLs', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined()
  })

  it('returns undefined for empty input', () => {
    expect(safeUrl('')).toBeUndefined()
    expect(safeUrl(undefined)).toBeUndefined()
  })

  it('rejects bare domain without protocol', () => {
    expect(safeUrl('example.com')).toBeUndefined()
  })
})

describe('normalizeUrl', () => {
  it('prepends https:// to bare domain', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
  })

  it('does not modify existing https:// URL', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com')
  })

  it('does not modify existing http:// URL', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })

  it('handles empty input', () => {
    expect(normalizeUrl('')).toBeUndefined()
    expect(normalizeUrl(undefined)).toBeUndefined()
  })

  it('handles whitespace-only input', () => {
    expect(normalizeUrl('   ')).toBeUndefined()
  })
})
