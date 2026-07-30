# 04 Rebuild TIH From Scratch

If the entire codebase was deleted, here is the exact order of implementation to rebuild it from memory.

## Step 1: Initialization & Boilerplate
- Initialize a monorepo structure.
- Run `npm create vite@latest web -- --template react-ts`.
- Install core dependencies: `tailwindcss`, `lucide-react`, `framer-motion`, `zustand`, `react-router-dom`.
- **Why**: You need the foundational routing, state, and styling layers before writing any domain logic.

## Step 2: The Core Entity (The Type System)
- Create `src/types/database.ts`.
- Define the `TalentProfile` interface. Include id, name, email, skills array, experience array, education, and kanban status.
- **Why**: Every other feature depends on the shape of the data. Without defining the data first, you will have to rewrite your parsers and UI later.

## Step 3: Global State (Zustand)
- Build `talentStore.ts` and `authStore.ts`.
- Add demo data (`demoData.ts`) to populate the store initially.
- **Why**: You need dummy data to build the UI against. You can't build a dashboard if there is no data to visualize.

## Step 4: The Layout & Navigation
- Build `AppLayout.tsx`, `Sidebar.tsx`, and `Topbar.tsx`.
- Connect React Router to blank placeholder pages (`/dashboard`, `/kanban`, `/bulk`).
- **Why**: Establish the skeleton of the app so you can navigate between features.

## Step 5: The Ingestion Engines (The Hard Part)
- Install `pdfjs-dist` and `mammoth`.
- Build `src/lib/pdfParser.ts`. Start with just extracting text. Then integrate Groq for structured JSON parsing. Write robust regex fallbacks.
- Build `src/lib/profileSpreadsheet.ts` for CSV parsing. Write the 5-pass normalization algorithm to handle dirty headers.
- **Why**: This is the core intellectual property of the app. It's the hardest part to get right.

## Step 6: The User Interfaces (Connecting the pipes)
- Build `DashboardPage.tsx`: Hook up Recharts to read from `talentStore`.
- Build `KanbanPage.tsx`: Implement `dnd-kit`. Create Droppable columns based on the status enum, and Draggable cards for each candidate.
- Build `TalentDetailPage.tsx`: Include the `ResumePreview.tsx` (using an HTML canvas to render the PDF).

## Step 7: Authentication & Supabase
- Integrate `supabase.ts`.
- Wrap the app in an `AuthInitializer`.
- Build the `/login` route.
- **Why**: Leave infrastructure until the end. Building it client-first (offline-first) ensures your UI is incredibly fast and completely decoupled from network latency.
