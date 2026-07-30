# Module: Drag and Drop

## 1. Why this concept exists
A Kanban board is a fundamental interaction paradigm for hiring pipelines. It provides spatial awareness of where candidates are in the process. Drag-and-drop must be perfectly fluid and support both mouse (desktop) and touch (mobile) sensors.

## 2. Where this concept appears in THIS project
- `apps/web/src/pages/KanbanPage.tsx`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `<DndContext>`
- `useSensors()`, `useSensor()`, `PointerSensor`, `TouchSensor`
- `<SortableContext>`
- `useSortable()`

## 5. Complete execution flow
1. **Setup**: The `KanbanPage` defines a grid of columns. It wraps the entire grid in `<DndContext>`.
2. **Sensors**: It initializes `PointerSensor` (mouse) and `TouchSensor` (mobile) with slight activation constraints (e.g., drag must move 5px before starting) to prevent accidental drags when scrolling on mobile.
3. **Draggable Items**: Every candidate card is wrapped in a `SortableItem` component, calling `useSortable({ id: candidate.id })`.
4. **Interaction**: User clicks and holds a card. `DndContext` registers the `onDragStart`.
5. **Drop**: User releases the card over a new column. `onDragEnd` fires.
6. **State Mutation**: The event payload provides the `active.id` (candidate) and `over.id` (the new column). The UI maps the `over.id` to the new pipeline status (e.g., "Shortlisted") and calls `talentStore.updateProfile()`.

## 6. Engineering decisions
- **dnd-kit over react-beautiful-dnd**: `react-beautiful-dnd` is deprecated and heavily bloated. `@dnd-kit` is modern, highly accessible, modular, and natively supports mobile touch without polyfills.

## 7. Tradeoffs
- **Tradeoff**: `dnd-kit` is extremely unopinionated. Building a Kanban board requires manually managing SortableContexts and collision detection arrays, which is verbose.
- **Mitigation**: The verbosity is encapsulated entirely inside `KanbanPage.tsx`, keeping the rest of the application clean.

## 8. Alternatives
- HTML5 Native Drag and Drop. Rejected because it is notoriously terrible, doesn't support mobile touch, and styling the "ghost" element is near impossible.

## 9. Common bugs
- **Mobile Scrolling**: Attempting to scroll down the page accidentally drags a card.
- *Fix*: Apply `{ activationConstraint: { delay: 250, tolerance: 5 } }` to the `TouchSensor`. The user must hold for 250ms to initiate a drag, allowing normal swipes to scroll.

## 10. Debugging techniques
- Monitor the `onDragOver` event in the console to ensure collision detection is correctly identifying which column the cursor is currently over.

## 11. Security implications
- None. Pure UX interaction.

## 12. Performance implications
- The CSS `transform: translate3d(x, y, 0)` is used for the dragging animation, offloading the render loop to the GPU and ensuring 60fps on low-end devices.

## 13. Scalability implications
- Rendering 500+ cards in a Kanban board will cause DOM lag during drags. Virtualization (windowing) is required if a pipeline column holds more than ~100 items.

## 14. Best practices
- Always ensure `id` props passed to `useSortable` are strictly string UUIDs, never objects.

## 15. Future improvements
- Implement drag-to-reorder *within* the same column (currently it only changes the status).

## 16. Interview questions
- *Q: Why do we use CSS Transforms for drag-and-drop instead of changing top/left properties?*
  A: Changing top/left triggers a layout recalculation (Reflow) on the CPU for every frame. `transform` triggers only a Composite layer change on the GPU, guaranteeing a buttery-smooth 60fps.

## 17. Practical exercises
- Change the drag overlay styling to rotate the card by 5 degrees while it is being dragged.

## 18. Mini implementation exercises
- Add a new pipeline column "Technical Interview" and ensure cards can be dropped there.

## 19. Reading checklist
- [ ] Read `KanbanPage.tsx`.

## 20. Completion checklist
- [ ] I understand the difference between PointerSensor and TouchSensor.
- [ ] I can explain why GPU transforms are critical for UX.
