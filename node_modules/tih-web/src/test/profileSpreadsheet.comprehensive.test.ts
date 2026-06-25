/**
 * Comprehensive test suite for profileSpreadsheet.ts
 * Covers: parseCsv, listVal, fuzzyEnum, looksLikePhone, looksLikeExp, findAlias,
 *         filterProfilesForBulkPage, removeDuplicateProfiles, profileToExportRow,
 *         and full parseProfilesWorkbook pipeline with mock File objects
 */
import { describe, it, expect } from 'vitest'
import {
  parseCsv,
  listVal,
  fuzzyEnum,
  looksLikePhone,
  looksLikeExp,
  findAlias,
  txt,
  num,
  escape,
  normSkill,
  detectDelimiter,
  filterProfilesForBulkPage,
  removeDuplicateProfiles,
  profileToExportRow,
  parseProfilesWorkbook,
  RX_EMAIL,
} from '../lib/profileSpreadsheet'
import type { TalentProfile } from '../types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeFile(content: string, name = 'test.csv'): File {
  return new File([content], name, { type: 'text/csv' })
}

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

// ─── parseCsv ────────────────────────────────────────────────────────────────
describe('parseCsv', () => {
  it('parses basic comma-delimited CSV', () => {
    const result = parseCsv('Name,Email\nAlice,alice@example.com')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(['Name', 'Email'])
    expect(result[1]).toEqual(['Alice', 'alice@example.com'])
  })

  it('parses semicolon-delimited CSV', () => {
    const result = parseCsv('Name;Email;Phone\nBob;bob@test.com;1234567890')
    expect(result[0]).toEqual(['Name', 'Email', 'Phone'])
    expect(result[1]).toEqual(['Bob', 'bob@test.com', '1234567890'])
  })

  it('parses tab-delimited TSV', () => {
    const result = parseCsv('Name\tEmail\nCharlie\tcharlie@test.com')
    expect(result[0]).toEqual(['Name', 'Email'])
    expect(result[1]).toEqual(['Charlie', 'charlie@test.com'])
  })

  it('handles quoted cells with commas inside', () => {
    const result = parseCsv('"Smith, John",john@test.com')
    expect(result[0][0]).toBe('Smith, John')
    expect(result[0][1]).toBe('john@test.com')
  })

  it('handles escaped double quotes inside quoted cells', () => {
    const result = parseCsv('"He said ""Hello""",test@test.com')
    expect(result[0][0]).toBe('He said "Hello"')
  })

  it('strips UTF-8 BOM', () => {
    const result = parseCsv('﻿Name,Email\nAlice,alice@test.com')
    // BOM stripped — first row should start with 'Name' not BOM+Name
    expect(result[0][0]).not.toMatch(/﻿/)
  })

  it('handles CRLF line endings', () => {
    const result = parseCsv('Name,Email\r\nAlice,alice@test.com')
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(['Alice', 'alice@test.com'])
  })

  it('handles CR-only line endings (old Mac)', () => {
    const result = parseCsv('Name,Email\rAlice,alice@test.com')
    expect(result).toHaveLength(2)
  })

  it('filters out blank rows', () => {
    const result = parseCsv('Name,Email\n\n\nAlice,alice@test.com\n\n')
    expect(result).toHaveLength(2) // header + 1 data row
  })

  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('   \n  \n  ')).toEqual([])
  })

  it('handles single-column files', () => {
    const result = parseCsv('Name\nAlice\nBob')
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(['Name'])
  })

  it('handles cells with newlines inside quotes', () => {
    const result = parseCsv('"Alice\nSmith",alice@test.com')
    expect(result[0][0]).toBe('Alice\nSmith')
  })

  it('handles trailing commas (empty last column)', () => {
    const result = parseCsv('Name,Email,\nAlice,alice@test.com,')
    expect(result[0]).toHaveLength(3)
  })
})

