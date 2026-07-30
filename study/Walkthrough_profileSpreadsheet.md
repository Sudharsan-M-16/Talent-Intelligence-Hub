# Code Walkthrough: profileSpreadsheet.ts

## Purpose
To ingest, normalize, and validate bulk candidate data from CSV and Excel files.

## Responsibilities
- Parsing binary/text data into JS arrays.
- Guessing which row contains headers.
- Mapping arbitrary user column names to the database schema.
- Sanitizing inputs (stripping injection vectors, converting types).

## Dependencies
- `read-excel-file` (Handles both CSV and XLSX)
- `write-excel-file` (Handles exports)

## Key Exports
- `parseProfilesWorkbook(file)`
- `COLUMN_ALIASES` (A massive dictionary mapping)

## Execution Order
1. `parseProfilesWorkbook` receives a `File`.
2. Reads rows into `string[][]`.
3. Calls `determineHeaderRow()` to find the start of the data.
4. Identifies the index of each known column based on `COLUMN_ALIASES`.
5. Iterates through all subsequent data rows.
6. Calls `normalizeField()` on every single cell.
7. Filters out rows that lack a `full_name`.

## Business Logic
The `COLUMN_ALIASES` map is the heart of the logic. It maps `email` to `['email', 'e-mail', 'email address', 'candidate email']`. The parser normalizes both the dictionary and the spreadsheet headers (lowercasing, stripping spaces) before comparing them.

## Data Flow
File -> Binary Buffer -> 2D String Array -> Normalized JSON Objects -> `talentStore.addProfile()`.

## Error Handling
If `read-excel-file` throws an exception (e.g., password-protected zip), the function catches it and returns an empty array, bubbling a safe error to the UI.

## Security
**Anti-Injection**: The `normalizeField` function specifically checks if a string starts with `=`, `+`, `-`, or `@`. If it does, it strips the character. This prevents CSV macro injection vulnerabilities when a recruiter downloads an exported CSV and opens it in Excel.

## Testing Strategy
Covered by `profileSpreadsheet.comprehensive.test.ts`. Tests include empty files, missing headers, random junk rows, and injection vectors.

## Complexity
$O(R \times C)$ where R is rows and C is columns. Extremely fast.

## Potential Improvements
Add a secondary validation layer using Zod to strictly type-check the resulting objects.

## Related Files
- `BulkProfilesPage.tsx`
- `profileSpreadsheet.comprehensive.test.ts`

## Common Interview Questions
*Q: How do you prevent CSV injection in this file?*
A: In the `normalizeField` function, we inspect the first character of every string. If it is an executable macro prefix (`=`, `+`, etc.), we slice it off, neutralizing the payload before it enters our database.
