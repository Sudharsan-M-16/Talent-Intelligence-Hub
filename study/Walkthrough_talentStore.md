# Code Walkthrough: talentStore.ts

## Purpose
Acts as the central nervous system for all talent data in the offline/demo state of the application. It holds the canonical lists of candidates, evaluations, and activity logs.

## Responsibilities
- State initialization (with mock data fallbacks).
- CRUD operations for profiles.
- Filtering logic.
- LocalStorage persistence.

## Dependencies
- `zustand` (State creation)
- `zustand/middleware` (`persist` for localStorage)
- `../types/database` (Strict TS interfaces)
- `../lib/demoData` (Fallback seeded data)

## Execution Order
1. File is imported. Zustand executes `create()`.
2. Middleware intercept: `persist` checks `localStorage.getItem('tih-talent-store-v2')`.
3. If data exists, hydrates state. If empty, falls back to `demoProfiles` from `demoData.ts`.
4. Exposes the `useTalentStore` hook.

## Key Functions

### `addProfile(profile)`
Prepends the new profile to the `profiles` array. Automatically generates a "PROFILE_CREATED" activity log entry and unshifts it into the `activities` array.

### `updateProfile(id, updates)`
Uses standard immutable mapping: `state.profiles.map(p => p.id === id ? { ...p, ...updates } : p)`.

### `setFilters(filters)`
Merges new filter state into the existing `state.filters` object.

### `filteredProfiles()` (Getter)
A derived state function. It pulls `get().profiles` and `get().filters`. It executes a multi-stage filter pipeline:
- Status check
- Text search (`toLowerCase().includes()`)
- Array overlap for skills (checks if every filter skill is present in the candidate's `primary_skills`).

## Business Logic
The store forces immutability. All updates create new object references, ensuring React's diffing engine triggers re-renders correctly.

## Data Flow
User Action -> Component calls `talentStore.addProfile()` -> Zustand updates memory -> Zustand serializes to LocalStorage -> All subscribed components re-render.

## Performance
`filteredProfiles()` runs an $O(N)$ filter operation on every render where it is called. For $N < 5000$, this takes < 5ms.

## Security
Zero security. Data is stored in plaintext in the browser. This file is strictly for the Demo tier of the application.

## Testing Strategy
Tested extensively in `talentStore.test.ts` to ensure that adding a profile correctly generates the side-effect activity log.

## Potential Improvements
Refactor to extract `activities` into a separate `auditStore` to prevent the talent array and audit array from invalidating each other's cache lines.

## Related Files
- `database.ts`
- `TalentListPage.tsx`

## Common Interview Questions
*Q: Why is `filteredProfiles` a function on the store instead of an array in state?*
A: If it were an array in state, we would have to synchronize it every time the main `profiles` array updated. By making it a function, it acts as a selector that dynamically computes the result based on the true state, preventing desyncs.
