# Talent Intelligence Hub

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-ready-3ECF8E?logo=supabase&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-AI_Parsing-F55036)

A production-grade talent repository and evaluation platform for recruiters, HR teams, and hiring managers. Upload resumes, track candidates through a hiring pipeline, run structured evaluations, and compare profiles side by side. Ships with a fully functional demo mode — no backend required to get started.

![TIH Dashboard](docs/screenshot.png)

---

## Features

- **AI Resume Parsing** — drop a PDF or DOCX and Groq (llama-3.3-70b) extracts name, contact, skills, experience, and education automatically; falls back to heuristic regex when offline
- **Kanban Pipeline Board** — drag-and-drop candidate stages with dnd-kit; works on desktop and mobile touch
- **Bulk Import / Export** — upload CSV or XLSX with flexible column headers; export filtered results back to CSV or Excel
- **In-Browser PDF Preview** — view candidate resumes without leaving the app (pdfjs-dist canvas rendering)
- **Print-Friendly Profiles** — `/talent/:id/print` renders a clean, paginated view ready for `window.print()`
- **Side-by-Side Comparison** — compare up to 4 profiles; selection persists in `?ids=` URL params for shareable links
- **Structured Evaluations** — score candidates against pre-built templates (Technical Interview, Cultural Fit, Communication Assessment) or custom metrics; paginated list across all profiles
- **Global Search** — full-text search across all candidate fields via Cmd+K / Ctrl+K
- **Notification Bell** — live activity feed wired to the audit log
- **Audit Log** — paginated, timestamped record of every create, update, and status change
- **Shortlisted & Favorites** — quick-access filtered views for bookmarked candidates
- **Dashboard Analytics** — stat cards, pipeline funnel chart, candidate source donut, top-rated profiles
- **Dark / Light Theme** — system-aware toggle with zero flash on load
- **Demo Mode** — works entirely from localStorage; no server, no sign-up
- **Supabase Auth** — Email + Password login, Google OAuth, email verification, password reset via email link, persistent sessions (auto-refreshed), multi-view login page

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/employeerepo.git
cd employeerepo/apps/web

# 2. Copy env template and fill in keys (or leave blank for demo mode)
cp .env.example .env.local

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev
# → http://localhost:5173
```

The app works immediately in demo mode with pre-seeded candidate data. To enable AI resume parsing, add your Groq key to `.env.local`.

---

## Demo Mode vs Production Mode

| | Demo Mode | Production Mode |
|---|---|---|
| Supabase env vars | Not set | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set |
| Auth | Always logs in as a fixed admin user | Real Supabase Auth (email/password, Google OAuth) |
| Data storage | Zustand in localStorage | Zustand in localStorage (Supabase data queries are the next step) |
| Sessions | Simulated | Real sessions; auto-refreshed; persist across reloads |
| Google OAuth button | Shown but disabled (tooltip explains why) | Fully functional (requires Google provider enabled in Supabase) |

---

## Authentication Features

When Supabase is configured (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set):

- **Email + Password** — sign up with email verification, log in, reset password
- **Google OAuth** — one-click sign-in via Google (requires setup below)
- **Password Reset** — sends an email link; `/reset-password` page handles the callback
- **Email Verification** — sent on signup; `/auth/callback` handles the confirmation link
- **Session Persistence** — Supabase stores sessions in localStorage; users stay logged in across reloads until they sign out or the session expires
- **Multi-view Login Page** — login, sign up, forgot password, and check-email views all in one page (violet/indigo palette, WebGL grid)

### Google OAuth Setup

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **Auth → Providers → Google** — enable the provider
2. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/) and copy the Client ID and Secret into Supabase
3. In Supabase Dashboard → **Auth → URL Configuration → Redirect URLs**, add:
   - `http://localhost:5173/auth/callback` (local development)
   - `https://yourdomain.com/auth/callback` (production)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | No | Supabase project URL. Omit to run in demo mode (no real auth or backend). |
| `VITE_SUPABASE_ANON_KEY` | No | Supabase anon/public key. Omit to run in demo mode. |
| `VITE_GROQ_API_KEY` | No | Groq API key for AI resume parsing. Get one at [console.groq.com/keys](https://console.groq.com/keys). |
| `VITE_GROQ_MODEL` | No | Override the Groq model. Defaults to `llama-3.3-70b-versatile`. |

---

## Project Structure

```
apps/web/
├── src/
│   ├── pages/              # 16 route-level pages (all lazy-loaded)
│   ├── components/
│   │   ├── layout/         # Sidebar, Topbar, AppLayout
│   │   └── ui/             # ConfirmDialog, ResumePreview, RatingStars, StatusBadge, ...
│   ├── store/              # Zustand stores: talentStore, authStore, themeStore
│   ├── lib/                # pdfParser, profileSpreadsheet, supabase, demoData, utils
│   ├── types/              # database.ts — single source of truth for all interfaces
│   └── index.css           # Design system: CSS variables + component utility classes
├── index.html              # Google Fonts: Syne + Figtree + JetBrains Mono
└── .env.local              # Environment variables (gitignored)
```

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript + Vite |
| Styling | TailwindCSS v4 (`@import "tailwindcss"` only — no config file) |
| State | Zustand v5 with `persist` middleware (talent data); authStore uses Supabase native session persistence |
| Routing | React Router v7 |
| Animation | framer-motion |
| Tables | @tanstack/react-table v8 |
| Drag-drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | recharts |
| PDF | pdfjs-dist v6 |
| DOCX | mammoth |
| Spreadsheet | read-excel-file + write-excel-file |
| Toasts | react-hot-toast |
| AI parsing | Groq API (llama-3.3-70b-versatile) |
| Testing | Vitest + React Testing Library + jsdom |

---

## Testing

```bash
cd apps/web
npm test
```

244 tests across 9 files covering spreadsheet import/export, filter logic, and data normalization. All tests must pass before merging.

```bash
npm run typecheck   # tsc --noEmit — zero errors required
npm run build       # tsc -b && vite build
```

---

## Supabase Setup

**Auth is already wired up.** Once you add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, login, signup, Google OAuth, and password reset all work without any code changes.

To also connect the talent data to a real database:

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`
4. Each Zustand store has swap-point comments for replacing in-memory state with Supabase queries

Full step-by-step guide: [supabase/SETUP.md](supabase/SETUP.md)

---

## License

MIT
