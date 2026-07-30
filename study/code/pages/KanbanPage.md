# Code Deep Dive: `src/pages/KanbanPage.tsx`

## Purpose
Renders a visual drag-and-drop pipeline of candidates. It reads from `talentStore` and allows recruiters to quickly move candidates from "New" to "Screening" to "Interview" to "Offer".

## Architecture
- Uses `@dnd-kit/core` and `@dnd-kit/sortable`.
- Follows a headless component architecture, meaning `dnd-kit` manages the logic, and we manage the Tailwind styling.

## Execution Flow
1. **Sensors**: Initialize `PointerSensor` and `TouchSensor`. If you only initialize `PointerSensor`, the board cannot be dragged on an iPhone.
2. **Context**: Wrap the board in `<DndContext onDragEnd={handleDragEnd}>`.
3. **Columns**: Render a `SortableContext` for each column (Status).
4. **Cards**: Inside each column, map over the candidates belonging to that status and render a `<DraggableCard>`.
5. **Drag Event**: When `handleDragEnd` fires, it receives `active` (the card being dragged) and `over` (the column it was dropped onto).
6. **State Update**: Calls `updateTalentStatus(active.id, over.id)` which triggers a Zustand state update, causing React to re-render the board with the card in the new column.

## Complexities
- The "Over" logic. What happens if you drop a card *between* two cards in the same column vs dropping a card onto an empty column? The system maps the `over.id` correctly to either a specific card or a column container.

## Testing Strategy
- E2E testing using Playwright or Cypress is required here. Jest cannot test drag-and-drop easily because it requires simulating complex pointer events and browser layout geometry that JSDom does not support.
