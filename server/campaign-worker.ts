import { Worker } from 'bullmq';
import { hostname } from 'node:os';
import { pathToFileURL } from 'node:url';
import { CAMPAIGN_QUEUE, closeQueueConnections, enqueueCampaign, redisClient, redisOptions, WORKER_HEARTBEATS } from './queue.js';
import { closeDatabase, databaseClient, withStore } from './store.js';
import { executeCampaign } from './campaigns.js';

export async function startCampaignWorker() {
  if (!process.env.DATABASE_URL || !process.env.REDIS_URL) throw new Error('Workers require DATABASE_URL and REDIS_URL.');
  let stopping = false;
  const workerId = `${process.env.HOSTNAME || hostname()}:${process.pid}`;
  const worker = new Worker<{ campaignId: string; tenantId: string }>(CAMPAIGN_QUEUE,
    job => executeCampaign(job.data.tenantId, job.data.campaignId, () => stopping),
    { connection: redisOptions(), concurrency: Number(process.env.CAMPAIGN_WORKER_CONCURRENCY || 2), lockDuration: 60_000 });
  worker.on('error', error => console.error('Worker error:', error.message));
  worker.on('failed', (job, error) => {
    console.error(`Campaign job ${job?.id} failed:`, error.message);
    if (!job || job.attemptsMade < (job.opts.attempts || 1)) return;
    void withFailedCampaign(job.data.tenantId, job.data.campaignId).catch(failure => console.error('Could not mark campaign failed:', failure));
  });
  let reconciling = false;
  const reconcile = async () => {
    if (reconciling || stopping) return;
    reconciling = true;
    try {
      await redisClient().zadd(WORKER_HEARTBEATS, Date.now(), workerId);
      await redisClient().expire(WORKER_HEARTBEATS, 60);
      // The running database row is the durable dispatch intent. Redis outages
      // or an API crash between commit and enqueue cannot lose a campaign.
      const campaigns = await databaseClient().campaignRecord.findMany({ where: { status: 'running' }, select: { id: true, tenantId: true } });
      for (const campaign of campaigns) await enqueueCampaign(campaign);
    } catch (error) { console.error('Campaign reconciliation failed:', error); }
    finally { reconciling = false; }
  };
  await worker.waitUntilReady();
  await reconcile();
  const timer = setInterval(() => void reconcile(), 5000);
  return async () => {
    stopping = true;
    clearInterval(timer);
    try { await redisClient().zrem(WORKER_HEARTBEATS, workerId); } catch { /* Redis may already be unavailable. */ }
    await worker.close();
    await closeQueueConnections();
    await closeDatabase();
  };
}

async function withFailedCampaign(tenantId: string, campaignId: string) {
  await withStore(tenantId, store => {
    const campaign = store.campaigns.find(item => item.id === campaignId);
    if (campaign?.status === 'running') {
      campaign.status = 'failed';
      campaign.finishedAt = new Date().toISOString();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startCampaignWorker().then(close => {
    console.info('AgentBreak campaign worker ready.');
    for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => void close().catch(console.error));
  }).catch(error => { console.error(error); process.exitCode = 1; });
}
