# AgentBreak

AgentBreak is an evidence-first security platform for autonomous AI agents. It models an agent’s identities, tools, memory, retrieval sources, tenants, delegation relationships, and business invariants as a **digital twin**. Then it composes attacks, verifies committed effects independently, contains live tool calls, searches for the smallest repair, and gates releases on reproducible evidence.

The project’s core claim is deliberately narrow and testable:

> **AgentBreak does not ask an agent whether it was compromised. It checks whether an unauthorized business effect actually happened.**

That makes the product more than another prompt-injection dashboard. AttackGraph, Runtime Shield, TrustScore, the release gate, and the audit package all point to the same evidence chain.

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

The browser suite starts a separate server on port 3101 with a fresh temporary data store. It covers campaign creation, trace replay and import, defense validation, lockdown regressions, mobile layout, API validation, AttackGraph causal replay, Runtime Shield, release gates, and evidence exports.

## What's included

- **Security dashboard:** Recorded attempt activity, findings by target/surface, severity, defense coverage, and campaign progress. Date filters and attack-surface filters use persisted execution data.
- **Adaptive discovery:** Upper Confidence Bound selection explores five attack surfaces, rewards successful strategies, and mutates unsuccessful payloads among four strategy families. Campaign seeds fix tie-breaking. This is adaptive search over a bounded mutation space, not unrestricted LLM-generated attack invention.
- **Multi-stage traces:** Inputs, injected context, visible agent responses or simulated policy decisions, tool arguments, guard outcomes, and sandbox results. No hidden model chain-of-thought is requested or recorded.
- **Permission auditing:** Customer data scope, refund limits, protected memory namespaces, registered tools, and outbound destinations. Any unauthorized tool effect counts as an exploit, even if a subsequent step is blocked.
- **Reproducibility:** Full target snapshots and exact payloads, one-click replay, portable JSON exports/imports, and configuration fingerprints. Built-in simulation replay is deterministic. External models may vary.
- **Defense lab:** Source quarantine, least-privilege tool enforcement, protected memory, outbound allowlists, and a deliberately restrictive lockdown option. Validation does not change target settings; Apply changes future campaigns.
- **Regression history:** Replays successful original attacks and runs legitimate sandbox tool-contract checks. Utility checks cover public retrieval, in-scope account access, a $25 refund, preference memory, and an approved internal request where those tools are registered.
- **Local persistence:** Atomic JSON snapshots in `.agentbreak/store.json`. Running campaigns become stopped after a server restart. Set `AGENTBREAK_DATA_DIR` to use another data directory.

### Platform features

- **AttackGraph:** Compose retrieval, identity, memory, delegation, and tool capabilities into multi-stage scenarios. Visualize the exact path from untrusted source to business impact. Every finding includes a minimal reproduction fingerprint and an effect-oracle verdict.
- **Runtime Shield:** Run operations through an identity-aware gateway before they reach a tool. Enforce tenant binding, intended tool contracts, protected memory, exact egress origins, delegation attenuation, source provenance, and one-use session-bound approvals. The gateway is fail-closed and all effects stay in-memory.
- **Adversarial swarm:** Viper, Specter, Echo, and Weaver are specialist strategies coordinated by an evidence-feedback supervisor. Initial probes cover the specialists; later probes mutate successful and failed paths. Verified exploits automatically become permanent regression cases.
- **TrustScore:** An explicit weighted posture score based on verified prevention, retained utility, and release-gate evidence. Missing evidence is shown as “not measured.” It is not presented as an objective safety guarantee, certification, or cross-customer benchmark.
- **Identity auditor:** Analyze an imported manifest of agent identities, credentials, intended tools, resources, and trust edges. Report cross-tenant paths, wildcard synthetic scopes, tool overreach, untrusted retrieval paths, unrestricted memory, and delegation authority amplification.
- **Repair Search:** Exhaustively replay successful paths against the 256 candidate control policies in the twin. Recommend the lowest-cost policy only when it blocks the known attack corpus and preserves all five legitimate sandbox tasks.
- **Release Gate:** Run permanent attack cases and legitimate utility checks against an exact twin fingerprint. Enforce thresholds for critical exploits, exploit rate, utility, corpus size, and p95 latency. CI can call the same endpoint with an operator token.
- **Evidence Vault:** Hash-linked append-only audit entries connect experiments, runtime decisions, effects, verifier findings, repairs, and release gates. Chain verification makes tampering visible. Exports are suitable for external signing and incident replay.
- **Universal gateway foundation:** The runtime API uses a normalized operation contract, so adapters for MCP, OpenAI-compatible function calling, LangGraph, or other frameworks can map into the same isolated tool gateway. No unimplemented connector is described as supported.

## Sandbox versus real models

