# 07 Resource Library

Whenever a specific topic appears in the codebase, refer to these canonical, high-quality resources to master it.

## 1. Zustand & State Management
- **Official Documentation**: [Zustand GitHub Repo](https://github.com/pmndrs/zustand)
- **Why**: Zustand's documentation is incredibly concise. Pay special attention to the "Slices Pattern" which is how `talentStore.ts` and `authStore.ts` should eventually be merged if a single root store is desired.
- **Advanced Reading**: TKDodo's Blog on Zustand vs React Query (crucial for Phase 9 evolution).

## 2. Framer Motion (Animations)
- **Official Documentation**: [Framer Motion Docs](https://www.framer.com/motion/)
- **Why**: Used for all route transitions and micro-interactions in TIH.
- **Specific Feature**: Look at the `AnimatePresence` component documentation. It is the only way to smoothly animate components *out* of the React tree (used when deleting a candidate).

## 3. dnd-kit (Kanban Board)
- **Official Documentation**: [dnd-kit Docs](https://docs.dndkit.com/)
- **Why**: `react-beautiful-dnd` is deprecated by Atlassian. `dnd-kit` is the modern, headless, accessibility-first replacement used in `KanbanPage.tsx`.
- **Key Concept**: Read about "Sensors" to understand why mobile dragging breaks if `TouchSensor` is not registered.

## 4. PDF Parsing & AI Extraction
- **PDF.js**: [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) (Understand the rendering canvas).
- **Groq API**: [Groq Console Console](https://console.groq.com/docs/quickstart)
- **Prompt Engineering**: Anthropic's guide to prompt engineering is highly applicable to Groq/Llama models to understand how to force JSON schema outputs reliably.

## 5. Styling
- **Tailwind CSS v4**: [Tailwind Blog / v4 Alpha release notes](https://tailwindcss.com/blog/tailwindcss-v4-alpha)
- **Why**: TIH uses v4. It has NO config file. You must read the v4 docs specifically to understand `@theme` CSS variables.
