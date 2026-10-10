---
last_mapped_commit: c63c991c329fc4c767697f6960873065ca231207
last_mapped_at: 2026-10-10
---
# Architecture

**Analysis Date:** 2026-10-10

## High-Level Pattern

The application is structured as a monolithic local web application with a separate frontend (React/Vite) and backend (Express/Node.js). It acts as a single-user security testing workbench for AI agents.

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Frontend UI (`src/`)** | Presents security dashboard, attack traces, and manages campaigns. | Backend API via `fetch` to `/api/*`. |
| **Backend API (`server/index.ts`)** | Handles REST requests for campaigns, traces, state, and validations. | Attack Engine, Data Store. |
| **Attack Engine (`server/engine.ts`)** | Orchestrates adaptive attack discovery (UCB), simulates targets, validates defenses. | External Models (if configured), Data Store. |
| **Data Store (`server/store.ts`)** | Manages atomic persistence of campaigns, traces, and validations to a JSON file. | Disk (`.agentbreak/store.json`). |
| **Shared Types (`shared/types.ts`)**| Defines domain models used by both frontend and backend. | Frontend, Backend. |

## Data Flow

1. **User Action:** The user initiates a campaign from the React dashboard (e.g., `POST /api/campaigns`).
2. **API Reception:** The Express server (`server/index.ts`) receives the request, validates the payload, and saves the initial campaign state to the store (`server/store.ts`).
3. **Execution Loop:** An asynchronous loop (`executeCampaign`) repeatedly selects an attack (`selectAttack`) using UCB and runs it against the target (`runAttack`).
4. **Target Simulation:** `runAttack` (`server/engine.ts`) evaluates the attack against the target's defenses (e.g., `sourceIsolation`, `toolPermissions`). If a live model is configured, it proxies the request; otherwise, it uses policy-based simulation.
5. **Result Recording:** The trace (inputs, decisions, outcomes) is saved to the store and broadcast/polled back to the frontend dashboard.

<!-- refreshed: 2026-10-10 -->