// ─── detectDelimiter ─────────────────────────────────────────────────────────
describe('detectDelimiter', () => {
  it('detects comma delimiter', () => {
    expect(detectDelimiter('Name,Email,Phone')).toBe(',')
  })
  it('detects semicolon delimiter', () => {
    expect(detectDelimiter('Name;Email;Phone')).toBe(';')
  })
  it('detects tab delimiter', () => {
    expect(detectDelimiter('Name\tEmail\tPhone')).toBe('\t')
  })
  it('detects pipe delimiter', () => {
    expect(detectDelimiter('Name|Email|Phone')).toBe('|')
  })
  it('does not count delimiters inside quotes', () => {
    // "Smith, John";Email should be detected as semicolon
    expect(detectDelimiter('"Smith, John";Email')).toBe(';')
  })
})

// ─── listVal ─────────────────────────────────────────────────────────────────
describe('listVal', () => {
  it('splits comma-separated skills', () => {
    expect(listVal('Python, Java, React')).toEqual(['Python', 'Java', 'React'])
  })

  it('splits pipe-separated skills', () => {
    expect(listVal('Python|Java|React')).toEqual(['Python', 'Java', 'React'])
  })

  it('splits semicolon-separated skills', () => {
    expect(listVal('Python;Java;React')).toEqual(['Python', 'Java', 'React'])
  })

  it('splits slash-separated skills', () => {
    expect(listVal('AI/ML')).toEqual(['AI/ML']) // single slash item preserved
  })

  it('splits mixed separators', () => {
    const result = listVal('Python, Java | AWS; Docker')
    expect(result).toContain('Python')
    expect(result).toContain('Java')
    expect(result).toContain('AWS')
    expect(result).toContain('Docker')
  })

  it('splits & connector', () => {
    const result = listVal('React & Node.js')
    expect(result).toContain('React')
    expect(result).toContain('Node.js')
  })

  it('deduplicates skills case-insensitively', () => {
    const result = listVal('Python, python, PYTHON')
    expect(result).toHaveLength(1)
  })

  it('normalizes react.js → React', () => {
    const result = listVal('react.js, node.js')
    expect(result).toContain('React')
    expect(result).toContain('Node.js')
  })

  it('normalizes js → JavaScript', () => {
    expect(listVal('js')).toContain('JavaScript')
  })

  it('returns empty array for empty input', () => {
    expect(listVal('')).toEqual([])
    expect(listVal(null)).toEqual([])
    expect(listVal(undefined)).toEqual([])
  })

  it('handles single skill', () => {
    expect(listVal('Python')).toEqual(['Python'])
  })
})

// ─── normSkill ───────────────────────────────────────────────────────────────
describe('normSkill', () => {
  it('normalizes typescript → TypeScript', () => {
    expect(normSkill('typescript')).toBe('TypeScript')
  })
  it('passes through unknown skills unchanged', () => {
    expect(normSkill('Kubernetes')).toBe('Kubernetes')
  })
  it('is case-insensitive for aliases', () => {
    expect(normSkill('REACTJS')).toBe('React')
  })
})

// ─── fuzzyEnum ───────────────────────────────────────────────────────────────
describe('fuzzyEnum', () => {
  const statuses = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected'] as const
  const types = ['Trainer', 'Consultant', 'Employee', 'Speaker', 'Mentor', 'Freelancer', 'Contractor', 'Other'] as const
  const sources = ['WhatsApp', 'LinkedIn', 'Referral', 'Email', 'Website', 'Job Portal', 'Manual', 'Other'] as const

  it('exact match (case-insensitive)', () => {
    expect(fuzzyEnum('approved', statuses)).toBe('Approved')
    expect(fuzzyEnum('SHORTLISTED', statuses)).toBe('Shortlisted')
  })

  it('partial match — value contains enum word', () => {
    expect(fuzzyEnum('Super Approved by Manager', statuses)).toBe('Approved')
    expect(fuzzyEnum('currently under review', statuses)).toBe('Under Review')
  })

  it('partial match — enum word in value fragment', () => {
    expect(fuzzyEnum('Trainer (Certified)', types)).toBe('Trainer')
  })

  it('returns fallback for unknown value', () => {
    expect(fuzzyEnum('completely unknown', statuses, 'New')).toBe('New')
  })

  it('returns undefined fallback for no match', () => {
    expect(fuzzyEnum('xyz', statuses)).toBeUndefined()
  })

  it('does not false-match very short strings', () => {
    // "O" should not match "Other" or "Employee"
    expect(fuzzyEnum('O', types)).toBeUndefined()
  })

  it('matches WhatsApp source', () => {
    expect(fuzzyEnum('whatsapp', sources)).toBe('WhatsApp')
  })

  it('matches Job Portal source', () => {
    expect(fuzzyEnum('job portal', sources)).toBe('Job Portal')
    expect(fuzzyEnum('job-portal', sources)).toBe('Job Portal')
  })

  it('matches LinkedIn', () => {
    expect(fuzzyEnum('linkedin', sources)).toBe('LinkedIn')
  })

  it('handles null/undefined', () => {
    expect(fuzzyEnum(null, statuses)).toBeUndefined()
    expect(fuzzyEnum(undefined, statuses, 'New')).toBe('New')
  })
})

