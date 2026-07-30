# Module: Mathematics & Algorithms

## 1. Why this concept exists
A talent hub must evaluate, rank, and sort candidates. Simple alphabetical sorting is insufficient. We need algorithmic weighting to bubble up the best candidates dynamically.

## 2. Where this concept appears in THIS project
- `supabase/schema.sql` (Trigger `recompute_rating`, Trigger `update_search_vector`)
- `apps/web/src/lib/profileSpreadsheet.ts` (Fuzzy header matching)

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `ts_rank()`
- `setweight()`
- Levenshtein distance / Heuristic scoring in `determineHeaderRow()`.

## 5. Complete execution flow
**Rating Recomputation:**
1. A recruiter submits a 5-star evaluation (Technical=4, Culture=5).
2. The trigger `recompute_rating` fires.
3. It runs `AVG(overall_score)` across all evaluations for that `talent_id`.
4. It mathematically rounds to 2 decimals and updates `talent_profiles.overall_rating`.

**Search Ranking:**
1. `setweight()` applies mathematical priorities (Name = A, Skills = B).
2. `ts_rank(search_vector, query)` calculates the density of query words inside the vector. A match in a weight-A lexeme yields a higher scalar score than a match in a weight-C lexeme.
3. Results are ordered `ORDER BY rank DESC`.

**Heuristic Header Detection:**
1. `determineHeaderRow()` iterates over an array of cell strings.
2. For each string, it checks for inclusion in `COLUMN_ALIASES`.
3. It increments a `score` integer.
4. The row with the maximum mathematical `score` is chosen. If `maxScore < 2`, it rejects the spreadsheet.

## 6. Engineering decisions
- **Weighted tsvector**: By offloading ranking math to the C-kernel of PostgreSQL, we avoid pulling thousands of rows into Node.js/Vite memory just to sort them.
- **Trigger-based Averages**: Averages are computed strictly at write-time, making read-time $O(1)$ for retrieving a profile's rating.

## 7. Tradeoffs
- **Tradeoff**: Write-time triggers cause slightly slower inserts/updates.
- **Mitigation**: The system is read-heavy. The tradeoff is perfectly aligned with the usage pattern.

## 8. Alternatives
- Calculating averages on the frontend. Rejected because paginated API responses wouldn't be able to sort by average if the frontend had to calculate it on the fly.

## 9. Common bugs
- **Floating Point Math**: JavaScript `0.1 + 0.2 = 0.30000000000000004`.
- *Fix*: The SQL trigger handles the rounding strictly at the database level (`ROUND(v_avg::NUMERIC, 2)`).

## 10. Debugging techniques
- Select the raw `rank` scalar from the `search_talent` function to see exactly how the algorithm is grading the matches.

## 11. Security implications
- Minimal, pure mathematics.

## 12. Performance implications
- `ts_rank` requires CPU cycles. For extreme scale, `ts_rank_cd` (cover density) provides better results but requires more processing power.

## 13. Scalability implications
- Write-time average calculation scales infinitely because the cost is paid once per evaluation, not once per read.

## 14. Best practices
- Never trust JavaScript for financial or critical floating-point math. Offload to PostgreSQL `NUMERIC` types.

## 15. Future improvements
- Implement tf-idf (Term Frequency - Inverse Document Frequency) for skill rarity matching.

## 16. Interview questions
- *Q: Why is the rating average calculated via a DB trigger instead of a SQL View?*
  A: A materialized view requires refreshing. A standard view recalculates the average every single time the profile is queried, causing $O(N)$ reads. A trigger recalculates it exactly once upon mutation, making the read $O(1)$.

## 17. Practical exercises
- Change the `update_search_vector` math to give 'Location' a higher weight than 'Skills'.

## 18. Mini implementation exercises
- Write a query to find the standard deviation of all technical scores in the database.

## 19. Reading checklist
- [ ] Read the `recompute_rating` trigger in `schema.sql`.

## 20. Completion checklist
- [ ] I understand why JavaScript floating point math is avoided.
- [ ] I understand how `ts_rank` works.
