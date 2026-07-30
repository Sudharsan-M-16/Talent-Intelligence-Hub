# Project Evolution & Roadmap

This document outlines the current state of the Talent Intelligence Hub, technical debt, and the roadmap to an Enterprise-grade architecture.

## Current Strengths
- **Instant UI**: Zustand local-storage architecture provides 0ms latency for interactions.
- **Robust Parsers**: The AI integration and spreadsheet normalization are battle-tested with comprehensive unit tests.
- **Strict Typing**: The shared `database.ts` guarantees frontend/backend sync.
- **Design System**: CSS variable approach prevents utility-class bloat and enforces a premium dark-mode aesthetic.

## Current Weaknesses
- **State Limits**: Relying on LocalStorage for all profile data caps the application at ~2,000 candidates before browser memory limits are hit.
- **Security**: The Groq API key is exposed in the frontend bundle.
- **Testing**: No E2E browser tests to verify drag-and-drop or auth flows.

## Technical Debt
- **Duplicated Search Logic**: `filteredProfiles()` in TS and `search_talent()` in SQL do the exact same thing but must be maintained separately.
- **Store Monolith**: `talentStore` handles profiles, evaluations, AND activity logs. It needs to be split.

---

## The Enterprise Scaling Roadmap

### Phase 1: Security & Proxy (Immediate)
1. Move the Groq API call out of `pdfParser.ts` and into a Supabase Edge Function (`/functions/parse-resume`).
2. Remove `VITE_GROQ_API_KEY` from the frontend completely.

### Phase 2: React Query Integration (Mid-term)
1. Remove the `persist` middleware from `talentStore`.
2. Convert `talentStore` into a purely UI-state store (holding current search queries and open modal states).
3. Implement `@tanstack/react-query` to fetch lists of candidates directly from Supabase, utilizing server-side pagination.

### Phase 3: Real-time Collaboration (Long-term)
1. Enable Supabase Realtime subscriptions on the `talent_profiles` table.
2. Update the React Query cache optimistically. When Recruiter A changes a candidate's status to "Shortlisted", Recruiter B's Kanban board moves the card automatically via WebSockets.

### Phase 4: Data Lake & Enterprise Analytics (Scale)
1. Export the `activity_log` table daily to a Snowflake or BigQuery data lake.
2. Build Python-based ML models to analyze time-to-hire metrics based on the transition times between "New" and "Engaged" statuses.