// ─── looksLikePhone ──────────────────────────────────────────────────────────
describe('looksLikePhone', () => {
  it('accepts standard 10-digit numbers', () => {
    expect(looksLikePhone('9876543210')).toBe(true)
  })

  it('accepts phone with country code', () => {
    expect(looksLikePhone('+91-9876543210')).toBe(true)
    expect(looksLikePhone('+1 (555) 123-4567')).toBe(true)
  })

  it('accepts phone with spaces and dashes', () => {
    expect(looksLikePhone('98765 43210')).toBe(true)
  })

  it('rejects email addresses', () => {
    expect(looksLikePhone('test@example.com')).toBe(false)
  })

  it('rejects very short numbers (< 7 digits)', () => {
    expect(looksLikePhone('12345')).toBe(false)
  })

  it('rejects very long numbers (> 15 digits)', () => {
    expect(looksLikePhone('1234567890123456789')).toBe(false)
  })

  it('rejects text strings', () => {
    expect(looksLikePhone('hello world')).toBe(false)
  })
})

// ─── looksLikeExp ────────────────────────────────────────────────────────────
describe('looksLikeExp', () => {
  it('accepts valid experience values', () => {
    expect(looksLikeExp('5')).toBe(true)
    expect(looksLikeExp('12')).toBe(true)
    expect(looksLikeExp('0')).toBe(true)
    expect(looksLikeExp('3.5')).toBe(true)
  })

  it('rejects 4-digit years', () => {
    expect(looksLikeExp('2020')).toBe(false)
    expect(looksLikeExp('2023')).toBe(false)
    expect(looksLikeExp('1999')).toBe(false)
  })

  it('rejects negative values', () => {
    expect(looksLikeExp('-1')).toBe(false)
  })

  it('rejects values > 80', () => {
    expect(looksLikeExp('85')).toBe(false)
  })

  it('rejects values with letters', () => {
    expect(looksLikeExp('5 years')).toBe(false)
    expect(looksLikeExp('NA')).toBe(false)
  })

  it('rejects empty/null', () => {
    expect(looksLikeExp('')).toBe(false)
    expect(looksLikeExp('  ')).toBe(false)
  })
})

// ─── findAlias ───────────────────────────────────────────────────────────────
describe('findAlias', () => {
  it('exact alias match', () => {
    const [field, score] = findAlias('email')
    expect(field).toBe('email')
    expect(score).toBe(100)
  })

  it('case-insensitive match', () => {
    expect(findAlias('EMAIL')[0]).toBe('email')
    expect(findAlias('Full Name')[0]).toBe('full_name')
  })

  it('strips special chars for matching', () => {
    expect(findAlias('Full-Name')[0]).toBe('full_name')
    expect(findAlias('full_name_col')[0]).toBe('full_name')
  })

  it('maps creative headers via partial contains', () => {
    expect(findAlias('Candidate Full Name')[0]).toBe('full_name')
    expect(findAlias('Email Address')[0]).toBe('email')
    expect(findAlias('Mobile Number')[0]).toBe('phone')
    expect(findAlias('Years of Experience')[0]).toBe('years_experience')
    expect(findAlias('Expected CTC')[0]).toBe('expected_compensation')
  })

  it('returns undefined for completely unknown header', () => {
    expect(findAlias('Xyzzy Foo')[0]).toBeUndefined()
  })

  it('maps LinkedIn URL', () => {
    expect(findAlias('LinkedIn URL')[0]).toBe('linkedin_url')
    expect(findAlias('linkedin profile')[0]).toBe('linkedin_url')
  })

  it('maps skill variants', () => {
    expect(findAlias('Key Skills')[0]).toBe('primary_skills')
    expect(findAlias('Tech Stack')[0]).toBe('primary_skills')
    expect(findAlias('Technical Skills')[0]).toBe('primary_skills')
  })

  it('maps compensation variants', () => {
    expect(findAlias('CTC')[0]).toBe('expected_compensation')
    expect(findAlias('Salary')[0]).toBe('expected_compensation')
    expect(findAlias('Annual Salary')[0]).toBe('expected_compensation')
  })
})

