# Talent Intelligence Hub (TIH) — MVP+ Scaffold TODO

## Phase 1: Project scaffold
- [ ] Create monorepo structure:
  - [ ] /apps/web (React + TS + Vite + Tailwind + shadcn/ui + TanStack Table)
  - [ ] /apps/api (Next.js or Node/Express API for ingestion webhook)
  - [ ] /supabase (SQL migrations, RLS policies, indexes, triggers)
- [ ] Add root README with local dev instructions (Supabase + web + api)

## Phase 2: Supabase core (must-have)
- [ ] Create SQL migrations:
  - [ ] organizations
  - [ ] users (tenant-scoped, role-based)
  - [ ] talent_profiles (with search_vector TSVECTOR)
  - [ ] evaluations
  - [ ] tags + talent_tags
  - [ ] saved_searches
  - [ ] activities
  - [ ] audit_logs
- [ ] Enable RLS on tenant tables
- [ ] Create policies for Admin / Recruiter / Viewer
- [ ] Add indexes:
  - [ ] GIN/GiST for full-text search (tsvector)
  - [ ] pg_trgm indexes for fast LIKE/ILIKE where applicable
- [ ] Add triggers to maintain `search_vector`
- [ ] Add duplicate detection logic (email/phone/link) in API/webhook (and optionally DB-level constraints)

## Phase 3: API ingestion endpoint (MVP+)
- [ ] Implement `POST /api/v1/profiles/webhook`
  - [ ] Validate payload
  - [ ] Extract/mapping into talent_profiles fields
  - [ ] Store unmapped payload into `raw_metadata` JSONB
  - [ ] Duplicate detection (email/phone/link) -> return warning + existing matches
  - [ ] Create talent profile for correct `organization_id`

## Phase 4: Web app MVP
- [ ] Auth + role gating with Supabase Auth
- [ ] Dashboard MVP widgets + basic pipeline counters
- [ ] Talent list:
  - [ ] global search (tsvector)
  - [ ] multi-select filters
  - [ ] pagination
- [ ] Talent detail:
  - [ ] evaluation form (metrics JSONB + overall_score calc)
  - [ ] shortlist/favorite toggle
- [ ] Kanban MVP (status move with buttons)
- [ ] Saved searches UI (persist `filters_json`)

## Phase 5: Quality baseline
- [ ] Environment variable templates for local dev
- [ ] Basic lint/typecheck
- [ ] Seed script for default types/sources/statuses and role mapping

## Definition of Done (MVP+)
- [ ] Authentication and multi-tenancy (RLS) fully functional
- [ ] CRUD works for major tables
- [ ] Global search (tsvector), tags, complex filters work
- [ ] Resume uploads work (Supabase Storage) (MVP+ later if needed)
- [ ] Evaluations, shortlisting, comparisons work
- [ ] Dashboard analytics and Kanban load correctly
- [ ] Audit logs and activity timelines recording
- [ ] Responsive UI complete without critical bugs
