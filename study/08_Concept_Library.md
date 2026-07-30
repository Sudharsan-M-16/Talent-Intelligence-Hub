# 08 Concept Library

This document contains standalone learning guides for core concepts utilized across the TIH codebase.

## 1. Closures in React (Stale State Bugs)
**What is it?** A closure is a function that remembers its outer variables and can access them.
**Why it matters in TIH:** In `useEffect` hooks or `dnd-kit` callbacks, if you pass a function that references a state variable, but don't include that variable in the dependency array, the function will "close over" the *old* state.
**Debugging Technique:** Always use the ESLint `exhaustive-deps` rule.

## 2. Generics in TypeScript
**What is it?** A way to create reusable components that work with a variety of types rather than a single one.
**How TIH uses it:** The `Table` component or `dnd-kit` sortable contexts often use Generics to accept any data shape (e.g., `<T extends { id: string }>`) as long as it has an ID, without explicitly binding it to `TalentProfile`.

## 3. Discriminated Unions
**What is it?** A TypeScript pattern where a single field (the discriminator) is used to narrow down a type.
**How TIH uses it:** Handling API responses.
```typescript
type ApiResponse = 
  | { status: 'success', data: TalentProfile[] }
  | { status: 'error', message: string };
```
If you check `if (response.status === 'success')`, TypeScript automatically knows `response.data` exists and `response.message` does not.

## 4. Virtual DOM & Reconciliation
**What is it?** React's in-memory representation of the actual DOM.
**Optimization in TIH:** When dragging 500 cards on the Kanban board, if React re-rendered the entire board on every pixel move, it would lag to 2 FPS. `dnd-kit` uses CSS `transform` properties via inline styles, completely bypassing the React reconciliation engine for the drag movement, maintaining 60 FPS.
