# AgentBreak

An autonomous red-team workbench for AI agents. Discover attacks, inspect multi-stage tool traces, replay exact inputs, and evaluate security controls alongside legitimate functionality.

## Run locally

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. Vite serves the UI and proxies the Express API on port 3001.

```sh
npm test         # Sandbox boundary, replay, adaptation, and regression tests
npm run build   # TypeScript check and optimized frontend build
npm start       # Serve the built application at http://localhost:3001
```

Browser workflow checks (run the build first):

```sh
npx playwright install --with-deps chromium
npm run test:e2e
```

The browser suite starts a separate server on port 3101 with a fresh temporary data store. It covers campaign creation, trace replay and import, defense validation, lockdown regressions, mobile layout, and API validation.

## What's included

- **Security dashboard:** Recorded attempt activity, findings by target/surface, severity, defense coverage, and campaign progress. Date filters and attack-surface filters use persisted execution data.
- **Adaptive discovery:** Upper Confidence Bound selection explores five attack surfaces, rewards successful strategies, and mutates unsuccessful payloads among four strategy families. Campaign seeds fix tie-breaking. This is adaptive search over a bounded mutation space, not unrestricted LLM-generated attack invention.
- **Multi-stage traces:** Inputs, injected context, visible agent responses or simulated policy decisions, tool arguments, guard outcomes, and sandbox results. No hidden model chain-of-thought is requested or recorded.
- **Permission auditing:** Customer data scope, refund limits, protected memory namespaces, registered tools, and outbound destinations. Any unauthorized tool effect counts as an exploit, even if a subsequent step is blocked.
- **Reproducibility:** Full target snapshots and exact payloads, one-click replay, portable JSON exports/imports, and configuration fingerprints. Built-in simulation replay is deterministic. External models may vary.
- **Defense lab:** Source quarantine, least-privilege tool enforcement, protected memory, outbound allowlists, and a deliberately restrictive lockdown option. Validation does not change target settings; Apply changes future campaigns.
- **Regression history:** Replays successful original attacks and runs legitimate sandbox tool-contract checks. Utility checks cover public retrieval, in-scope account access, a $25 refund, preference memory, and an approved internal request where those tools are registered.
- **Local persistence:** Atomic JSON snapshots in `.agentbreak/store.json`. Running campaigns become stopped after a server restart. Set `AGENTBREAK_DATA_DIR` to use another data directory.

## Sandbox versus real models

The three built-in targets are **policy-based simulations**, not language models. On the first run, six starter campaigns are executed against these fixtures to populate the dashboard with actual, reproducible simulation traces. These numbers are demonstration data, not real-model benchmark results.

All tools operate on synthetic data in fresh per-attempt memory. HTTP tools capture requests in a local in-memory sink; they never perform network requests. Refunds never contact a payment provider. The sandbox exposes no filesystem, shell, or host credentials to target agents.

To test an actual model, configure an OpenAI-compatible endpoint on the **server** before starting it:

```sh
AGENTBREAK_MODEL_BASE_URL=https://api.openai.com/v1 \
AGENTBREAK_MODEL_NAME=your-model-name \
AGENTBREAK_MODEL_API_KEY=your-api-key \
npm run dev
```

Optional: `AGENTBREAK_MODEL_LABEL` changes the target's display name. These variables must be present in the shell environment; `.env` is not loaded automatically. API keys are never sent to the browser or stored in traces. A **Connected Model** target appears after restart. It must support `/chat/completions` and function calling. Each attack is limited to five model turns, twenty tool calls, and a thirty-second timeout per request. Model calls can incur provider charges.

Retrieved or memory-borne attacks are delivered as explicitly labeled untrusted context. Source isolation quarantines the attacked retrieved context entirely; it is not an NLP injection detector. The regression suite verifies sandbox tool contracts, **not** real-model end-to-end task completion. External agent frameworks can be integrated by extending `runAttack` in `server/engine.ts`.

## API

All paths are under `/api`. Errors return `{ "error": "message" }`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API status and model connection availability |
| GET | `/state` | Targets, campaigns, traces, and validations |
| POST | `/campaigns` | Start an adaptive run |
| POST | `/campaigns/:id/stop` | Stop a run and preserve completed attempts |
| POST | `/traces/:id/replay` | Replay the original target snapshot and payload |
| GET | `/traces/:id/export` | Download a portable trace |
| POST | `/traces/import` | Execute a version 1 exported trace in this instance |
| POST | `/validations` | Replay successful attacks with proposed defenses |
| PATCH | `/targets/:id/defenses` | Apply controls to future campaigns |
| GET | `/report` | Download the full security report |

Example campaign body:

```json
{
  "name": "Support agent boundary test",
  "targetId": "atlas",
  "surfaces": ["retrieval", "tools", "memory", "instructions", "multi-stage"],
  "budget": 30,
  "seed": 2026
}
```

Example validation body:

```json
{
  "targetId": "atlas",
  "defenses": {
    "sourceIsolation": true,
    "toolPermissions": true,
    "memoryGuard": true,
    "outboundFilter": true,
    "lockdown": false
  }
}
```

## Architecture

```text
src/App.tsx          Dashboard, campaigns, trace inspector, defense and regression UI
src/styles.css       Responsive design system
shared/types.ts      Shared API domain types
server/engine.ts     Adaptive selection, isolated tools, simulation/model runners
server/store.ts      Seed campaigns and atomic JSON persistence
server/index.ts      Express API and production static server
server/engine.test.ts Security invariants and functional regressions
```

The application is a local development workbench with a single workspace. Authentication, multi-tenant isolation, distributed scheduling, and production-grade databases are not included.
