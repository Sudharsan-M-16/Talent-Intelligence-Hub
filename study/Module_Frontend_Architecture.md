# Module: Frontend Architecture

## 1. Why this concept exists
To deliver a production-grade user experience, a frontend must be highly responsive, strictly typed, and cleanly structured. The architecture separates routing, state, and UI components to allow the team to scale without collisions. TailwindCSS v4 with CSS variables ensures a unified design language that can be updated centrally.

## 2. Where this concept appears in THIS project
The entire `apps/web/src` directory is the physical manifestation of this architecture.

## 3. Which files implement it
- `apps/web/src/main.tsx` (Entry point)
- `apps/web/src/App.tsx` (Router & Auth initialization)
- `apps/web/src/index.css` (Design system)
- `apps/web/src/components/layout/AppLayout.tsx` (Structural layout)

## 4. Which functions implement it
- `React.lazy()` for code splitting pages.
- `createBrowserRouter` from React Router v7.

## 5. Complete execution flow
1. **Boot**: `main.tsx` renders the `<App />` component into the DOM.
2. **Auth Intialization**: Inside `<App />`, the `AuthInitializer` component immediately fires `authStore.init()` to check for an existing Supabase session.
3. **Routing Setup**: `createBrowserRouter` defines the routes. Every page (e.g., `DashboardPage`, `TalentListPage`) is wrapped in `React.lazy`.
4. **Guards**: `ProtectedRoute` intercepts private routes. If `authStore.isLoading` is true, it yields a `<PageLoader />`. If false and no user exists, it redirects to `/login`.
5. **Layout Rendering**: Authenticated routes render inside `<AppLayout>`, which mounts the `<Sidebar>` and `<Topbar>`, projecting the specific page into the `<main>` outlet.

## 6. Engineering decisions
- **Lazy Loading**: Chosen to keep the initial JavaScript bundle small. Only the code for the current page is downloaded.
- **No tailwind.config.js**: The project relies purely on TailwindCSS v4's CSS variable-driven engine via `@import "tailwindcss"`. This reduces build complexity and centralizes theme tokens in `index.css`.

## 7. Tradeoffs
- **Tradeoff**: Lazy loading causes a slight delay (and a Suspense fallback) when navigating to a new page for the first time.
- **Mitigation**: Once loaded, React Router caches the chunk, making subsequent visits instantaneous.

## 8. Alternatives
- **Next.js SSR**: Would offer better SEO, but this is a gated B2B dashboard where SEO is irrelevant. A pure Vite SPA is vastly simpler to host and maintain.

## 9. Common bugs
- Flash of unstyled content (FOUC) or flash of login screen before auth resolves.
- *Fix*: The `isLoading` state in `authStore` completely blocks the router from rendering the protected outlet until Supabase responds.

## 10. Debugging techniques
- Use React DevTools to inspect the `Suspense` boundaries.
- Check the network tab for `chunk-[hash].js` files loading when clicking sidebar links.

## 11. Security implications
- Frontend route guarding (`ProtectedRoute`) is a UX feature, not a security boundary. True security is enforced by Supabase RLS on the backend.

## 12. Performance implications
- The Vite build aggressively code-splits. The core bundle is tiny.

## 13. Scalability implications
- The architecture cleanly supports adding 100+ more pages without affecting the initial load time.

## 14. Best practices
- All new pages must be added to `App.tsx` using `lazy()`.
- Never use raw hex colors in JSX. Always use the `var(--color-...)` CSS variables mapped in `index.css`.

## 15. Future improvements
- Implement pre-fetching on hover for sidebar links to eliminate the lazy-load delay.

## 16. Interview questions
- *Q: Why does the project use Vite + SPA instead of Next.js?*
  A: It's an authenticated dashboard requiring zero SEO. An SPA avoids the overhead of server-side rendering, simplifies state management across navigations, and allows for an offline-capable demo mode.

## 17. Practical exercises
- Add a new empty page called `AnalyticsPage`. Wire it up to the sidebar and lazily load it in `App.tsx`.

## 18. Mini implementation exercises
- Change the primary accent color from Indigo to Emerald purely by modifying `index.css`.

## 19. Reading checklist
- [ ] Read `App.tsx`
- [ ] Read `index.css`
- [ ] Read `AppLayout.tsx`

## 20. Completion checklist
- [ ] I can trace a route click from the Sidebar to the rendered page.
- [ ] I understand how CSS variables drive the theme.
