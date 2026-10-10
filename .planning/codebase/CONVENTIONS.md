---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Code Conventions

**Analysis Date:** 2026-10-10

## Code Style

- **TypeScript:** Strict mode is enabled (`strict: true` in `tsconfig.json`). Explicit typing is preferred for domain models in `shared/types.ts`.
- **Formatting:** Standard formatting (likely Prettier/ESLint, though not explicitly configured in `package.json`).
- **Module System:** ES Modules (`type: "module"` in `package.json`). Imports use `.js` extensions for local files in Node.js execution (e.g., `import { loadStore } from './store.js'`).
- **React:** Functional components with Hooks.

## Architectural Patterns

- **Shared Types:** A single `shared/types.ts` file acts as the source of truth for the domain model across the stack, ensuring type safety between the API and UI.
- **Atomic Persistence:** The backend uses a simple, file-based atomic JSON store (`server/store.ts`). Reads load the entire state into memory; writes save the entire state.
- **Synchronous/Asynchronous Boundaries:** The API routes are largely thin wrappers around asynchronous engine logic (`runAttack`, `validateDefenses`).

## Error Handling

- **API Level:** Express routes handle errors with `try/catch` and pass them to an Express error handling middleware (`app.use((error: Error, ...`) that returns a standard JSON error response (`{ error: '...' }`).
- **Validation:** Input validation happens primarily in the route handlers (e.g., checking for valid targets, seeds, defense objects) before invoking core logic.

## Naming Conventions

- **Types:** PascalCase (e.g., `AttackInput`, `TraceStep`).
- **Functions/Variables:** camelCase (e.g., `runAttack`, `loadStore`, `executeCampaign`).
- **Constants:** UPPER_SNAKE_CASE for global constants (e.g., `SURFACES`, `EMPTY_DEFENSE`).

<!-- refreshed: 2026-10-10 -->
