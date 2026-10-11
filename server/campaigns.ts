import { runAttack, selectAttack } from './engine.js';
import { loadStore, withStore } from './store.js';

export async function executeCampaign(tenantId: string, campaignId: string, stopping = () => false): Promise<void> {
  while (!stopping()) {
    const state = await loadStore(tenantId);
    const campaign = state.campaigns.find(item => item.id === campaignId);
    if (!campaign || campaign.status !== 'running') return;
    const history = state.traces.filter(trace => trace.campaignId === campaign.id && !trace.replayOf);
    const trace = await runAttack(campaign.targetSnapshot, selectAttack(campaign, history), campaign.id);
    trace.tenantId = tenantId;
    // Stable attempt identity and a compare-and-swap on completed prevent
    // duplicate commits after retries, stalled jobs, or worker replacement.
    trace.id = `${campaign.id}_attempt_${campaign.completed}`;
    await withStore(tenantId, store => {
      const current = store.campaigns.find(item => item.id === campaignId);
      if (!current || current.status !== 'running' || current.completed !== campaign.completed) return;
      store.traces.push(trace); current.completed++;
      if (trace.outcome === 'success') current.successes++;
      if (trace.outcome === 'error') current.errors++;
      if (current.completed >= current.budget) {
        current.status = current.errors === current.completed ? 'failed' : 'completed';
        current.finishedAt = new Date().toISOString();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
