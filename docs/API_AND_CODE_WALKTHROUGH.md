# Complete API Reference & Codebase Reading Roadmap

**Product:** AgentBreak Autonomous AI Red Team  
**Branch:** `feature/dashboard-redesign`  
**Target Audience:** Software Engineers, API Reviewers, Technical Evaluators  

---

## 1. Source Code Reading Roadmap

If you have 60 minutes to master the entire AgentBreak codebase before presenting to judges, read the files in this precise order:

```
[ Step 1: Types & Data Contracts ]
    └── shared/types.ts           (Surfaces, Attacks, Traces, Defenses, Targets)
    └── shared/platform.ts        (Digital Twin, Runtime Events, Policies, Audit)
         │
[ Step 2: The Core Execution Engine ]
    └── server/engine.ts          (UCB1 algorithm, Sandbox Tool Execution, Validation)
    └── server/store.ts           (Atomic JSON Persistence)
         │
[ Step 3: API Routing & Handlers ]
    └── server/index.ts           (Express Routes, Async Loops, Error Handling)
         │
[ Step 4: Platform Security Services ]
    └── server/platform/runtime.ts      (Identity-aware Runtime Shield Gateway & Oracle)
    └── server/platform/analysis.ts     (256-State Repair Search, Causal Analysis, TrustScore)
    └── server/platform/experiments.ts  (Adversarial Swarm & Multi-Turn Model Execution)
    └── server/platform/audit.ts        (Hash-Linked Immutable Audit Ledger)
         │
[ Step 5: Frontend Dashboard UI ]
    └── src/App.tsx                     (Main Shell, Sidebar Navigation, Breadcrumbs, Routing)
    └── src/DashboardComponents.tsx     (OverviewView, RunTestConsole, ResultsEvidenceView, FixRetestView, AdvancedToolsView)
    └── src/redesign.css                (Modern Dark/Lime Styling System)
```

---

## 2. API Route Inventory

All endpoints are hosted by Express on port 3001 and accessed via Vite's proxy at `/api`. Error responses follow the uniform format: `{ "error": "Descriptive message" }`.

### 2.1 Core Workbench Endpoints

#### `GET /api/health`
- **Purpose:** Health check and model connectivity detection.
- **Handler:** Inline in [`server/index.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/index.ts#L21).
- **Response Format:**
  ```json
  {
    "status": "ok",
    "modelAvailable": false,
    "model": "simulation"
  }
  ```

#### `GET /api/state`
- **Purpose:** Returns the current state of targets, active/completed campaigns, recorded traces, and defense validations.
- **Handler:** Returns `store.data` from [`server/store.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/store.ts).
- **Frontend Usage:** Polled every 1800ms by [`src/App.tsx`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/App.tsx#L82) to keep the dashboard live.

#### `POST /api/campaigns`
- **Purpose:** Starts an autonomous adaptive attack campaign.
- **Request Body:**
  ```json
  {
    "name": "CustomerOps Assessment (standard)",
    "targetId": "atlas",
    "surfaces": ["tools", "memory", "retrieval", "instructions"],
    "budget": 30,
    "seed": 7331
  }
  ```
- **Handler:** Validates target, creates campaign in `store`, and kicks off an asynchronous loop that executes `selectAttack()`, `runAttack()`, and appends traces until the budget is exhausted.
- **Response:** Newly created `Campaign` object with status `"running"`.

#### `POST /api/campaigns/:id/stop`
- **Purpose:** Immediately stops a running campaign, preserving all traces generated so far.
- **Handler:** Sets `campaign.status = 'stopped'`.

#### `POST /api/traces/:id/replay`
- **Purpose:** One-click deterministic reproduction of a historical exploit.
- **Handler:** Loads the historical trace, retrieves its immutable `targetSnapshot`, and re-runs `runAttack()` with the identical attack payload.
- **Response:** Newly generated replay `Trace` object linking back to `replayOf: id`.

#### `GET /api/traces/:id/export`
- **Purpose:** Downloads a portable JSON artifact containing the target snapshot, attack payload, steps, and SHA-256 fingerprint.

#### `POST /api/traces/import`
- **Purpose:** Uploads and executes an exported trace JSON to verify if the vulnerability exists in the current environment.

#### `POST /api/validations`
- **Purpose:** Tests candidate defense mitigations against historical exploits and runs the legitimate utility suite.
- **Request Body:**
  ```json
  {
    "targetId": "atlas",
    "defenses": {
      "sourceIsolation": true,
      "toolPermissions": true,
      "memoryGuard": false,
      "outboundFilter": true,
      "lockdown": false
    }
  }
  ```
- **Handler:** Calls [`validateDefenses()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L234).
- **Response:**
  ```json
  {
    "id": "val_9f21",
    "tested": 3,
    "blocked": 3,
    "remaining": 0,
    "utilityPassed": 5,
    "utilityTotal": 5
  }
  ```

#### `PATCH /api/targets/:id/defenses`
- **Purpose:** Persists confirmed defense mitigations to the target agent for future campaigns.

#### `GET /api/report`
- **Purpose:** Generates and downloads a comprehensive JSON report containing all targets, campaigns, traces, and posture statistics.

---

### 2.2 Advanced Platform Endpoints

#### `GET /api/platform`
- **Purpose:** Returns the complete Digital Twin platform view: twins, experiments, runs, corpus, repair searches, release gates, and audit chain integrity.

#### `POST /api/platform/experiments`
- **Purpose:** Starts a 4-specialist adversarial swarm experiment (`Viper`, `Specter`, `Echo`, `Weaver`).

#### `POST /api/platform/experiments/:id/step`
- **Purpose:** Advances the swarm by one probe. The supervisor chooses the specialist based on UCB evidence feedback, mutates the scenario, and commits verified exploits into the permanent regression corpus.

#### `POST /api/platform/repairs`
- **Purpose:** Triggers the exhaustive $2^8 = 256$ candidate policy search to identify the lowest-cost viable guardrail combination.

#### `POST /api/platform/gates`
- **Purpose:** Executes the Release Gate check, evaluating critical exploits, utility rates, and P95 latency against deployment thresholds.
