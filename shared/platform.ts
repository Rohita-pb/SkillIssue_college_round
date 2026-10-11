export const CONTROLS = [
  { id: 'tenantIsolation', name: 'Tenant isolation', description: 'Bind every data and financial operation to the authenticated tenant.', cost: 1, control: 'AB-AC-01' },
  { id: 'identityBinding', name: 'Identity binding', description: 'Reject impersonation and tools outside the executing agent’s identity.', cost: 1, control: 'AB-AC-02' },
  { id: 'memoryIntegrity', name: 'Memory integrity', description: 'Make authorization namespaces immutable and retain source provenance.', cost: 1, control: 'AB-MEM-01' },
  { id: 'approvalBinding', name: 'Bound approvals', description: 'Require one-use, session-bound human approval for high-value refunds.', cost: 2, control: 'AB-AUTH-01' },
  { id: 'egressAllowlist', name: 'Egress allowlist', description: 'Permit exports only to exact approved HTTPS origins.', cost: 1, control: 'AB-DLP-01' },
  { id: 'sequenceDetection', name: 'Sensitive-flow detection', description: 'Contain read → export sequences involving restricted or foreign-tenant data.', cost: 2, control: 'AB-DLP-02' },
  { id: 'delegationScope', name: 'Delegation attenuation', description: 'Delegated agents inherit the initiating user’s scope, never broader authority.', cost: 1, control: 'AB-TRUST-01' },
  { id: 'sourceProvenance', name: 'Source provenance', description: 'Reject sensitive actions originating from untrusted retrieval or memory.', cost: 3, control: 'AB-SRC-01' },
] as const;

export type ControlId = typeof CONTROLS[number]['id'];
export type ShieldPolicy = Record<ControlId, boolean>;
export const OPEN_POLICY: ShieldPolicy = Object.fromEntries(CONTROLS.map(c => [c.id, false])) as ShieldPolicy;
export const STRICT_POLICY: ShieldPolicy = Object.fromEntries(CONTROLS.map(c => [c.id, true])) as ShieldPolicy;
export const TWIN_TOOLS = ['search_knowledge', 'read_record', 'remember', 'recall', 'refund', 'export_data', 'delegate'] as const;
export type TwinTool = typeof TWIN_TOOLS[number];
export type Specialist = 'injection' | 'identity' | 'memory' | 'chain';
export const SPECIALISTS: { id: Specialist; name: string; role: string; color: string }[] = [
  { id: 'injection', name: 'Viper', role: 'Retrieval & instruction attacks', color: 'lime' },
  { id: 'identity', name: 'Specter', role: 'Identity & permission boundaries', color: 'purple' },
  { id: 'memory', name: 'Echo', role: 'Persistent memory poisoning', color: 'blue' },
  { id: 'chain', name: 'Weaver', role: 'Cross-agent exploit composition', color: 'orange' },
];

