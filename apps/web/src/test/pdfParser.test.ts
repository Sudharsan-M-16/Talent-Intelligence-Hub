import { describe, it, expect } from 'vitest'
import { dedupeSkills, parsedToProfile } from '../lib/pdfParser'
import type { ParsedResume } from '../lib/pdfParser'

function makeParsed(overrides: Partial<ParsedResume> = {}): ParsedResume {
  return {
    primary_skills: [],
    secondary_skills: [],
    certifications: [],
    industry_domains: [],
    rawText: '',
    parseMode: 'heuristic',
    ...overrides,
  }
}

describe('pdfParser utilities', () => {
  it('deduplicates exact case-insensitive duplicates (React vs react)', () => {
    // dedupeSkills key is s.toLowerCase().replace(/[.\s\-]/g, '')
    // 'React' → 'react', 'react' → 'react' (same key, deduplicated)
    // 'React.js' → 'reactjs' (different key, kept)
    const result = dedupeSkills(['React', 'react', 'Python'])
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('React')
    expect(result[1]).toBe('Python')
  })

  it('dedupeSkills keeps first occurrence', () => {
    const result = dedupeSkills(['Python', 'python', 'PYTHON'])
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('Python')
  })

  it('dedupeSkills with empty array returns empty', () => {
    expect(dedupeSkills([])).toEqual([])
  })

  it('parsedToProfile maps full_name', () => {
    const parsed = makeParsed({ full_name: 'Alice Smith' })
    const profile = parsedToProfile(parsed)
    expect(profile.full_name).toBe('Alice Smith')
  })

  it('parsedToProfile maps email', () => {
    const parsed = makeParsed({ email: 'alice@example.com' })
    const profile = parsedToProfile(parsed)
    expect(profile.email).toBe('alice@example.com')
  })

  it('parsedToProfile maps phone', () => {
    const parsed = makeParsed({ phone: '+91 9876543210' })
    const profile = parsedToProfile(parsed)
    expect(profile.phone).toBe('+91 9876543210')
  })

  it('parsedToProfile maps primary_skills', () => {
    const parsed = makeParsed({ primary_skills: ['Python', 'Django'] })
    const profile = parsedToProfile(parsed)
    expect(profile.primary_skills).toEqual(['Python', 'Django'])
  })

  it('parsedToProfile maps years_experience', () => {
    const parsed = makeParsed({ years_experience: 7 })
    const profile = parsedToProfile(parsed)
    expect(profile.years_experience).toBe(7)
  })

  it('parsedToProfile maps linkedin_url', () => {
    const parsed = makeParsed({ linkedin_url: 'https://linkedin.com/in/alice' })
    const profile = parsedToProfile(parsed)
    expect(profile.linkedin_url).toBe('https://linkedin.com/in/alice')
  })

  it('parsedToProfile sets domains from industry_domains', () => {
    const parsed = makeParsed({ industry_domains: ['FinTech', 'SaaS'] })
    const profile = parsedToProfile(parsed)
    expect(profile.domains).toEqual(['FinTech', 'SaaS'])
  })

  it('parsedToProfile notes: summary becomes notes with parseMode suffix', () => {
    const parsed = makeParsed({ summary: 'Experienced developer.', parseMode: 'ai' })
    const profile = parsedToProfile(parsed)
    expect(profile.notes).toContain('Experienced developer.')
    expect(profile.notes).toContain('AI')
  })

  it('parsedToProfile returns empty string for missing full_name', () => {
    const parsed = makeParsed({ full_name: undefined })
    const profile = parsedToProfile(parsed)
    expect(profile.full_name).toBe('')
  })
})
