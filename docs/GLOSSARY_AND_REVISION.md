# Quick Revision Notes, Cheat Sheet & Technical Glossary

**Product:** AgentBreak Autonomous AI Red Team  
**Branch:** `feature/dashboard-redesign`  

---

## 1. Ten Facts You MUST Remember Before Presenting

1. **The Core Philosophy:** AgentBreak does not ask an agent if it was hacked; it checks whether an unauthorized business effect actually happened in the sandbox.
2. **Deterministic Sandboxing:** All tools (`issue_refund`, `http_request`, `write_memory`) are 100% in-memory synthetic sinks. No real dollars move; no external network packets leave the machine.
3. **UCB1 Algorithm:** We use Upper Confidence Bound multi-armed bandit algorithm to explore 5 attack surfaces and exploit vulnerabilities with mathematical regret bounds.
4. **4 Strategy Families:** Unsuccessful probes mutate across Direct Instruction, Authority Impersonation, Context Fragmentation, and Approval Laundering.
5. **Independent Effect Oracle:** Outcome determination is completely decoupled from the agent's prose. An exploit is flagged only when committed sandbox state violates an immutable invariant rule.
6. **256 Policy Search:** Repair Search exhaustively tests the power set of 8 security controls ($2^8 = 256$ subsets) in ~200ms to find the lowest-cost policy that blocks all attacks and passes all 5 utility checks.
7. **The Legitimate Utility Suite:** 5 baseline customer actions (public FAQ, account read, $25 refund, language preference, helpdesk ticket) prove that defenses don't break normal business tasks.
8. **Evidence Vault:** Every audit event is chained with SHA-256 hashes (`previousHash -> hash`) like a blockchain block, making tampering detectable.
9. **Simulation vs. Real Model:** The default out-of-the-box engine is a deterministic, policy-based simulator. A real OpenAI-compatible LLM can be attached via 2 environment variables.
10. **Test Coverage:** All 22 automated unit tests pass in 1.14 seconds, and TypeScript builds with 0 errors.

---

## 2. Ten Mistakes & Exaggerated Claims to AVOID

1. ❌ **DON'T CLAIM:** *"We trained our own AI model to hack agents."*  
   ✔ **CORRECT:** *"We use an algorithmic bandit (UCB1) and bounded mutation templates to red-team agent tool boundaries."*
2. ❌ **DON'T CLAIM:** *"We execute live attacks on real banks or cloud servers."*  
   ✔ **CORRECT:** *"We execute attacks inside isolated in-memory sandbox fixtures with synthetic records."*
3. ❌ **DON'T CLAIM:** *"Our security score is an objective mathematical guarantee of safety."*  
   ✔ **CORRECT:** *"TrustScore is an empirical measurement based on recorded evidence for this specific target configuration."*
4. ❌ **DON'T CLAIM:** *"Strict lockdown is our best defense."*  
   ✔ **CORRECT:** *"Strict lockdown blocks attacks but fails 100% of legitimate utility checks, making it impractical for production."*
5. ❌ **DON'T CLAIM:** *"We inspect the LLM's private chain-of-thought tokens."*  
   ✔ **CORRECT:** *"We inspect visible tool call arguments and committed sandbox effects."*
6. ❌ **DON'T CLAIM:** *"If a model times out, our defense prevented the attack."*  
   ✔ **CORRECT:** *"Timeouts and API errors are marked inconclusive; we never falsely claim prevention."*
7. ❌ **DON'T CLAIM:** *"We use heavyweight Docker containers for every probe."*  
   ✔ **CORRECT:** *"We use lightweight in-memory execution sandboxes that execute in sub-millisecond time."*
8. ❌ **DON'T CLAIM:** *"We use MongoDB or PostgreSQL in the background."*  
   ✔ **CORRECT:** *"We use atomic JSON persistence with OS-level atomic file renames in `.agentbreak/store.json`."*
9. ❌ **DON'T CLAIM:** *"Our system automatically rewrites the neural network weights."*  
   ✔ **CORRECT:** *"Our system identifies the optimal runtime guardrail policy and boundary filters."*
10. ❌ **DON'T CLAIM:** *"We are just another prompt injection scanner."*  
    ✔ **CORRECT:** *"Prompt injection is only 1 of our 5 surfaces; we specialize in multi-step tool and privilege boundary auditing."*

---