The default digital twin is a **policy-based simulation**, not a language model. On first run, it creates a real four-specialist evidence experiment with synthetic records, two tenants, persistent per-session memory, delegation, payroll, exports, and refunds. These numbers demonstrate the platform and are not real-model benchmark results.

All tools operate on synthetic data in fresh per-attempt memory. HTTP tools capture requests in a local in-memory sink; they never perform network requests. Refunds never contact a payment provider. The sandbox exposes no filesystem, shell, or host credentials to target agents.

To test an actual model, configure an OpenAI-compatible endpoint on the **server** before starting it:

```sh
AGENTBREAK_MODEL_BASE_URL=https://api.openai.com/v1 \
AGENTBREAK_MODEL_NAME=your-model-name \
AGENTBREAK_MODEL_API_KEY=your-api-key \
npm run dev
```

Optional: `AGENTBREAK_MODEL_LABEL` changes the target's display name. These variables must be present in the shell environment; `.env` is not loaded automatically. API keys are never sent to the browser or stored in traces. A **Connected Model** target appears after restart. It must support `/chat/completions` and function calling. Each attack is limited to five model turns, twenty tool calls, and a thirty-second timeout per request. Model calls can incur provider charges.

Retrieved or memory-borne attacks are delivered as explicitly labeled untrusted context. Source provenance is evaluated at the gateway, not inferred from a model’s prose. The independent verifier reads committed sandbox effects and immutable business contracts; it does not trust shield labels or model self-assessments. The regression suite verifies sandbox tool contracts, **not** real-model end-to-end task completion.

Import a digital-twin manifest with `POST /api/platform/twins`. The manifest declares synthetic agents, tools, resources, identities, trust edges, approved origins, and policy. All imported data is validated with strict schemas; resource contents are synthetic and capped. The project intentionally does not claim live cloud IAM discovery without provider credentials and connectors.

Platform experiments accept `mode: "model"` only when the server has `AGENTBREAK_MODEL_BASE_URL` and `AGENTBREAK_MODEL_NAME`. In that mode the configured OpenAI-compatible model receives the scenario and normalized digital-twin tool schemas, while every requested call still passes through Runtime Shield and the independent effect oracle. The model is limited to five turns, twenty tool calls, and a 30-second request timeout. If the model endpoint is unavailable, the run is **inconclusive**, never counted as a prevented attack.

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
| GET | `/platform` | Platform state, TrustScores, identity findings, and audit integrity |
| POST | `/platform/twins` | Import a validated digital-twin manifest |
| POST | `/platform/twins/:id/version` | Create a versioned twin policy/configuration |
| GET | `/platform/twins/:id/audit` | View identity and permission findings |
| POST | `/platform/sessions` | Start an isolated runtime session |
| POST | `/platform/sessions/:id/events` | Execute one operation through Runtime Shield |
| POST | `/platform/sessions/:id/approvals/:approvalId` | Approve or deny a bound sensitive operation |
| POST | `/platform/experiments` | Start adaptive specialist discovery |
| POST | `/platform/experiments/:id/step` | Advance one supervisor-selected probe |
| POST | `/platform/runs/:id/replay` | Reproduce an exact twin scenario |
| POST | `/platform/runs/:id/causal` | Run one-operation-at-a-time causal replay |
| POST | `/platform/repairs/search` | Search candidate control policies |
| POST | `/platform/repairs/:id/apply` | Version the twin with a repair policy |
| POST | `/platform/gates` | Run a CI-style release gate |
| GET | `/platform/report` | Download the platform evidence package |
| GET | `/platform/audit/verify` | Verify the tamper-evident hash chain |

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
src/PlatformPages.tsx AttackGraph, Runtime Shield, swarm, TrustScore, identity, gate, evidence UI
src/styles.css       Responsive design system
shared/types.ts      Shared API domain types
shared/platform.ts   Digital twins, operations, effects, evidence, gates, and scores
server/engine.ts     Adaptive selection, isolated tools, simulation/model runners
server/platform/     Twin schemas, runtime gateway, effect oracle, swarm, repair search, gates, audit chain
server/store.ts      Seed campaigns and atomic JSON persistence
server/index.ts      Express API and production static server
server/engine.test.ts Security invariants and functional regressions
server/platform.test.ts Platform runtime, causal, repair, gate, and audit invariants
```

The application is a local development workbench with a single workspace. Operator authentication is optional and enabled with `AGENTBREAK_OPERATOR_TOKEN`; gateway authentication is surfaced for integration work with `AGENTBREAK_GATEWAY_TOKEN`. Multi-tenant isolation inside the digital twin is enforced and tested, but production deployment still needs a real identity provider, durable database, distributed scheduling, provider-specific connectors, and external signing.
