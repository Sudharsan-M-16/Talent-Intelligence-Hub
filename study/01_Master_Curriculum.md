# Master Curriculum: Talent Intelligence Hub

This roadmap outlines the exact progression required to achieve founder-level mastery of the codebase.

## Progression Roadmap

| Module | Difficulty | Est. Hours | Description |
|--------|------------|------------|-------------|
| 1. Frontend Architecture | Beginner | 2h | Vite, React Router lazy loading, Theme System |
| 2. State Management | Beginner | 3h | Zustand stores, persistence, offline-mode handling |
| 3. Database Engineering | Intermediate | 4h | PostgreSQL Schema, RLS, Triggers, Views |
| 4. Authentication | Intermediate | 3h | Supabase Auth, Google OAuth, Route Guarding |
| 5. Spreadsheet Processing | Intermediate | 4h | Bulk CSV/XLSX imports, fuzzy matching, normalization |
| 6. PDF & Docx Parsing | Advanced | 3h | Binary extraction, pdfjs-dist canvas rendering |
| 7. AI Resume Parsing | Advanced | 3h | Groq API integration, fallback heuristics, LLM prompting |
| 8. Search & Filtering | Advanced | 2h | Client filtering vs. `pg_trgm` / `tsvector` backend search |
| 9. Drag & Drop Engine | Advanced | 2h | `@dnd-kit` implementation for Kanban pipelines |
| 10. Edge Functions | Intermediate | 1h | Deno-based intake webhooks |
| 11. Mathematics & Ranking | Intermediate | 1h | Rating algorithms, weighted scores |
| 12. Testing Strategy | Advanced | 3h | Vitest suites, edge case injection |

## Prerequisites
- Intermediate TypeScript knowledge.
- Familiarity with React hooks (`useEffect`, `useState`, `useRef`, `useMemo`, `useCallback`).
- Basic SQL understanding (SELECT, INSERT, JOIN).

## Learning Objectives
By the end of this curriculum, you will:
1. Understand the exact execution flow of the application from `main.tsx` to database persistence.
2. Be capable of modifying the complex spreadsheet parsing algorithm without breaking the 244 existing tests.
3. Be able to scale the application from the current LocalStorage-based offline mode to a fully connected real-time Supabase architecture.
4. Pass any system design or technical interview centered around this architecture.

## How to use this curriculum
Proceed module by module. Open the corresponding `study/Module_*.md` file. For every module, open the actual source code files referenced and trace the execution path as described. Do not move to the next module until the "Completion checklist" is satisfied.
