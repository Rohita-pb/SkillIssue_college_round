---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# External Integrations

**Analysis Date:** 2026-10-10

## External APIs & Services

- **OpenAI-compatible APIs:** The application can connect to external model endpoints (e.g., OpenAI, local LLMs) via the `/chat/completions` endpoint for target testing. Configured via environment variables (`AGENTBREAK_MODEL_BASE_URL`, `AGENTBREAK_MODEL_NAME`, `AGENTBREAK_MODEL_API_KEY`).
- **Web Browser (Playwright):** Used for end-to-end testing, not directly integrated into the application's runtime functionality.

## Databases & Persistence

- **Local File Storage:** Persistence is handled atomically via a local JSON file snapshot (`.agentbreak/store.json`). Configurable via `AGENTBREAK_DATA_DIR` environment variable.

## Authentication

- No external auth providers are configured. The app runs locally as a developer workbench.

## Network & Webhooks

- The express server listens on port 3001 and handles all API paths under `/api`.
- The Vite dev server proxies `/api` requests to the Express server.

<!-- refreshed: 2026-10-10 -->
