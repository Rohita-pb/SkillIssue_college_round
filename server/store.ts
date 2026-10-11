import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import PrismaPackage from '@prisma/client';
import type { Prisma, PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { builtInTargets, id, runSimulation, selectAttack } from './engine.js';
import { SURFACES, type Campaign, type Store } from '../shared/types.js';
import { demoOverview, seedPlatform } from './platform/index.js';
import { signAuditHead } from './audit-signing.js';

export const usesDatabase = () => Boolean(process.env.DATABASE_URL) && process.env.AGENTBREAK_STORAGE !== 'file';
const { PrismaClient } = PrismaPackage;
let prisma: PrismaClientType | undefined;
export function databaseClient() {
  if (!usesDatabase()) throw new Error('DATABASE_URL is required.');
  return prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, connectionTimeoutMillis: 5000 }) });
}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const clone = <T>(value: unknown) => JSON.parse(JSON.stringify(value)) as T;

export function seedStore(tenantId: string, demo = process.env.NODE_ENV !== 'production'): Store {
  const store: Store = { version: 1, targets: builtInTargets().map(target => ({ ...target, tenantId })), campaigns: [], traces: [], validations: [], platform: seedPlatform() };
  store.platform!.twins[0].tenantId = tenantId;
  if (demo) {
    const names = ['Initial security baseline', 'Retrieval boundary assessment', 'Finance permission audit', 'Memory persistence evaluation', 'Multi-stage exploit discovery', 'Support agent red team'];
    for (let i = 0; i < names.length; i++) {
      const target = store.targets[[0, 1, 2, 1, 0, 0][i]];
      const startedAt = new Date(Date.now() - (5 - i) * 86400000 - 3600000).toISOString();
      const campaign: Campaign = { id: id('cmp'), tenantId, name: names[i], targetId: target.id, surfaces: SURFACES.map(s => s.id), budget: 20 + i * 4, seed: 4200 + i, status: 'completed', completed: 0, successes: 0, errors: 0, startedAt, targetSnapshot: structuredClone(target) };
      const history = [];
      for (let j = 0; j < campaign.budget; j++) {
        const trace = runSimulation(target, selectAttack(campaign, history), campaign.id);
        trace.tenantId = tenantId;
        trace.createdAt = new Date(Date.parse(startedAt) + j * 1000).toISOString();
        history.push(trace); campaign.completed++;
        if (trace.outcome === 'success') campaign.successes++;
      }
      campaign.finishedAt = history.at(-1)!.createdAt;
      store.campaigns.push(campaign); store.traces.push(...history);
    }
    demoOverview(store.platform!);
  }
  return store;
}

function configureTargets(store: Store, tenantId: string) {
  for (const item of [...store.targets, ...store.campaigns, ...store.traces, ...store.validations, ...store.platform?.twins || []]) item.tenantId = tenantId;
  if (process.env.AGENTBREAK_MODEL_BASE_URL && process.env.AGENTBREAK_MODEL_NAME) {
    const saved = store.targets.find(target => target.id === 'live-model');
    if (!saved) store.targets.push({ ...builtInTargets()[0], id: 'live-model', tenantId, name: process.env.AGENTBREAK_MODEL_LABEL || 'Connected Model', mode: 'model', model: process.env.AGENTBREAK_MODEL_NAME });
  }
}

async function readDatabase(tx: Prisma.TransactionClient, tenantId: string): Promise<Store | undefined> {
  const meta = await tx.workspaceState.findUnique({ where: { id: tenantId } });
  if (!meta) return;
  const [targets, campaigns, traces, validations] = await Promise.all([
    tx.targetRecord.findMany({ where: { tenantId } }),
    tx.campaignRecord.findMany({ where: { tenantId }, orderBy: { startedAt: 'asc' } }),
    tx.traceRecord.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
    tx.validationRecord.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
  ]);
  return { ...clone<Store>(meta.state), targets: targets.map(row => clone(row.snapshot)), campaigns: campaigns.map(row => clone(row.snapshot)), traces: traces.map(row => clone(row.snapshot)), validations: validations.map(row => clone(row.snapshot)) };
}

