# Module: Search and Filtering

## 1. Why this concept exists
A talent repository is useless if recruiters cannot instantly find the exact candidate they need. The system implements dual-layer search: ultra-fast client-side filtering for immediate UI feedback, and robust database-level full-text search for scale.

## 2. Where this concept appears in THIS project
- `apps/web/src/components/layout/Topbar.tsx` (Global Search UI)
- `apps/web/src/pages/TalentListPage.tsx` (Client Filtering)
- `apps/web/src/store/talentStore.ts` (State Selectors)
- `supabase/schema.sql` (Backend `tsvector` and `pg_trgm`)

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `filteredProfiles()` (Zustand derived state)
- `search_talent()` (PostgreSQL SQL function)
- `update_search_vector()` (PostgreSQL Trigger)

## 5. Complete execution flow
**Client-Side Filtering (Demo Mode):**
1. User types in the UI filter boxes (e.g., skill = "React").
2. The UI calls `talentStore.setFilter({ primary_skills: ['React'] })`.
3. The component re-renders. It calls `filteredProfiles()`.
4. The function iterates through all loaded profiles, running array `includes()` and string `toLowerCase().includes()`.
5. The UI updates instantly.

**Backend Full-Text Search (Production Mode):**
1. User creates/updates a profile.
2. PostgreSQL trigger `update_search_vector()` concatenates the name, skills, and notes into a lexically parsed `tsvector`, weighting Name as 'A', Skills as 'B', Notes as 'C'.
3. User types in Topbar search.
4. The client fetches from Supabase RPC `search_talent(query)`.
5. PostgreSQL uses `websearch_to_tsquery` to match the vector, utilizing the GIN index for lightning-fast retrieval, and returns results sorted by relevance rank (`ts_rank`).

## 6. Engineering decisions
- **Dual Architecture**: Supporting both client-side and backend search is intentional. Client-side is perfect for the offline Demo mode and for small sets. Backend search is required when data exceeds 10,000 rows.
- **pg_trgm vs tsvector**: `tsvector` is used for word-level stemming and ranking (e.g., matching "running" to "run"). `pg_trgm` (trigram) is used on `full_name` to allow typo tolerance (e.g., matching "Jonh" to "John").

## 7. Tradeoffs
- **Tradeoff**: Maintaining search logic in two places (Zustand `filteredProfiles` and PostgreSQL `search_talent`) violates DRY (Don't Repeat Yourself).
- **Mitigation**: It is a necessary evil to support the zero-backend Demo mode, which is critical for product marketing and local development.

## 8. Alternatives
- Using ElasticSearch or Algolia. Rejected due to immense cost and complexity. PostgreSQL's native full-text capabilities are sufficient for 99% of B2B applications.

## 9. Common bugs
- **Missing index**: Full-text search takes 5 seconds instead of 5ms.
- *Fix*: Ensure the `GIN` index on `search_vector` is actually created in `schema.sql`.

## 10. Debugging techniques
- In Supabase SQL editor, run `EXPLAIN ANALYZE SELECT * FROM search_talent('...')` to verify that the query planner is using the index and not doing a sequential scan.

## 11. Security implications
- When calling RPC functions like `search_talent`, ensure RLS is enforced *inside* the function, or that the function is designated `SECURITY INVOKER`, otherwise it might bypass org-level isolation.

## 12. Performance implications
- GIN indexes significantly speed up reads but slow down writes. This is acceptable since a talent hub is heavily read-biased.

## 13. Scalability implications
- PostgreSQL native text search scales well up to ~5-10 million rows. Beyond that, a dedicated engine (ElasticSearch) might be necessary.

## 14. Best practices
- Use `websearch_to_tsquery` instead of `to_tsquery` because it allows users to use Google-style syntax (e.g., `"React Native" -Angular`).

## 15. Future improvements
- Add query highlighting to the UI so users see exactly *why* a candidate matched the search.

## 16. Interview questions
- *Q: What is the difference between `tsvector` and `pg_trgm`?*
  A: `tsvector` tokenizes text into language-specific lexemes for semantic search (stemming, dictionaries). `pg_trgm` breaks text into 3-letter chunks, allowing for fuzzy matching and typo-tolerance without language context.

## 17. Practical exercises
- Add "Location" to the client-side filters in `talentStore.ts`.

## 18. Mini implementation exercises
- Change the weight of "Notes" in the PostgreSQL trigger from 'C' to 'D' to de-prioritize it in search results.

## 19. Reading checklist
- [ ] Read `filteredProfiles` in `talentStore.ts`.
- [ ] Read the `search_talent` function in `schema.sql`.

## 20. Completion checklist
- [ ] I understand how the dual-layer search works.
- [ ] I know how to use EXPLAIN ANALYZE to check index usage.
