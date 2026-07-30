# Code Walkthrough: KanbanPage.tsx

## Purpose
Provides a drag-and-drop pipeline interface for managing candidates through different hiring stages (New, Shortlisted, Approved, etc.).

## Responsibilities
- Setting up the `@dnd-kit/core` context.
- Defining interaction sensors (mouse/touch).
- Rendering columns.
- Updating candidate statuses when a drop occurs.

## Dependencies
- `@dnd-kit/core` (Sensors, DragOverlay, DndContext)
- `@dnd-kit/sortable` (SortableContext, useSortable)
- `../store/talentStore` (Fetching profiles and updating status)

## Execution Order
1. Component mounts. Selects profiles from `talentStore` where `is_active == true`.
2. Computes `columns` state, grouping profiles by their current `status`.
3. Renders `<DndContext>` with configured sensors.
4. User initiates drag -> `handleDragStart` sets `activeId`.
5. `<DragOverlay>` renders a floating copy of the card at the pointer position.
6. User drops card -> `handleDragEnd` evaluates `active` and `over` elements.
7. Calls `updateProfile(id, { status: newStatus })`.

## Key Component: `SortableItem`
A wrapper around the actual Kanban card. It calls `useSortable()`.
```typescript
const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
```
It applies CSS `transform: CSS.Transform.toString(transform)` to physically move the card on the screen.

## Business Logic
The Kanban board currently only supports moving candidates *between* columns (status updates). It does not persist the vertical order *within* a column, as candidates are typically sorted by rating or date by default.

## Performance
Because `@dnd-kit` uses CSS `transform3d`, dragging does not cause browser reflows. The component maintains 60fps even with hundreds of DOM nodes.

## UX Decisions
The `TouchSensor` requires a 250ms hold to activate. This is critical. Without this delay, attempting to scroll down the page on a mobile phone would instantly pick up a card and break the scrolling behavior.

## Common Interview Questions
*Q: Why use a DragOverlay instead of just moving the original element?*
A: If you move the original element, it leaves a confusing empty gap in the DOM, or changes the layout of the list while dragging. `DragOverlay` creates an ephemeral clone of the element positioned absolutely at the mouse cursor, leaving the original element in place (often styled with `opacity: 0.5`) until the drop is finalized.
