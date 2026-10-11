# AgentBreak: Hackathon Master Demo Runbook & Feature Catalog

> **5-Minute Winning Presentation & Complete Feature Demonstration Guide**  
> **Platform:** AgentBreak — Autonomous AI Agent Security & Evidence Platform  
> **Core Differentiator:** *"AgentBreak does not ask an agent whether it was compromised. It checks whether an unauthorized business effect actually happened."*

---

## Table of Contents
1. [Executive Summary & The Winning Pitch Narrative](#1-executive-summary--the-winning-pitch-narrative)
2. [5-Minute Pitch Script (Second-by-Second Timecode)](#2-5-minute-pitch-script-second-by-second-timecode)
3. [Master Feature Catalog (Every Feature Exhaustively Documented)](#3-master-feature-catalog)
   - [Pillar 1: Discovery, Onboarding & Visual Hook](#pillar-1-discovery-onboarding--visual-hook)
   - [Pillar 2: Adversarial Red-Teaming & Swarm Intelligence](#pillar-2-adversarial-red-teaming--swarm-intelligence)
   - [Pillar 3: Forensic Telemetry & The Effect Oracle](#pillar-3-forensic-telemetry--the-effect-oracle)
   - [Pillar 4: Defense Lab, Auto-Repair & Regression Safety](#pillar-4-defense-lab-auto-repair--regression-safety)
   - [Pillar 5: Runtime Shield, Fuzzing & Live Intercept](#pillar-5-runtime-shield-fuzzing--live-intercept)
   - [Pillar 6: Enterprise Governance, Compliance & Tamper-Evident Vault](#pillar-6-enterprise-governance-compliance--tamper-evident-vault)
4. [Judge Q&A Defense Matrix (Top 10 Tough Questions & Killer Answers)](#4-judge-qa-defense-matrix)
5. [Pre-Flight Setup & Fail-Safe Demo Checklist](#5-pre-flight-setup--fail-safe-demo-checklist)

---

## 1. Executive Summary & The Winning Pitch Narrative

### The Problem (The 30-Second Blind Spot)
Every enterprise is deploying autonomous AI agents (CustomerOps, FinTech assistants, HR automations, DevOps bots). Unlike simple chatbots that only generate text, **agents have hands**—they execute shell commands, issue refunds, access customer databases, and query long-term memory.  
Current "AI guardrails" (NeMo, Llama Guard, regex prompt filters) suffer from a fatal flaw: **they ask the LLM if it was jailbroken**, or scan text for bad words. If an attacker uses indirect prompt injection inside a PDF, an agent can politely say *"I'm sorry, I cannot help with that"*—while **silently executing an unauthorized $5,000 refund in the background**.

### The Solution: AgentBreak
**AgentBreak is an evidence-first security workbench and digital twin for autonomous AI agents.**  
It models an agent’s tools, identities, memory stores, and business invariants in an isolated sandbox. It unleashes coordinated adversarial swarms, intercepts tool calls in real time, and uses an independent **Effect Oracle** to mathematically verify whether an unauthorized business effect occurred.  
When an exploit is verified, AgentBreak's **Repair Search** exhaustively evaluates 256 candidate control policies to automatically deploy the lowest-cost defense that blocks the attack while guaranteeing that **100% of legitimate business tasks still work**.

---

## 2. 5-Minute Pitch Script (Second-by-Second Timecode)

| Time | Section | Screen / URL | Action to Perform | Spoken Pitch / Script |
|---|---|---|---|---|
| **0:00 - 0:40** | **The Hook & Problem** | `/landing` | Open the landing page. Point to the **3D Conceptual Agent Sphere** and the **Cinematic Veo Intro**. | *"Judges, autonomous AI agents are moving billions of dollars and executing mission-critical code. But today's AI safety tools make a fatal mistake: they ask the LLM if it was hacked. If an agent hallucinates or gets manipulated via indirect prompt injection, it can politely apologize to the user while silently transferring funds or exfiltrating private data. We built AgentBreak on one core thesis: Don't ask the agent if it was compromised. Check if an unauthorized business effect actually happened."* |
| **0:40 - 1:30** | **Live Attack & The Effect Oracle** | `/landing` or `/` -> **Run a Test** | Click **"Security Assessment"** modal on landing page (or click **"Quick Test"** in workbench). Select target `Research Copilot`, check all 5 surfaces, click **"Launch Assessment"**. | *"Watch this in real-time. AgentBreak spins up an isolated digital twin. Our adaptive discovery engine probes 5 attack surfaces: prompt injection, indirect retrieval poisoning, tool argument tampering, memory backdoors, and chained multi-stage escalation. Notice the live progress: 5 attempts completed. Look at this red badge: 'Policy violation observed'. Unlike traditional scanners that inspect words, our independent Effect Oracle observed that an unauthorized tool call committed an illegal state change in the sandbox."* |
| **1:30 - 2:20** | **Forensics & AttackGraph** | `/` -> **Results & Evidence** -> **AttackGraph** | Click **"Results & Evidence"**. Click the top Critical trace. Expand the 6-stage telemetry. Then click **"AttackGraph"** in Advanced Tools. | *"Let’s inspect the forensics. AgentBreak provides complete multi-stage provenance: the raw payload, injected context, model policy decision, tool parameters, and the Oracle verdict. We don't just see the exploit—we map it in our AttackGraph DAG. See this causal graph: from untrusted PDF ingestion -> identity scope escalation -> payroll tool invocation -> unauthorized data egress. With one click on 'Causal Replay', AgentBreak ablates each stage to mathematically prove which step was the critical point of failure."* |
| **2:20 - 3:15** | **Fix & Retest: 256-Policy Auto-Repair** | `/` -> **Fix & Retest** -> **Defense Lab** | Navigate to **"Fix & Retest"**. Toggle **Source Isolation** & **Tool Permissions**. Click **"Validate Defenses"**. Show **Regression Tests** passing 5/5 utility checks. | *"Now, how do you fix it without breaking the agent? If you make your guardrails too aggressive, the agent becomes useless. In our Defense Lab, we test modular controls: Source Isolation, Least-Privilege Tool Scoping, and Memory Guards. But even better: our Repair Search algorithm exhaustively evaluates all 256 candidate policies in seconds! It calculates the lowest-cost policy that eliminates 100% of the attack corpus while preserving all 5 legitimate business utility benchmarks—from public FAQ retrieval to $25 customer refunds."* |
| **3:15 - 4:05** | **Live Runtime Shield & Payload Fuzzer** | `/` -> **Advanced Tools** (`runtime` & `fuzzer`) | Switch to **Advanced Tools** -> **Payload Fuzzer**. Select `shell_execute`. Click **"Fire Fuzz Payload"**. Show **Runtime Shield** intercept. | *"For production deployments, AgentBreak provides the Runtime Shield—a fail-closed, identity-aware in-memory gateway. Let's stress-test it in our Payload Fuzzer. We inject a jailbreak override trying to steal environment secrets via `shell_execute`. Instantly, Runtime Shield intercepts the call at the perimeter, validates tenant binding, detects the synthetic scope violation, and blocks execution before the tool is ever invoked."* |
| **4:05 - 5:00** | **Evidence Vault, CI Release Gate & Conclusion** | `/` -> **Evidence Vault** -> **Release Gate** | Open **Evidence Vault**. Click **"Verify Audit Chain"** (shows green **CHAIN INTACT**). Quick glance at **Release Gate** & **Compliance Exporter**. | *"Finally, how do enterprise teams trust this in production? We built the Tamper-Evident Evidence Vault. Every experiment, tool decision, verifier finding, and release gate is recorded in an append-only SHA-256 hash chain. Click 'Verify Audit Chain'—the cryptographic integrity check proves zero tampering. With our automated Release Gate, DevOps teams can enforce zero critical exploits in their CI/CD pipelines before an agent ships. AgentBreak bridges the gap between probabilistic AI and deterministic enterprise security. Thank you!"* |

---

## 3. Master Feature Catalog

### PILLAR 1: Discovery, Onboarding & Visual Hook

#### 1. Cinematic Video Intro & 3D Boundaries Sphere
- **Location**: `/landing`
- **What it does**: High-production visual introduction featuring the rotating SVG conceptual agent boundary mesh and a cinematic intro video (`agentbreak-veo-intro.mp4`) with synchronized subtitle captions (*"when they go wrong? Validate the defenses"*).
- **Pitch Value**: Delivers an immediate "wow" factor within the first 5 seconds. Establishes that the product is a sophisticated security platform, not a simple hackathon script.
- **How to demo**: Open `/landing`. Allow the intro animation to play, or click anywhere to land on the interactive showcase.

#### 2. Interactive Pre-Built Scenario Selector
- **Location**: `/landing`
- **What it does**: 3 interactive attack scenario cards:
  1. *Indirect Tool Poisoning* (Retrieval vector)
  2. *Memory Store Poisoning* (Context persistence vector)
  3. *Secondary API Privilege Escalation* (Multi-stage chained vector)
- **Pitch Value**: Immediately illustrates the real attack surfaces unique to autonomous agents that traditional WAFs miss.
- **How to demo**: Click between the 3 scenario pills to show dynamic context and architecture diagrams.

#### 3. One-Click Security Assessment Modal
- **Location**: `/landing` (Click *"Security Assessment"* or *"Launch Custom Test"*)
- **What it does**: Executable quick-launch assessment dialog with target radio selector (Research Copilot, Atlas Support Agent, Finance Assistant), attack surface toggles, attempt budget counter, and a real-time progress bar.
- **Pitch Value**: Proves live execution capability directly from the public landing page without complex configuration.
- **How to demo**: Select `Research Copilot`, choose `Memory poisoning`, set attempts to `5`, click *"Launch Assessment"*. Watch progress reach `5 / 5` with live policy violation indicators.

#### 4. Guided Demo Tour Dialog (4-Step Onboarding)
- **Location**: `/` -> Click *"Watch a quick demo"* button in the hero overview card.
- **What it does**: Interactive modal guiding first-time users through the core workflow: (1) Run tests -> (2) Inspect Evidence -> (3) Defense Lab -> (4) CI Release Gate.
- **Pitch Value**: Demonstrates extreme polish and enterprise usability for non-technical stakeholders.

---

### PILLAR 2: Adversarial Red-Teaming & Swarm Intelligence

#### 5. Multi-Surface Attack Engine
- **Location**: `/` -> **Run a Test** (`campaigns`)
- **What it does**: Executes automated red-teaming across 5 distinct threat surfaces:
  - **Retrieval**: Hidden instructions in RAG documents and search queries.
  - **Tools**: Parameter tampering, unauthorized tool selection, schema manipulation.
  - **Memory**: Injecting backdoor commands into persistent per-session memory.
  - **Instructions**: System prompt inversion, jailbreaks, persona hijacking.
  - **Multi-Stage**: Complex multi-hop attacks chaining retrieval, memory, and secondary APIs.
- **Pitch Value**: Complete coverage of modern LLM security threat models.
- **How to demo**: Show the surface selector badges with distinct color-coded indicators.

#### 6. Upper Confidence Bound (UCB) Adaptive Discovery
- **Location**: Campaign execution backend & live telemetry.
- **What it does**: Algorithmic mutation engine. Uses Upper Confidence Bound (multi-armed bandit) selection to prioritize attack surfaces that yield vulnerabilities, mutating payloads from 4 strategy families (direct override, encoded context, authority spoofing, delimiter collision).
- **Pitch Value**: Bounded, deterministic adaptive search—avoids uncontrollable LLM hallucinations while finding edge-case bypasses.

#### 7. Adversarial Swarm (4 Autonomous Specialists)
- **Location**: `/` -> **Advanced Tools** -> **Adversarial Swarm** (`swarm`)
- **What it does**: Coordinates four specialized attack agents led by an evidence-feedback supervisor:
  - **Viper**: Indirect prompt injection & retrieval poisoner.
  - **Specter**: Identity impersonator & synthetic scope privilege escalator.
  - **Echo**: Memory persistence specialist creating long-term context backdoors.
  - **Weaver**: Multi-stage tool chain orchestrator.
- **Pitch Value**: Demonstrates state-of-the-art multi-agent offensive security.
- **How to demo**: Click *"Adversarial swarm"* in the Advanced Tools menu. Show the 4 specialist avatars, their win rates, and click *"Step probe"* to advance an attack step.

#### 8. Live Interactive Payload Fuzzer
- **Location**: `/` -> **Advanced Tools** -> **Payload Fuzzer** (`fuzzer`)
- **What it does**: Real-time interactive playground to test arbitrary attack payloads against specific agent tools (e.g., `shell_execute`, `sql_query`, `http_post`).
- **Pitch Value**: Highly engaging live demo element—judges can type their own prompt injection strings!
- **How to demo**: Select `shell_execute`. Click *"Fire Fuzz Payload"*. Watch the live response show `[INTERCEPTED] Runtime Perimeter Defense triggered: Policy violation blocked`.

---

### PILLAR 3: Forensic Telemetry & The Effect Oracle

#### 9. The Effect Oracle (Core Differentiator)
- **Location**: Visible in every trace under **Results & Evidence** (`traces`).
- **What it does**: Independent verifier that inspects the *committed state* of the sandbox rather than the agent’s generated prose. Detects whether an unauthorized tool effect occurred (e.g., unauthorized funds transfer, data exfiltration, memory overwrite, credential leak).
- **Pitch Value**: **The #1 winning argument of your presentation.** Completely reframes AI safety from subjective text parsing to deterministic invariant verification.
- **How to demo**: Open a trace where the agent's response was polite, but the Oracle badge says `Exploited: Unauthorized tool call issue_refund with amount $500 exceeding limit $50`.

#### 10. 6-Stage Forensic Trace Inspector
- **Location**: `/` -> **Results & Evidence** (`traces`) -> Click any trace.
- **What it does**: Full end-to-end audit trail broken into 6 clear stages:
  1. Input Payload
  2. Retrieved / Injected Context
  3. Visible Agent Response / Policy Decision
  4. Tool Invocations & Arguments
  5. Guardrail / Perimeter Evaluation
  6. Independent Sandbox Effect Verdict
- **Pitch Value**: Total transparency and explainability for security auditors.

#### 11. One-Click Deterministic Trace Replay
- **Location**: Trace inspector modal -> *"Replay exact path"* button (`POST /api/traces/:id/replay`).
- **What it does**: Re-executes the exact payload against the exact target snapshot deterministically.
- **Pitch Value**: Eliminates the "it worked on my machine" problem in AI security; turns stochastic LLM exploits into reproducible bug tickets.

#### 12. Portable Forensic Trace Export & Import
- **Location**: Trace inspector -> *"Download exact trace JSON"* (`GET /api/traces/:id/export`) and *"Import Trace"* button (`POST /api/traces/import`).
- **What it does**: Exports standalone JSON forensic artifacts that can be shared across teams, imported into other AgentBreak instances, or attached to GitHub issues.

#### 13. AttackGraph (Causal DAG Visualization)
- **Location**: `/` -> **Advanced Tools** -> **AttackGraph** (`attack-graph`)
- **What it does**: Renders an interactive visual DAG connecting untrusted data sources -> compromised agent identities -> tool invocations -> affected business assets.
- **Pitch Value**: Transforms complex multi-stage attacks into an intuitive visual graph that any judge can understand in 5 seconds.
- **How to demo**: Open AttackGraph. Point out the nodes leading from `untrusted_input` to `payroll_db_sink`. Click *"Causal Replay"* to demonstrate stage ablation.

---

### PILLAR 4: Defense Lab, Auto-Repair & Regression Safety

#### 14. Defense Lab (5 Modular Controls)
- **Location**: `/` -> **Fix & Retest** (`defenses`)
- **What it does**: Provides fine-grained toggles for 5 containment defenses:
  - **Source Isolation**: Quarantines retrieved data so instructions cannot jump execution contexts.
  - **Tool Permissions**: Enforces strict parameter schemas and least-privilege scoping.
  - **Memory Guard**: Protects sensitive long-term memory namespaces from unauthorized writes.
  - **Outbound Filter**: Blocks exfiltration to unapproved external domains and IPs.
  - **Strict Lockdown**: Deliberately restrictive emergency containment posture.
- **Pitch Value**: Demonstrates actionable defense, not just vulnerability finding.
- **How to demo**: Toggle controls on/off. Notice the Defense Coverage progress bar dynamically update.

#### 15. Safe Defense Validation ("Validate Defenses")
- **Location**: `/` -> **Fix & Retest** -> Click *"Validate Defenses"* (`POST /api/validations`).
- **What it does**: Replays the entire historical attack corpus against the proposed defense configuration in sandbox simulation **without modifying target settings**.
- **Pitch Value**: Zero risk to production—teams test defense efficacy before deployment.

#### 16. 256-Policy Repair Search Optimizer
- **Location**: `/` -> **Advanced Tools** -> **Repair Search** (`POST /api/platform/repairs/search`).
- **What it does**: Algorithmic synthesizer that exhaustively replays attacks across all 256 candidate control combinations. Computes and recommends the **lowest-cost policy** that blocks 100% of verified attacks while preserving 100% of legitimate utility tasks.
- **Pitch Value**: Self-healing agent infrastructure—replaces manual policy engineering with automated mathematical optimization.

#### 17. Automated Regression Suite (5 Legitimate Utility Benchmarks)
- **Location**: `/` -> **Fix & Retest** -> **Regression Tests** (`regressions`)
- **What it does**: Replays known attacks to ensure they remain blocked, while running 5 legitimate business utility tasks:
  1. *Public Retrieval*: Fetching public FAQs.
  2. *In-Scope Account Access*: Retrieving legitimate customer account records.
  3. *Authorized $25 Refund*: Processing customer service refunds within policy limits.
  4. *Preference Memory*: Storing user UI preferences safely.
  5. *Approved Internal Request*: Dispatching authorized internal webhooks.
- **Pitch Value**: Answers the #1 enterprise objection: *"Will security make my agent dumb or broken?"*

---

### PILLAR 5: Runtime Shield, Fuzzing & Live Intercept

#### 18. Identity-Aware Runtime Shield Gateway
- **Location**: `/` -> **Advanced Tools** -> **Runtime Shield** (`runtime`)
- **What it does**: In-memory, fail-closed gateway positioned between agent logic and external tools. Enforces tenant binding, intended tool contracts, memory boundaries, and provenance validation before tool invocation.
- **Pitch Value**: Real-time prevention, not just post-mortem logging.

#### 19. Interactive Sensitive Action Approvals
- **Location**: `/` -> **Runtime Shield** -> Session event dispatch (`POST /api/platform/sessions/:id/approvals/:approvalId`).
- **What it does**: Intercepts sensitive operations (e.g., transfers over $1,000, schema modifications) and holds them pending an operator's one-use session approval token.
- **Pitch Value**: Human-in-the-loop governance for high-risk autonomous workflows.
- **How to demo**: Trigger a sensitive tool call in Runtime Shield. Click *"Approve"* or *"Deny"* to demonstrate real-time gatekeeper control.

#### 20. Multi-Agent Topology Mapper
- **Location**: `/` -> **Advanced Tools** -> **Topology Mapper** (`topology`)
- **What it does**: Renders a live blast-radius topology map showing connected agent nodes, external tool endpoints, databases, and memory stores.
- **Pitch Value**: Essential for enterprises with multi-agent swarms (e.g., CrewAI, AutoGen).

#### 21. Real-Time Policy Editor
- **Location**: `/` -> **Advanced Tools** -> **Policy Editor** (`policy`)
- **What it does**: JSON-based boundary rules editor allowing operators to configure allowed URL schemes, banned system binaries (`/bin/sh`, `curl`), memory quarantine thresholds, and token limits, with one-click *"Deploy to Runtime Shield"*.

---

### PILLAR 6: Enterprise Governance, Compliance & Tamper-Evident Vault

#### 22. Tamper-Evident Evidence Vault (SHA-256 Hash Chain)
- **Location**: `/` -> **Advanced Tools** -> **Evidence Vault** (`evidence`)
- **What it does**: Append-only, hash-linked audit chain connecting actors, policies, tool events, sandbox effects, verifier decisions, and release gate outcomes.
- **Pitch Value**: Legally defensible, cryptographic chain of custody.
- **How to demo**: Open Evidence Vault. Click the audit integrity status badge. Watch it verify the hash chain and display **CHAIN INTACT** with the exact SHA-256 head hash.

#### 23. TrustScore (Quantified Security Posture)
- **Location**: `/` -> **Advanced Tools** -> **TrustScore** (`trust`)
- **What it does**: Transparent, multi-variable posture score (0–100) computed from:
  - Verified Prevention Rate
  - Retained Utility Rate
  - CI Release Gate status
  - Surfaces unmeasured areas as "Not Measured" rather than falsely assuming safety.
- **Pitch Value**: Executive-ready dashboard metric for CISOs and boardrooms.

#### 24. Identity Auditor
- **Location**: `/` -> **Advanced Tools** -> **Identity Auditor** (`identity`)
- **What it does**: Parses imported digital-twin identity manifests (`POST /api/platform/twins`). Detects cross-tenant trust paths, wildcard permissions, tool overreach, and delegation authority amplification.

#### 25. CI/CD Release Gate
- **Location**: `/` -> **Advanced Tools** -> **Release Gate** (`release`)
- **What it does**: Programmable quality gate endpoint (`POST /api/platform/gates`) enforcing strict deployment criteria:
  - 0 Critical Exploits
  - Exploit rate <= 5%
  - Utility preservation >= 100%
  - p95 latency under threshold
- **Pitch Value**: Plugs directly into GitHub Actions or GitLab CI pipelines with operator tokens.

#### 26. OWASP Top 10 for LLMs & NIST AI RMF Compliance Exporter
- **Location**: `/` -> **Advanced Tools** -> **Compliance Exporter** (`compliance`)
- **What it does**: Automatically maps observed findings and defense coverage to:
  - **OWASP Top 10 for LLMs** (LLM01 Prompt Injection, LLM02 Insecure Output, LLM06 Excessive Agency, LLM08 Vector Poisoning).
  - **NIST AI Risk Management Framework** (Govern, Map, Measure, Manage).
  - Provides one-click *"Export Compliance Report"* (`GET /api/platform/report`).

---

## 4. Judge Q&A Defense Matrix

### Q1: "Are you just testing mock simulations or does this work on real models?"
> **Answer**:  
> *"Both, and that's by design. For rapid, deterministic testing without burning API credits, our policy-based simulation provides instant 256-policy searches and reproducible regression tests. But with three environment variables (`AGENTBREAK_MODEL_BASE_URL`, `AGENTBREAK_MODEL_NAME`, `AGENTBREAK_MODEL_API_KEY`), AgentBreak connects directly to any OpenAI-compatible or Anthropic model. The exact same Runtime Shield, tools, and Effect Oracle evaluate real LLM function calls without altering a single line of defense code."*

### Q2: "How does your Effect Oracle differ from NeMo Guardrails or Llama Guard?"
> **Answer**:  
> *"Guardrails like NeMo or Llama Guard inspect text inputs and outputs. If an attacker uses steganography, token smuggling, or multi-step logic, the guardrail often passes the text because it doesn't look toxic. AgentBreak's Effect Oracle doesn't care what the LLM says; it monitors the downstream environment state. If a tool call writes to an unauthorized database table, triggers a payment, or leaks a token, the Effect Oracle detects the invariant breach deterministically."*

### Q3: "What is the runtime performance overhead of the Runtime Shield?"
> **Answer**:  
> *"Sub-millisecond. The Runtime Shield is an identity-aware, in-memory proxy that validates tool schemas, tenant bindings, and egress allowlists using compiled regex and hash lookups before delegating to the tool. It adds negligible latency compared to the 800ms+ network round-trip of an LLM generation."*

### Q4: "Won't strict security policies break legitimate user requests?"
> **Answer**:  
> *"That's exactly why we built our 5-task Utility Benchmark and the 256-policy Repair Search. We don't just find the strictest defense; we find the lowest-cost defense that blocks 100% of attacks while maintaining 100% utility on valid business tasks (like authentic customer refunds and FAQ retrieval). If a proposed policy breaks legitimate utility, AgentBreak rejects it."*

### Q5: "How does this integrate into existing enterprise agent frameworks like LangChain, CrewAI, or MCP?"
> **Answer**:  
> *"AgentBreak uses a normalized operation contract. Tool calls, identity headers, and memory events are passed as standardized JSON events. Any MCP (Model Context Protocol) server or LangChain tool can route its execution through the AgentBreak `/api/platform/sessions/:id/events` gateway with a simple 5-line middleware adapter."*

### Q6: "Can an attacker tamper with the audit logs to hide their exploit?"
> **Answer**:  
> *"No. The Evidence Vault uses a SHA-256 hash-linked append-only chain. Each entry hashes the previous entry's hash alongside the current timestamp, subject, and payload. Any alteration to historical telemetry invalidates the chain head immediately, which our live 'Verify Audit Chain' button flags instantly."*

### Q7: "What prevents adaptive attackers from bypassing your specialist swarm?"
> **Answer**:  
> *"Our supervisor coordinates specialists across 4 distinct attack paradigms—retrieval, identity, memory, and tool chaining. Whenever an attack succeeds, the exact scenario is permanently added to our regression corpus. The system exhibits monotonically increasing security: it never forgets an exploit once discovered."*

### Q8: "How does this handle multi-tenant isolation in enterprise SaaS?"
> **Answer**:  
> *"The digital twin explicitly models tenant boundaries and synthetic scopes. The Runtime Shield enforces tenant binding on every single tool argument. If Agent A (Tenant 1) attempts to pass a customer ID belonging to Tenant 2 into a query tool, the shield blocks the call at the boundary, regardless of what prompt was used."*

### Q9: "What's the business model for AgentBreak?"
> **Answer**:  
> *"Developer workbench is free and open-source for local evaluation. The enterprise tier sells the continuous CI/CD Release Gate, team-shared Evidence Vault, automated compliance reporting for SOC2/ISO42001/EU AI Act, and cloud connector agents for production VPC deployment."*

### Q10: "What was the hardest technical challenge you solved during the hackathon?"
> **Answer**:  
> *"Building the Effect Oracle and the 256-policy Repair Search optimizer. Ensuring that multi-stage attacks across retrieval, persistent memory, and chained tool calls could be evaluated deterministically in sub-second time without relying on another unreliable LLM to judge the LLM."*

---

## 5. Pre-Flight Setup & Fail-Safe Demo Checklist

### 1. Terminal Setup
Open two clean terminal windows:
```powershell
# Terminal 1: Backend & Frontend Dev Server
cd c:\Users\admin\Documents\SkillIssue_college_round_dashboard-redesign
npm run dev
# Confirm: Running at http://localhost:5173 and API at http://localhost:3001
```

### 2. Browser Tabs to Pre-Open (in order)
1. **Tab 1 (The Hook)**: `http://localhost:5173/landing` (Landing Page with 3D Sphere & Cinematic Intro)
2. **Tab 2 (The Workbench)**: `http://localhost:5173/` (Security Overview Dashboard)
3. **Tab 3 (Forensics & AttackGraph)**: Pre-loaded on `Results & Evidence` with top trace expanded
4. **Tab 4 (Defense Lab & Regression)**: Pre-loaded on `Fix & Retest`
5. **Tab 5 (Advanced Tools & Evidence Vault)**: Pre-loaded on `Evidence Vault` with intact hash chain

### 3. Keyboard Shortcuts to Know
- `Cmd + K` or `Ctrl + K`: Instantly opens the global test search bar.
- `Escape`: Instantly closes any modal, drawer, or dialog.
- Zoom Level: Set browser zoom to **90%** so all dashboard metrics and graphs fit comfortably on the presentation projector.

### 4. Fail-Safe / Offline Mode Guarantee
- AgentBreak operates **100% locally** with atomic JSON persistence in `.agentbreak/store.json`.
- It does **not** require external WiFi, OpenAI keys, or external cloud infrastructure during the live pitch.
- All 4 specialists, the Effect Oracle, the 256-policy Repair Search, and the SHA-256 Evidence Vault execute locally in milliseconds.
