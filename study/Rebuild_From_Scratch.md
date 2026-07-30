# Rebuilding from Scratch

If the codebase were deleted, here is the exact order of implementation to rebuild the Talent Intelligence Hub.

## Step 1: Database & Schema (Backend First)
**Why:** The database dictates the types. Without types, the frontend will be a mess of `any`.
1. Spin up a local Supabase instance or PostgreSQL container.
2. Write `schema.sql`. Create `organizations`, `user_profiles`, `talent_profiles`.
3. Write the triggers (`update_search_vector`, `recompute_rating`) immediately to ensure data integrity at the database layer.
4. Export the database types into `database.ts`.

## Step 2: Foundation & Tooling
**Why:** Set up the compiler and styling engines before writing components.
1. Run `npm create vite@latest apps/web -- --template react-ts`.
2. Configure TailwindCSS v4.
3. Write `index.css`. Define the exact CSS variables (`--color-base`, `--color-primary`) and font imports (`Syne`, `Figtree`, `JetBrains Mono`). Do not proceed until the design system tokens are locked.

## Step 3: State & Auth
**Why:** Components need a place to read data from.
1. Write `authStore.ts`. Wire it to the Supabase client.
2. Write `talentStore.ts`. Build the mock demo data (`demoData.ts`) so UI development can happen completely offline.
3. Build the `AuthInitializer` component to mount the session on boot.

## Step 4: Routing & Layout
**Why:** The skeleton of the application.
1. Install `react-router`.
2. Create `App.tsx` with lazy-loaded routes.
3. Build the `ProtectedRoute` wrapper.
4. Build `AppLayout.tsx`, `Sidebar.tsx`, and `Topbar.tsx`.

## Step 5: Core Ingestion Logic (Test Driven)
**Why:** Data parsing is mathematical and brittle. It must be built outside of React.
1. Install `vitest`.
2. Write `profileSpreadsheet.ts`. Use TDD (Test Driven Development) to build the header fuzzy matching and regex normalization.
3. Write `pdfParser.ts`. Implement the Y-coordinate grouping and Groq API fetch loop.

## Step 6: UI Components (Bottom-Up)
**Why:** Build small blocks before assembling pages.
1. Build `StatusBadge`, `RatingStars`, `SkillChip`.
2. Build `ConfirmDialog` and `ResumePreview`.

## Step 7: Core Pages
**Why:** Assemble the application.
1. Build `TalentListPage.tsx`. Hook it up to `talentStore.filteredProfiles()`.
2. Build `BulkProfilesPage.tsx`. Hook it to the `profileSpreadsheet` parser.
3. Build `KanbanPage.tsx` using `dnd-kit`.

## Step 8: The Polish
**Why:** Makes the app production-ready.
1. Run `npm run typecheck` and fix all `any` and strict null checks.
2. Ensure CSS classes map perfectly to `index.css`.
3. Add framer-motion animations to route transitions.