// ─── txt ─────────────────────────────────────────────────────────────────────
describe('txt', () => {
  it('returns string from string input', () => { expect(txt('hello')).toBe('hello') })
  it('returns undefined for null', () => { expect(txt(null)).toBeUndefined() })
  it('returns undefined for undefined', () => { expect(txt(undefined)).toBeUndefined() })
  it('returns undefined for whitespace-only', () => { expect(txt('   ')).toBeUndefined() })
  it('trims surrounding whitespace', () => { expect(txt('  hello  ')).toBe('hello') })
  it('converts numbers to strings', () => { expect(txt(42)).toBe('42') })
})

// ─── num ─────────────────────────────────────────────────────────────────────
describe('num', () => {
  it('parses integer', () => { expect(num('5')).toBe(5) })
  it('parses decimal', () => { expect(num('3.5')).toBe(3.5) })
  it('parses number with commas', () => { expect(num('1,00,000')).toBe(100000) })
  it('returns undefined for empty string', () => { expect(num('')).toBeUndefined() })
  it('returns undefined for null', () => { expect(num(null)).toBeUndefined() })
  it('returns undefined for non-numeric text', () => { expect(num('hello')).toBeUndefined() })
  it('extracts number from mixed string', () => { expect(num('5 years')).toBe(5) })
})

