# Step-by-Step Learning Roadmap & Hackathon Prep Plan

**Product:** AgentBreak Autonomous AI Red Team  
**Branch:** `feature/dashboard-redesign`  
**Target:** 3rd Year Computer Engineering Students preparing for Hackathon Viva & Judging  

---

## Roadmap Overview

This structured roadmap organizes your preparation into 6 focused study sessions. Follow the order below to build complete, unshakeable confidence before presenting to the hackathon evaluators.

```
┌───────────────────────────────────────────────────────────┐
│ SESSION 1: The Core Mission & Problem Statement (20 mins) │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ SESSION 2: Understanding the Architecture & Tech (30 mins)│
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ SESSION 3: Mastering the Codebase & Algorithms  (45 mins) │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ SESSION 4: Walkthrough of the Redesigned UI     (25 mins) │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ SESSION 5: Rehearsing the Live Demonstration    (30 mins) │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ SESSION 6: Viva Defense & Hard Technical Questions (30 mins)│
└───────────────────────────────────────────────────────────┘
```

---

## Session 1: The Core Mission & Problem Statement (20 mins)

### What to Read:
1. Read the Problem Statement backstory in [`docs/AGENTBREAK_PRD.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/AGENTBREAK_PRD.md#L21-L36).
2. Read Section 1 of [`docs/GLOSSARY_AND_REVISION.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/GLOSSARY_AND_REVISION.md#L8-L20) (Ten Facts You Must Remember).

### What You Should Be Able to Explain Afterwards:
- What is the difference between a traditional vulnerability scanner, a basic prompt filter, and AgentBreak?
- Why is checking an LLM's prose output useless compared to checking committed sandbox effects?
- What are the 5 attack surfaces probed by the platform?

### Practice Question:
> *"Explain AgentBreak in 3 sentences to someone who has never heard of AI red teaming."*

---

## Session 2: System Architecture & Technologies (30 mins)

### What to Read:
1. Study the Mermaid diagrams in [`docs/AGENTBREAK_ARCHITECTURE.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/AGENTBREAK_ARCHITECTURE.md#L1-L75).
2. Review the technology choices in [`docs/TECH_STACK_EXPLAINED.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/TECH_STACK_EXPLAINED.md).

### Source Files to Inspect:
- [`package.json`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/package.json) (Review the 5 runtime dependencies).
- [`server/store.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/store.ts) (Understand atomic JSON file writes).

### What You Should Be Able to Explain Afterwards:
- Why does the frontend run on port 5173 while the backend runs on port 3001?
- How does Vite eliminate CORS issues during development?
- Why do we use in-memory sandboxes rather than spawning Docker containers for every probe?

---

## Session 3: Core Codebase & Algorithms (45 mins)

### What to Read:
1. Read Part A of [`docs/AGENTBREAK_THEORY_GUIDE.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/AGENTBREAK_THEORY_GUIDE.md#L15-L250).
2. Inspect the code files listed below.

### Source Files to Inspect:
- [`server/engine.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts):
  - Lines 49-64: [`selectAttack()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L49) (The UCB1 algorithm implementation).
  - Lines 71-101: [`executeTool()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L71) (Sandbox tool boundary checks).
  - Lines 220-232: [`runRegression()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/engine.ts#L220) (The 5-case legitimate utility suite).
- [`server/platform/analysis.ts`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/platform/analysis.ts):
  - Lines 49-62: [`searchRepairs()`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/server/platform/analysis.ts#L49) (256-state policy subset search).

### What You Should Be Able to Explain Afterwards:
- What is the UCB1 formula, and why is it superior to random testing?
- What are the 4 payload mutation strategies?
- How does Repair Search guarantee that a recommended policy won't break normal customer tasks?

---

## Session 4: Walkthrough of the Redesigned Dashboard (25 mins)

### What to Read:
1. Open [`http://localhost:5173/`](http://localhost:5173/) in your web browser.
2. Read the screen-by-screen talking points in [`docs/DEMO_AND_PRESENTATION_GUIDE.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/DEMO_AND_PRESENTATION_GUIDE.md#L90-L130).

### Hands-on Steps:
1. Click **Home**: Inspect the 4 top metric cards and the 60s onboarding banner.
2. Click **Run a Test**: View the 4 scenario selector cards and intensity buttons.
3. Click **Results & Evidence**: Click on finding `FIND-053A` and inspect the forensic step timeline.
4. Click **Fix & Retest**: Toggle the guardrail switch to ACTIVE and observe the mode buttons.
5. Click **Advanced Tools** -> **Topology Mapper**: Observe the multi-agent nodes and blast radius edges.
6. Click **Compliance Exporter**: Click "Download Audit Report (JSON)".

---

## Session 5: Rehearsing the Live Demonstration (30 mins)

### What to Read:
1. Rehearse the 2-person script in [`docs/DEMO_AND_PRESENTATION_GUIDE.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/DEMO_AND_PRESENTATION_GUIDE.md#L45-L95).
2. Review the Demo Recovery Plan ([`docs/DEMO_AND_PRESENTATION_GUIDE.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/DEMO_AND_PRESENTATION_GUIDE.md#L140-L155)).

### Self-Check Practice:
- Practice the 30-second elevator pitch out loud with a timer.
- Practice running an end-to-end flow: from running a test to inspecting the trace, toggling the defense, and showing the green `[DEFENDED]` badge.

---

## Session 6: Viva Defense & Hard Judge Questions (30 mins)

### What to Read:
1. Read the 60 technical questions and answers in [`docs/JUDGE_QA_AND_VIVA.md`](file:///c:/Users/Admin/omnirush.ai/AgentBreak/docs/JUDGE_QA_AND_VIVA.md).
2. Pay special attention to Category 5 (Algorithms), Category 6 (Defenses & Verification), and Category 10 (Limitations).

### Top 5 Viva Questions to Master:
1. *Why doesn't AgentBreak just use Llama Guard or NeMo Guardrails?*
2. *Does AgentBreak use an actual LLM, or is it a simulation?*
3. *What is the mathematical justification for UCB1?*
4. *How do you know that enabling a defense doesn't break legitimate business tasks?*
5. *How does the Evidence Vault detect tampering?*

---

## Self-Assessment Checklist Before Going on Stage

- [ ] I can explain the core philosophy in one sentence without hesitating.
- [ ] I know that our test suite runs 22 tests in 1.14 seconds.
- [ ] I can point to `server/engine.ts` for UCB1 and `server/platform/analysis.ts` for Repair Search.
- [ ] I know the 5 attack surfaces by heart (`retrieval`, `instructions`, `memory`, `tools`, `multi-stage`).
- [ ] I know that tools execute in pure in-memory sandboxes and do not make external network requests.
- [ ] I have rehearsed the live demo with my partner and tested it at `http://localhost:5173/`.
- [ ] I know how to answer honestly about project limitations without undermining our engineering achievements.
