# Module: Database Engineering

## 1. Why this concept exists
A resilient B2B application requires a strict, relational, highly constrained database. The database must protect against data corruption, enforce multi-tenant isolation, and provide high-performance search capabilities.

## 2. Where this concept appears in THIS project
The entire database structure is defined in `supabase/schema.sql`.

## 3. Which files implement it
- `supabase/schema.sql` (The absolute source of truth)
- `apps/web/src/types/database.ts` (The TypeScript representation)

## 4. Which functions implement it
- PostgreSQL Triggers: `set_updated_at()`, `update_search_vector()`, `recompute_rating()`, `log_status_change()`, `log_profile_created()`
- PostgreSQL Functions: `search_talent()`, `current_org_id()`

## 5. Complete execution flow
1. **Schema Execution**: `schema.sql` is run in the Supabase SQL Editor.
2. **Table Creation**: `organizations`, `user_profiles`, `talent_profiles`, etc., are created with strict foreign keys.
3. **Data Mutation**: When a profile is inserted, the `trg_log_profile_created` trigger fires, automatically writing an entry to `activity_log`.
4. **Search Indexing**: The `trg_talent_search_vector` trigger concatenates name, skills, and notes into a `tsvector` column and weights them (A, B, C, D) for the `pg_trgm` index.
5. **RLS Enforcement**: Every query is intercepted by Row Level Security (e.g., `org_id = current_org_id()`). If the JWT does not map to the correct org, zero rows are returned.

## 6. Engineering decisions
- **Denormalization for Performance**: Skills (`primary_skills`, `secondary_skills`) are stored as `TEXT[]` arrays rather than separate tables. This avoids expensive JOINs when filtering thousands of profiles.
- **Triggers for Business Logic**: Audit logs and rating averages are computed via DB triggers, ensuring data integrity even if the database is modified directly via API or external tools, bypassing the frontend.

## 7. Tradeoffs
- **Tradeoff**: Storing skills as `TEXT[]` arrays makes renaming a skill across the entire organization slightly harder (requires an `UPDATE` with `array_replace`).
- **Mitigation**: The extreme read-performance gain for the dashboard outweighs the rare occurrence of bulk-renaming a skill.

## 8. Alternatives
- Using a NoSQL database (MongoDB). This was rejected because relational constraints, strict schemas, and RLS are critical for multi-tenant B2B apps.

## 9. Common bugs
- **RLS block**: A backend function fails to insert data because it doesn't pass the `org_id`.
- **Search Vector Drift**: If the trigger is accidentally disabled, full-text search stops returning new records.

## 10. Debugging techniques
- Use `SELECT * FROM auth.users` and cross-reference with `user_profiles` to ensure Auth/Public sync.
- Temporarily disable RLS for a table in the Supabase UI to isolate if a bug is query-related or RLS-related.

## 11. Security implications
- **RLS is the ultimate firewall.** Even if a user manipulates API payloads to request data from another `org_id`, PostgreSQL will block it at the kernel level.

## 12. Performance implications
- `pg_trgm` indexes allow sub-millisecond wildcard searches (`ILIKE '%query%'`) across millions of rows.
- GIN indexes on `search_vector` and `primary_skills` make array overlap queries (`&&`) lightning fast.

## 13. Scalability implications
- The schema is designed for multi-tenancy out of the box (`org_id` on every core table).

## 14. Best practices
- Never write business logic in the UI that can be handled by a DB trigger (e.g., updated_at timestamps, audit logging).
- Always use UUIDs for primary keys to prevent enumeration attacks.

## 15. Future improvements
- Implement partitioning on the `activity_log` table by date if the table exceeds 50 million rows.

## 16. Interview questions
- *Q: Why use a trigger for `search_vector` instead of generating it on the client?*
  A: Generating it in the DB ensures 100% consistency, allows usage of PostgreSQL's native `setweight` functions, and prevents the client payload from becoming bloated.

## 17. Practical exercises
- Add a new column `github_url` to `talent_profiles`. Update the `update_search_vector` trigger to include this URL with weight 'C'.

## 18. Mini implementation exercises
- Write a SQL query to manually invoke the `search_talent` function for a specific `org_id`.

## 19. Reading checklist
- [ ] Read `supabase/schema.sql` top to bottom.
- [ ] Understand the `search_talent` function syntax.

## 20. Completion checklist
- [ ] I can explain what a `tsvector` is.
- [ ] I understand how RLS isolates tenants based on `org_id`.
