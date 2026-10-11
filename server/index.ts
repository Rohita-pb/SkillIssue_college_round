import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { SURFACES, type Campaign, type Defense, type Store } from '../shared/types.js';
import { TWIN_TOOLS, type PlatformState } from '../shared/platform.js';
import { id, runAttack, validateDefenses } from './engine.js';
import { withStore, loadStore, checkDatabase, closeDatabase, usesDatabase } from './store.js';
import { advanceExperiment, analyzeRun, applyRepair, approveRuntime, createSession, findRepair, getTwin, importTwin, patchTwin, replayRun, runGate, runRuntimeOperation, startExperiment, stopExperiment, viewPlatform } from './platform/index.js';
import { auditPermissions, policySchema } from './platform/twins.js';
import { appendAudit, verifyAudit } from './platform/audit.js';
import { verifyAuditSignature } from './audit-signing.js';
import { authMiddleware, isPrivileged, tenantId, validateProductionConfig, verifyToken } from './auth.js';
import { executeCampaign } from './campaigns.js';
import { enqueueCampaign, queueEnabled, checkQueue, redisClient, closeQueueConnections } from './queue.js';
import { normalizeProviderOperation, providerNames } from './connectors/index.js';

validateProductionConfig();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.AGENTBREAK_TRUST_PROXY_HOPS || 0));
app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'"], 'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null } } }));
const asyncRoute = (fn: (req: express.Request, res: express.Response) => unknown) => (req: express.Request, res: express.Response, next: express.NextFunction) => { Promise.resolve().then(() => fn(req, res)).catch(next); };
let shuttingDown = false;
app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get(['/api/health', '/api/health/ready'], asyncRoute(async (_req, res) => {
  const [database, queue] = await Promise.all([checkDatabase(), checkQueue()]);
  const ready = !shuttingDown && database && queue.connected && queue.worker;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'not-ready', database, queue, modelConnected: Boolean(process.env.AGENTBREAK_MODEL_NAME) });
}));
const origins = new Set((process.env.AGENTBREAK_CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    let allowed = origins.has(origin);
    if (process.env.NODE_ENV !== 'production') {
      try {
        const url = new URL(origin);
        const host = new URL(`http://${req.headers.host}`).hostname;
        const loopback = ['localhost', '127.0.0.1', '[::1]'];
        allowed ||= url.host === req.headers.host || (loopback.includes(url.hostname) && loopback.includes(host));
      } catch { /* malformed origins fail closed */ }
    }
    if (!allowed) return res.status(403).json({ error: 'Origin is not allowed.' });
  } else if (req.headers.cookie?.includes('agentbreak_session=') && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return res.status(403).json({ error: 'Cookie-authenticated mutations require an allowed Origin.' });
  }
  next();
});
app.use('/api', cors({ origin: true, credentials: true, allowedHeaders: ['Authorization', 'Content-Type', 'Last-Event-ID'], maxAge: 600 }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: Number(process.env.AGENTBREAK_RATE_LIMIT || 300), standardHeaders: 'draft-7', legacyHeaders: false,
  ...(queueEnabled() ? { store: new RedisStore({ sendCommand: (...args: string[]) => redisClient().call(...args as [string, ...string[]]) as Promise<number | string | (number | string)[]>, prefix: 'agentbreak:ratelimit:' }) } : {}),
}));
app.use(express.json({ limit: '128kb' }));
app.post('/api/auth/session', asyncRoute((req, res) => {
  const token = z.string().min(1).max(16000).parse(req.body?.token);
  const user = verifyToken(token);
  res.cookie('agentbreak_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api', maxAge: Math.max(0, user.expiresAt! - Date.now()) });
  res.json({ subject: user.subject, tenantId: user.tenantId, roles: user.roles });
}));
app.use('/api', authMiddleware);
app.get('/api/auth/me', (req, res) => res.json(req.user));
app.post('/api/auth/logout', (_req, res) => { res.clearCookie('agentbreak_session', { path: '/api', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' }); res.sendStatus(204); });
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !isPrivileged(req) && !req.user?.roles.includes('analyst') && !(req.path.startsWith('/gateway/') && req.user?.roles.includes('gateway'))) return res.status(403).json({ error: 'Write access requires the analyst, operator, or gateway role.' });
  next();
});

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
function found<T>(value: T | undefined, label: string): T { if (!value) throw new HttpError(404, `${label} not found.`); return value; }
function operator(req: express.Request) { if (!isPrivileged(req)) throw new HttpError(403, 'Operator role required.'); }
function platform(store: Store): PlatformState { return found(store.platform, 'Platform'); }
const read = (path: string, action: (store: Store, req: express.Request) => unknown) => app.get(path, asyncRoute(async (req, res) => res.json(await withStore(tenantId(req), store => action(store, req), false))));
const mutate = (path: string, action: (store: Store, req: express.Request) => unknown, status = 201) => app.post(path, asyncRoute(async (req, res) => {
  const result = await withStore(tenantId(req), async store => {
    const result = await action(store, req);
    if (store.platform) appendAudit(store.platform.audit, 'api.mutation', req.path, { actor: req.user!.subject, tenantId: tenantId(req), method: req.method });
    return result;
  });
  res.status(status).json(result);
}));
const defenseSchema = z.object({ sourceIsolation: z.boolean(), toolPermissions: z.boolean(), memoryGuard: z.boolean(), outboundFilter: z.boolean(), lockdown: z.boolean() }).strict();
const operationSchema = z.object({ id: z.string().min(1).max(160), label: z.string().min(1).max(200), tool: z.enum(TWIN_TOOLS), args: z.record(z.string(), z.unknown()), turn: z.number().int().min(0).max(100), source: z.object({ kind: z.enum(['user', 'retrieval', 'memory', 'delegation']), id: z.string().min(1).max(200), trusted: z.boolean() }).strict(), requires: z.array(z.string()).max(100).optional() }).strict();

read('/api/state', store => store);
read('/api/report', store => ({ generatedAt: new Date().toISOString(), environment: 'Synthetic sandbox effects', ...store }));
app.post('/api/campaigns', asyncRoute(async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(100), targetId: z.string(), surfaces: z.array(z.enum(['retrieval', 'instructions', 'memory', 'tools', 'multi-stage'])).min(1).max(5), budget: z.number().int().min(5).max(100), seed: z.number().int().min(0).max(2147483647) }).strict().parse(req.body);
  const tenant = tenantId(req);
  const campaign = await withStore(tenant, store => {
    const target = found(store.targets.find(target => target.id === input.targetId), 'Target');
    if (store.campaigns.filter(item => item.status === 'running').length >= 3) throw new HttpError(409, 'Three campaigns are already running.');
    const campaign: Campaign = { ...input, id: id('cmp'), tenantId: tenant, surfaces: [...new Set(input.surfaces)], status: 'running', completed: 0, successes: 0, errors: 0, startedAt: new Date().toISOString(), targetSnapshot: structuredClone(target) };
    store.campaigns.push(campaign); return campaign;
  });
  if (queueEnabled()) {
    // The worker's database reconciler retries dispatch if Redis is unavailable.
    void enqueueCampaign(campaign).catch(error => console.error('Dispatch deferred to reconciler:', error.message));
  } else void executeCampaign(tenant, campaign.id).catch(error => console.error('Inline campaign failed:', error));
  res.status(201).json(campaign);
}));
mutate('/api/campaigns/:id/stop', (store, req) => {
  const campaign = found(store.campaigns.find(item => item.id === req.params.id), 'Campaign');
  if (campaign.status === 'running') { campaign.status = 'stopped'; campaign.finishedAt = new Date().toISOString(); }
  return campaign;
}, 200);
app.get('/api/campaigns/:id/events', asyncRoute(async (req, res) => {
  const tenant = tenantId(req);
  const initial = await loadStore(tenant);
  found(initial.campaigns.find(item => item.id === req.params.id), 'Campaign');
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let closed = false;
  req.on('close', () => { closed = true; });
  let last = '';
  while (!closed) {
    if (req.user?.expiresAt && Date.now() >= req.user.expiresAt) break;
    const state = await loadStore(tenant);
    const campaign = found(state.campaigns.find(item => item.id === req.params.id), 'Campaign');
    const revision = `${campaign.completed}:${campaign.status}`;
    if (revision !== last) {
      const data = { campaign, traces: state.traces.filter(trace => trace.campaignId === campaign.id) };
      res.write(`id: ${revision}\nevent: ${campaign.status === 'running' ? 'progress' : 'complete'}\ndata: ${JSON.stringify(data)}\n\n`);
      last = revision;
    } else res.write(': heartbeat\n\n');
    if (campaign.status !== 'running' || res.writableLength > 1024 * 1024) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  res.end();
}));
read('/api/traces/:id/export', (store, req) => ({ schemaVersion: 1, exportedAt: new Date().toISOString(), trace: found(store.traces.find(trace => trace.id === req.params.id), 'Trace') }));
mutate('/api/traces/:id/replay', async (store, req) => {
  const original = found(store.traces.find(trace => trace.id === req.params.id), 'Trace');
  const trace = await runAttack(original.targetSnapshot, original.input, original.campaignId, original.id);
  trace.tenantId = tenantId(req); store.traces.push(trace); return trace;
}, 200);
mutate('/api/traces/import', async (store, req) => {
  const input = z.object({ surface: z.enum(['retrieval', 'instructions', 'memory', 'tools', 'multi-stage']), variant: z.number().int().min(0).max(3), payload: z.string().max(16000), strategy: z.string().max(1000), objective: z.string().max(2000) });
  const target = z.object({ id: z.string().min(1).max(160), name: z.string().max(100), description: z.string().max(2000), initials: z.string().max(10), color: z.string().max(30), mode: z.enum(['simulation', 'model']), model: z.string().optional(), tenantId: z.string().optional(), tools: z.array(z.enum(['read_document', 'read_private_record', 'http_request', 'issue_refund', 'write_memory'])).max(5), weaknesses: z.array(input.shape.surface).max(5), defenses: defenseSchema });
  const value = z.object({ schemaVersion: z.literal(1), trace: z.object({ id: z.string().max(160), input, targetSnapshot: target }) }).parse(req.body);
  const snapshot = value.trace.targetSnapshot;
  if (snapshot.mode === 'model' && snapshot.model !== process.env.AGENTBREAK_MODEL_NAME) throw new HttpError(409, 'Connect the matching model first.');
  const targetId = store.targets.some(item => item.id === snapshot.id) ? snapshot.id : id('imported-target');
  if (!store.targets.some(item => item.id === targetId)) store.targets.push({ ...snapshot, id: targetId, tenantId: tenantId(req) });
  const campaign: Campaign = { id: id('import'), tenantId: tenantId(req), name: 'Imported reproduction', targetId, surfaces: [value.trace.input.surface], budget: 1, seed: 0, status: 'completed', completed: 1, successes: 0, errors: 0, startedAt: new Date().toISOString(), targetSnapshot: snapshot };
  const trace = await runAttack(snapshot, value.trace.input, campaign.id, value.trace.id);
  trace.tenantId = tenantId(req); campaign.successes = Number(trace.outcome === 'success'); campaign.errors = Number(trace.outcome === 'error'); campaign.finishedAt = trace.createdAt;
  store.campaigns.push(campaign); store.traces.push(trace); return trace;
});
mutate('/api/validations', async (store, req) => {
  const target = found(store.targets.find(target => target.id === req.body?.targetId), 'Target');
  const validation = await validateDefenses(target, defenseSchema.parse(req.body.defenses), store.traces);
  validation.tenantId = tenantId(req); store.validations.push(validation); return validation;
}, 200);
app.patch('/api/targets/:id/defenses', asyncRoute(async (req, res) => res.json(await withStore(tenantId(req), store => {
  const target = found(store.targets.find(target => target.id === req.params.id), 'Target');
  target.defenses = defenseSchema.parse(req.body) as Defense; return target;
}))));

read('/api/platform', store => viewPlatform(platform(store)));
read('/api/platform/report', store => ({ schemaVersion: 2, generatedAt: new Date().toISOString(), evidenceBoundary: 'Synthetic digital twin effects', platform: viewPlatform(platform(store)) }));
read('/api/platform/twins/:id/audit', (store, req) => { const twin = getTwin(platform(store), req.params.id); return { twin, findings: auditPermissions(twin) }; });
read('/api/platform/audit/verify', async (store, req) => { const state = platform(store); const chain = verifyAudit(state.audit); return { ...chain, signature: await verifyAuditSignature(state.auditSignature, chain.head, tenantId(req)) }; });
mutate('/api/platform/twins', (store, req) => { operator(req); const twin = importTwin(platform(store), req.body); twin.tenantId = tenantId(req); return twin; });
mutate('/api/platform/twins/:id/version', (store, req) => {
  operator(req);
  const patch = z.object({ policy: policySchema.optional(), shieldMode: z.enum(['observe', 'enforce']).optional(), allowedOrigins: z.array(z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && value === url.origin; })).min(1).max(10).optional(), refundLimit: z.number().positive().max(10000).optional() }).strict().parse(req.body);
  return patchTwin(platform(store), req.params.id, patch);
});
mutate('/api/platform/sessions', (store, req) => { const body = z.object({ twinId: z.string(), actorId: z.string().optional(), tenantId: z.string().optional() }).strict().parse(req.body); return createSession(platform(store), body.twinId, body.actorId!, body.tenantId); });
mutate('/api/platform/sessions/:id/events', (store, req) => runRuntimeOperation(platform(store), req.params.id, operationSchema.parse(req.body)));
mutate('/api/platform/sessions/:id/approvals/:approvalId', (store, req) => { operator(req); const body = z.object({ approve: z.boolean(), reviewer: z.string().optional(), reason: z.string().max(2000).default('') }).strict().parse(req.body); return approveRuntime(platform(store), req.params.id, req.params.approvalId, body.approve, req.user!.subject, body.reason); }, 200);
mutate('/api/platform/experiments', (store, req) => {
  const body = z.object({ twinId: z.string(), name: z.string().min(1).max(100).default('Autonomous attack discovery'), budget: z.number().int().min(1).max(50).default(12), seed: z.number().int().min(0).max(2147483647).default(7331), mode: z.enum(['fixture', 'model']).default('fixture') }).strict().parse(req.body);
  if (body.mode === 'model' && !process.env.AGENTBREAK_MODEL_NAME) throw new HttpError(400, 'Model is not configured.');
  return startExperiment(platform(store), body.twinId, body.name, body.budget, body.seed, body.mode);
});
mutate('/api/platform/experiments/:id/step', (store, req) => advanceExperiment(platform(store), req.params.id));
mutate('/api/platform/experiments/:id/stop', (store, req) => stopExperiment(platform(store), req.params.id), 200);
mutate('/api/platform/runs/:id/replay', (store, req) => replayRun(platform(store), req.params.id));
mutate('/api/platform/runs/:id/causal', (store, req) => analyzeRun(platform(store), req.params.id));
mutate('/api/platform/repairs/search', (store, req) => findRepair(platform(store), z.string().parse(req.body?.twinId)));
mutate('/api/platform/repairs/:id/apply', (store, req) => { operator(req); return applyRepair(platform(store), req.params.id); });
mutate('/api/platform/gates', (store, req) => { operator(req); return runGate(platform(store), z.string().parse(req.body?.twinId)); });
read('/api/platform/evidence/:id', (store, req) => {
  const state = platform(store); const run = found(state.runs.find(run => run.id === req.params.id), 'Evidence');
  return { run, analysis: state.analyses.find(item => item.runId === run.id), audit: state.audit.filter(item => item.subjectId === run.id), graph: { nodes: run.scenario.operations.map(operation => ({ id: operation.id, label: operation.label, kind: operation.tool })), edges: run.scenario.operations.slice(1).map((operation, i) => ({ from: run.scenario.operations[i].id, to: operation.id })) } };
});

