import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { createHash } from 'node:crypto';
import type { Campaign } from '../shared/types.js';

export const CAMPAIGN_QUEUE = 'agentbreak-campaigns';
export const WORKER_HEARTBEATS = 'agentbreak:worker:heartbeats';
export const queueEnabled = () => Boolean(process.env.REDIS_URL);
let redis: Redis | undefined;
let queue: Queue<{ campaignId: string; tenantId: string }> | undefined;
export function redisClient() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required.');
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000, commandTimeout: 5000 });
    redis.on('error', error => console.error('Redis unavailable:', error.message));
  }
  return redis;
}
export function redisOptions() {
  const url = new URL(process.env.REDIS_URL!);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username ? decodeURIComponent(url.username) : undefined, password: url.password ? decodeURIComponent(url.password) : undefined, db: Number(url.pathname.slice(1) || 0), ...(url.protocol === 'rediss:' ? { tls: {} } : {}) };
}
export function campaignQueue() { return queue ??= new Queue(CAMPAIGN_QUEUE, { connection: { ...redisOptions(), maxRetriesPerRequest: 1 } }); }
export async function enqueueCampaign(campaign: Pick<Campaign, 'id' | 'tenantId'>) {
  const jobId = createHash('sha256').update(`${campaign.tenantId}:${campaign.id}`).digest('hex');
  const queue = campaignQueue();
  const existing = await queue.getJob(jobId);
  if (existing && ['completed', 'failed'].includes(await existing.getState())) await existing.remove();
  await queue.add('execute', { campaignId: campaign.id, tenantId: campaign.tenantId || 'default' }, { jobId, attempts: 5, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 100 });
}
export async function checkQueue() {
  if (!queueEnabled()) return { connected: true, worker: true };
  try {
    const client = redisClient();
    await client.ping();
    const cutoff = Date.now() - 30_000;
    await client.zremrangebyscore(WORKER_HEARTBEATS, '-inf', cutoff);
    return { connected: true, worker: (await client.zcard(WORKER_HEARTBEATS)) > 0 };
  }
  catch { return { connected: false, worker: false }; }
}
export async function closeQueueConnections() { await queue?.close(); if (redis) redis.disconnect(); }