## 3. One-Page Project Cheat Sheet

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AGENTBREAK : THE AUTONOMOUS AI RED TEAM                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ CORE WORKBENCH                                                               │
│ • 5 Attack Surfaces : retrieval, instructions, memory, tools, multi-stage    │
│ • 4 Strategy Mutators: direct, authority, fragmentation, approval            │
│ • 5 Target Defenses : sourceIsolation, toolPermissions, memoryGuard,         │
│                       outboundFilter, lockdown                               │
│ • 5 Utility Checks  : FAQ read, own account, $25 refund, memory, helpdesk    │
├──────────────────────────────────────────────────────────────────────────────┤
│ MATHEMATICAL FORMULAS                                                        │
│ • UCB1 Exploration  : Score = MeanSuccess + sqrt(2 * ln(Total) / SurfaceRuns)│
│ • Posture Score     : 100 - (Exploits / TotalNonError) * 100                 │
│ • TrustScore        : 65% * Prevention + 20% * Utility + 15% * ReleaseGate   │
│ • Repair Space      : 2^8 = 256 subsets of 8 contextual controls             │
│ • Trace Fingerprint : SHA256(TargetSnapshot + AttackInput)[:16]              │
├──────────────────────────────────────────────────────────────────────────────┤
│ KEY FILE PATHS                                                               │
│ • Engine & Sandbox  : server/engine.ts                                       │
│ • Runtime Gateway   : server/platform/runtime.ts                             │
│ • Repair & Analysis : server/platform/analysis.ts                            │
│ • UI Dashboard Shell: src/App.tsx                                            │
│ • UI Components     : src/DashboardComponents.tsx                            │
│ • Styling System    : src/redesign.css                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Feature-to-Code-Path Quick Reference

| Feature | Frontend UI Entry Point | Backend API Route | Core Function |
|:---|:---|:---|:---|
| **Overview Posture** | [`OverviewView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L1153) | `GET /api/state` | `store.data` |
| **Run a Test Console** | [`RunTestConsole`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L37) | `POST /api/campaigns` | [`selectAttack()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L49) |
| **Evidence Ledger** | [`ResultsEvidenceView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L352) | `GET /api/state` | [`createTrace()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L116) |
| **One-Click Replay** | Replay Button in Findings Drawer | `POST /api/traces/:id/replay` | [`runAttack()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L217) |
| **Fix & Retest Lab** | [`FixRetestView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L604) | `POST /api/validations` | [`validateDefenses()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L234) |
| **Payload Fuzzer** | [`AdvancedToolsView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L874) | (Client Fuzzing Engine) | Simulated Gateway |
| **Topology Mapper** | [`AdvancedToolsView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L933) | `GET /api/platform` | SVG Graph Renderer |
| **Policy Editor** | [`AdvancedToolsView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L1012) | `PATCH /api/targets/:id/defenses` | JSON Policy Validator |
| **Compliance Exporter**| [`AdvancedToolsView`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/src/DashboardComponents.tsx#L1112) | Client JSON Generator | OWASP/NIST Mapper |
| **Repair Search** | Repair Search Tab | `POST /api/platform/repairs` | [`searchRepairs()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/platform/analysis.ts#L49) |
| **Evidence Vault** | Evidence Vault Tab | `GET /api/platform` | [`verifyAudit()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/platform/audit.ts#L12) |

---

## 5. Technical Glossary & Key Terms

- **Autonomous Agent:** An LLM system configured with a reasoning loop (like ReAct) that can choose which tools to call, inspect tool outputs, and chain multi-step actions.
- **Tool / Function Calling:** Structured JSON interface allowing an LLM to request actions outside its neural network (e.g., executing a database query or initiating a refund).
- **Blast Radius:** The full set of data, tools, and permissions an attacker can access if a given agent node is compromised.
- **Fail-Closed:** A security system design where any unexpected failure, parse error, or network timeout defaults to blocking the operation rather than allowing it.
- **Invariant:** A business rule that must NEVER be violated under any circumstances (e.g. *"Refunds over $50 require human approval"*).
- **Independent Effect Oracle:** A verification system that checks committed state changes rather than relying on self-reported model text.
- **UCB1 (Upper Confidence Bound 1):** An optimal multi-armed bandit algorithm that balances trying untried options with exploiting known winning options.
- **Zod Schema:** A runtime validation tool that ensures arguments passed to tools conform strictly to defined types.
- **SHA-256 Digest:** A cryptographic hash function that converts arbitrary data into a 256-bit unique string, used for fingerprints and audit chains.
