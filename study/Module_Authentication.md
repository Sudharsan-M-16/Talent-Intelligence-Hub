# Module: Authentication

## 1. Why this concept exists
A B2B platform must strictly authenticate users to protect proprietary talent data. The app requires robust login, signup, password reset, and OAuth flows.

## 2. Where this concept appears in THIS project
- `apps/web/src/store/authStore.ts`
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/AuthCallbackPage.tsx`
- `apps/web/src/pages/ResetPasswordPage.tsx`
- `apps/web/src/lib/supabase.ts`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `authStore.init()`
- `authStore.login()`
- `authStore.signup()`
- `authStore.loginWithGoogle()`
- `authStore.logout()`

## 5. Complete execution flow
1. **Application Load**: `<AuthInitializer>` calls `authStore.init()`.
2. **Session Check**: `init()` calls `supabase.auth.getSession()`.
   - *If no Supabase URL is found*: It falls back to Demo Mode and sets a mock admin user.
   - *If session found*: Updates Zustand state with the `AuthUser`.
3. **Login Action**: User enters credentials. `login()` calls `supabase.auth.signInWithPassword()`.
4. **Persistence**: Supabase JS automatically writes the JWT to LocalStorage (`sb-{projectRef}-auth-token`).
5. **Subscription**: `init()` sets up `supabase.auth.onAuthStateChange` to automatically log the user out if the session expires or is revoked remotely.

## 6. Engineering decisions
- **Zustand is NOT persisted for Auth**: The `authStore` deliberately omits the Zustand `persist` middleware. Why? Because `supabase-js` inherently manages session storage. Persisting the store would create two sources of truth and lead to race conditions where Zustand says "logged in" but Supabase says "token expired".

## 7. Tradeoffs
- **Tradeoff**: Coupling heavily to Supabase Auth means migrating to Auth0 or AWS Cognito later would require rewriting `authStore.ts`.
- **Mitigation**: The `authStore` completely encapsulates the auth logic. React components never call Supabase directly; they only call `authStore.login()`, shielding the UI from the underlying provider.

## 8. Alternatives
- NextAuth.js / Auth.js: Excellent for SSR, but unnecessary and overly complex for a Vite SPA.

## 9. Common bugs
- **Infinite Redirect Loops**: User goes to `/login`, auth resolves, redirects to `/dashboard`, auth state drops, redirects back to `/login`.
- *Fix*: Ensure `authStore.isLoading` acts as an absolute guard blocking the router from redirecting until `getSession` explicitly resolves.

## 10. Debugging techniques
- Check LocalStorage for the `sb-*` keys to verify if the token actually exists.
- Network tab: Monitor the `POST` requests to `https://[ref].supabase.co/auth/v1/token`.

## 11. Security implications
- JWTs are stored in LocalStorage. This is standard for SPAs, but susceptible to XSS. The app must strictly avoid rendering raw HTML (`dangerouslySetInnerHTML`) to prevent XSS token theft.

## 12. Performance implications
- `getSession()` makes a network call on mount to verify token freshness, adding a ~100ms delay to initial boot.

## 13. Scalability implications
- Supabase Auth handles millions of users natively. The client-side implementation requires zero scaling effort.

## 14. Best practices
- Always `await authStore.logout()` to ensure the backend invalidates the token before the UI updates.

## 15. Future improvements
- Implement Multi-Factor Authentication (MFA) via Supabase's native MFA flow.

## 16. Interview questions
- *Q: Why isn't the auth store persisted like the talent store?*
  A: Because the Supabase client inherently handles session persistence. Double-persisting would lead to out-of-sync states between the application state and the cryptographic reality of the token.

## 17. Practical exercises
- Trace the execution flow from clicking "Sign in with Google" to the `AuthCallbackPage` resolving the hash parameters.

## 18. Mini implementation exercises
- Add a "Delete Account" function to `authStore` that calls Supabase's user deletion endpoint.

## 19. Reading checklist
- [ ] Read `authStore.ts`
- [ ] Read `LoginPage.tsx`

## 20. Completion checklist
- [ ] I understand the difference between Demo mode and Production auth mode.
- [ ] I understand how the router guards protect private pages.
