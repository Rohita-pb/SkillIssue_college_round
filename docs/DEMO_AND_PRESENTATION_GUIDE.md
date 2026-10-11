# Live Demonstration & Presentation Script Guide

**Product:** AgentBreak Autonomous AI Red Team  
**Event:** Hackathon Presentation & Viva Evaluation  
**Branch:** `feature/dashboard-redesign`  

---

## 1. Project Pitches

### 1.1 The 30-Second Elevator Pitch
> *"Every company is connecting AI agents to real tools—like databases, bash terminals, and payment APIs. But how do you know your agent won't obey a hidden prompt inside an invoice and leak private payroll data? Current security tools only check if the LLM's text sounds polite.  
>
> We built **AgentBreak**: an autonomous AI red team that actively probes agents across 5 attack surfaces, records cryptographic traces of every tool call in a secure sandbox, and automatically tests 256 guardrail policies to find the cheapest fix that blocks attacks without breaking legitimate business tasks."*

### 1.2 The One-Minute Pitch
> *"Autonomous AI agents introduce a brand-new attack vector: indirect prompt injection and unauthorized tool execution. If a hacker hides a malicious prompt in a PDF, the agent might read it and execute an unapproved database query or a $5,000 refund.  
>
> **AgentBreak** solves this with an evidence-first red teaming workbench. Instead of static tests, we use the UCB1 multi-armed bandit algorithm to adaptively discover weak spots across instructions, memory, retrieval, and tools. When a vulnerability is found, AgentBreak doesn't rely on the agent's self-assessment; our independent effect oracle inspects the sandbox ledger to verify if an invariant was actually broken.  
>
> Best of all, our automated Repair Search evaluates 256 security control combinations in milliseconds, finding the exact policy that stops the hack while keeping 100% of normal customer operations working."*

### 1.3 The Three-Minute Pitch
> *"Good morning, judges. In traditional software, we test endpoints and input fields. But autonomous AI agents don't follow rigid code paths; they make probabilistic multi-step decisions using LLMs and external tools.  
>
> This creates a massive enterprise dilemma: traditional vulnerability scanners don't understand function calling, while standard LLM guardrails only scan chat text. If an agent executes a malicious refund tool call, no text scanner can tell if the transaction crossed an authorization boundary.  
>
> Enter **AgentBreak**. AgentBreak models the agent, its tools, memory, and permissions as a digital twin. It runs an autonomous attack engine using Upper Confidence Bound selection to probe five distinct attack surfaces. If a probe succeeds, it captures a reproducible, cryptographic trace containing the user prompt, the injected context, the agent's decision, and the exact tool arguments.  
>
> To fix findings, engineers don't have to guess. Our Fix & Retest lab and automated Repair Search test all 256 possible defense combinations against historical exploits and our 5-case legitimate utility suite. Finally, all decisions are chained into a SHA-256 tamper-proof Evidence Vault for enterprise audit compliance.  
>
> In short: AgentBreak transforms AI agent security from subjective prompt evaluation into deterministic, verifiable engineering."*

---

## 2. Five-to-Seven Minute Technical Live Demo Script (2-Person Delivery)

### Roles:
- **Presenter 1 (Speaker / Explainer):** Introduces problem, explains algorithms, communicates with judges.
- **Presenter 2 (Pilot / Operator):** Operates the browser, clicks buttons, highlights outputs, switches tabs.

---

### Step 1: The Overview Posture (Time: 0:00 - 1:15)
- **Screen:** `http://localhost:5173/` (Sidebar -> **Home**)
- **Operator Action:** Shows the 4 metric cards and scrolls down to the Recent Findings table.
- **Presenter 1:**
  > *"Judges, welcome to AgentBreak. We start here on the executive dashboard. In the top cards, you see our Security Health Score is currently at 82/100, with 1 Active Critical Breach detected across 97 evaluated probes.  
  >
  > Notice that this score is calculated purely from committed sandbox effects—not an LLM self-report. Notice probe `AB-TRC-053A` at the top of our Recent Findings: our customer support agent was tricked into exfiltrating the payroll database. Let's see how our autonomous engine discovered this."*

---

### Step 2: Executing an Adaptive Test Campaign (Time: 1:15 - 2:45)
- **Screen:** Click **"Run a Test"** in the sidebar.
- **Operator Action:** Selects `CustomerOps-ReAct-Agent`, keeps the 4 probe scenarios checked, selects `Standard Suite (32 Probes)`, and clicks **"Execute Security Assessment"**.
- **Presenter 2 (takes mic briefly while operating):**
  > *"I am now launching a 32-probe adaptive campaign. As the terminal streams in real time, watch how the engine operates. It doesn't fire random spam. It uses the UCB1 Multi-Armed Bandit algorithm.  
  >
  > It balances exploring new attack surfaces with exploiting the ones where weaknesses exist. Notice that when a probe fails, our engine mutates the payload across four strategy families: direct instruction, authority impersonation, context fragmentation, and approval laundering."*
