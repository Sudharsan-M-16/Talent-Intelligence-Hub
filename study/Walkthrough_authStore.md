# Code Walkthrough: authStore.ts

## Purpose
Manages the user's authentication lifecycle, bridging the gap between the React UI and the Supabase Auth client.

## Responsibilities
- Handling Login, Signup, OAuth, and Logout.
- Exposing the `user` object to the application.
- Emitting an `isLoading` flag to block protected routes.
- Providing a Demo Mode fallback if Supabase environment variables are missing.

## Dependencies
- `zustand`
- `../lib/supabase` (The initialized Supabase client)

## Execution Order
1. App mounts, `<AuthInitializer>` calls `init()`.
2. `init()` checks `supabase`. If null (demo mode), instantly sets the mock user.
3. If real, calls `supabase.auth.getSession()`.
4. Subscribes to `supabase.auth.onAuthStateChange()`.
5. Updates `user` state and sets `isLoading = false`.

## Key Functions

### `init()`
The most critical function. It establishes the session state. It contains a listener that auto-updates the store if the session expires or is refreshed in another tab.

### `login(email, password)`
A thin wrapper around `supabase.auth.signInWithPassword()`. Maps the resulting session into the `AuthUser` interface.

### `loginWithGoogle()`
Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '.../auth/callback' } })`. This causes a full page redirect.

### `logout()`
Calls `supabase.auth.signOut()`. It sets `user` to `null`. This is an async function because it requires a network call to invalidate the token.

## Business Logic
The store intentionally does not use `persist` middleware. Supabase handles session storage natively.

## Data Flow
Supabase Auth API -> `authStore` state -> Route Guards (`ProtectedRoute`) -> UI Components.

## Error Handling
The functions return `{ error: Error }` objects to the caller (e.g., `LoginPage`) rather than throwing, allowing the UI to handle and display toast messages cleanly.

## Security
This file handles the JWT indirectly (via the supabase client). It ensures the app only renders secure areas if a valid session exists.

## Testing Strategy
Auth flows are generally hard to test with unit tests because they require real network calls. They are best tested via E2E tests (Playwright).

## Potential Improvements
Add Role-Based Access Control (RBAC) parsing. Currently, it assumes anyone logged in is an Admin.

## Related Files
- `App.tsx` (Route Guards)
- `LoginPage.tsx`
- `supabase.ts`

## Common Interview Questions
*Q: Why does `init()` subscribe to `onAuthStateChange`?*
A: If a user logs out in Tab A, Tab B needs to instantly log them out as well. The auth state listener catches the localStorage event fired by Supabase and syncs the Zustand store across tabs.
