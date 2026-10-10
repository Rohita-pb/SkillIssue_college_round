import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SURFACES, type AttackInput, type Campaign, type Defense, type Surface, type Target, type ToolName } from '../shared/types.js';
import { id, runAttack, selectAttack, validateDefenses } from './engine.js';
import { loadStore, saveStore } from './store.js';

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
    try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Cross-origin API access is disabled.' }); }
    catch { return res.status(403).json({ error: 'Invalid origin.' }); }
  }
  next();
});

app.get('/api/state', (_req, res) => res.json(store));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'sandbox', modelConnected: store.targets.some(t => t.mode === 'model') }));

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

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
const dist = resolve('dist');
if (existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html'))); }
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'The operation could not be completed. Check the server log and try again.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, '0.0.0.0', () => console.log(`AgentBreak API running at http://localhost:${port}`));