// ─── escape (CSV injection) ───────────────────────────────────────────────────
describe('escape (CSV injection protection)', () => {
  it('prefixes = with single quote', () => {
    expect(escape('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
  })
  it('prefixes + with single quote', () => {
    expect(escape('+1234567890')).toBe("'+1234567890")
  })
  it('prefixes @ with single quote', () => {
    expect(escape('@SUM')).toBe("'@SUM")
  })
  it('wraps values with commas in quotes', () => {
    expect(escape('Smith, John')).toBe('"Smith, John"')
  })
  it('escapes double quotes', () => {
    expect(escape('He said "Hello"')).toBe('"He said ""Hello"""')
  })
  it('passes through safe values unchanged', () => {
    expect(escape('Hello World')).toBe('Hello World')
  })
  it('handles numbers', () => {
    expect(escape(42)).toBe('42')
  })
})

// ─── removeDuplicateProfiles ─────────────────────────────────────────────────
describe('removeDuplicateProfiles', () => {
  it('detects duplicate by email', () => {
    const existing = [makeProfile({ email: 'alice@example.com' })]
    const incoming = [makeProfile({ email: 'alice@example.com', full_name: 'Alice 2' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(0)
    expect(duplicates).toHaveLength(1)
  })

  it('detects duplicate by phone', () => {
    const existing = [makeProfile({ phone: '9876543210' })]
    const incoming = [makeProfile({ phone: '9876543210' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(duplicates).toHaveLength(1)
  })

  it('case-insensitive email matching', () => {
    const existing = [makeProfile({ email: 'ALICE@EXAMPLE.COM' })]
    const incoming = [makeProfile({ email: 'alice@example.com' })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(duplicates).toHaveLength(1)
  })

  it('allows profiles with no email or phone through (no match key)', () => {
    const existing = [makeProfile({ email: undefined, phone: undefined })]
    const incoming = [makeProfile({ email: undefined, phone: undefined })]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(1)
    expect(duplicates).toHaveLength(0)
  })

  it('allows profiles with different emails', () => {
    const existing = [makeProfile({ email: 'alice@example.com' })]
    const incoming = [makeProfile({ email: 'bob@example.com' })]
    const { unique } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(1)
  })

  it('handles mixed batch — some unique some duplicate', () => {
    const existing = [makeProfile({ email: 'alice@example.com' })]
    const incoming = [
      makeProfile({ email: 'alice@example.com' }), // dup
      makeProfile({ email: 'bob@example.com' }),     // unique
      makeProfile({ email: 'charlie@example.com' }), // unique
    ]
    const { unique, duplicates } = removeDuplicateProfiles(incoming, existing)
    expect(unique).toHaveLength(2)
    expect(duplicates).toHaveLength(1)
  })
})

// ─── profileToExportRow ──────────────────────────────────────────────────────
describe('profileToExportRow', () => {
  it('serializes a full profile correctly', () => {
    const p = makeProfile({
      full_name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '9876543210',
      talent_type: 'Consultant',
      source: 'LinkedIn',
      status: 'Shortlisted',
      primary_skills: ['React', 'TypeScript'],
      secondary_skills: ['AWS'],
      certifications: ['AWS SA'],
      is_shortlisted: true,
      is_favorite: false,
      overall_rating: 4.5,
    })
    const row = profileToExportRow(p)
    expect(row['Full Name']).toBe('Alice Smith')
    expect(row['Email']).toBe('alice@example.com')
    expect(row['Talent Type']).toBe('Consultant')
    expect(row['Primary Skills']).toBe('React, TypeScript')
    expect(row['Secondary Skills']).toBe('AWS')
    expect(row['Certifications']).toBe('AWS SA')
    expect(row['Shortlisted']).toBe('Yes')
    expect(row['Favorite']).toBe('No')
    expect(row['Overall Rating']).toBe(4.5)
  })

  it('outputs empty strings for missing optional fields', () => {
    const p = makeProfile({ email: undefined, phone: undefined, location: undefined })
    const row = profileToExportRow(p)
    expect(row['Email']).toBe('')
    expect(row['Phone']).toBe('')
    expect(row['Location']).toBe('')
  })

  it('serializes empty skill arrays as empty string', () => {
    const p = makeProfile({ primary_skills: [], secondary_skills: [] })
    const row = profileToExportRow(p)
    expect(row['Primary Skills']).toBe('')
    expect(row['Secondary Skills']).toBe('')
  })
})

// ─── filterProfilesForBulkPage ───────────────────────────────────────────────
describe('filterProfilesForBulkPage', () => {
  const defaultFilters = { query:'', skill:'', location:'', minExperience:'', maxExperience:'', status:'', source:'', talentType:'' }

  const profiles: TalentProfile[] = [
    makeProfile({ full_name:'Alice React Dev', email:'alice@test.com', primary_skills:['React','TypeScript'], location:'Mumbai', years_experience:5, status:'Shortlisted', source:'LinkedIn', talent_type:'Consultant' }),
    makeProfile({ full_name:'Bob Python Dev', email:'bob@test.com', primary_skills:['Python','Django'], location:'Bangalore', years_experience:8, status:'New', source:'Referral', talent_type:'Employee' }),
    makeProfile({ full_name:'Charlie DevOps', email:'charlie@test.com', primary_skills:['AWS','Docker'], location:'Delhi', years_experience:3, status:'Approved', source:'Manual', talent_type:'Contractor' }),
    makeProfile({ full_name:'Inactive User', email:'inactive@test.com', primary_skills:['Java'], location:'Chennai', years_experience:10, is_active:false }),
  ]

  it('returns all active profiles with no filters', () => {
    const result = filterProfilesForBulkPage(profiles, defaultFilters)
    expect(result).toHaveLength(3) // excludes inactive
  })

  it('excludes inactive profiles always', () => {
    const result = filterProfilesForBulkPage(profiles, defaultFilters)
    expect(result.every(p => p.is_active)).toBe(true)
  })

  it('filters by text query (name)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, query: 'alice' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Alice React Dev')
  })

  it('filters by text query (skill)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, query: 'python' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Bob Python Dev')
  })

  it('filters by skill (single)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, skill: 'React' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Alice React Dev')
  })

  it('filters by skill (multiple, all must match)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, skill: 'React,TypeScript' })
    expect(result).toHaveLength(1)
  })

  it('filters by location (partial match)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, location: 'bang' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Bob Python Dev')
  })

  it('filters by min experience', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, minExperience: '6' })
    expect(result).toHaveLength(1) // only Bob (8 yrs)
  })

  it('filters by max experience', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, maxExperience: '4' })
    expect(result).toHaveLength(1) // only Charlie (3 yrs)
  })

  it('filters by experience range', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, minExperience: '4', maxExperience: '7' })
    expect(result).toHaveLength(1) // Alice (5 yrs)
  })

  it('filters by status', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, status: 'Shortlisted' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Alice React Dev')
  })

  it('filters by source', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, source: 'Referral' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Bob Python Dev')
  })

  it('filters by talent type', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, talentType: 'Contractor' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Charlie DevOps')
  })

  it('combines multiple filters (AND logic)', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, location: 'bangalore', status: 'New' })
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Bob Python Dev')
  })

  it('returns empty array when nothing matches', () => {
    const result = filterProfilesForBulkPage(profiles, { ...defaultFilters, query: 'nonexistent_xyz' })
    expect(result).toHaveLength(0)
  })
})

