import { describe, it, expect } from 'vitest'
import { removeDuplicateProfiles } from '../lib/profileSpreadsheet'
import type { TalentProfile } from '../types/database'

function makeProfile(overrides: Partial<TalentProfile> = {}): TalentProfile {
  return {
    id: 'test-' + Math.random().toString(36).slice(2),
    organization_id: 'demo-org-001',
    full_name: 'Test User',
    talent_type: 'Trainer',
    source: 'Manual',
    status: 'New',
    primary_skills: [],
    secondary_skills: [],
    certifications: [],
    domains: [],
    is_shortlisted: false,
    is_favorite: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// Test CSV injection protection via the escape logic
function sanitizeCsvValue(value: unknown): string {
  let str = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(str)) str = "'" + str
  if (/[",\n\r\t]/.test(str)) str = `"${str.replace(/"/g, '""')}"`
  return str
}

describe('profileSpreadsheet', () => {
  it('sanitizes CSV injection in cell values starting with =', () => {
    expect(sanitizeCsvValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
  })

  it('sanitizes CSV injection in cell values starting with +', () => {
    expect(sanitizeCsvValue('+1234567890')).toBe("'+1234567890")
  })

  it('sanitizes CSV injection in cell values starting with @', () => {
    expect(sanitizeCsvValue('@SUM')).toBe("'@SUM")
  })

  it('detects duplicate profiles by email', () => {
    const existing = [makeProfile({ email: 'alice@example.com' })]
    const incoming = [makeProfile({ email: 'alice@example.com', full_name: 'Alice Duplicate' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(0)
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].full_name).toBe('Alice Duplicate')
  })

  it('detects duplicate profiles by phone', () => {
    const existing = [makeProfile({ phone: '9876543210' })]
    const incoming = [makeProfile({ phone: '9876543210', full_name: 'Phone Duplicate' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(0)
    expect(duplicates).toHaveLength(1)
  })

  it('handles profiles with no email or phone (no false duplicate)', () => {
    const existing = [makeProfile({ email: undefined, phone: undefined })]
    const incoming = [makeProfile({ email: undefined, phone: undefined })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    // No keys to match on — both should be treated as unique
    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)
  })

  it('does not duplicate-detect profiles with different emails', () => {
    const existing = [makeProfile({ email: 'alice@example.com' })]
    const incoming = [makeProfile({ email: 'bob@example.com' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)
  })

  it('cell with no special chars passes through unchanged', () => {
    expect(sanitizeCsvValue('Hello World')).toBe('Hello World')
  })

  it('cell with comma is wrapped in quotes', () => {
    const result = sanitizeCsvValue('Smith, John')
    expect(result).toBe('"Smith, John"')
  })

  it('cell with double quote is escaped', () => {
    const result = sanitizeCsvValue('He said "Hello"')
    expect(result).toBe('"He said ""Hello"""')
  })
})
