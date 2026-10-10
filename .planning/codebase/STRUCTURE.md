---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Directory Structure

**Analysis Date:** 2026-10-10

## High-Level Layout

The repository is organized into distinct directories separating frontend, backend, shared types, and test code.

```text
/
├── public/                 # Static assets served by Vite (e.g., favicon.svg)
├── server/                 # Express backend and core execution engine
│   ├── engine.test.ts      # Tests for the core engine
│   ├── engine.ts           # Attack orchestration, simulation, and defense validation
│   ├── index.ts            # Express application setup and API routes
│   └── store.ts            # Atomic JSON persistence logic
├── shared/                 # Code shared between frontend and backend
│   └── types.ts            # TypeScript interfaces and types (Surface, Defense, Trace, etc.)
├── src/                    # React frontend source code
│   ├── App.tsx             # Main React application component (Dashboard, Campaigns, UI)
│   ├── main.tsx            # React entry point
│   └── styles.css          # Global and component styles
├── tests/                  # Playwright end-to-end tests
│   └── workflows.spec.ts   # E2E test suites for application workflows
├── .gitignore              # Git ignore patterns
├── index.html              # HTML entry point for Vite
├── package.json            # Project dependencies and scripts
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json           # TypeScript compiler configuration
└── vite.config.ts          # Vite configuration
```

## Key Locations

- **API Routes:** `server/index.ts`
- **Core Logic:** `server/engine.ts`
- **State Management:** `server/store.ts` (persists to `.agentbreak/store.json`)
- **Domain Models:** `shared/types.ts`
- **Main UI:** `src/App.tsx`
- **Styling:** `src/styles.css`

## Naming Conventions

- **Directories:** lowercase (e.g., `src`, `server`, `tests`).
- **TypeScript/React Files:** CamelCase or PascalCase for React components (`App.tsx`), lowercase with hyphens/dots for utilities/tests (`engine.test.ts`, `main.tsx`).
- **Configuration:** Standard config naming (`vite.config.ts`, `tsconfig.json`).

<!-- refreshed: 2026-10-10 -->
