# 00 Project Knowledge Map — Talent Intelligence Hub (TIH)

## 1. Architecture
- **Monorepo Structure**: Split into `apps/web` (frontend) and `apps/api` (future backend) with shared configurations.
- **Client-Side Heavy Architecture**: The application heavily relies on client-side state management (Zustand) and offline-first/demo capabilities, gracefully falling back to local storage when Supabase is unconfigured.
- **Vite Build System**: Ultra-fast HMR and optimized production bundles utilizing Vite and esbuild.

## 2. Features
- **Dashboard & Analytics**: Real-time insights, metrics, and data visualization.
- **Talent Kanban Board**: Drag-and-drop pipeline management for tracking candidate progress.
- **Bulk Spreadsheet Upload**: Advanced parsing of CSV/XLSX files with 5-pass normalization, fuzzy matching, and injection protection.
- **AI-Powered Resume Parsing**: Extraction of text via PDF.js/Mammoth and structural inference via Groq's Llama-3 API.
- **Talent Profiling & Scoring**: Algorithms to calculate profile completeness, skill matching, and candidate ranking.
- **Evaluations & Audits**: Standardized rubrics for technical, cultural, and communication assessments.

## 3. Business Logic
- **Profile Normalization**: 5-pass cleaning of incoming data to standard internal formats.
- **AI Heuristic Fallbacks**: Regex fallback if AI API rate limits or hallucinates data.
- **Idempotency in Syncing**: (Where applicable) ensuring duplicate uploads don't shatter state.

## 4. Frontend & UI
- **Framework**: React 18
- **Styling**: Tailwind CSS v4 (No `tailwind.config.js`, pure `@import "tailwindcss"` with CSS variables).
- **Typography**: Figtree (UI), Syne (Headings), JetBrains Mono (Numbers).
- **Theme Management**: Dark/Light modes managed via `themeStore.ts`.
- **Animations**: Framer Motion for micro-interactions and route transitions.

## 5. State Management
- **Global State**: Zustand.
- **Slices**: `authStore.ts`, `talentStore.ts`, `themeStore.ts`.
- **Persistence**: Hybrid approach. Supabase handles Auth persistence (`sb-{projectRef}-auth-token`). Data pages fallback to Zustand in-memory local storage when demo mode is active.

## 6. Authentication & Authorization
- **Supabase Auth**: Full integration with Email/Password and Google OAuth.
- **Demo Mode Fallback**: `authStore.init()` automatically defaults to a demo admin if Supabase environment variables are missing.
- **Role-Based Access**: Single admin role (no distinct recruiter vs. viewer roles currently).

## 7. API & Backend Services (Supabase & Groq)
- **Supabase PostgreSQL**: Schema definitions (`supabase/schema.sql`).
- **Groq AI**: Used for JSON-structured resume parsing via `llama-3.3-70b-versatile`.

## 8. Specific Libraries & Dependencies
- `zustand` (State)
- `framer-motion` (Animations)
- `dnd-kit` (Kanban pointer/touch sensors)
- `pdfjs-dist` (PDF preview canvas & text extraction)
- `mammoth` (DOCX extraction)
- `lucide-react` (Icons)
- `date-fns` (Date formatting)

## 9. Mathematics & Algorithms
- **Ranking Algorithms**: Weighted averages for candidate scoring.
- **Fuzzy Matching**: Resolving slight discrepancies in bulk spreadsheet uploads (e.g. "S.Eng" -> "Software Engineer").
- **Completeness Calculation**: Percentage math based on filled versus empty fields in a candidate's profile.

## 10. Core Utilities
- `src/lib/pdfParser.ts`: The heavy lifter for the resume pipeline.
- `src/lib/profileSpreadsheet.ts`: The data ingestion powerhouse.
- `src/lib/talentService.ts`: Core talent manipulation.

---
### 📚 Learning Classification Modules
To fully master the system, all of this knowledge is broken down into the curriculum (see `01_Master_Curriculum.md`), which takes you from a beginner level overview to expert-level architecture comprehension.
