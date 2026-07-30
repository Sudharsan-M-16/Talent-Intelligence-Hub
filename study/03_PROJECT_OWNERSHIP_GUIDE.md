# 03 Project Ownership Guide

This is the ultimate reference for exactly *what* happens when a user clicks around the application.

## 1. Why does every folder exist?
- `apps/web`: The entire frontend application. This ensures if the team ever wants to add an API, a mobile app (React Native), or an admin panel, it has its own silo.
- `apps/api`: A placeholder for the eventual Node.js backend.
- `supabase/`: Contains database migration logic (`schema.sql`). This is kept out of `src` because it represents backend infrastructure as code.
- `src/lib/`: Standalone, framework-agnostic business logic (parsers, spreadsheets, utilities). This code should theoretically be able to run in a Node.js environment without React.

## 2. What happens when a user logs in?
1. User enters email/password.
2. `login(email, password)` is called in `src/store/authStore.ts`.
3. Supabase Auth API (`signInWithPassword`) is pinged.
4. Supabase responds with a JWT session.
5. The session is automatically persisted to `localStorage` under `sb-{projectRef}-auth-token`.
6. `authStore` updates `isLoading` to false.
7. `AuthRoute` unmounts, pushing the user to `/dashboard`.

## 3. What happens when a user uploads a resume?
1. The user drops a PDF into the dropzone.
2. `parseResumeFromFile(file)` in `pdfParser.ts` is triggered.
3. **Extraction**: `pdfjs-dist` loads the PDF into an off-screen HTML5 Canvas. It iterates through the text layers, sorting items by their Y-coordinates to maintain paragraph structure.
4. **AI Processing**: The raw text string is sent to Groq (`llama-3.3-70b-versatile`) with a strict JSON schema prompt.
5. **Heuristic Fallback**: If Groq fails or times out, regex (e.g., `/[\w\.-]+@[\w\.-]+\.\w+/`) extracts the email, phone, and name.
6. The resulting `ParsedResume` is converted to `TalentProfile` via `parsedToProfile()`.
7. `talentStore.addTalent()` is called, updating the UI immediately.

## 4. What happens when a user exports a CSV?
1. User clicks Export on the Bulk Profiles page.
2. `exportProfiles(profiles)` in `profileSpreadsheet.ts` fires.
3. The JSON array of `profiles` is mapped into a flat string structure.
4. A Blob is created with `type: 'text/csv;charset=utf-8;'`.
5. An invisible `<a>` tag is dynamically created, its `href` is set to `URL.createObjectURL(blob)`, and it is programmatically `.click()`ed, triggering the browser download.

## 5. How everything connects together
- **The Core Entity**: The `TalentProfile` TypeScript interface (`src/types/database.ts`). The database schema, the AI parser, the spreadsheet parser, and the UI all agree on this exact shape.
- **The Hub**: `talentStore.ts`. It acts as the traffic controller. The UI reads from it, and the data parsers write to it.
