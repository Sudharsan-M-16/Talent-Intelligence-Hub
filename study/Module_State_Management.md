# Module: State Management

## 1. Why this concept exists
A complex dashboard with offline demo capabilities requires a robust, synchronous data layer. Components must react instantly to mutations (like dragging a Kanban card) without waiting for network latency, ensuring a fluid UX.

## 2. Where this concept appears in THIS project
- `apps/web/src/store/talentStore.ts`
- `apps/web/src/store/themeStore.ts`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `create()` from Zustand.
- `persist()` middleware from Zustand.
- `filteredProfiles()` (derived state selector).

## 5. Complete execution flow
1. **Initialization**: Zustand creates the store using `create()`.
2. **Rehydration**: The `persist` middleware intercepts initialization, reads `tih-talent-store-v2` from LocalStorage, and hydrates the store.
3. **Mutation**: A component calls `addProfile(profile)`.
4. **Immutability**: Zustand updates the state immutably (`state.profiles = [profile, ...state.profiles]`).
5. **Persistence**: Zustand automatically serializes the new state to LocalStorage.
6. **Reactivity**: Any React component hooked via `useTalentStore(s => s.profiles)` re-renders automatically.

## 6. Engineering decisions
- **Zustand over Redux**: Redux requires immense boilerplate (actions, reducers, dispatch). Zustand allows direct mutator functions inside the store, cutting boilerplate by 80% while retaining Redux-DevTools compatibility.
- **In-Memory Derived State**: The store keeps an active `filters` object. The `filteredProfiles()` function computes the result of the array intersection *on the fly* rather than storing a separate filtered array, preventing state desync.

## 7. Tradeoffs
- **Tradeoff**: LocalStorage has a ~5MB limit. Storing thousands of detailed profiles (including Base64 avatars or massive parsed JSONs) will crash the browser storage.
- **Mitigation**: This is explicitly an offline/demo-mode architecture. The `CLAUDE.md` specifies that connecting to Supabase requires swapping these Zustand arrays for React Query / Supabase hooks.

## 8. Alternatives
- React Context: Rejected because Context triggers a re-render of ALL consumers on ANY change. Zustand allows atomic selector subscriptions (`useStore(state => state.specificPiece)`).

## 9. Common bugs
- **Hydration Mismatch**: React renders the server/default state, then Zustand injects the local state, causing a UI flicker.
- *Fix*: The app prevents hydration UI mismatches by not relying on SSR.

## 10. Debugging techniques
- Install Redux DevTools extension. Zustand natively hooks into it if configured, allowing time-travel debugging of state mutations.
- Check LocalStorage in the browser application tab for `tih-talent-store-v2`.

## 11. Security implications
- Storing PII (Personally Identifiable Information) in LocalStorage is dangerous on shared computers. This further necessitates moving to a pure DB-driven approach for production.

## 12. Performance implications
- Zustand mutations are instantaneous. Reactivity is incredibly fast because it bypasses the React Context tree.

## 13. Scalability implications
- To scale beyond the demo, `talentStore` must transition from being a Data Store to simply UI State Store (holding only filters and modal states), while React Query or SWR handles data fetching.

## 14. Best practices
- NEVER mutate state directly (e.g., `state.profiles.push()`). Always return a new array or object to trigger React's object-identity checks.

## 15. Future improvements
- Extract `filters` into its own `filterStore` or sync them with URL Search Params so the back button works for filtered views.

## 16. Interview questions
- *Q: Why use Zustand instead of React Context?*
  A: Context causes unnecessary re-renders for all consumers when any part of the value changes. Zustand uses selectors to ensure components only re-render when the specific data they care about changes.

## 17. Practical exercises
- Implement a new action `deleteProfile(id)` in `talentStore`.

## 18. Mini implementation exercises
- Change the persistence key in `talentStore` and observe how the app resets to default demo data on reload.

## 19. Reading checklist
- [ ] Read `talentStore.ts`
- [ ] Read `themeStore.ts`

## 20. Completion checklist
- [ ] I understand how Zustand persistence works.
- [ ] I can trace a mutation from UI click to LocalStorage update.