async function writeDatabase(tx: Prisma.TransactionClient, tenantId: string, store: Store, before?: Store) {
  const changed = <T extends { id: string }>(items: T[], previous: T[] = []) => {
    const existing = new Map(previous.map(item => [item.id, JSON.stringify(item)]));
    return items.filter(item => existing.get(item.id) !== JSON.stringify(item));
  };
  for (const target of changed(store.targets, before?.targets)) {
    const data = { tenantId, id: target.id, snapshot: json(target) };
    await tx.targetRecord.upsert({ where: { tenantId_id: { tenantId, id: target.id } }, create: data, update: data });
  }
  for (const campaign of changed(store.campaigns, before?.campaigns)) {
    const data = { tenantId, id: campaign.id, targetId: campaign.targetId, status: campaign.status, completed: campaign.completed, startedAt: new Date(campaign.startedAt), snapshot: json(campaign) };
    await tx.campaignRecord.upsert({ where: { tenantId_id: { tenantId, id: campaign.id } }, create: data, update: data });
  }
  for (const trace of changed(store.traces, before?.traces)) {
    const data = { tenantId, id: trace.id, campaignId: trace.campaignId, outcome: trace.outcome, createdAt: new Date(trace.createdAt), snapshot: json(trace) };
    await tx.traceRecord.upsert({ where: { tenantId_id: { tenantId, id: trace.id } }, create: data, update: data });
  }
  for (const validation of changed(store.validations, before?.validations)) {
    const data = { tenantId, id: validation.id, createdAt: new Date(validation.createdAt), snapshot: json(validation) };
    await tx.validationRecord.upsert({ where: { tenantId_id: { tenantId, id: validation.id } }, create: data, update: data });
  }
  const state = json({ version: store.version, platform: store.platform });
  await tx.workspaceState.upsert({ where: { id: tenantId }, create: { id: tenantId, state }, update: { state } });
}

const fileLocks = new Map<string, Promise<unknown>>();
function filePath(tenantId: string) {
  const directory = resolve(process.env.AGENTBREAK_DATA_DIR || '.agentbreak');
  mkdirSync(directory, { recursive: true });
  return resolve(directory, tenantId === 'default' ? 'store.json' : `tenant-${createHash('sha256').update(tenantId).digest('hex')}.json`);
}

/** Each mutation reads fresh state under a tenant-specific database lock and
 * commits before returning. No process-local snapshot is ever written back. */
export async function withStore<T>(tenantId: string, action: (store: Store) => T | Promise<T>, write = true): Promise<T> {
  const run = async (tx?: Prisma.TransactionClient) => {
    if (tx) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}, 0))`;
    const file = tx ? undefined : filePath(tenantId);
    const existing = tx ? await readDatabase(tx, tenantId) : existsSync(file!) ? JSON.parse(readFileSync(file!, 'utf8')) as Store : undefined;
    const store = existing || seedStore(tenantId);
    const before = existing ? structuredClone(existing) : undefined;
    configureTargets(store, tenantId);
    const result = await action(store);
    if (write || !existing) {
      if (store.platform && store.platform.audit.at(-1)?.hash !== before?.platform?.audit.at(-1)?.hash) {
        const signature = await signAuditHead(store.platform.audit.at(-1)?.hash, tenantId);
        if (signature) store.platform.auditSignature = signature;
      }
      if (tx) await writeDatabase(tx, tenantId, store, before);
      else { writeFileSync(`${file}.tmp`, JSON.stringify(store)); renameSync(`${file}.tmp`, file!); }
    }
    return structuredClone(result);
  };
  if (usesDatabase()) return databaseClient().$transaction(tx => run(tx), { maxWait: 10_000, timeout: 240_000 });
  const pending = (fileLocks.get(tenantId) || Promise.resolve()).catch(() => {}).then(() => run());
  fileLocks.set(tenantId, pending);
  try { return await pending; } finally { if (fileLocks.get(tenantId) === pending) fileLocks.delete(tenantId); }
}

export const loadStore = (tenantId = 'default') => withStore(tenantId, store => store, false);
export async function checkDatabase() {
  if (!usesDatabase()) return true;
  try { await databaseClient().$queryRaw`SELECT 1`; return true; } catch { return false; }
}
export async function closeDatabase() { await prisma?.$disconnect(); }
