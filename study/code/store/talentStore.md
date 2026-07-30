# Code Deep Dive: `src/store/talentStore.ts`

## Purpose
The absolute source of truth for all candidate data in the frontend. It manages the list of profiles, the Kanban board status, the active/selected profiles, and integrates deeply with local storage for demo persistence.

## Architecture
Built using Zustand, a small, fast, and scalable bearbones state-management solution.

## State Variables
- `profiles`: `TalentProfile[]` - The master array of all candidates.
- `searchQuery`: `string` - Global search state.
- `statusFilter`: `string | null` - Filtering for list views.

## Key Actions
- `addTalent(profile)`: Appends a new profile to the array.
- `updateTalentStatus(id, newStatus)`: The function called by `dnd-kit` when a card is dropped into a new column on the Kanban board.
- `bulkAddTalent(profiles)`: Takes the output of `profileSpreadsheet.ts` and merges it into the state.

## Flow & Integration with Supabase
The file is littered with comments marking "swap points".
Currently, `updateTalentStatus` modifies the local Zustand array.
In production, this is the exact line where you swap in:
`await supabase.from('talent').update({ status: newStatus }).eq('id', id)`

## Potential Bugs
**Race Conditions in State Syncing:**
If you bulk upload 1,000 profiles, and simultaneously delete a profile from another tab, the local storage sync might overwrite the deletion if it commits last. Zustand's basic persist middleware does not handle complex distributed system CRDT (Conflict-free Replicated Data Type) resolution.

## Refactoring Ideas
- **Normalized State**: Currently, `profiles` is an array. To update a profile by ID, Zustand has to map over the entire array. O(N).
- If `profiles` was a Record/Object `Record<string, TalentProfile>`, updating a profile's status would be O(1) direct access.
```javascript
// Current
updateTalentStatus: (id, status) => set(state => ({
   profiles: state.profiles.map(p => p.id === id ? { ...p, status } : p)
}))

// Refactored O(1)
updateTalentStatus: (id, status) => set(state => ({
   profiles: { ...state.profiles, [id]: { ...state.profiles[id], status } }
}))
```
