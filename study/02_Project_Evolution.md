# 02 Project Evolution & Architecture

## Current Architecture Overview
TIH is a Single Page Application (React 18) operating primarily as a rich client interacting with Supabase (BaaS) and Groq (AI inference). Its architecture heavily favors **Client-Side Processing**. For instance, PDF text extraction and CSV parsing happen purely in the browser, saving massive amounts of server cost and protecting user data privacy.

## Strengths
- **Cost Efficiency**: Doing compute-heavy tasks like `pdfjs-dist` text extraction on the client-side drastically reduces server bills.
- **Offline/Demo Resilience**: By using a robust Zustand in-memory fallback, the app can be demoed or used locally without ANY backend infrastructure configured.
- **Lightning Fast UI**: Tailwind CSS v4 and Framer motion, combined with Vite, makes the application feel like a native desktop app.

## Weaknesses & Technical Debt
1. **Client-Side Heavy Parsing Limits**: While running Groq and PDF.js in the browser is cost-effective, extremely large PDFs or massive spreadsheets (e.g., 50,000 rows) will cause main-thread blocking and browser freezes.
2. **Missing Granular RBAC**: The system only supports a monolithic "Admin" view. There is no separation for recruiters, interviewers, or read-only clients.
3. **Data Sync Conflicts**: State relies heavily on `talentStore.ts`. In a multi-player environment (two recruiters dragging Kanban cards simultaneously), the current architecture lacks robust optimistic UI concurrency control (CRDTs or WebSockets) and risks overwriting data.

## Future Roadmap & Scalability Improvements
### 1. Enterprise Backend (The `apps/api` folder)
The monorepo contains an `apps/api` folder indicating future intent. To scale to enterprise:
- **Move Groq API calls to Backend**: Prevent exposing the `VITE_GROQ_API_KEY` in the browser bundle (which is a massive security risk currently).
- **Implement a Node.js/Fastify API**: Move the 5-pass spreadsheet normalization to a background worker queue (e.g., BullMQ + Redis) to handle 100k+ row CSVs without blocking the user's browser.

### 2. Database Improvements
- **PostgreSQL Vector Extension (`pgvector`)**: Migrate from keyword/regex based searching to semantic search. By embedding candidate resumes using an embedding model and storing them in Supabase pgvector, recruiters could search for "someone good at distributed systems" rather than exactly "Kafka".

### 3. State Management Improvements
- **Move from Zustand to React Query (TanStack Query)**: As the app relies more on Supabase data, Zustand becomes an anti-pattern for server-state. Transitioning to React Query will provide automatic caching, background refetching, and optimistic updates.
