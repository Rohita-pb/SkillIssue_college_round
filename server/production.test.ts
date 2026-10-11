import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { CircuitBreaker, normalizeProviderOperation } from './connectors/index.js';
import { verifyToken } from './auth.js';

test('provider adapters normalize MCP, Anthropic, LangGraph, and OpenAI tool calls', () => {
  assert.equal(normalizeProviderOperation('mcp', { name: 'read_record', arguments: { resourceId: 'customer-northstar' } }).tool, 'read_record');
  assert.equal(normalizeProviderOperation('anthropic', { name: 'remember', input: { key: 'preferences.language', value: 'English' } }).tool, 'remember');
  assert.equal(normalizeProviderOperation('langgraph', { tool: 'recall', args: { key: 'preferences.language' } }).tool, 'recall');
  assert.equal(normalizeProviderOperation('openai', { tool_call_id: 'call-1', function: { name: 'refund', arguments: '{"amount":25,"tenantId":"northstar"}' } }).tool, 'refund');
  assert.throws(() => normalizeProviderOperation('mcp', { name: 'not-a-runtime-tool', arguments: {} }));
});

test('connector circuit breaker opens after repeated provider failures and recovers', async () => {
  const breaker = new CircuitBreaker(2, 1);
  await assert.rejects(() => breaker.execute(async () => { throw new Error('provider down'); }));
  await assert.rejects(() => breaker.execute(async () => { throw new Error('provider down'); }));
  assert.equal(breaker.state, 'open');
  await new Promise(resolve => setTimeout(resolve, 2));
  assert.equal(await breaker.execute(async () => 'ok'), 'ok');
  assert.equal(breaker.state, 'closed');
});

test('JWT authentication requires tenant, expiry, issuer, and audience claims', () => {
  const previous = { secret: process.env.AGENTBREAK_JWT_SECRET, issuer: process.env.AGENTBREAK_JWT_ISSUER, audience: process.env.AGENTBREAK_JWT_AUDIENCE };
  process.env.AGENTBREAK_JWT_SECRET = 'test-secret-that-is-long-enough-for-signing';
  const secret = process.env.AGENTBREAK_JWT_SECRET;
  process.env.AGENTBREAK_JWT_ISSUER = 'agentbreak';
  process.env.AGENTBREAK_JWT_AUDIENCE = 'agentbreak-api';
  const token = jwt.sign({ tenantId: 'tenant-a', roles: ['operator'] }, secret, { subject: 'user-a', expiresIn: '1h', issuer: 'agentbreak', audience: 'agentbreak-api' });
  const user = verifyToken(token);
  assert.equal(user.subject, 'user-a');
  assert.equal(user.tenantId, 'tenant-a');
  assert.deepEqual(user.roles, ['operator']);
  assert.throws(() => verifyToken(jwt.sign({ roles: ['operator'] }, secret, { subject: 'user-a', expiresIn: '1h', issuer: 'agentbreak', audience: 'agentbreak-api' })));
  if (previous.secret === undefined) delete process.env.AGENTBREAK_JWT_SECRET; else process.env.AGENTBREAK_JWT_SECRET = previous.secret;
  if (previous.issuer === undefined) delete process.env.AGENTBREAK_JWT_ISSUER; else process.env.AGENTBREAK_JWT_ISSUER = previous.issuer;
  if (previous.audience === undefined) delete process.env.AGENTBREAK_JWT_AUDIENCE; else process.env.AGENTBREAK_JWT_AUDIENCE = previous.audience;
});
