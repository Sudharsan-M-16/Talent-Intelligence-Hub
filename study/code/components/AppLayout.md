# Code Deep Dive: `src/components/layout/AppLayout.tsx`

## Purpose
The shell of the application. It provides the routing structure, the sidebar layout, the top navigation, and global context providers (like Toasters for notifications).

## Architecture
- It acts as the parent route component for `react-router-dom`.
- Inside `AppLayout.tsx`, an `<Outlet />` is rendered. This is where the children pages (Dashboard, Kanban, etc.) are injected based on the current URL.
- Uses CSS Grid or Flexbox to maintain a fixed sidebar and a scrolling main content area.

## Dependencies
- `react-router-dom` (`<Outlet />`)
- `Sidebar.tsx`
- `Topbar.tsx`
- `framer-motion` (sometimes used here to animate page transitions when the Outlet changes).

## Execution
- On mount, it mounts the Sidebar.
- On route change, it unmounts the old child and mounts the new one in the Outlet, leaving the Sidebar intact. This is what makes it a Single Page Application (SPA).

## Common Bugs
- If a child page inside the `<Outlet />` crashes, it brings down the entire application to a white screen.
- **Fix:** Wrap the `<Outlet />` in an `<ErrorBoundary>` component. 
