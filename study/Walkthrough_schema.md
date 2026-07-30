# Code Walkthrough: schema.sql

## Purpose
The absolute source of truth for the production data layer. Defines tables, relationships, security, and full-text search mechanics for PostgreSQL.

## Responsibilities
- Schema definition.
- Relational integrity (Foreign Keys).
- Triggers for automated logic (timestamps, vectors, ratings).
- Row Level Security (RLS) for multi-tenant isolation.
- Search indexing (`pg_trgm`, `tsvector`).

## Dependencies
- PostgreSQL Extensions: `uuid-ossp`, `pg_trgm`, `unaccent`.

## Execution Order
Run once manually via the Supabase SQL editor to bootstrap the project.

## Key Sections

### Tables
- `organizations`: The root tenant table.
- `user_profiles`: Extends the internal Supabase `auth.users` table with business logic.
- `talent_profiles`: The core entity. Massive table utilizing `TEXT[]` arrays for skills to avoid joins.
- `evaluations`: Linked to talent via FK. Triggers update the talent's average score on change.

### Triggers
- `trg_talent_search_vector`: Automatically fires on INSERT/UPDATE to rebuild the `search_vector`.
- `trg_recompute_rating`: Automatically fires when an evaluation is added, calculating the true mean average.
- `trg_log_status_change`: Automatically creates an `activity_log` entry when a candidate moves from "New" to "Shortlisted".

### Row Level Security (RLS)
Every table is locked down with `ENABLE ROW LEVEL SECURITY`. Policies check `org_id = current_org_id()`. If a user is not part of the org, they cannot see or modify the data.

### RPC Functions
`search_talent`: A Postgres function (callable via `supabase.rpc()`) that executes a weighted vector search using `websearch_to_tsquery`.

## Business Logic
The schema intentionally pushes business logic into the database (Triggers for logs and averages). This guarantees data consistency regardless of whether the data was inserted by the React app, a webhook, or a manual SQL script.

## Performance
- GIN indexes are placed on array columns and vectors.
- Denormalization of skills (`TEXT[]`) vastly speeds up dashboard loading.

## Security
RLS is the ultimate firewall. The `current_org_id()` helper function extracts the org ID safely, preventing cross-tenant data leaks.

## Potential Improvements
Add `ON DELETE RESTRICT` to certain foreign keys instead of `CASCADE` to prevent accidental deletion of entire organizations.

## Common Interview Questions
*Q: Why are skills stored as a `TEXT[]` array instead of a separate `skills` table with a junction table?*
A: Filtering a massive table by a junction requires expensive JOINs. Because skills are highly mutable and mostly used for filtering, PostgreSQL's `GIN` index on a `TEXT[]` array allows for sub-millisecond filtering (`WHERE 'React' = ANY(primary_skills)`) without any joins.
