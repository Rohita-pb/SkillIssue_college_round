import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SURFACES, type AttackInput, type Campaign, type Defense, type Surface, type Target, type ToolName } from '../shared/types.js';
import { id, runAttack, selectAttack, validateDefenses } from './engine.js';
import { loadStore, saveStore } from './store.js';
import { advanceExperiment, analyzeRun, applyRepair, approveRuntime, createSession, findRepair, getTwin, importTwin, patchTwin, replayRun, runGate, runRuntimeOperation, startExperiment, stopExperiment, viewPlatform } from './platform/index.js';
import { auditPermissions } from './platform/twins.js';
import { appendAudit, verifyAudit } from './platform/audit.js';
import { type Operation, type PlatformState, type ShieldPolicy } from '../shared/platform.js';

const app = express();
const store = loadStore();
const running = new Set<string>();
const validations = new Set<string>();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
// Local-only API; same-origin browser clients and CLI clients are supported.
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestHostname = String(req.headers.host || '').split(':')[0].replace('[', '').replace(']', '');
      const loopback = new Set(['localhost', '127.0.0.1', '::1']);
      const sameOrigin = originUrl.host === req.headers.host;
      // Vite’s local dev proxy keeps the browser on :5173 while forwarding
      // requests to the API on :3001. Both endpoints remain loopback-only.
      const localDevProxy = loopback.has(originUrl.hostname) && loopback.has(requestHostname);
      if (!sameOrigin && !localDevProxy) return res.status(403).json({ error: 'Cross-origin API access is disabled.' });
    }
    catch { return res.status(403).json({ error: 'Invalid origin.' }); }
  }
  next();
});

app.get('/api/state', (_req, res) => res.json(store));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'sandbox', modelConnected: store.targets.some(t => t.mode === 'model') }));
app.get('/api/platform', (_req, res) => res.json(store.platform ? viewPlatform(store.platform) : null));
app.get('/api/platform/twins/:id/audit', (req, res) => { try { const twin = getTwin(requirePlatform(), req.params.id); res.json({ twin, findings: auditPermissions(twin) }); } catch (error) { res.status(404).json({ error: error instanceof Error ? error.message : 'Twin not found.' }); } });
app.get('/api/platform/audit/verify', (_req, res) => res.json(store.platform ? verifyAudit(store.platform.audit) : { valid: false, checked: 0, head: 'GENESIS' }));
app.get('/api/platform/report', (_req, res) => { if (!store.platform) return res.status(503).json({ error: 'Platform state is not initialized.' }); res.setHeader('Content-Disposition', 'attachment; filename="agentbreak-platform-evidence.json"'); res.json({ schemaVersion: 2, generatedAt: new Date().toISOString(), evidenceBoundary: 'Synthetic digital twin; in-memory effects; hash-linked audit chain.', platform: viewPlatform(store.platform) }); });

function requirePlatform(): PlatformState { if (!store.platform) throw new Error('Platform state is not initialized.'); return store.platform; }
function persistPlatform() { saveStore(store); }
function requireOperator(req: express.Request, res: express.Response): boolean {
  const expected = process.env.AGENTBREAK_OPERATOR_TOKEN;
  if (!expected) return true;
  if (req.headers.authorization !== `Bearer ${expected}`) { res.status(401).json({ error: 'Operator authentication required for this control-plane action.' }); return false; }
  return true;
}
function parseOperation(input: unknown): Operation {
  if (!input || typeof input !== 'object') throw new Error('A runtime operation object is required.');
  const value = input as Partial<Operation>;
  if (typeof value.id !== 'string' || typeof value.label !== 'string' || typeof value.tool !== 'string' || !Number.isInteger(value.turn) || !value.source || typeof value.source !== 'object' || !value.args || typeof value.args !== 'object' || Array.isArray(value.args)) throw new Error('Invalid runtime operation.');
  return value as Operation;
}
function withPlatformErrors(handler: (req: express.Request, res: express.Response) => unknown) { return (req: express.Request, res: express.Response, next: express.NextFunction) => { try { const result = handler(req, res); if (result instanceof Promise) void result.catch(next); } catch (error) { const message = error instanceof Error ? error.message : 'Platform operation failed.'; res.status(message.includes('not found') ? 404 : 400).json({ error: message }); } }; }

