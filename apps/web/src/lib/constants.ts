import type { TalentStatus, TalentType, TalentSource } from '../types/database'

export const TALENT_STATUSES: TalentStatus[] = [
  'New',
  'Under Review',
  'Shortlisted',
  'Approved',
  'Engaged',
  'Rejected',
]

export const TALENT_TYPES: TalentType[] = [
  'Trainer',
  'Consultant',
  'Employee',
  'Speaker',
  'Mentor',
  'Freelancer',
  'Contractor',
  'Other',
]

export const TALENT_SOURCES: TalentSource[] = [
  'WhatsApp',
  'LinkedIn',
  'Referral',
  'Email',
  'Website',
  'Job Portal',
  'Manual',
  'Other',
]
