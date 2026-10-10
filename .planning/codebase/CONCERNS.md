---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Codebase Concerns & Debt

**Analysis Date:** 2026-10-10

## Technical Debt & Fragility

- **In-Memory Store:** The persistence layer (`server/store.ts`) loads the entire JSON store into memory and writes the entire file synchronously on every update (`saveStore`). While fine for a local developer tool, this will not scale if data volume grows significantly or if multiple users attempt concurrent operations.
- **Polling / Broadcast:** The frontend currently polls or relies on simple API requests to get updates for running campaigns. WebSockets or Server-Sent Events (SSE) would provide a smoother and more efficient real-time experience for the dashboard.
- **Model Key Handling:** Environment variables for real models (`AGENTBREAK_MODEL_API_KEY`) are read directly by the server. If this tool were to be deployed (even internally), a more robust secret management solution would be needed.

## Security Considerations

- **Cross-Origin Access:** The API has a simple check `if (new URL(origin).host !== req.headers.host)` to prevent cross-origin access. This relies on the `Origin` header being present and accurately reflecting the client.
- **File System Access:** The `store.ts` file operations run synchronously and without file locking. While isolated locally, abrupt termination during a write could corrupt the `store.json` file.

## Missing Features / Completeness

- **Multi-tenant isolation:** As stated in the README, the application is designed as a single-workspace local tool. It lacks authentication, authorization, or multi-tenant isolation.
- **External model variability:** Testing against live LLMs is supported, but external models introduce non-determinism, which can make regression testing flaky compared to the built-in simulations.

<!-- refreshed: 2026-10-10 -->
