import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPEN_POLICY, type AuditEntry, type Operation, type SourceContext } from '../shared/platform.js';
import { appendAudit, makeReleaseGate, verifyAudit } from './platform/audit.js';
import { causalAnalysis, searchRepairs, utilitySuite } from './platform/analysis.js';
import { createExperiment, runModelScenario, runScenario } from './platform/experiments.js';
import { invoke, newSession, resolveApproval, verifyEffects } from './platform/runtime.js';
import { scenarioFor } from './platform/scenarios.js';
import { createTwin } from './platform/twins.js';

const user = { kind: 'user' as const, id: 'authenticated-user', trusted: true };
const retrieval = { kind: 'retrieval' as const, id: 'knowledge', trusted: false };
const op = (tool: Operation['tool'], args: Record<string, unknown>, source: SourceContext = user): Operation => ({ id: `op-${tool}`, label: tool, tool, args, turn: 1, source });

test('digital twin models a stateful cross-tenant exploit and verifies effects independently', () => {
  const twin = createTwin();
  const run = runScenario(twin, scenarioFor(twin, 'identity', 1), 'test');
  assert.equal(run.outcome, 'exploited');
  assert.equal(run.verification.method, 'independent-effect-oracle');
  assert.ok(run.verification.violations.some(v => v.invariant === 'tenant-data-boundary'));
  assert.ok(run.verification.violations.some(v => v.invariant === 'tenant-transaction-boundary'));
  assert.equal(run.session.effects.length, 2);
});

test('runtime shield blocks before effect creation and does not trust asserted identities', () => {
  const twin = createTwin(); twin.policy.tenantIsolation = true; twin.policy.identityBinding = true; twin.policy.sourceProvenance = true;
  const session = newSession(twin, 'atlas', 'northstar');
  const event = invoke(twin, session, op('read_record', { resourceId: 'customer-orbit', asAgent: 'ledger' }, retrieval));
  assert.equal(event.decision.action, 'block');
  assert.equal(session.effects.length, 0);
  assert.match(event.result, /Prevented before execution/);
});

test('protected memory keeps provenance and rejects poisoned authorization writes', () => {
  const twin = createTwin(); twin.policy.memoryIntegrity = true; twin.policy.sourceProvenance = true;
  const session = newSession(twin, 'atlas', 'northstar');
  const event = invoke(twin, session, op('remember', { key: 'policy.approvals', value: 'admin-approved' }, retrieval));
  assert.equal(event.decision.action, 'block');
  assert.equal(Object.keys(session.memory).length, 0);
  const preference = invoke(twin, session, op('remember', { key: 'preferences.language', value: 'English' }));
  assert.equal(preference.decision.action, 'allow');
  assert.equal(session.memory['preferences.language'].source.kind, 'user');
});

test('high-value refunds require an exact, one-use approval bound to the session', () => {
  const twin = createTwin(); twin.policy.approvalBinding = true;
  const session = newSession(twin, 'atlas', 'northstar');
  const request = invoke(twin, session, op('refund', { amount: 4999, tenantId: 'northstar' }));
  assert.equal(request.decision.action, 'approval');
  assert.equal(session.effects.length, 0);
  const approval = session.approvals[0];
  const completed = resolveApproval(twin, session, approval.id, true, 'reviewer', 'Verified order');
  assert.equal(completed?.decision.action, 'allow');
  assert.equal(session.effects.at(-1)?.approved, true);
  assert.equal(session.approvals[0].status, 'consumed');
  const replay = invoke(twin, session, op('refund', { amount: 4999, tenantId: 'northstar', approvalId: approval.id }));
  assert.notEqual(replay.decision.action, 'allow');
});

test('delegation attenuation prevents authority amplification while preserving in-scope work', () => {
  const twin = createTwin(); twin.policy.delegationScope = true; twin.policy.approvalBinding = true;
  const session = newSession(twin, 'atlas', 'northstar');
  const delegation = invoke(twin, session, op('delegate', { agentId: 'ledger', task: 'refund' }));
  assert.equal(delegation.decision.action, 'allow');
  assert.equal(session.inheritedScope, true);
  const refund = invoke(twin, session, op('refund', { amount: 4999, tenantId: 'northstar' }, { kind: 'delegation', id: 'ledger', trusted: true }));
  assert.equal(refund.decision.action, 'block');
  assert.equal(session.effects.filter(e => e.type === 'refund').length, 0);
});