function gateway(req: express.Request) { if (!isPrivileged(req) && !req.user?.roles.includes('gateway')) throw new HttpError(403, 'Gateway role required.'); }
mutate('/api/gateway/:provider/sessions/:id/operations', (store, req) => { gateway(req); return { provider: req.params.provider, event: runRuntimeOperation(platform(store), req.params.id, normalizeProviderOperation(req.params.provider, req.body)) }; });
app.post('/api/gateway/:provider/sessions/:id/stream', asyncRoute(async (req, res) => {
  gateway(req);
  if (!providerNames.includes(req.params.provider as typeof providerNames[number])) throw new HttpError(404, 'Connector not found.');
  const items = z.array(z.unknown()).min(1).max(20).parse(req.body?.events);
  const operations = items.map(item => normalizeProviderOperation(req.params.provider, item));
  const state = await loadStore(tenantId(req)); found(state.platform?.sessions.find(session => session.id === req.params.id), 'Session');
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' }); res.flushHeaders();
  for (const operation of operations) {
    if (res.destroyed) break;
    const event = await withStore(tenantId(req), store => runRuntimeOperation(platform(store), req.params.id, operation));
    res.write(`event: decision\ndata: ${JSON.stringify({ provider: req.params.provider, event })}\n\n`);
  }
  res.write('event: complete\ndata: {}\n\n'); res.end();
}));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
if (existsSync(resolve('dist'))) { app.use(express.static(resolve('dist'))); app.get('*', (_req, res) => res.sendFile(resolve('dist/index.html'))); }
app.use((error: Error & { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (res.headersSent) { res.write('event: error\ndata: {"error":"Operation failed"}\n\n'); res.end(); return; }
  const status = error instanceof HttpError ? error.status : error instanceof z.ZodError || error.type === 'entity.parse.failed' ? 400 : error.status === 413 ? 413 : error.message.includes('not found') ? 404 : 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'The operation could not be completed.' : error instanceof z.ZodError ? 'Invalid request.' : error.message });
});
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, '0.0.0.0', () => console.info(`AgentBreak API listening on ${port}`));
server.requestTimeout = 240_000;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  shuttingDown = true;
  server.close(() => { void Promise.all([closeDatabase(), closeQueueConnections()]).then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 30_000).unref();
});
