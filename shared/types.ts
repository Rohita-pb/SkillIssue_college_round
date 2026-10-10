export type Surface = 'retrieval' | 'instructions' | 'memory' | 'tools' | 'multi-stage';
export type Severity = 'critical' | 'high' | 'medium';
export type Outcome = 'success' | 'blocked' | 'error';
export type ToolName = 'read_document' | 'read_private_record' | 'http_request' | 'issue_refund' | 'write_memory';

export interface Defense {
  sourceIsolation: boolean;
  toolPermissions: boolean;
  memoryGuard: boolean;
  outboundFilter: boolean;
  lockdown: boolean;
}

export interface Target {
  id: string;
  name: string;
  description: string;
  initials: string;
  color: string;
  mode: 'simulation' | 'model';
  model?: string;
  tools: ToolName[];
  weaknesses: Surface[];
  defenses: Defense;
}

export interface TraceStep {
  id: number;
  kind: 'input' | 'context' | 'decision' | 'tool' | 'result' | 'guard';
  label: string;
  content: string;
  tool?: ToolName;
  args?: Record<string, unknown>;
  status: 'info' | 'pass' | 'fail' | 'blocked';
}

export interface AttackInput {
  surface: Surface;
  variant: number;
  payload: string;
  strategy: string;
  objective: string;
}

export interface Trace {
  id: string;
  campaignId: string;
  targetId: string;
  targetSnapshot: Target;
  input: AttackInput;
  outcome: Outcome;
  severity: Severity;
  title: string;
  steps: TraceStep[];
  createdAt: string;
  durationMs: number;
  fingerprint: string;
  replayOf?: string;
}

export interface Campaign {
  id: string;
  name: string;
  targetId: string;
  surfaces: Surface[];
  budget: number;
  seed: number;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  completed: number;
  successes: number;
  errors: number;
  startedAt: string;
  finishedAt?: string;
  targetSnapshot: Target;
}

export interface Validation {
  id: string;
  targetId: string;
  createdAt: string;
  defenses: Defense;
  tested: number;
  blocked: number;
  remaining: number;
  errors: number;
  utilityPassed: number;
  utilityTotal: number;
  results: { traceId: string; title: string; before: Outcome; after: Outcome }[];
  regression: { name: string; passed: boolean; detail: string }[];
}

export interface Store {
  version: number;
  targets: Target[];
  campaigns: Campaign[];
  traces: Trace[];
  validations: Validation[];
}

export const SURFACES: { id: Surface; label: string; short: string; description: string }[] = [
  { id: 'retrieval', label: 'Prompt injection', short: 'Injection', description: 'Malicious instructions in retrieved documents' },
  { id: 'tools', label: 'Tool misuse', short: 'Tool misuse', description: 'Overprivileged actions and permission boundaries' },
  { id: 'memory', label: 'Memory poisoning', short: 'Memory', description: 'Persistent instruction and approval tampering' },
  { id: 'instructions', label: 'Instruction override', short: 'Override', description: 'Role spoofing and instruction hierarchy attacks' },
  { id: 'multi-stage', label: 'Multi-stage attacks', short: 'Multi-stage', description: 'Chained retrieval, memory, and tool exploits' },
];

export const EMPTY_DEFENSE: Defense = {
  sourceIsolation: false, toolPermissions: false, memoryGuard: false, outboundFilter: false, lockdown: false,
};
