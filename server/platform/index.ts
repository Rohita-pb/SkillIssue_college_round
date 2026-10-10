import { type ExperimentRun, type PlatformState, type PlatformView, type ReleaseGate, type ShieldPolicy } from '../../shared/platform.js';
import { appendAudit, makeReleaseGate, verifyAudit } from './audit.js';
import { causalAnalysis, searchRepairs, trustScore, utilitySuite } from './analysis.js';
import { digest, now, uid } from './canonical.js';
import { createExperiment, nextExperimentStep, runModelScenario, runScenario } from './experiments.js';
import { createTwin, fingerprintTwin, manifestSchema, auditPermissions } from './twins.js';
import { invoke, newSession, resolveApproval, verifyEffects } from './runtime.js';
import { scenarioFor } from './scenarios.js';

export function seedPlatform(): PlatformState {
  const twin = createTwin();
  return { version: 2, twins: [twin], experiments: [], runs: [], sessions: [], corpus: [], analyses: [], repairs: [], gates: [], audit: [], intelligenceSharing: false };
}
export function getTwin(state: PlatformState, id: string) { const twin = state.twins.find(t => t.id === id); if (!twin) throw new Error('Digital twin not found.'); return twin; }
export function viewPlatform(state: PlatformState): PlatformView {
  const scores = state.twins.map(t => trustScore(t, state.runs.filter(r => r.twinId === t.id), state.repairs.filter(r => r.twinId === t.id).at(-1), state.gates.filter(g => g.twinId === t.id).at(-1)));
  const audits = Object.fromEntries(state.twins.map(t => [t.id, auditPermissions(t)]));
  return { ...state, scores, audits, integrity: verifyAudit(state.audit), connection: { model: process.env.AGENTBREAK_MODEL_NAME || null, attackerModel: process.env.AGENTBREAK_ATTACKER_MODEL_NAME || null, gatewayAuthentication: process.env.AGENTBREAK_GATEWAY_TOKEN ? true : false, operatorAuthentication: process.env.AGENTBREAK_OPERATOR_TOKEN ? true : false } };
}

export function importTwin(state: PlatformState, input: unknown) {
  const manifest = manifestSchema.parse(input); const twin = createTwin(manifest); state.twins.push(twin); appendAudit(state.audit, 'twin.imported', twin.id, { fingerprint: twin.fingerprint, name: twin.name }); return twin;
}
export function patchTwin(state: PlatformState, id: string, patch: { policy?: ShieldPolicy; shieldMode?: 'observe' | 'enforce'; allowedOrigins?: string[]; refundLimit?: number }) {
  const twin = getTwin(state, id); const candidate = structuredClone(twin); if (patch.policy) candidate.policy = patch.policy; if (patch.shieldMode) candidate.shieldMode = patch.shieldMode; if (patch.allowedOrigins) candidate.allowedOrigins = patch.allowedOrigins; if (patch.refundLimit !== undefined) candidate.refundLimit = patch.refundLimit; candidate.version++; candidate.createdAt = now(); candidate.parentId = twin.id; candidate.id = uid('twin'); candidate.fingerprint = fingerprintTwin(candidate); state.twins.push(candidate); appendAudit(state.audit, 'twin.versioned', candidate.id, { parentId: twin.id, fingerprint: candidate.fingerprint, changes: patch }); return candidate;
}

export function createSession(state: PlatformState, twinId: string, actorId: string, tenantId?: string) { const session = newSession(getTwin(state, twinId), actorId, tenantId); state.sessions.push(session); appendAudit(state.audit, 'runtime.session.created', session.id, { twinId, actorId, tenantId: session.tenantId }); return session; }
export function runRuntimeOperation(state: PlatformState, sessionId: string, operation: Parameters<typeof invoke>[2]) { const session = state.sessions.find(s => s.id === sessionId); if (!session) throw new Error('Runtime session not found.'); const event = invoke(getTwin(state, session.twinId), session, operation); appendAudit(state.audit, 'runtime.operation', event.id, { sessionId, tool: operation.tool, decision: event.decision, effectIds: event.effects.map(e => e.id) }); return event; }
export function approveRuntime(state: PlatformState, sessionId: string, approvalId: string, approve: boolean, reviewer: string, reason: string) { const session = state.sessions.find(s => s.id === sessionId); if (!session) throw new Error('Runtime session not found.'); const event = resolveApproval(getTwin(state, session.twinId), session, approvalId, approve, reviewer, reason); appendAudit(state.audit, 'runtime.approval', approvalId, { sessionId, approve, reviewer, eventId: event?.id }); return { approval: session.approvals.find(a => a.id === approvalId), event }; }

