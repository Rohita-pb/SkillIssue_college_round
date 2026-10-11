import { readFileSync } from 'node:fs';
import type { Store } from '../shared/types.js';
import { withStore, closeDatabase, databaseClient } from './store.js';
import { verifyAudit } from './platform/audit.js';

const [file, tenantId] = process.argv.slice(2);
if (!file || !tenantId || !/^[a-zA-Z0-9_-]{1,80}$/.test(tenantId)) throw new Error('Usage: npm run db:import -- <store.json> <tenantId>');
try {
  const source = JSON.parse(readFileSync(file, 'utf8')) as Store;
  if (source.version !== 1 || ![source.targets, source.campaigns, source.traces, source.validations].every(Array.isArray)) throw new Error('Unsupported store format.');
  if (source.platform && !verifyAudit(source.platform.audit).valid) throw new Error('Source audit chain is invalid.');
  if (await databaseClient().workspaceState.findUnique({ where: { id: tenantId } })) throw new Error('Import requires a new tenant ID.');
  // Legacy imports may reference an unregistered imported campaign or target.
  for (const trace of source.traces) {
    if (!source.targets.some(target => target.id === trace.targetId)) source.targets.push(trace.targetSnapshot);
    if (!source.campaigns.some(campaign => campaign.id === trace.campaignId)) source.campaigns.push({ id: trace.campaignId, name: 'Legacy imported traces', targetId: trace.targetId, surfaces: [trace.input.surface], budget: 0, seed: 0, status: 'stopped', completed: 0, successes: 0, errors: 0, startedAt: trace.createdAt, targetSnapshot: trace.targetSnapshot });
  }
  for (const campaign of source.campaigns) if (campaign.status === 'running') campaign.status = 'stopped';
  for (const item of [...source.targets, ...source.campaigns, ...source.traces, ...source.validations, ...source.platform?.twins || []]) item.tenantId = tenantId;
  await withStore(tenantId, state => { Object.assign(state, source); });
  console.info(`Imported ${source.campaigns.length} campaigns and ${source.traces.length} traces into ${tenantId}.`);
} finally { await closeDatabase(); }
