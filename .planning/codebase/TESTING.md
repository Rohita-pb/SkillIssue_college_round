---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Testing Practices

**Analysis Date:** 2026-10-10

## Frameworks & Tools

- **Unit/Integration Testing:** Native Node.js test runner (`node --test`, executed via `tsx --test`).
- **End-to-End (E2E) Testing:** Playwright (`@playwright/test`).

## Structure

- **Unit Tests:** Co-located or placed near the source files (e.g., `server/engine.test.ts` tests `server/engine.ts`).
- **E2E Tests:** Located in the `tests/` directory (e.g., `tests/workflows.spec.ts`).

## Test Execution

- **Unit Tests:** Run via `npm test`.
- **E2E Tests:** Run via `npm run test:e2e`. The Playwright config automatically starts the development server on a different port (`3101`) with a temporary data directory (`AGENTBREAK_DATA_DIR`) to ensure tests run in isolation without affecting the main development store.

## Test Patterns

- **Isolation:** The e2e tests use a temporary data directory for the `store.json` file, ensuring that test runs are atomic and do not pollute the developer's main environment.
- **Mocking:** Real network requests are not made during testing unless explicitly configured. The built-in targets are policy-based simulations, which makes testing fast and deterministic.

<!-- refreshed: 2026-10-10 -->
