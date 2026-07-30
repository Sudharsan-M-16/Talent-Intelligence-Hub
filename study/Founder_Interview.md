# Founder Interview Prep

Pretend you are the technical founder of the Talent Intelligence Hub. You must defend your engineering decisions.

## Architecture

**Interviewer:** You chose Vite and React for a B2B dashboard. Why not Next.js, considering it's the industry standard right now?
**Founder:** Next.js is the standard for *public* apps requiring SEO and fast Time-to-First-Byte for crawlers. TIH is a gated, authenticated dashboard. Next.js introduces server-side rendering complexity, hydration mismatches, and infrastructure overhead. A Vite SPA compiles to pure static HTML/JS/CSS, meaning we can host it anywhere for pennies, and it allows us to build a robust offline "Demo Mode" that runs entirely in LocalStorage without a server.

## Database

**Interviewer:** You put skills into a `TEXT[]` array column instead of a separate `skills` table. Doesn't that violate normal form?
**Founder:** Yes, it violates 1NF, but intentionally. A core feature of this platform is instantly filtering thousands of candidates by skills. Joining a massive junction table every time the user types a keystroke would crush the database. PostgreSQL's GIN indexing on `TEXT[]` arrays gives us sub-millisecond filtering at the cost of slight write-complexity if we ever need to rename a skill globally. For read-heavy talent hubs, denormalization is the correct tradeoff.

## AI Integration

**Interviewer:** Exposing the Groq API key in the frontend is a security flaw. Why did you do this?
**Founder:** It is an intentional shortcut for the MVP/Demo phase to avoid provisioning proxy servers. However, the architecture is designed so that `callGroqApi()` is an isolated pure function. In production, we swap that exact function to hit a Supabase Edge Function instead, hiding the key immediately. The core parsing logic remains completely untouched.

**Interviewer:** LLMs hallucinate. How do you trust the parsed resume data?
**Founder:** We don't. The AI is treated as a highly capable but untrusted worker. After the AI outputs a JSON object, we run `normalizeParsedResume()`. This function takes the AI's email and phone outputs and runs a regex match against the *raw, original extracted text*. If the AI made up an email, the regex fails, and the data is dropped. 

## State Management

**Interviewer:** You have a Zustand store holding all application data. What happens when I upload 50,000 resumes?
**Founder:** The browser tab will crash due to LocalStorage limits (~5MB) and JS heap limits. The current Zustand `persist` setup is strictly for our Demo Mode architecture. The scaling roadmap explicitly dictates swapping the Zustand arrays for TanStack Query connected to our paginated Supabase backend, keeping memory footprint flat regardless of database size.

## Security

**Interviewer:** How do you ensure one company can't see another company's candidates?
**Founder:** Row Level Security (RLS) in PostgreSQL. Security is not handled in the API or the UI. The database kernel itself intercepts every query and enforces `org_id = current_org_id()`. Even if an engineer writes a completely broken backend route that queries `SELECT * FROM talent_profiles`, the database will automatically restrict the return set to only the caller's organization.