export function startExperiment(state: PlatformState, twinId: string, name: string, budget: number, seed: number, mode: 'fixture' | 'model' = 'fixture') { const experiment = createExperiment(getTwin(state, twinId), name, budget, seed, mode); state.experiments.push(experiment); appendAudit(state.audit, 'experiment.created', experiment.id, { twinId, budget, seed, mode }); return experiment; }
export async function advanceExperiment(state: PlatformState, experimentId: string): Promise<{ experiment: PlatformState['experiments'][number]; run: ExperimentRun }> {
  const experiment = state.experiments.find(e => e.id === experimentId); if (!experiment) throw new Error('Experiment not found.'); if (experiment.status !== 'running') throw new Error('Experiment is no longer running.'); if (experiment.completed >= experiment.budget) throw new Error('Experiment budget exhausted.');
  const previous = state.runs.filter(r => r.experimentId === experiment.id); const { scenario, decision } = nextExperimentStep(experiment, previous); const run = experiment.mode === 'model' ? await runModelScenario(experiment.twinSnapshot, scenario, experiment.id) : runScenario(experiment.twinSnapshot, scenario, experiment.id, 'fixture'); decision.runId = run.id; experiment.decisions.push(decision); experiment.runIds.push(run.id); experiment.completed++; state.runs.push(run); if (run.verification.objectiveMet) { const regression = { id: uid('reg'), twinId: experiment.twinId, sourceRunId: run.id, scenario: run.scenario, fingerprint: run.fingerprint, createdAt: now(), verifiedReplays: 1, enabled: true, provenance: run.mode === 'model' ? 'model' as const : 'fixture' as const }; state.corpus.push(regression); } if (experiment.completed >= experiment.budget) { experiment.status = 'completed'; experiment.finishedAt = now(); } appendAudit(state.audit, 'experiment.run', run.id, { experimentId, specialist: scenario.specialist, outcome: run.outcome, verified: run.verification.objectiveMet, violationIds: run.verification.violations.map(v => v.id) }); return { experiment, run };
}
export function stopExperiment(state: PlatformState, experimentId: string) { const experiment = state.experiments.find(e => e.id === experimentId); if (!experiment) throw new Error('Experiment not found.'); if (experiment.status === 'running') { experiment.status = 'stopped'; experiment.finishedAt = now(); appendAudit(state.audit, 'experiment.stopped', experimentId, {}); } return experiment; }
export async function replayRun(state: PlatformState, runId: string) { const original = state.runs.find(r => r.id === runId); if (!original) throw new Error('Run not found.'); const run = original.mode === 'model' ? await runModelScenario(original.twinSnapshot, original.scenario, 'replay', original.id) : runScenario(original.twinSnapshot, original.scenario, 'replay', 'tool-replay', original.id); state.runs.push(run); appendAudit(state.audit, 'run.replayed', run.id, { originalId: original.id, fingerprint: run.fingerprint, outcome: run.outcome }); return run; }
export function analyzeRun(state: PlatformState, runId: string) { const run = state.runs.find(r => r.id === runId); if (!run) throw new Error('Run not found.'); const analysis = causalAnalysis(run.twinSnapshot, run); state.analyses.push(analysis); appendAudit(state.audit, 'causal.analysis', analysis.id, { runId, minimalSteps: analysis.minimalSteps, necessary: analysis.ablations.filter(a => a.necessary).map(a => a.operationId) }); return analysis; }
export function findRepair(state: PlatformState, twinId: string) { const twin = getTwin(state, twinId); const successful = state.runs.filter(r => r.twinId === twinId && r.verification.objectiveMet && !r.replayOf); const repair = searchRepairs(twin, successful); state.repairs.push(repair); appendAudit(state.audit, 'repair.search', repair.id, { twinId, evaluated: repair.evaluated, recommended: repair.recommended?.controls || [] }); return repair; }
export function applyRepair(state: PlatformState, repairId: string) { const repair = state.repairs.find(r => r.id === repairId); if (!repair?.policy) throw new Error('Repair does not have a policy.'); const twin = patchTwin(state, repair.twinId, { policy: repair.policy, shieldMode: 'enforce' }); appendAudit(state.audit, 'repair.applied', twin.id, { repairId, policy: repair.policy }); return twin; }
export async function runGate(state: PlatformState, twinId: string) { const twin = getTwin(state, twinId); const cases = await Promise.all(state.corpus.filter(c => c.twinId === twinId && c.enabled).map(async c => ({ id: c.id, sourceRunId: c.sourceRunId, run: c.provenance === 'model' ? await runModelScenario(twin, c.scenario, `gate_${uid('g')}`) : runScenario(twin, c.scenario, `gate_${uid('g')}`, 'tool-replay') }))); const utility = utilitySuite(twin); const gate = makeReleaseGate(twin, cases, utility); state.gates.push(gate); appendAudit(state.audit, 'release.gate', gate.id, { twinId, passed: gate.passed, checks: gate.checks }); return gate; }

export function demoOverview(state: PlatformState) {
  const twin = state.twins[0];
  if (!state.runs.some(r => r.twinId === twin.id && r.verification.objectiveMet)) {
    const experiment = startExperiment(state, twin.id, 'Autonomous compromise discovery', 4, 7331);
    for (let i = 0; i < 4; i++) {
      const previous = state.runs.filter(r => r.experimentId === experiment.id); const { scenario, decision } = nextExperimentStep(experiment, previous); const run = runScenario(experiment.twinSnapshot, scenario, experiment.id, 'fixture'); decision.runId = run.id; experiment.decisions.push(decision); experiment.runIds.push(run.id); experiment.completed++; state.runs.push(run); if (run.verification.objectiveMet) state.corpus.push({ id: uid('reg'), twinId: experiment.twinId, sourceRunId: run.id, scenario: run.scenario, fingerprint: run.fingerprint, createdAt: now(), verifiedReplays: 1, enabled: true, provenance: 'fixture' }); appendAudit(state.audit, 'experiment.run', run.id, { experimentId: experiment.id, specialist: scenario.specialist, outcome: run.outcome, verified: run.verification.objectiveMet, violationIds: run.verification.violations.map(v => v.id) });
    }
    experiment.status = 'completed'; experiment.finishedAt = now();
  }
  return viewPlatform(state);
}
