# Talent Intelligence Hub (TIH) — Claude Code Guide

A centralized talent repository and evaluation platform built for recruiters, HR teams, and hiring managers. Demo mode works out of the box with no backend; Supabase Auth is fully wired up and ready for production use.

---

## Repo Layout

```
employeerepo/
├── apps/web/               ← React + Vite frontend (this is where all work happens)
│   ├── src/
│   │   ├── pages/          ← 16 route-level pages (all lazy-loaded)
│   │   ├── components/     ← layout/ and ui/ subdirectories
│   │   ├── store/          ← Zustand stores (talentStore, authStore, themeStore)
│   │   ├── lib/            ← pdfParser, profileSpreadsheet, supabase, demoData, utils
│   │   ├── types/          ← database.ts — all TypeScript interfaces
│   │   └── index.css       ← entire design system (CSS variables + component classes)
│   ├── index.html          ← Google Fonts: Syne + Figtree + JetBrains Mono
│   └── .env.local          ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GROQ_API_KEY
└── supabase/
    ├── schema.sql          ← complete PostgreSQL schema (run once in Supabase dashboard)
    └── SETUP.md            ← step-by-step Supabase setup guide
```

---

## Dev Commands

```bash
cd apps/web
npm run dev          # starts Vite dev server (port 5173 or next available)
npm run build        # tsc -b && vite build
npm run typecheck    # tsc --noEmit (run this before considering any change "done")
npm test             # vitest (244 tests, 9 files — all must pass)
```

**Always run `npm run typecheck` after edits.** Zero errors is the bar.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript + Vite |
| Styling | TailwindCSS v4 — `@import "tailwindcss"` only, **no tailwind.config.js** |
| State | Zustand v5 with `persist` middleware (key: `tih-talent-store-v2`) |
| Routing | React Router v7 (all pages lazy-loaded via `React.lazy`) |
| Animation | framer-motion |
| Tables | @tanstack/react-table v8 |
| Drag-drop | @dnd-kit/core + @dnd-kit/sortable (desktop + TouchSensor for mobile) |
| Charts | recharts |
| PDF | pdfjs-dist v6 (text extraction + in-browser canvas rendering) |
| DOCX | mammoth |
| Spreadsheet | read-excel-file + write-excel-file (browser builds) |
| Toasts | react-hot-toast |
| AI parsing | Groq API via fetch with retry/backoff (VITE_GROQ_API_KEY in .env.local) |
| Testing | Vitest + React Testing Library + jsdom |

---

## Design System

**Fonts** (loaded in `index.html` from Google Fonts):
- `Syne` — headings, section titles, page titles, logo
- `Figtree` — body text, buttons, inputs, all UI
- `JetBrains Mono` — numeric data (stat card values, timestamps, rankings)

**Login page exception**: Login has its own isolated design palette (`#06060f` bg, `#7c3aed` violet/indigo accent, WebGL perspective grid). It also uses `Inter`. Do not apply main-app CSS tokens there.

**CSS Variables** (defined in `src/index.css`, applied via `data-theme` attribute):
- Dark palette: `#0c0c0f` base → `#111114` primary → `#1a1a1e` card
- Accent: `#5e6ad2` (Linear-style indigo — not neon, not electric blue)
- Text: `#ebebf0` primary / `#8a8a9a` secondary / `#4a4a58` muted
- All interactive components use CSS variable tokens — never raw hex in JSX (login page is the only exception)

**Component classes** (all in `src/index.css`):
- `.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-danger`
- `.input-field` `.label` `.form-label` `.badge`
- `.sidebar-item` (has `::before` left-border active indicator)
- `.stat-card` `.glass-hover` `.skill-chip` `.tag-pill`
- `.data-table` `.kanban-col` `.kanban-card` `.upload-zone`
- `.page-container` `.page-header` `.page-title` `.section-card`

**Theme toggle**: `useThemeStore` → sets `data-theme` on `document.documentElement`. Applied at startup in `src/main.tsx` to prevent flash.

---

## Pages & Routes

