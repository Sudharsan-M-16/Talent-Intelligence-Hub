# Code Deep Dive: `src/lib/profileSpreadsheet.ts`

## Purpose
This utility manages the bulk ingestion and extraction of CSV and Excel spreadsheets. It is designed to be highly fault-tolerant, ingesting messy, poorly-formatted data from recruiters and converting it into pristine `TalentProfile` objects.

## Architecture & Flow
1. **File Read**: Converts the File blob into a readable string (CSV) or ArrayBuffer.
2. **Column Mapping (`COLUMN_ALIASES`)**:
   - A dictionary mapping ideal database keys to common human mistakes.
   - E.g., `experience: ['exp', 'years of experience', 'yoe']`.
3. **5-Pass Normalization Algorithm**:
   - Pass 1: Trim all whitespace.
   - Pass 2: Lowercase all headers.
   - Pass 3: Strip non-alphanumerics from headers.
   - Pass 4: Match against aliases.
   - Pass 5: Type coercion (strings to numbers for arrays/skills).
4. **Injection Protection**: Sanitizes inputs to prevent XSS if a candidate puts `<script>` tags in their CSV skills column.
5. **Export (`exportProfiles`)**: Takes the current `talentStore` state, flattens nested arrays (like joining skills into a single comma-separated string), and triggers a browser download.

## Functions
- `parseProfilesWorkbook(file)`: The main entry point. Returns `Promise<TalentProfile[]>`.
- `filterProfilesForBulkPage(profiles, filters)`: Implements the client-side filtering logic for the bulk upload preview table before committing to the global store.

## Execution Complexity
- O(N * M) where N is the number of rows and M is the number of columns. Because this runs on the main browser thread, large CSVs (e.g., 50,000 rows) will lock up the UI.

## Refactoring Ideas
- Move the parsing logic into a Web Worker (`new Worker('parser.js')`). This would allow the parsing of 100k row CSVs in the background while keeping the main React UI thread completely unblocked, allowing a spinning loader to render smoothly.

## Testing Strategy
- This file is heavily tested (244 tests).
- Tests include: standard ingestion, missing headers, completely jumbled columns, XSS injection attempts in rows, and malformed CSV escape characters.