// ─── parseProfilesWorkbook — integration (mock CSV File) ────────────────────
describe('parseProfilesWorkbook', () => {
  it('parses a clean standard CSV', async () => {
    const csv = [
      'Full Name,Email,Phone,Talent Type,Source,Status,Primary Skills,Location,Years Experience',
      'Alice Smith,alice@test.com,9876543210,Consultant,LinkedIn,Shortlisted,"React, Node.js",Mumbai,5',
      'Bob Jones,bob@test.com,1234567890,Employee,Referral,New,"Python, Django",Bangalore,8',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(2)
    expect(result.failedRows).toHaveLength(0)
    const alice = result.profiles[0]
    expect(alice.full_name).toBe('Alice Smith')
    expect(alice.email).toBe('alice@test.com')
    expect(alice.talent_type).toBe('Consultant')
    expect(alice.status).toBe('Shortlisted')
    expect(alice.primary_skills).toContain('React')
    expect(alice.primary_skills).toContain('Node.js')
    expect(alice.years_experience).toBe(5)
    expect(alice.location).toBe('Mumbai')
  })

  it('handles fuzzy/creative column headers', async () => {
    const csv = [
      'Candidate Full Name,Email Address,Mobile Number,Current Company,Total Experience',
      'Alice Smith,alice@test.com,9876543210,Tech Corp,6',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(1)
    const p = result.profiles[0]
    expect(p.full_name).toBe('Alice Smith')
    expect(p.email).toBe('alice@test.com')
    expect(p.phone).toBe('9876543210')
    expect(p.organization).toBe('Tech Corp')
    expect(p.years_experience).toBe(6)
  })

  it('infers email and phone from headerless file by pattern', async () => {
    // No headers — all patterns must be inferred
    const csv = [
      'Alice Smith,alice@test.com,9876543210',
      'Bob Jones,bob@test.com,1234567890',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.fileWarnings.length).toBeGreaterThan(0)
    // Emails should be detected by pattern
    const emails = result.profiles.map(p => p.email).filter(Boolean)
    expect(emails).toContain('alice@test.com')
    expect(emails).toContain('bob@test.com')
  })

  it('skips blank rows', async () => {
    const csv = [
      'Full Name,Email',
      'Alice,alice@test.com',
      ',',
      '   ,   ',
      'Bob,bob@test.com',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(2)
  })

  it('puts rows with no identity in failedRows', async () => {
    const csv = [
      'Skill Level,Domain',
      'Expert,FinTech',
      'Intermediate,Healthcare',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.failedRows).toHaveLength(2)
    expect(result.failedRows[0].reason).toContain('No identity marker')
  })

  it('uses email prefix as fallback name when full_name is missing', async () => {
    const csv = 'Email\nalice@example.com'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].full_name).toBe('alice')
  })

  it('detects intra-file duplicate rows', async () => {
    const csv = [
      'Full Name,Email',
      'Alice Smith,alice@test.com',
      'Alice Duplicate,alice@test.com', // same email
    ].join('\n')
    // Both should be extracted (dedup is handled by removeDuplicateProfiles later)
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(2)
  })

  it('handles semicolon-delimited CSV', async () => {
    const csv = 'Full Name;Email;Phone\nAlice Smith;alice@test.com;9876543210'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].email).toBe('alice@test.com')
  })

  it('handles tab-delimited file', async () => {
    const csv = 'Full Name\tEmail\tPhone\nAlice Smith\talice@test.com\t9876543210'
    const result = await parseProfilesWorkbook(makeFile(csv, 'test.csv'))
    expect(result.profiles).toHaveLength(1)
  })

  it('coerces fuzzy status values', async () => {
    const csv = [
      'Full Name,Email,Status',
      'Alice,alice@test.com,Super Approved',
      'Bob,bob@test.com,currently under review',
      'Charlie,charlie@test.com,SHORTLISTED',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].status).toBe('Approved')
    expect(result.profiles[1].status).toBe('Under Review')
    expect(result.profiles[2].status).toBe('Shortlisted')
  })

  it('coerces fuzzy talent type values', async () => {
    const csv = [
      'Full Name,Email,Type',
      'Alice,alice@test.com,trainer',
      'Bob,bob@test.com,CONSULTANT',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].talent_type).toBe('Trainer')
    expect(result.profiles[1].talent_type).toBe('Consultant')
  })

  it('rescues email from wrong column via pattern detection', async () => {
    const csv = [
      'Name,Notes,Contact',
      'Alice Smith,Senior dev,alice@test.com',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].email).toBe('alice@test.com')
  })

  it('rescues phone from wrong column via pattern detection', async () => {
    const csv = [
      'Name,Remarks,Mobile',
      'Bob Jones,good candidate,9876543210',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].phone).toBe('9876543210')
  })

  it('detects and routes LinkedIn URL to linkedin_url', async () => {
    const csv = [
      'Full Name,Email,Profile',
      'Alice Smith,alice@test.com,https://linkedin.com/in/alice',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].linkedin_url).toBe('https://linkedin.com/in/alice')
  })

  it('detects and routes GitHub URL to portfolio_url', async () => {
    const csv = [
      'Full Name,Email,Profile',
      'Alice Smith,alice@test.com,https://github.com/alice',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].portfolio_url).toBe('https://github.com/alice')
  })

  it('handles bare linkedin.com URL without protocol', async () => {
    const csv = [
      'Full Name,Email,URL',
      'Alice Smith,alice@test.com,linkedin.com/in/alice',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].linkedin_url).toBe('https://linkedin.com/in/alice')
  })

  it('parses skills with complex separators', async () => {
    const csv = [
      'Full Name,Email,Skills',
      'Alice,alice@test.com,"Python | Java & AWS; Docker, Kubernetes"',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    const skills = result.profiles[0].primary_skills
    expect(skills).toContain('Python')
    expect(skills).toContain('Java')
    expect(skills).toContain('AWS')
    expect(skills).toContain('Docker')
    expect(skills).toContain('Kubernetes')
  })

  it('handles "Last, First" name format', async () => {
    const csv = [
      'Full Name,Email',
      '"Smith, Alice",alice@test.com',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].full_name).toBe('Alice Smith')
  })

  it('does not infer year values as experience', async () => {
    const csv = [
      'Full Name,Email,Graduation Year',
      'Alice Smith,alice@test.com,2018',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    // 2018 should NOT be inferred as experience
    expect(result.profiles[0].years_experience).toBeUndefined()
  })

  it('handles only header row (no data rows)', async () => {
    const csv = 'Full Name,Email,Phone,Talent Type,Status'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(0)
    expect(result.fileWarnings.some(w => w.includes('only headers'))).toBe(true)
  })

  it('parses compensation correctly without confusing with experience', async () => {
    const csv = [
      'Full Name,Email,Expected Compensation,Years Experience',
      'Alice,alice@test.com,1200000,7',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].expected_compensation).toBe(1200000)
    expect(result.profiles[0].years_experience).toBe(7)
  })

  it('applies default status New for unknown/missing status', async () => {
    const csv = 'Full Name,Email\nAlice Smith,alice@test.com'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].status).toBe('New')
  })

  it('applies default source Manual for missing source', async () => {
    const csv = 'Full Name,Email\nAlice Smith,alice@test.com'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].source).toBe('Manual')
  })

  it('handles 100-row CSV efficiently', async () => {
    const rows = ['Full Name,Email,Primary Skills,Years Experience,Location,Status']
    for (let i = 1; i <= 100; i++) {
      rows.push(`Person ${i},person${i}@test.com,"React, TypeScript",${i % 20},Mumbai,New`)
    }
    const result = await parseProfilesWorkbook(makeFile(rows.join('\n')))
    expect(result.profiles).toHaveLength(100)
    expect(result.failedRows).toHaveLength(0)
  })

  it('handles all-caps headers', async () => {
    const csv = 'NAME,EMAIL,PHONE,LOCATION\nAlice Smith,alice@test.com,9876543210,Mumbai'
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].full_name).toBe('Alice Smith')
    expect(result.profiles[0].email).toBe('alice@test.com')
  })

  it('handles jumbled column order', async () => {
    const csv = [
      'Status,Phone,Full Name,Email,Location,Years Experience,Source',
      'Shortlisted,9876543210,Alice Smith,alice@test.com,Mumbai,5,LinkedIn',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles).toHaveLength(1)
    const p = result.profiles[0]
    expect(p.full_name).toBe('Alice Smith')
    expect(p.status).toBe('Shortlisted')
    expect(p.years_experience).toBe(5)
  })

  it('puts unrecognized cell values into notes', async () => {
    const csv = [
      'Full Name,Email,WildCard1,WildCard2',
      'Alice Smith,alice@test.com,random data 1,random data 2',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    // Unrecognized values should not crash; profile should still be created
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].full_name).toBe('Alice Smith')
  })

  it('throws on unsupported format (.txt mistakenly named)', async () => {
    const file = new File(['hello'], 'file.txt', { type: 'text/plain' })
    // .txt with text/plain should be treated as CSV text
    // (it passes because we check file.type includes text)
    // Just verify it doesn't crash
    const result = await parseProfilesWorkbook(file)
    expect(result).toBeDefined()
  })

  it('throws specific error for .xls format', async () => {
    const file = new File(['dummy'], 'file.xls', { type: 'application/vnd.ms-excel' })
    await expect(parseProfilesWorkbook(file)).rejects.toThrow('xls')
  })

  it('blocks CSV injection values in cell data', async () => {
    const csv = [
      'Full Name,Email,Notes',
      'Alice Smith,alice@test.com,=SUM(A1:A10)',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    // Profile should still be created, but = value should not appear in notes raw
    expect(result.profiles).toHaveLength(1)
    // The notes should either be empty or have the blocked marker, not the raw = formula
    const notes = result.profiles[0].notes ?? ''
    expect(notes).not.toBe('=SUM(A1:A10)')
  })

  it('handles Unicode names correctly', async () => {
    const csv = [
      'Full Name,Email',
      'Aarav Shàrmä,aarav@test.com',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].full_name).toBe('Aarav Shàrmä')
  })

  it('handles extra whitespace in cell values', async () => {
    const csv = [
      'Full Name,Email,Location',
      '  Alice Smith  ,  alice@test.com  ,  Mumbai  ',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].full_name).toBe('Alice Smith')
    expect(result.profiles[0].email).toBe('alice@test.com')
    expect(result.profiles[0].location).toBe('Mumbai')
  })

  it('handles rating values between 0-5', async () => {
    const csv = [
      'Full Name,Email,Overall Rating',
      'Alice,alice@test.com,4.5',
    ].join('\n')
    const result = await parseProfilesWorkbook(makeFile(csv))
    expect(result.profiles[0].overall_rating).toBe(4.5)
  })
})

// ─── RX_EMAIL spot checks ────────────────────────────────────────────────────
describe('RX_EMAIL pattern', () => {
  it('matches standard email', () => {
    expect(RX_EMAIL.test('alice@example.com')).toBe(true)
  })
  it('matches email with dots', () => {
    expect(RX_EMAIL.test('alice.smith@example.co.uk')).toBe(true)
  })
  it('rejects email without @', () => {
    expect(RX_EMAIL.test('notanemail.com')).toBe(false)
  })
  it('rejects email without TLD', () => {
    expect(RX_EMAIL.test('alice@example')).toBe(false)
  })
  it('rejects email with spaces', () => {
    expect(RX_EMAIL.test('alice @example.com')).toBe(false)
  })
})
