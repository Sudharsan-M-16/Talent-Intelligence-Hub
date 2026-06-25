import { describe, it, expect } from 'vitest'
import { safeUrl, normalizeUrl } from '../lib/utils'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

describe('form validation', () => {
  it('rejects invalid email format — missing @', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })

  it('rejects invalid email format — missing domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })

  it('rejects invalid email format — missing tld', () => {
    expect(isValidEmail('user@domain')).toBe(false)
  })

  it('accepts valid email format', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('accepts valid email with subdomain', () => {
    expect(isValidEmail('user@mail.example.co.in')).toBe(true)
  })

  it('accepts valid email with plus', () => {
    expect(isValidEmail('user+tag@example.com')).toBe(true)
  })

  it('normalizeUrl prepends https:// to bare domain', () => {
    expect(normalizeUrl('github.com/user')).toBe('https://github.com/user')
  })

  it('normalizeUrl does not modify existing https:// URL', () => {
    expect(normalizeUrl('https://linkedin.com/in/user')).toBe('https://linkedin.com/in/user')
  })

  it('normalizeUrl handles empty input', () => {
    expect(normalizeUrl('')).toBeUndefined()
  })

  it('normalizeUrl handles undefined input', () => {
    expect(normalizeUrl(undefined)).toBeUndefined()
  })

  it('safeUrl rejects javascript: URLs', () => {
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('JAVASCRIPT:void(0)')).toBeUndefined()
  })

  it('safeUrl rejects data: URLs', () => {
    expect(safeUrl('data:text/html,hello')).toBeUndefined()
  })

  it('safeUrl accepts https:// URLs', () => {
    expect(safeUrl('https://portfolio.example.com')).toBe('https://portfolio.example.com')
  })

  it('safeUrl returns undefined for empty input', () => {
    expect(safeUrl('')).toBeUndefined()
    expect(safeUrl(undefined)).toBeUndefined()
  })

  it('safeUrl rejects bare domain', () => {
    expect(safeUrl('example.com')).toBeUndefined()
  })
})
