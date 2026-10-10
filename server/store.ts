import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { builtInTargets, id, runSimulation, selectAttack } from './engine.js';
import { SURFACES, type Campaign, type Store } from '../shared/types.js';
import { demoOverview, seedPlatform } from './platform/index.js';
import { fingerprintTwin } from './platform/twins.js';

const directory = resolve(process.env.AGENTBREAK_DATA_DIR || '.agentbreak');
const file = resolve(directory, 'store.json');

function seedStore(): Store {
  const store: Store = { version: 1, targets: builtInTargets(), campaigns: [], traces: [], validations: [] };
  const names = ['Initial security baseline', 'Retrieval boundary assessment', 'Finance permission audit', 'Memory persistence evaluation', 'Multi-stage exploit discovery', 'Support agent red team'];
  for (let i = 0; i < names.length; i++) {
    const target = store.targets[[0, 1, 2, 1, 0, 0][i]];
    const startedAt = new Date(Date.now() - (5 - i) * 86400000 - 3600000).toISOString();
    const campaign: Campaign = { id: id('cmp'), name: names[i], targetId: target.id, surfaces: SURFACES.map(s => s.id), budget: 20 + i * 4, seed: 4200 + i, status: 'completed', completed: 0, successes: 0, errors: 0, startedAt, targetSnapshot: structuredClone(target) };
    const history = [];
    for (let j = 0; j < campaign.budget; j++) {
      const trace = runSimulation(target, selectAttack(campaign, history), campaign.id);
      trace.createdAt = new Date(new Date(startedAt).getTime() + j * 1000).toISOString();
      history.push(trace);
      campaign.completed++;
      if (trace.outcome === 'success') campaign.successes++;
    }
    campaign.finishedAt = history.at(-1)!.createdAt;
    store.campaigns.push(campaign);
    store.traces.push(...history);
  }
  return store;
}

export function loadStore(): Store {
  mkdirSync(directory, { recursive: true });
  const store: Store = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : seedStore();
  if (!store.platform || store.platform.version !== 2) store.platform = seedPlatform();
  const researchIdentity = store.platform.twins[0]?.agents.find(agent => agent.id === 'research');
  if (researchIdentity && !researchIdentity.intendedTools.includes('export_data')) { researchIdentity.intendedTools.push('export_data'); store.platform.twins[0].fingerprint = fingerprintTwin(store.platform.twins[0]); }
  const currentFingerprints = new Set(store.platform.twins.map(twin => twin.fingerprint));
  store.platform.repairs = store.platform.repairs.filter(repair => currentFingerprints.has(repair.twinFingerprint));
  store.platform.gates = store.platform.gates.filter(gate => currentFingerprints.has(gate.twinFingerprint));
  if (!store.platform.runs.length) demoOverview(store.platform);
  for (const campaign of store.campaigns) {
    if (campaign.status === 'running') { campaign.status = 'stopped'; campaign.finishedAt = new Date().toISOString(); }
  }
  if (process.env.AGENTBREAK_MODEL_BASE_URL && process.env.AGENTBREAK_MODEL_NAME) {
    const savedModel = store.targets.find(t => t.id === 'live-model');
    store.targets = store.targets.filter(t => t.id !== 'live-model');
    store.targets.push({ ...builtInTargets()[0], ...(savedModel ? { defenses: savedModel.defenses } : {}), id: 'live-model', name: process.env.AGENTBREAK_MODEL_LABEL || 'Connected Model', initials: 'LM', color: 'orange', mode: 'model', model: process.env.AGENTBREAK_MODEL_NAME, description: 'OpenAI-compatible model running with isolated sandbox tools.' });
  } else store.targets = store.targets.filter(t => t.id !== 'live-model');
  saveStore(store);
  return store;
}

export function saveStore(store: Store) {
  writeFileSync(`${file}.tmp`, JSON.stringify(store, null, 2));
  renameSync(`${file}.tmp`, file);
}
