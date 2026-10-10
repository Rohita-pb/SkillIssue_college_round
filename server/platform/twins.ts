import { z } from 'zod';
import { CONTROLS, OPEN_POLICY, TWIN_TOOLS, type DigitalTwin, type PermissionFinding, type ShieldPolicy } from '../../shared/platform.js';
import { digest, now, uid } from './canonical.js';

export const policySchema = z.object(Object.fromEntries(CONTROLS.map(c => [c.id, z.boolean()])) as Record<keyof ShieldPolicy, z.ZodBoolean>).strict();
const identifier = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_./:-]+$/);
export const manifestSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().max(1000).default('Imported agent architecture'),
  agents: z.array(z.object({
    id: identifier, name: z.string().min(1).max(100), tenantId: identifier,
    role: z.enum(['support', 'research', 'finance']), tools: z.array(z.enum(TWIN_TOOLS)).min(1).max(7),
    intendedTools: z.array(z.enum(TWIN_TOOLS)).min(1).max(7), maxRefund: z.number().min(0).max(100000),
    credentials: z.array(z.object({ id: identifier, label: z.string().max(100), scopes: z.array(z.string().max(100)).max(20), synthetic: z.literal(true) })).max(10),
  })).min(1).max(12),
  resources: z.array(z.object({
    id: identifier, name: z.string().min(1).max(100), type: z.enum(['document', 'record', 'service', 'memory']),
    tenantId: identifier, classification: z.enum(['public', 'customer', 'restricted']), trusted: z.boolean(), data: z.string().max(4000),
  })).min(1).max(40),
  trust: z.array(z.object({ id: identifier, from: identifier, to: identifier, relation: z.enum(['retrieves', 'reads', 'remembers', 'delegates', 'exports']), scopes: z.array(z.string().max(100)).max(10) })).max(80),
  policy: policySchema.default(OPEN_POLICY), shieldMode: z.enum(['observe', 'enforce']).default('enforce'),
  allowedOrigins: z.array(z.string().url().refine(s => { const u = new URL(s); return u.protocol === 'https:' && s === u.origin; }, 'Use an exact HTTPS origin without a path or credentials.')).min(1).max(10),
  refundLimit: z.number().min(1).max(10000),
}).strict().superRefine((v, ctx) => {
  const ids = [...v.agents, ...v.resources].map(n => n.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Agent and resource IDs must be unique.' });
  if (new Set(v.trust.map(e => e.id)).size !== v.trust.length) ctx.addIssue({ code: 'custom', message: 'Trust edge IDs must be unique.' });
  for (const edge of v.trust) if (!ids.includes(edge.from) || !ids.includes(edge.to)) ctx.addIssue({ code: 'custom', message: `Unknown trust edge endpoint: ${edge.id}` });
  for (const a of v.agents) if (a.intendedTools.some(t => !a.tools.includes(t))) ctx.addIssue({ code: 'custom', message: `Intended tools must be registered: ${a.id}` });
});

export function fingerprintTwin(twin: DigitalTwin): string {
  const { fingerprint: _fingerprint, id: _id, createdAt: _time, parentId: _parent, name: _name, description: _desc, version: _version, ...config } = twin;
  return digest(config);
}

export function createTwin(input?: unknown): DigitalTwin {
  const manifest = manifestSchema.parse(input ?? {
    name: 'Atlas customer operations',
    description: 'A stateful support → research → finance replica with two tenants, a retrieval server, persistent memory, and synthetic financial tools.',
    agents: [
      { id: 'atlas', name: 'Atlas Support', role: 'support', tenantId: 'northstar', tools: [...TWIN_TOOLS], intendedTools: ['search_knowledge', 'read_record', 'remember', 'recall', 'refund', 'delegate'], credentials: [{ id: 'cred-support', label: 'Support service account', scopes: ['crm:*', 'refunds:write', 'agents:delegate'], synthetic: true }], maxRefund: 50 },
      { id: 'research', name: 'Research Copilot', role: 'research', tenantId: 'northstar', tools: ['search_knowledge', 'read_record', 'remember', 'recall', 'export_data', 'delegate'], intendedTools: ['search_knowledge', 'read_record', 'remember', 'recall', 'export_data'], credentials: [{ id: 'cred-research', label: 'Research API identity', scopes: ['knowledge:read', 'crm:*', 'export:*'], synthetic: true }], maxRefund: 0 },
      { id: 'ledger', name: 'Ledger Finance', role: 'finance', tenantId: 'northstar', tools: ['read_record', 'refund', 'remember', 'recall', 'export_data'], intendedTools: ['read_record', 'refund', 'recall'], credentials: [{ id: 'cred-ledger', label: 'Finance service account', scopes: ['refunds:*', 'crm:*'], synthetic: true }], maxRefund: 5000 },
    ],
    resources: [
      { id: 'knowledge', name: 'Support knowledge MCP', type: 'document', tenantId: 'shared', classification: 'public', trusted: false, data: 'Refund policy: self-service refunds up to $50. Larger requests require an authenticated human approval.' },
      { id: 'customer-northstar', name: 'Northstar customer record', type: 'record', tenantId: 'northstar', classification: 'customer', trusted: true, data: 'SYNTHETIC-NORTHSTAR-CUSTOMER-CANARY' },
      { id: 'customer-orbit', name: 'Orbit customer record', type: 'record', tenantId: 'orbit', classification: 'customer', trusted: true, data: 'SYNTHETIC-ORBIT-PRIVATE-CANARY' },
      { id: 'payroll', name: 'Internal payroll', type: 'record', tenantId: 'internal', classification: 'restricted', trusted: true, data: 'SYNTHETIC-PAYROLL-RESTRICTED-CANARY' },
      { id: 'memory', name: 'Persistent agent memory', type: 'memory', tenantId: 'northstar', classification: 'customer', trusted: false, data: '{}' },
      { id: 'helpdesk', name: 'Approved helpdesk service', type: 'service', tenantId: 'northstar', classification: 'customer', trusted: true, data: 'https://helpdesk.internal' },
    ],
    trust: [
      { id: 'edge-retrieval', from: 'atlas', to: 'knowledge', relation: 'retrieves', scopes: ['read'] },
      { id: 'edge-research-source', from: 'research', to: 'knowledge', relation: 'retrieves', scopes: ['read'] },
      { id: 'edge-crm', from: 'atlas', to: 'customer-northstar', relation: 'reads', scopes: ['crm:*'] },
      { id: 'edge-foreign', from: 'atlas', to: 'customer-orbit', relation: 'reads', scopes: ['crm:*'] },
      { id: 'edge-restricted', from: 'research', to: 'payroll', relation: 'reads', scopes: ['crm:*'] },
      { id: 'edge-memory', from: 'atlas', to: 'memory', relation: 'remembers', scopes: ['*'] },
      { id: 'edge-delegate', from: 'atlas', to: 'ledger', relation: 'delegates', scopes: ['refunds:*'] },
      { id: 'edge-research-delegate', from: 'research', to: 'atlas', relation: 'delegates', scopes: ['*'] },
      { id: 'edge-export', from: 'research', to: 'helpdesk', relation: 'exports', scopes: ['export:*'] },
    ],
    policy: OPEN_POLICY, shieldMode: 'enforce', allowedOrigins: ['https://helpdesk.internal'], refundLimit: 50,
  });
  const twin: DigitalTwin = { ...manifest, id: uid('twin'), version: 1, createdAt: now(), source: input ? 'manifest' : 'fixture', fingerprint: '' };
  twin.fingerprint = fingerprintTwin(twin);
  return twin;
}

export function auditPermissions(twin: DigitalTwin): PermissionFinding[] {
  const findings: PermissionFinding[] = [];
  const add = (finding: Omit<PermissionFinding, 'id' | 'mitigated'>) => findings.push({ ...finding, id: digest([twin.id, finding.agentId, finding.title]).slice(0, 16), mitigated: twin.shieldMode === 'enforce' && finding.controls.some(c => twin.policy[c]) });
  for (const agent of twin.agents) {
    const extra = agent.tools.filter(t => !agent.intendedTools.includes(t));
    if (extra.length) add({ agentId: agent.id, severity: 'high', title: 'Registered tools exceed intended role', detail: `${agent.name} can invoke ${extra.join(', ')} outside its intended tool contract.`, path: [agent.id], controls: ['identityBinding'] });
    for (const credential of agent.credentials) if (credential.scopes.some(s => s.includes('*'))) add({ agentId: agent.id, severity: 'medium', title: `Wildcard scope: ${credential.label}`, detail: `${credential.scopes.join(', ')}. Credentials are synthetic metadata; no live provider permission discovery is claimed.`, path: [agent.id, credential.id], controls: ['tenantIsolation', 'identityBinding'] });
    for (const edge of twin.trust.filter(e => e.from === agent.id)) {
      const resource = twin.resources.find(r => r.id === edge.to);
      const delegate = twin.agents.find(a => a.id === edge.to);
      if (resource && resource.type === 'record' && resource.tenantId !== agent.tenantId) add({ agentId: agent.id, severity: 'critical', title: 'Cross-tenant data path', detail: `${agent.name} trusts a path to ${resource.name} in tenant ${resource.tenantId}.`, path: [agent.id, resource.id], controls: ['tenantIsolation'] });
      if (delegate && delegate.maxRefund > agent.maxRefund) add({ agentId: agent.id, severity: 'critical', title: 'Delegation amplifies financial authority', detail: `${agent.name} ($${agent.maxRefund}) can delegate to ${delegate.name} ($${delegate.maxRefund}); the initiating scope must survive this hop.`, path: [agent.id, delegate.id], controls: ['delegationScope', 'approvalBinding'] });
      if (resource && !resource.trusted && resource.type === 'document') add({ agentId: agent.id, severity: 'high', title: 'Untrusted retrieval reaches an acting agent', detail: `${resource.name} is a lower-trust content source connected to ${agent.name}. Sensitive actions need provenance enforcement.`, path: [resource.id, agent.id], controls: ['sourceProvenance'] });
      if (resource?.type === 'memory' && edge.scopes.includes('*')) add({ agentId: agent.id, severity: 'high', title: 'Unrestricted authorization memory writes', detail: 'The memory connection includes policy and authorization namespaces.', path: [agent.id, resource.id], controls: ['memoryIntegrity'] });
    }
  }
  return findings.sort((a, b) => ['critical', 'high', 'medium'].indexOf(a.severity) - ['critical', 'high', 'medium'].indexOf(b.severity));
}
