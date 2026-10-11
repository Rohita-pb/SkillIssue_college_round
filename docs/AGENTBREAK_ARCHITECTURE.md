# AgentBreak Architecture & System Design Document

**Product:** AgentBreak Autonomous AI Red Team  
**Branch:** `feature/dashboard-redesign`  
**Target Audience:** Software Architects, Hackathon Judges, Computer Engineering Students  

---

## 1. High-Level Architectural Overview

AgentBreak is organized as a decoupled, modern TypeScript full-stack system comprising:
1. **Frontend Presentation Shell (Vite + React 19 + Vanilla CSS Redesign):** Interactive workbench with Dark/Lime theme, real-time campaign streaming, forensic telemetry timelines, topology graphs, and policy editors.
2. **Backend API & Orchestration Engine (Node.js 22 + Express):** Hosts REST endpoints under `/api`, manages persistence, schedules asynchronous test campaigns, executes UCB1 adaptive discovery, and coordinates adversarial swarms.
3. **Execution Sandbox & Boundary Enforcers:** Pure in-memory synthetic fixtures simulating agent tools (`read_document`, `read_private_record`, `http_request`, `issue_refund`, `write_memory`), ensuring zero real-world data leaks or host risks.
4. **Independent Effect Oracle:** Separate verification engine that inspects committed execution state (not LLM prose) against business contracts to determine truth.
5. **Optional OpenAI-Compatible Model Gateway:** Pluggable adapter to connect live LLMs (GPT-4o, Claude 3.5, Gemini 2.5) via standard function calling.

```mermaid
graph TB
    subgraph Browser ["Frontend Browser (localhost:5173)"]
        UI[React 19 Shell & App.tsx]
        DashComp[DashboardComponents.tsx]
        RedesignCSS[redesign.css & styles.css]
        UI --> DashComp
        UI --> RedesignCSS
    end

    subgraph Server ["Express API Server (localhost:3001)"]
        Routes[API Router - server/index.ts]
        Store[Atomic Store - server/store.ts]
        Routes --> Store
    end

    subgraph CoreEngine ["Core Engine (server/engine.ts)"]
        UCB[UCB1 Attack Selector]
        Mutation[Payload Mutator 4-Families]
        Sim[In-Memory Sandbox Runner]
        ModelAdapter[OpenAI Model Adapter]
        Validation[Defense Validation Runner]
        UCB --> Mutation
        Mutation --> Sim
        Mutation --> ModelAdapter
    end

    subgraph PlatformServices ["Platform & Experiment Services (server/platform/)"]
        Twins[Digital Twin Manager]
        Swarm[Adversarial Swarm Supervisor]
        Shield[Runtime Shield Gateway]
        Oracle[Independent Effect Oracle]
        Repair[256-State Repair Search]
        Audit[Hash-Linked Audit Ledger]
    end

    Browser -- "HTTP /api (Vite Proxy)" --> Routes
    Routes --> CoreEngine
    Routes --> PlatformServices
    Sim --> Oracle
    ModelAdapter --> Shield
    Shield --> Sim
    PlatformServices --> Store
```

---

## 2. End-to-End Security Test Lifecycle

The security testing lifecycle in AgentBreak operates in 5 deterministic phases:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / User
    participant UI as RunTestConsole (UI)
    participant API as Express API (/api/campaigns)
    participant Engine as Engine (selectAttack)
    participant Sandbox as In-Memory Sandbox
    participant Oracle as Invariant Oracle
    participant Store as State Store (.agentbreak/)

    Dev->>UI: Selects Agent, Scenarios & Intensity
    UI->>API: POST /api/campaigns { targetId, surfaces, budget, seed }
    API->>Store: Create Campaign (status: running)
    API-->>UI: Return Campaign ID
    
    loop For each budget iteration
        API->>Engine: selectAttack(campaign, history)
        Note over Engine: Computes UCB1 score across 5 surfaces<br/>Mutates payload across 4 strategy families
        API->>Sandbox: executeTool / runSimulation
        Sandbox->>Sandbox: Execute in isolated per-attempt memory
        Sandbox->>Oracle: Inspect committed side-effects
        Oracle-->>API: Outcome (success / blocked / error)
        API->>Store: Append Trace to Campaign
    end

    API->>Store: Update Campaign (status: completed)
    UI->>API: GET /api/state (polling)
    API-->>UI: Return updated traces & findings ledger
    UI->>Dev: Renders Findings & Forensic Telemetry