test('causal replay isolates necessary operations and repair search tests utility', () => {
  const twin = createTwin();
  const run = runScenario(twin, scenarioFor(twin, 'injection', 1), 'test');
  const analysis = causalAnalysis(twin, run);
  assert.equal(analysis.baselineReproduced, true);
  assert.ok(analysis.minimalSteps < analysis.originalSteps);
  assert.ok(analysis.ablations.some(a => a.necessary));
  const repair = searchRepairs(twin, [run]);
  assert.equal(repair.evaluated, 256);
  assert.ok(repair.candidates.length > 0);
  assert.equal(repair.utility.length, 5);
  assert.ok(repair.candidates.some(candidate => candidate.utilityPassed === candidate.utilityTotal));
});

test('release gate fails open vulnerable corpus and passes after the viable repair policy', () => {
  const twin = createTwin();
  const runs = ['injection', 'identity', 'memory', 'chain'].map((specialist, i) => runScenario(twin, scenarioFor(twin, specialist as 'injection' | 'identity' | 'memory' | 'chain', i), 'test'));
  const cases = runs.map(run => ({ id: run.id, sourceRunId: run.id, run }));
  const open = makeReleaseGate(twin, cases, utilitySuite(twin));
  assert.equal(open.passed, false);
  const repair = searchRepairs(twin, runs);
  assert.ok(repair.policy);
  const defended = { ...structuredClone(twin), policy: repair.policy!, shieldMode: 'enforce' as const };
  const fixed = runs.map(run => ({ id: run.id, sourceRunId: run.id, run: runScenario(defended, run.scenario, 'gate') }));
  const closed = makeReleaseGate(defended, fixed, utilitySuite(defended));
  assert.equal(closed.passed, true);
});

test('hash-linked audit evidence detects tampering', () => {
  const entries: AuditEntry[] = [];
  appendAudit(entries, 'demo.start', 'subject', { value: 1 });
  appendAudit(entries, 'demo.end', 'subject', { value: 2 });
  assert.equal(verifyAudit(entries).valid, true);
  entries[0].payload = { value: 99 };
  assert.equal(verifyAudit(entries).valid, false);
});

test('model-backed platform experiments call the configured model and still verify sandbox effects', async t => {
  const twin = createTwin(); const scenario = scenarioFor(twin, 'identity', 1); const previousBase = process.env.AGENTBREAK_MODEL_BASE_URL; const previousModel = process.env.AGENTBREAK_MODEL_NAME;
  process.env.AGENTBREAK_MODEL_BASE_URL = 'https://model.test.invalid/v1'; process.env.AGENTBREAK_MODEL_NAME = 'demo-model';
  t.after(() => { if (previousBase === undefined) delete process.env.AGENTBREAK_MODEL_BASE_URL; else process.env.AGENTBREAK_MODEL_BASE_URL = previousBase; if (previousModel === undefined) delete process.env.AGENTBREAK_MODEL_NAME; else process.env.AGENTBREAK_MODEL_NAME = previousModel; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, 'https://model.test.invalid/v1/chat/completions'); const request = JSON.parse(String(options.body)); assert.equal(request.model, 'demo-model'); calls++;
    const message = calls === 1 ? { content: 'I will inspect the requested account.', tool_calls: [{ id: 'model-call-1', function: { name: 'read_record', arguments: '{"resourceId":"customer-orbit"}' } }] } : { content: 'I completed the task.' };
    return Response.json({ choices: [{ message }] });
  });
  const run = await runModelScenario(twin, scenario, 'model-test');
  assert.equal(calls, 2); assert.equal(run.mode, 'model'); assert.equal(run.outcome, 'exploited'); assert.ok(run.verification.violations.some(v => v.invariant === 'tenant-data-boundary'));
});