All pages are lazy-loaded via `React.lazy` for code splitting.

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | LoginPage | Multi-view auth page: login, signup, forgot password, check-email; Google OAuth; violet palette |
| `/auth/callback` | AuthCallbackPage | Handles OAuth redirects and email verification links; resolves session then navigates to /dashboard or /reset-password |
| `/reset-password` | ResetPasswordPage | Allows setting a new password after clicking the email reset link; calls `supabase.auth.updateUser` |
| `/dashboard` | DashboardPage | Stat cards, pipeline chart, source donut, top rated, activity |
| `/talent` | TalentListPage | Table + grid view, skill filter autocomplete, CSV/Excel export |
| `/talent/new` | TalentFormPage | Create profile with resume auto-fill |
| `/talent/:id` | TalentDetailPage | Full profile, evaluations, activity timeline, in-browser PDF preview |
| `/talent/:id/edit` | TalentFormPage | Edit existing profile |
| `/talent/:id/print` | TalentPrintPage | Clean print-friendly view — calls `window.print()` |
| `/bulk-profiles` | BulkProfilesPage | CSV/XLSX bulk upload + skill/exp/location filter + export |
| `/kanban` | KanbanPage | Drag-drop pipeline board (dnd-kit, desktop + mobile touch) |
| `/shortlisted` | ShortlistedPage | Filtered view of shortlisted profiles |
| `/favorites` | FavoritesPage | Filtered view of favorited profiles |
| `/compare` | ComparePage | Side-by-side comparison (up to 4); selected IDs persist in `?ids=` URL param; shareable copy-link |
| `/evaluations` | EvaluationsPage | All evaluations with pre-built templates; paginated |
| `/search` | SearchPage | Full-text search across all fields |
| `/settings` | SettingsPage | App settings, data reset |
| `/audit` | AuditPage | Paginated activity/audit log |
| `/about` | AboutPage | User guide, keyboard shortcuts, sign out |

---

## Key Files to Know

### `src/store/talentStore.ts`
Zustand store persisted to localStorage. Key method: `filteredProfiles()` — applies all active `TalentFilters` to `profiles` array. The `activities[]` array feeds the notification bell in the Topbar. Adding a new filter type requires updating both the `TalentFilters` interface in `types/database.ts` and the filter logic here.

### `src/store/authStore.ts`
Full Supabase Auth integration. Does **not** use Zustand `persist` middleware — Supabase manages session persistence natively in localStorage (`sb-{projectRef}-auth-token`).

Key exports: `AuthUser` interface, `DEMO_ADMIN_USER` constant.

Key state: `isLoading: true` on startup — routes must not render until `init()` resolves.

Key methods:
- `init()` — call once on app mount; calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`. Falls back to demo mode if Supabase env vars are absent.
- `login(email, password)` — calls `supabase.auth.signInWithPassword()`
- `signup(email, password, fullName)` — calls `supabase.auth.signUp()`; sends verification email
- `loginWithGoogle()` — calls `supabase.auth.signInWithOAuth({ provider: 'google' })`; requires Google provider enabled in Supabase Dashboard
- `forgotPassword(email)` — calls `supabase.auth.resetPasswordForEmail()`; sends reset email
- `logout()` — **async**; calls `supabase.auth.signOut()`. All callers must `await logout()` or use `.then()`

**App.tsx integration:**
- `AuthInitializer` component calls `init()` once on mount (guarded with `useRef`)
- `ProtectedRoute` checks `isLoading` — shows `PageLoader` while session resolves, then redirects to `/login` if unauthenticated
- `AuthRoute` redirects already-authenticated users away from `/login`

### `src/lib/pdfParser.ts`
Two-stage pipeline:
1. Text extraction: `pdfjs-dist` (PDF, position-based Y-grouping) or `mammoth` (DOCX)
2. Parsing: Groq API (`llama-3.3-70b-versatile`, `json_object` mode) with `fetchWithRetry` (exponential backoff) → falls back to heuristic regex

AI results take priority in `normalizeParsedResume()`. Heuristic fills gaps. Email/phone are cross-validated against raw text to prevent hallucination.

Entry points: `parseResumeFromFile(file)` → `ParsedResume`, then `parsedToProfile(parsed)` → `Partial<TalentProfile>`.

### `src/lib/profileSpreadsheet.ts`
Handles bulk CSV/XLSX import and export. 244 tests covering it.
- `parseProfilesWorkbook(file)` — reads file, maps columns via `COLUMN_ALIASES` (flexible header matching), 5-pass normalization, fuzzy matching, compound skills, injection protection; returns `TalentProfile[]`
- `exportProfiles(profiles, format, fileName)` — downloads CSV or Excel
- `filterProfilesForBulkPage(profiles, filters)` — client-side filtering for BulkProfilesPage

### `src/types/database.ts`
Single source of truth for all types. `TalentProfile` is the core interface — all stores, pages, and APIs use it.

### `src/components/layout/Topbar.tsx`
Contains the working global search (⌘K / Ctrl+K), notification bell wired to `activities[]` from talentStore, and the theme toggle.

### `src/components/ui/ResumePreview.tsx`
Slide-in panel that renders PDF files in-browser using `pdfjs-dist` canvas rendering. Used on TalentDetailPage. Do not use an `<iframe>` or `<embed>` — the canvas approach handles CORS and cross-browser quirks.

### `src/components/ui/ConfirmDialog.tsx`
Accessible confirm dialog: `role=alertdialog`, focus trap. Use this for all destructive-action confirmations.

---

## Evaluation Templates

EvaluationsPage ships three pre-built metric sets available when creating a new evaluation:
- **Technical Interview** — coding, system design, problem-solving metrics
- **Cultural Fit** — values alignment, collaboration, adaptability
- **Communication Assessment** — clarity, listening, written/verbal scores

Templates are defined inline in EvaluationsPage; they are not stored in Zustand.

---

## Authentication Architecture

### Auth Flow

```
App loads → AuthInitializer.init() → supabase.auth.getSession()
├── Session found → restore user → render app
└── No session → isLoading: false → show /login

