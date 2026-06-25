import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileCompleteness from '../components/ui/ProfileCompleteness'
import type { TalentProfile } from '../types/database'

function makeProfile(overrides: Partial<TalentProfile> = {}): TalentProfile {
  return {
    id: 'test-1',
    organization_id: 'demo-org-001',
    full_name: '',
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

describe('ProfileCompleteness', () => {
  it('shows low percentage for nearly empty profile', () => {
    // Only talent_type and source are filled (required fields always present)
    const profile = makeProfile({ full_name: '' })
    const { container } = render(<ProfileCompleteness profile={profile} />)
    // 2/14 filled = ~14%
    const text = container.textContent ?? ''
    // Should not show 100%
    expect(text).not.toContain('100%')
  })

  it('shows 100% for a fully filled profile', () => {
    const profile = makeProfile({
      full_name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '1234567890',
      talent_type: 'Trainer',
      source: 'LinkedIn',
      organization: 'ACME Corp',
      designation: 'Lead Trainer',
      years_experience: 5,
      location: 'Chennai',
      primary_skills: ['Python'],
      secondary_skills: ['SQL'],
      linkedin_url: 'https://linkedin.com/in/alice',
      resume_url: 'https://example.com/resume.pdf',
      overall_rating: 4.5,
    })
    const { container } = render(<ProfileCompleteness profile={profile} />)
    expect(container.textContent).toContain('100%')
  })

  it('shows warning color (var(--warning)) below 50%', () => {
    // Only 2 fields: talent_type + source (minimal overrides, no name/email/etc)
    const profile = makeProfile()
    const { container } = render(<ProfileCompleteness profile={profile} />)
    // The progress circle should use --warning color
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1] // second circle is the progress arc
    expect(progressCircle?.getAttribute('stroke')).toBe('var(--warning)')
  })

  it('shows accent color between 50-79%', () => {
    // Fill about 8/14 fields ~ 57%
    const profile = makeProfile({
      full_name: 'Bob',
      email: 'bob@test.com',
      phone: '123',
      organization: 'Corp',
      designation: 'Dev',
      years_experience: 3,
      location: 'Mumbai',
      primary_skills: ['Java'],
    })
    const { container } = render(<ProfileCompleteness profile={profile} />)
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]
    expect(progressCircle?.getAttribute('stroke')).toBe('var(--accent)')
  })

  it('shows success color at 80%+', () => {
    // Fill 12/14 fields ~ 86%
    const profile = makeProfile({
      full_name: 'Carol',
      email: 'carol@test.com',
      phone: '456',
      organization: 'Corp',
      designation: 'PM',
      years_experience: 8,
      location: 'Bangalore',
      primary_skills: ['React'],
      secondary_skills: ['Vue'],
      linkedin_url: 'https://linkedin.com/carol',
      resume_url: 'https://example.com/cv.pdf',
      overall_rating: 4.2,
    })
    const { container } = render(<ProfileCompleteness profile={profile} />)
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]
    expect(progressCircle?.getAttribute('stroke')).toBe('var(--success)')
  })

  it('shows field count in md size', () => {
    const profile = makeProfile({
      full_name: 'Dave',
      email: 'dave@test.com',
    })
    const { container } = render(<ProfileCompleteness profile={profile} size="md" />)
    // Should show "X/14 fields"
    expect(container.textContent).toContain('/14 fields')
  })
})
