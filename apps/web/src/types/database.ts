export type UserRole = 'admin' | 'recruiter' | 'viewer'

export type TalentType =
  | 'Trainer'
  | 'Consultant'
  | 'Employee'
  | 'Speaker'
  | 'Mentor'
  | 'Freelancer'
  | 'Contractor'
  | 'Other'

export type TalentStatus =
  | 'New'
  | 'Under Review'
  | 'Shortlisted'
  | 'Approved'
  | 'Engaged'
  | 'Rejected'

export type TalentSource =
  | 'WhatsApp'
  | 'LinkedIn'
  | 'Referral'
  | 'Email'
  | 'Website'
  | 'Job Portal'
  | 'Manual'
  | 'Other'

export interface Organization {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  organization_id: string
  role: UserRole
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}

export interface TalentProfile {
  id: string
  organization_id: string
  full_name: string
  email?: string
  phone?: string
  alternate_phone?: string
  talent_type: TalentType
  source: TalentSource
  status: TalentStatus
  organization?: string
  designation?: string
  years_experience?: number
  location?: string
  availability?: string
  expected_compensation?: number
  primary_skills: string[]
  secondary_skills: string[]
  certifications: string[]
  domains: string[]
  linkedin_url?: string
  portfolio_url?: string
  website?: string
  resume_url?: string
  notes?: string
  overall_rating?: number
  is_shortlisted: boolean
  is_favorite: boolean
  raw_metadata?: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  tags?: Tag[]
  evaluations?: Evaluation[]
}

export interface Evaluation {
  id: string
  organization_id: string
  talent_id: string
  evaluator_id: string
  metrics: Record<string, number>
  overall_score: number
  feedback?: string
  created_at: string
  // Joined
  evaluator?: User
}

export interface Tag {
  id: string
  organization_id: string
  name: string
  color: string
  created_at: string
}

export interface TalentTag {
  talent_id: string
  tag_id: string
}

export interface SavedSearch {
  id: string
  user_id: string
  name: string
  filters_json: TalentFilters
  created_at: string
}

export interface Activity {
  id: string
  organization_id: string
  talent_id: string
  action: string
  description: string
  created_by: string
  created_at: string
  // Joined
  talent?: Pick<TalentProfile, 'id' | 'full_name'>
  actor?: Pick<User, 'id' | 'email' | 'full_name'>
}

export interface AuditLog {
  id: string
  organization_id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  performed_by: string
  created_at: string
}

// Search & Filter types
export interface TalentFilters {
  query?: string
  talent_type?: TalentType[]
  status?: TalentStatus[]
  source?: TalentSource[]
  min_experience?: number
  max_experience?: number
  location?: string
  skills?: string[]
  min_rating?: number
  tags?: string[]
  is_shortlisted?: boolean
  is_favorite?: boolean
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface DashboardStats {
  total: number
  new_count: number
  under_review: number
  shortlisted: number
  approved: number
  rejected: number
  engaged: number
}

export interface SourceStat {
  source: string
  count: number
}

export interface TypeStat {
  type: string
  count: number
}
