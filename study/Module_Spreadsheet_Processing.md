# Module: Spreadsheet Processing

## 1. Why this concept exists
Recruiters often possess historical candidate data in messy Excel spreadsheets or CSVs. Building a robust data ingestion pipeline that can tolerate malformed headers, weird formatting, and missing data is critical for user onboarding.

## 2. Where this concept appears in THIS project
- `apps/web/src/lib/profileSpreadsheet.ts`
- `apps/web/src/pages/BulkProfilesPage.tsx`
- `apps/web/src/test/profileSpreadsheet.test.ts`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `parseProfilesWorkbook()`
- `normalizeField()`
- `determineHeaderRow()`
- `exportProfiles()`

## 5. Complete execution flow
1. **File Read**: User uploads a CSV/XLSX. `read-excel-file` converts it to a 2D array of rows and columns.
2. **Header Detection**: `determineHeaderRow()` scans the first 20 rows to find the row with the most "known" column aliases (Name, Email, Phone), ignoring preliminary junk rows.
3. **Column Mapping**: Uses a `COLUMN_ALIASES` map to fuzzy-match user columns (e.g., "candidate email", "e-mail", "email_address") to the canonical DB field `email`.
4. **Data Normalization**: Iterates through rows. `normalizeField` aggressively trims whitespace, extracts numbers for experience fields, and splits comma-separated strings into arrays for skills.
5. **Validation**: Checks for minimum required fields (Full Name). Drops empty rows.
6. **Output**: Returns an array of clean `TalentProfile` objects ready for state insertion.

## 6. Engineering decisions
- **Fuzzy Header Matching**: Instead of forcing users to download a "strict template", the parser intelligently maps dozens of common aliases to the correct field. This dramatically reduces friction.
- **Client-Side Processing**: By processing spreadsheets in the browser, the app avoids sending massive files over the network, providing instant validation feedback to the user.

## 7. Tradeoffs
- **Tradeoff**: Extremely large spreadsheets (100,000+ rows) will crash the browser tab due to memory limits.
- **Mitigation**: The app is currently targeted at batches of hundreds or thousands of profiles, not millions.

## 8. Alternatives
- Using a third-party managed importer like Flatfile. Rejected due to cost and loss of control over the normalization pipeline.

## 9. Common bugs
- **Date Formatting**: Excel stores dates as serial numbers.
- *Fix*: The parser must explicitly handle cell types to avoid turning "12-Oct-2023" into "45211".

## 10. Debugging techniques
- The file has 244 unit tests (`npm test`). If a bug is found with a specific spreadsheet, extract that row into a CSV, write a test case in `profileSpreadsheet.test.ts`, and fix the logic until the test passes.

## 11. Security implications
- CSV Injection: A user could upload `=CMD|' /C calc'!A0` to exploit users opening the exported file in Excel. The normalization function specifically strips leading `=` characters to prevent formula injection.

## 12. Performance implications
- The `read-excel-file` library is very fast, processing ~10,000 rows per second on modern hardware.

## 13. Scalability implications
- For massive datasets, processing would need to move to a background Web Worker or a Supabase Edge Function to prevent freezing the UI.

## 14. Best practices
- Write tests for *every single edge case*. The test file `profileSpreadsheet.comprehensive.test.ts` is a masterclass in this.

## 15. Future improvements
- Add a UI mapping step where the user can manually correct columns that the fuzzy matcher failed to guess.

## 16. Interview questions
- *Q: How does the parser handle spreadsheets that have 5 rows of empty space and a corporate logo before the actual table starts?*
  A: `determineHeaderRow()` heuristically scores the first 20 rows against the alias dictionary and selects the row with the highest confidence score as the header, ignoring the junk above it.

## 17. Practical exercises
- Introduce a new field `github_url` to the app and update the spreadsheet parser to extract it.

## 18. Mini implementation exercises
- Add a regex to `normalizeField` that automatically formats all phone numbers to E.164 format.

## 19. Reading checklist
- [ ] Read `profileSpreadsheet.ts`
- [ ] Read `COLUMN_ALIASES` mapping.
- [ ] Review `profileSpreadsheet.comprehensive.test.ts`

## 20. Completion checklist
- [ ] I understand how CSV Injection is mitigated.
- [ ] I can explain the heuristic header detection algorithm.
