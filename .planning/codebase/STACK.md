---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Codebase Stack

**Analysis Date:** 2026-10-10

## Technology Stack

### Languages & Runtime

- **Runtime:** Node.js (v22+)
- **Language:** TypeScript 5.7+
- **Execution:** `tsx` for server execution, `vite` for frontend bundling

### Frontend (src/)

- **Framework:** React 19.0.0
- **Build Tool:** Vite 6
- **Icons:** `lucide-react`
- **Styling:** Vanilla CSS (`src/styles.css`)

### Backend (server/)

- **Framework:** Express 4.21
- **API Style:** REST API (JSON payloads)
- **Persistence:** Local JSON file (`server/store.ts` handling `store.json`)

### Testing (tests/ & server/)

- **E2E:** Playwright (`@playwright/test`)
- **Unit/Integration:** Native Node.js test runner (`tsx --test`)

### Tooling

- **Orchestration:** `concurrently` (dev server running `vite` and `tsx watch` together)

## Configuration Files

- \`package.json\`: Defines dependencies and scripts (`dev`, `build`, `start`, `test`, `test:e2e`).
- \`tsconfig.json\`: TypeScript configuration (target ES2022, bundler module resolution, strict mode).
- \`vite.config.ts\`: Vite config with React plugin and proxy to `http://127.0.0.1:3001` for `/api`.
- \`playwright.config.ts\`: Playwright config, setting up a local webServer on port 3101 using `npm start` with a temporary data directory.

<!-- refreshed: 2026-10-10 -->