export interface AgentIdentity {
  id: string;
  name: string;
  tenantId: string;
  role: 'support' | 'research' | 'finance';
  tools: TwinTool[];
  intendedTools: TwinTool[];
  credentials: { id: string; label: string; scopes: string[]; synthetic: true }[];
  maxRefund: number;
}
export interface TwinResource {
  id: string;
  name: string;
  type: 'document' | 'record' | 'service' | 'memory';
  tenantId: string;
  classification: 'public' | 'customer' | 'restricted';
  trusted: boolean;
  data: string;
}
export interface TrustEdge {
  id: string;
  from: string;
  to: string;
  relation: 'retrieves' | 'reads' | 'remembers' | 'delegates' | 'exports';
  scopes: string[];
}
export interface DigitalTwin {
  id: string;
  tenantId?: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  parentId?: string;
  source: 'fixture' | 'manifest';
  agents: AgentIdentity[];
  resources: TwinResource[];
  trust: TrustEdge[];
  policy: ShieldPolicy;
  shieldMode: 'observe' | 'enforce';
  allowedOrigins: string[];
  refundLimit: number;
  fingerprint: string;
}
export interface SourceContext {
  kind: 'user' | 'retrieval' | 'memory' | 'delegation';
  id: string;
  trusted: boolean;
}
export interface Operation {
  id: string;
  label: string;
  tool: TwinTool;
  args: Record<string, unknown>;
  turn: number;
  source: SourceContext;
  requires?: string[];
}
export interface Scenario {
  id: string;
  name: string;
  specialist: Specialist;
  objective: 'exfiltration' | 'cross-tenant' | 'memory-poisoning' | 'unauthorized-refund' | 'privilege-escalation';
  impact: string;
  severity: 'critical' | 'high' | 'medium';
  payload: string;
  actorId: string;
  tenantId: string;
  operations: Operation[];
  generation: { method: 'capability-composition' | 'model-generated' | 'regression' | 'manual'; mutation: string; parentRunId?: string; seed: number };
}
export interface SandboxEffect {
  id: string;
  eventId: string;
  type: 'document_read' | 'record_read' | 'memory_write' | 'refund' | 'export' | 'delegation';
  actorId: string;
  tenantId: string;
  resourceId?: string;
  classification?: TwinResource['classification'];
  amount?: number;
  destination?: string;
  key?: string;
  value?: string;
  delegatedTo?: string;
  approved?: boolean;
  scopeInherited?: boolean;
  source: SourceContext;
}
export interface ShieldDecision {
  action: 'allow' | 'block' | 'approval';
  reason: string;
  rules: ControlId[];
  shadowAction?: 'block' | 'approval';
}
export interface RuntimeEvent {
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  operation: Operation;
  actorId: string;
  tenantId: string;
  policyHash: string;
  decision: ShieldDecision;
  result: string;
  effects: SandboxEffect[];
  durationMs: number;
}
export interface ApprovalRequest {
  id: string;
  sessionId: string;
  operation: Operation;
  requestHash: string;
  actorId: string;
  tenantId: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied' | 'consumed' | 'expired';
  reviewer?: string;
  resolvedAt?: string;
  reason?: string;
}
export interface RuntimeSession {
  id: string;
  twinId: string;
  actorId: string;
  activeActorId: string;
  tenantId: string;
  createdAt: string;
  status: 'active' | 'contained' | 'closed';
  memory: Record<string, { value: string; source: SourceContext; tenantId: string }>;
  readResourceIds: string[];
  delegated: boolean;
  inheritedScope: boolean;
  events: RuntimeEvent[];
  approvals: ApprovalRequest[];
  effects: SandboxEffect[];
}
export interface Violation {
  id: string;
  effectId: string;
  eventId: string;
  invariant: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  controlIds: ControlId[];
}
export interface Verification {
  exploited: boolean;
  objectiveMet: boolean;
  violations: Violation[];
  method: 'independent-effect-oracle';
  explanation: string;
}
export interface ExperimentRun {
  id: string;
  experimentId: string;
  twinId: string;
  twinSnapshot: DigitalTwin;
  scenario: Scenario;
  mode: 'fixture' | 'model' | 'tool-replay';
  model?: string;
  messages: { role: string; content: string; turn: number }[];
  session: RuntimeSession;
  verification: Verification;
  outcome: 'exploited' | 'prevented' | 'inconclusive';
  createdAt: string;
  durationMs: number;
  replayOf?: string;
  fingerprint: string;
  error?: string;
}
export interface SupervisorDecision {
  iteration: number;
  specialist: Specialist;
  rationale: string;
  feedback: string;
  runId?: string;
}
export interface Experiment {
  id: string;
  name: string;
  twinId: string;
  twinSnapshot: DigitalTwin;
  budget: number;
  seed: number;
  mode: 'fixture' | 'model';
  status: 'running' | 'completed' | 'stopped' | 'failed';
  completed: number;
  runIds: string[];
  decisions: SupervisorDecision[];
  createdAt: string;
  finishedAt?: string;
}
export interface RegressionCase {
  id: string;
  twinId: string;
  sourceRunId: string;
  scenario: Scenario;
  fingerprint: string;
  createdAt: string;
  verifiedReplays: number;
  enabled: boolean;
  provenance: 'fixture' | 'model';
}
export interface UtilityResult {
  name: string;
  passed: boolean;
  detail: string;
  durationMs: number;
  eventIds: string[];
}
export interface RepairCandidate {
  controls: ControlId[];
  cost: number;
  blocked: number;
  tested: number;
  utilityPassed: number;
  utilityTotal: number;
  viable: boolean;
}
export interface CausalAnalysis {
  id: string;
  runId: string;
  createdAt: string;
  baselineReproduced: boolean;
  method: 'deterministic-intervention' | 'recorded-tool-intervention';
  ablations: { operationId: string; label: string; objectiveMet: boolean; violations: number; necessary: boolean }[];
  minimalScenario: Scenario;
  originalSteps: number;
  minimalSteps: number;
  interventions: { control: ControlId; objectiveMet: boolean; violations: number }[];
}
export interface RepairSearch {
  id: string;
  twinId: string;
  twinFingerprint: string;
  createdAt: string;
  testedRunIds: string[];
  evaluated: number;
  searchSpace: number;
  method: 'exhaustive-recorded-tool-replay';
  candidates: RepairCandidate[];
  recommended: RepairCandidate | null;
  policy: ShieldPolicy | null;
  utility: UtilityResult[];
}
export interface GateThresholds {
  maxCritical: number;
  maxExploitRate: number;
  minUtilityRate: number;
  minCases: number;
  minSpecialists: number;
  maxP95Ms: number;
}
export interface ReleaseGate {
  id: string;
  twinId: string;
  twinFingerprint: string;
  createdAt: string;
  label: string;
  passed: boolean;
  mode: 'sandbox-contract';
  thresholds: GateThresholds;
  checks: { name: string; passed: boolean; actual: string; expected: string }[];
  results: { caseId: string; sourceRunId: string; runId: string; outcome: ExperimentRun['outcome']; critical: number }[];
  utility: UtilityResult[];
  p95Ms: number;
  exploitRate: number;
  utilityRate: number;
}
export interface AuditEntry {
  id: string;
  sequence: number;
  timestamp: string;
  kind: string;
  subjectId: string;
  payload: unknown;
  previousHash: string;
  hash: string;
}
export interface PermissionFinding {
  id: string;
  agentId: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detail: string;
  path: string[];
  controls: ControlId[];
  mitigated: boolean;
}
export interface TrustScore {
  twinId: string;
  score: number | null;
  confidence: 'unassessed' | 'provisional' | 'measured';
  policyFingerprint: string;
  evidenceCount: number;
  gateId?: string;
  components: { name: string; weight: number; value: number | null; explanation: string; evidenceIds: string[] }[];
  caveat: string;
}
export interface PlatformState {
  version: 2;
  twins: DigitalTwin[];
  experiments: Experiment[];
  runs: ExperimentRun[];
  sessions: RuntimeSession[];
  corpus: RegressionCase[];
  analyses: CausalAnalysis[];
  repairs: RepairSearch[];
  gates: ReleaseGate[];
  audit: AuditEntry[];
  auditSignature?: AuditSignature;
  intelligenceSharing: false;
}

export interface AuditSignature {
  tenantId: string;
  algorithm: 'HMAC-SHA256' | 'AWS-KMS-SHA256';
  keyId: string;
  signedHash: string;
  signature: string;
  signedAt: string;
}
export interface PlatformView extends PlatformState {
  scores: TrustScore[];
  audits: Record<string, PermissionFinding[]>;
  integrity: { valid: boolean; checked: number; head: string; error?: string };
  connection: { model: string | null; attackerModel: string | null; gatewayAuthentication: boolean; operatorAuthentication: boolean };
}