/login → Google OAuth → /auth/callback → navigate /dashboard
/login → Email + Password → login() → AuthRoute redirects → /dashboard
/login → Sign Up → signup() → email verification sent → check-email view
/login → Forgot Password → forgotPassword() → email sent → check-email view
Email link click → /reset-password → updateUser({ password }) → /dashboard
```

### Session Persistence

Supabase stores sessions in localStorage automatically (`sb-{projectRef}-auth-token`). On page reload, `init()` calls `getSession()` to restore the session — no explicit persist middleware needed. Sessions default to 1 hour and are auto-refreshed. The old stale `auth-storage` Zustand key is cleaned up in `main.tsx`.

### Demo Mode vs Production Mode

- **Demo mode** (no Supabase env vars): `authStore.init()` detects missing config and sets `DEMO_ADMIN_USER` directly. `login()` always succeeds. No network calls.
- **Production mode** (Supabase env vars present): full Supabase Auth with real sessions, email verification, OAuth, and password reset.

`supabase.ts` returns `null` when env vars are missing — all data pages fall back to Zustand in-memory state in this case.

To reset demo data: Settings page → Reset Data, or clear `tih-talent-store-v2` from localStorage.

### Google OAuth Setup (production only)

1. Enable Google provider in Supabase Dashboard → Auth → Providers → Google
2. Add Google OAuth credentials (Client ID + Secret from Google Cloud Console)
3. Add `http://localhost:5173/auth/callback` to Supabase Dashboard → Auth → URL Configuration → Redirect URLs
4. Add your production URL: `https://yourdomain.com/auth/callback`

---

## Environment Variables

```bash
# .env.local (apps/web/)
VITE_SUPABASE_URL=          # leave blank for demo mode
VITE_SUPABASE_ANON_KEY=     # leave blank for demo mode
VITE_GROQ_API_KEY=          # Groq API key for AI resume parsing (get from console.groq.com/keys)
VITE_GROQ_MODEL=            # optional override, defaults to llama-3.3-70b-versatile
```

---

## Supabase Integration

**Auth is fully connected.** The database schema for talent data is complete in `supabase/schema.sql` but talent data queries still use Zustand in-memory state. To connect data persistence:
1. Create Supabase project → run `supabase/schema.sql` in SQL editor
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`
3. Replace demo stores with Supabase queries (each store has comments marking swap points)

Full instructions in `supabase/SETUP.md`.

---

## Conventions & Rules

- **No tailwind.config.js** — TailwindCSS v4 is imported as `@import "tailwindcss"` only
- **CSS variables for all colors** — never inline raw hex values in JSX/TSX; the login page (isolated violet/indigo palette) is the one explicit exception
- **Figtree** for all UI text, **Syne** for headings, **JetBrains Mono** for numbers; **Inter** on the login page only
- **`logout()` is async** — always `await authStore.logout()` or chain `.then()`; never call it fire-and-forget
- **`npm run typecheck` must pass** before any change is complete
- **No role-based access** — single admin only, no viewer/recruiter role checks
- Skill chips use `border-radius: 5px` (rectangular), not pill shape
- Active sidebar items have a `::before` left-border indicator (2px, accent color)
- Toast font: Figtree (set in AppLayout.tsx toastOptions)
- All page headings use `.page-title` class (Figtree 700, `18px`, `-0.01em` tracking)
- ComparePage: selected profile IDs live in `?ids=` query param — keep URL state in sync so share links work
- KanbanPage: always register both `PointerSensor` and `TouchSensor` from dnd-kit — mobile drag-drop must work
- PDF preview: use `pdfjs-dist` canvas rendering in `ResumePreview.tsx`, not `<iframe>` or `<embed>`
- Pagination: EvaluationsPage and AuditPage are paginated — do not render unbounded lists