async function executeCampaign(campaign: Campaign) {
  running.add(campaign.id);
  try {
    while (campaign.status === 'running' && campaign.completed < campaign.budget) {
      const history = store.traces.filter(t => t.campaignId === campaign.id && !t.replayOf);
      const trace = await runAttack(campaign.targetSnapshot, selectAttack(campaign, history), campaign.id);
      if (campaign.status !== 'running') break;
      store.traces.push(trace);
      campaign.completed++;
      if (trace.outcome === 'success') campaign.successes++;
      if (trace.outcome === 'error') campaign.errors++;
      saveStore(store);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    if (campaign.status === 'running') campaign.status = campaign.errors === campaign.completed ? 'failed' : 'completed';
  } catch (error) {
    campaign.status = 'failed';
    console.error('Campaign failed:', error);
  } finally {
    campaign.finishedAt = new Date().toISOString();
    saveStore(store);
    running.delete(campaign.id);
  }
}

app.post('/api/campaigns', (req, res) => {
  const { name, targetId, surfaces, budget, seed } = req.body;
  const target = store.targets.find(t => t.id === targetId);
  if (!target || typeof name !== 'string' || !name.trim() || name.length > 100 || !Array.isArray(surfaces) || !surfaces.length || !surfaces.every(s => SURFACES.some(a => a.id === s)) || !Number.isInteger(budget) || budget < 5 || budget > 100 || !Number.isInteger(seed) || seed < 0 || seed > 2147483647) return res.status(400).json({ error: 'Provide a target, campaign name, valid attack surfaces, 5–100 attempts, and a nonnegative integer seed.' });
  if (running.size >= 3) return res.status(409).json({ error: 'Three campaigns are already running. Wait for one to finish.' });
  const campaign: Campaign = { id: id('cmp'), name: name.trim(), targetId, surfaces: [...new Set(surfaces)] as Surface[], budget, seed, status: 'running', completed: 0, successes: 0, errors: 0, startedAt: new Date().toISOString(), targetSnapshot: structuredClone(target) };
  store.campaigns.push(campaign);
  saveStore(store);
  res.status(201).json(campaign);
  void executeCampaign(campaign);
});

app.post('/api/campaigns/:id/stop', (req, res) => {
  const campaign = store.campaigns.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
  if (campaign.status === 'running') { campaign.status = 'stopped'; campaign.finishedAt = new Date().toISOString(); saveStore(store); }
  res.json(campaign);
});

app.get('/api/traces/:id/export', (req, res) => {
  const trace = store.traces.find(t => t.id === req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found.' });
  res.setHeader('Content-Disposition', `attachment; filename="agentbreak-${trace.id}.json"`);
  res.json({ schemaVersion: 1, exportedAt: new Date().toISOString(), reproduction: { method: 'POST', path: `/api/traces/${trace.id}/replay`, note: 'Replays the exact payload and target snapshot. Simulation is deterministic; external model behavior can vary. Import this file with POST /api/traces/import to replay on another instance.' }, trace });
});

app.post('/api/traces/:id/replay', async (req, res, next) => {
  try {
    const original = store.traces.find(t => t.id === req.params.id);
    if (!original) return res.status(404).json({ error: 'Trace not found.' });
    if (original.targetSnapshot.mode === 'model' && !store.targets.some(t => t.id === 'live-model')) return res.status(409).json({ error: 'Configure the original model endpoint before replaying this trace.' });
    const trace = await runAttack(original.targetSnapshot, original.input, original.campaignId, original.id);
    store.traces.push(trace);
    saveStore(store);
    res.json(trace);
  } catch (error) { next(error); }
});

app.post('/api/traces/import', async (req, res, next) => {
  const original = req.body?.trace;
  const input = original?.input as AttackInput | undefined;
  const snapshot = original?.targetSnapshot as Target | undefined;
  const tools: ToolName[] = ['read_document', 'read_private_record', 'http_request', 'issue_refund', 'write_memory'];
  if (req.body?.schemaVersion !== 1 || !input || !snapshot || typeof original.id !== 'string' ||
      !SURFACES.some(s => s.id === input.surface) || !Number.isInteger(input.variant) || input.variant < 0 || input.variant > 3 ||
      typeof input.payload !== 'string' || input.payload.length > 16000 || typeof input.strategy !== 'string' || typeof input.objective !== 'string' ||
      typeof snapshot.id !== 'string' || typeof snapshot.name !== 'string' || !['simulation', 'model'].includes(snapshot.mode) ||
      !Array.isArray(snapshot.tools) || !snapshot.tools.every(t => tools.includes(t)) ||
      !Array.isArray(snapshot.weaknesses) || !snapshot.weaknesses.every(s => SURFACES.some(a => a.id === s)) || !validDefense(snapshot.defenses)) {
    return res.status(400).json({ error: 'Upload a version 1 AgentBreak trace export with a valid attack input and target snapshot.' });
  }
  if (snapshot.mode === 'model' && !store.targets.some(t => t.mode === 'model' && t.model === snapshot.model)) return res.status(409).json({ error: 'Connect the matching model before importing this model-backed trace.' });
  try {
    const trace = await runAttack(snapshot, input, 'imported', original.id);
    store.traces.push(trace);
    saveStore(store);
    res.status(201).json(trace);
  } catch (error) { next(error); }
});

const defenseKeys: (keyof Defense)[] = ['sourceIsolation', 'toolPermissions', 'memoryGuard', 'outboundFilter', 'lockdown'];
function validDefense(value: unknown): value is Defense { return !!value && typeof value === 'object' && defenseKeys.every(k => typeof (value as Defense)[k] === 'boolean'); }

app.post('/api/validations', async (req, res, next) => {
  const target = store.targets.find(t => t.id === req.body.targetId);
  if (!target || !validDefense(req.body.defenses)) return res.status(400).json({ error: 'A valid target and all five defense settings are required.' });
  if (validations.has(target.id)) return res.status(409).json({ error: 'A validation is already running for this target.' });
  validations.add(target.id);
  try {
    const validation = await validateDefenses(target, req.body.defenses, [...store.traces]);
    store.validations.push(validation);
    saveStore(store);
    res.json(validation);
  } catch (error) { next(error); }
  finally { validations.delete(target.id); }
});

app.patch('/api/targets/:id/defenses', (req, res) => {
  const target = store.targets.find(t => t.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Target not found.' });
  if (!validDefense(req.body)) return res.status(400).json({ error: 'All five defense settings must be booleans.' });
  target.defenses = Object.fromEntries(defenseKeys.map(k => [k, req.body[k]])) as unknown as Defense;
  saveStore(store);
  res.json(target);
});

app.get('/api/report', (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="agentbreak-security-report.json"');
  res.json({ generatedAt: new Date().toISOString(), environment: 'Isolated sandbox; built-in targets are policy-based simulations.', ...store });
});

// AgentBreak Platform v2: twin, gateway, attack graph, repair, gate, and audit APIs.
app.post('/api/platform/twins', withPlatformErrors((req, res) => { if (!requireOperator(req, res)) return; const twin = importTwin(requirePlatform(), req.body); persistPlatform(); res.status(201).json(twin); }));
app.post('/api/platform/twins/:id/version', withPlatformErrors((req, res) => { if (!requireOperator(req, res)) return; const body = req.body as { policy?: ShieldPolicy; shieldMode?: 'observe' | 'enforce'; allowedOrigins?: string[]; refundLimit?: number }; const twin = patchTwin(requirePlatform(), req.params.id, body); persistPlatform(); res.status(201).json(twin); }));
app.post('/api/platform/sessions', withPlatformErrors((req, res) => { const session = createSession(requirePlatform(), req.body.twinId, req.body.actorId, req.body.tenantId); persistPlatform(); res.status(201).json(session); }));
app.post('/api/platform/sessions/:id/events', withPlatformErrors((req, res) => { const event = runRuntimeOperation(requirePlatform(), req.params.id, parseOperation(req.body)); persistPlatform(); res.status(201).json(event); }));
app.post('/api/platform/sessions/:id/approvals/:approvalId', withPlatformErrors((req, res) => { if (!requireOperator(req, res)) return; const result = approveRuntime(requirePlatform(), req.params.id, req.params.approvalId, req.body.approve === true, String(req.body.reviewer || 'operator'), String(req.body.reason || '')); persistPlatform(); res.json(result); }));
app.post('/api/platform/experiments', withPlatformErrors((req, res) => { const requestedMode = req.body.mode === 'model' ? 'model' : 'fixture'; if (requestedMode === 'model' && (!process.env.AGENTBREAK_MODEL_BASE_URL || !process.env.AGENTBREAK_MODEL_NAME)) return res.status(400).json({ error: 'Model mode requires AGENTBREAK_MODEL_BASE_URL and AGENTBREAK_MODEL_NAME. Fixture mode remains fully reproducible.' }); const experiment = startExperiment(requirePlatform(), req.body.twinId, String(req.body.name || 'Autonomous attack discovery'), Math.min(50, Math.max(1, Number(req.body.budget || 12))), Math.max(0, Number(req.body.seed || 7331)), requestedMode); persistPlatform(); res.status(201).json(experiment); }));
app.post('/api/platform/experiments/:id/step', withPlatformErrors(async (req, res) => { const result = await advanceExperiment(requirePlatform(), req.params.id); persistPlatform(); res.status(201).json(result); }));
app.post('/api/platform/experiments/:id/stop', withPlatformErrors((req, res) => { const experiment = stopExperiment(requirePlatform(), req.params.id); persistPlatform(); res.json(experiment); }));
app.post('/api/platform/runs/:id/replay', withPlatformErrors(async (req, res) => { const run = await replayRun(requirePlatform(), req.params.id); persistPlatform(); res.status(201).json(run); }));
app.post('/api/platform/runs/:id/causal', withPlatformErrors((req, res) => { const analysis = analyzeRun(requirePlatform(), req.params.id); persistPlatform(); res.status(201).json(analysis); }));
app.post('/api/platform/repairs/search', withPlatformErrors((req, res) => { const repair = findRepair(requirePlatform(), req.body.twinId); persistPlatform(); res.status(201).json(repair); }));
app.post('/api/platform/repairs/:id/apply', withPlatformErrors((req, res) => { if (!requireOperator(req, res)) return; const twin = applyRepair(requirePlatform(), req.params.id); persistPlatform(); res.status(201).json(twin); }));
app.post('/api/platform/gates', withPlatformErrors(async (req, res) => { if (!requireOperator(req, res)) return; const gate = await runGate(requirePlatform(), req.body.twinId); persistPlatform(); res.status(201).json(gate); }));
app.get('/api/platform/evidence/:id', withPlatformErrors((req, res) => { const platform = requirePlatform(); const run = platform.runs.find(r => r.id === req.params.id); const analysis = platform.analyses.find(a => a.runId === req.params.id); const audit = platform.audit.filter(a => a.subjectId === req.params.id || (a.payload && typeof a.payload === 'object' && JSON.stringify(a.payload).includes(req.params.id))); if (!run) return res.status(404).json({ error: 'Evidence subject not found.' }); res.json({ run, analysis, audit, graph: { nodes: [{ id: 'source', label: 'Untrusted source', kind: 'source' }, ...run.scenario.operations.map(o => ({ id: o.id, label: o.label, kind: o.tool })), { id: 'outcome', label: run.verification.objectiveMet ? 'Unauthorized effect' : 'Prevented', kind: 'outcome' }], edges: run.scenario.operations.map((o, i) => ({ from: i === 0 ? 'source' : run.scenario.operations[i - 1].id, to: o.id })).concat(run.scenario.operations.length ? [{ from: run.scenario.operations.at(-1)!.id, to: 'outcome' }] : []) } }); }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
const dist = resolve('dist');
if (existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html'))); }
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'The operation could not be completed. Check the server log and try again.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => console.log(`AgentBreak API running at http://localhost:${port}`));