```

---

## 3. Attack Detection & Runtime Shield Flow

When an operation is submitted to Runtime Shield, it passes through 8 contextual inspection gates before reaching any tool:

```mermaid
flowchart TD
    Op[Agent Requests Tool Call] --> Step1{Authenticated Identity Matches?}
    Step1 -- No --> Block1[BLOCK: Identity Impersonation]
    Step1 -- Yes --> Step2{Tool In Registered Contract?}
    Step2 -- No --> Block2[BLOCK: Role Tool Boundary]
    Step2 -- Yes --> Step3{Zod Arguments Schema Valid?}
    Step3 -- No --> Block3[BLOCK: Invalid Argument Schema]
    Step3 -- Yes --> Step4{Tenant Isolation Respected?}
    Step4 -- No --> Block4[BLOCK: Cross-Tenant Breach]
    Step4 -- Yes --> Step5{Protected Memory Key?}
    Step5 -- Yes --> Block5[BLOCK: Policy Memory Integrity]
    Step5 -- No --> Step6{Egress Origin on Exact Allowlist?}
    Step6 -- No --> Block6[BLOCK: Unapproved Egress Destination]
    Step6 -- Yes --> Step7{Requires Human Approval?}
    Step7 -- Yes --> Pending[SUSPEND: Awaiting Session Approval]
    Step7 -- No --> Allow[ALLOW: Execute Tool in Sandbox]
```

---

## 4. Effect Verification & Result Classification

AgentBreak strictly separates the execution output from the verification classification:

```mermaid
graph LR
    ToolExec[Tool Execution In Sandbox] --> Effects[Record In-Memory Effects]
    Effects --> Oracle[Independent Effect Oracle]
    Oracle --> InvariantCheck{Crosses Business Invariant?}
    
    InvariantCheck -- "Record exfiltrated / Refund > $50 / Memory poisoned" --> Success[Outcome: EXPLOITED / SUCCESS]
    InvariantCheck -- "Guard intercepted before execution" --> Blocked[Outcome: BLOCKED / PREVENTED]
    InvariantCheck -- "Model timeout / Malformed JSON / Network fail" --> Inconclusive[Outcome: INCONCLUSIVE / ERROR]
```

---

## 5. Persistence & State Management

- **Storage Engine:** Local atomic file persistence via [`server/store.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/store.ts).
- **Default Directory:** `.agentbreak/store.json` (configurable via `AGENTBREAK_DATA_DIR`).
- **Atomic Writes:** Serialized JSON is written to a temporary file (`.store.json.tmp`) and atomically renamed using `fs.renameSync()`. This guarantees zero database corruption even if the server is abruptly terminated mid-write.
- **Boot Recovery:** On startup, if a campaign was left in `running` status due to a server restart, it is automatically transitioned to `stopped` with all finished traces intact.

---

## 6. Simulation vs. Real-LLM Execution Modes

| Dimension | Policy-Based Simulation Mode (Default) | Real-LLM Connected Mode (Optional) |
|:---|:---|:---|
| **Underlying Engine** | Deterministic rule-based state machine in [`server/engine.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L147) | Live LLM via HTTP `/chat/completions` ([`server/engine.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L174)) |
| **Activation** | Default out-of-the-box (`npm run dev`) | Requires `AGENTBREAK_MODEL_BASE_URL` & `AGENTBREAK_MODEL_NAME` |
| **Cost & Latency** | $0.00 cost, $<5\text{ ms}$ per probe execution | Provider API charges, 500ms – 2000ms latency per turn |
| **Reproducibility** | 100% mathematically deterministic across identical seeds | Probabilistic (temperature 0 minimizes variance) |
| **Tool Execution** | In-memory sandbox fixture | In-memory sandbox fixture via standardized tool definitions |
| **Safety** | Zero external network calls; isolated in memory | Model calls API; tool side-effects remain in isolated memory |