- **Presenter 1:**
  > *"In less than a second, 32 probes have executed inside our isolated in-memory sandbox. The engine uncovered an indirect tool exfiltration exploit. Let's inspect the evidence."*

---

### Step 3: Forensic Evidence & One-Click Replay (Time: 2:45 - 4:00)
- **Screen:** Click **"Results & Evidence"** in the sidebar.
- **Operator Action:** Clicks `FIND-053A`. Points cursor to the Forensic Evidence Timeline on the right. Clicks the **Copy Trace JSON** button.
- **Presenter 1:**
  > *"Here in the Evidence Ledger, every finding has a complete chronological timeline. Look at Step 1: the legitimate user asked the agent to help review a refund policy.  
  > Look at Step 2: a malicious payload was injected via an unapproved PDF scraper parameter.  
  > Look at Step 4: the agent made a tool call to `http_request` with the payload body containing the private canary token `SYNTHETIC-CANARY-7F3A`.  
  >
  > Crucially, every trace has a unique SHA-256 fingerprint. If I want to prove this bug to an engineering team, I don't give them a screenshot—I click 'One-Click Replay', and the engine deterministically re-runs the exact same state snapshot to prove the exploit reproduces."*

---

### Step 4: Fix & Retest with Zero Regression (Time: 4:00 - 5:30)
- **Screen:** Click **"Fix & Retest"** in the sidebar.
- **Operator Action:** Selects `FIND-053A`. Flips the **RECOMMENDED DEFENSE GUARDRAIL** toggle switch to **ACTIVE** (`Runtime Parameter Sanitizer`). Selects sensitivity mode `Strict`. Clicks **"Re-Test Exploit With Guardrail"**.
- **Presenter 2:**
  > *"Now let's fix it. Here in the Fix & Retest lab, we activate the recommended defense: the Runtime Parameter Sanitizer, which enforces an egress allowlist and argument regex filters. I'll click 'Re-Test Exploit'."*
- **Presenter 1:**
  > *"Watch what happens: the backend immediately re-runs the exact attack payload against our candidate defense. The egress guard intercepts the call: `Blocked before execution`. The badge turns green: `[DEFENDED]`.  
  >
  > But here is our biggest differentiator: simultaneously, AgentBreak ran our 5-case legitimate utility suite. It verified that the agent can still read public FAQs, process in-policy $25 refunds, and save customer preferences. We prevented the attack without breaking legitimate functionality."*

---

### Step 5: Advanced Tools & Compliance Export (Time: 5:30 - 6:30)
- **Screen:** Sidebar -> Expand **ADVANCED TOOLS** -> Click **"Topology Mapper"**, then click **"Compliance Exporter"**.
- **Operator Action:** Shows the Multi-Agent Blast Radius graph, then switches to Compliance Exporter and clicks **"Download Audit Report (JSON)"**.
- **Presenter 1:**
  > *"Finally, under Advanced Tools, our Topology Mapper visualizes the blast radius across multi-agent delegation paths. And in the Compliance Exporter, we map all findings to OWASP Top 10 for LLMs and NIST AI RMF 1.0, generating a cryptographically verifiable JSON audit report for regulators.  
  >
  > AgentBreak gives enterprises the confidence to ship autonomous AI agents safely. Thank you, and we welcome your questions!"*

---

## 3. Demo Failover & Recovery Plan

| Potential Issue | What Happens | Immediate Action to Take |
|:---|:---|:---|
| **Vite server fails to reload** | Browser displays blank screen or connection error. | Press `Ctrl+Shift+R` to force hard reload. Check that terminal shows Vite listening on port 5173. |
| **API server is stopped** | Red top alert: *"Live updates paused: Failed to fetch"*. | In PowerShell terminal: run `npx tsx watch server/index.ts` to restart API server on port 3001 within 2 seconds. |
| **Test execution shows unexpected outcome** | Exploit outcome shows `blocked` when expecting `success`. | Explain honestly: *"This proves that the active target already had `toolPermissions` or `outboundFilter` enabled in its snapshot! Let's select an unpatched agent like `Atlas Support` to demonstrate the vulnerability."* |
| **External LLM endpoint times out (if model mode is configured)** | Trace displays `Model execution error: Request timed out`. | Explain immediately: *"Notice how our system handles external API failures: it flags the attempt as `inconclusive`, adhering to strict safety rules rather than falsely claiming the attack was prevented."* |
