import { z } from 'zod';
import type { Operation, TwinTool } from '../../shared/platform.js';
import { uid } from '../platform/canonical.js';

export const providerNames = ['mcp', 'anthropic', 'langgraph', 'openai'] as const;
export type ProviderName = typeof providerNames[number];

const toolNames = z.enum(['search_knowledge', 'read_record', 'remember', 'recall', 'refund', 'export_data', 'delegate']);
const sourceSchema = z.object({ kind: z.enum(['user', 'retrieval', 'memory', 'delegation']), id: z.string().min(1).max(200), trusted: z.boolean().optional() }).strict();

const common = z.object({
  id: z.string().min(1).max(160).optional(),
  label: z.string().min(1).max(200).optional(),
  tool: toolNames,
  args: z.record(z.string(), z.unknown()).default({}),
  turn: z.number().int().min(0).max(100).default(0),
  source: sourceSchema.optional(),
}).strict();

function source(value: z.infer<typeof sourceSchema> | undefined, provider: ProviderName) {
  return value ? { ...value, trusted: value.trusted === true } : { kind: provider === 'mcp' ? 'retrieval' as const : 'user' as const, id: `${provider}-adapter`, trusted: provider === 'openai' };
}

export function normalizeProviderOperation(provider: string, input: unknown): Operation {
  if (!providerNames.includes(provider as ProviderName)) throw new Error(`Unsupported connector: ${provider}. Supported connectors: ${providerNames.join(', ')}.`);
  const name = provider as ProviderName;
  let candidate: unknown = input;
  if (name === 'mcp') {
    const value = z.object({ id: z.string().optional(), name: toolNames, arguments: z.record(z.string(), z.unknown()).default({}), source: sourceSchema.optional(), turn: z.number().int().optional() }).strict().parse(input);
    candidate = { id: value.id, label: `MCP ${value.name}`, tool: value.name, args: value.arguments, source: value.source, turn: value.turn };
  } else if (name === 'anthropic') {
    const value = z.object({ id: z.string().optional(), name: toolNames, input: z.record(z.string(), z.unknown()).default({}), source: sourceSchema.optional(), turn: z.number().int().optional() }).strict().parse(input);
    candidate = { id: value.id, label: `Anthropic ${value.name}`, tool: value.name, args: value.input, source: value.source, turn: value.turn };
  } else if (name === 'langgraph') {
    const value = z.object({ id: z.string().optional(), tool: toolNames, args: z.record(z.string(), z.unknown()).default({}), source: sourceSchema.optional(), turn: z.number().int().optional() }).strict().parse(input);
    candidate = { ...value, label: `LangGraph ${value.tool}` };
  } else {
    const value = z.object({ id: z.string().optional(), tool_call_id: z.string().optional(), function: z.object({ name: toolNames, arguments: z.string().or(z.record(z.string(), z.unknown())) }), source: sourceSchema.optional(), turn: z.number().int().optional() }).strict().parse(input);
    candidate = { id: value.id || value.tool_call_id, label: `OpenAI ${value.function.name}`, tool: value.function.name, args: typeof value.function.arguments === 'string' ? JSON.parse(value.function.arguments) : value.function.arguments, source: value.source, turn: value.turn };
  }
  const parsed = common.parse(candidate);
  return { id: parsed.id || uid('op'), label: parsed.label || `${provider}:${parsed.tool}`, tool: parsed.tool as TwinTool, args: parsed.args, turn: parsed.turn, source: source(parsed.source, name) };
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  constructor(private readonly threshold = 5, private readonly cooldownMs = 30_000) {}
  get state(): 'closed' | 'open' | 'half-open' { return this.openedAt === 0 ? 'closed' : Date.now() - this.openedAt >= this.cooldownMs ? 'half-open' : 'open'; }
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') throw new Error('Connector circuit is open; retry after the cooldown window.');
    try { const result = await operation(); this.failures = 0; this.openedAt = 0; return result; }
    catch (error) { this.failures++; if (this.failures >= this.threshold) this.openedAt = Date.now(); throw error; }
  }
}

export const connectorBreakers = new Map<ProviderName, CircuitBreaker>(providerNames.map(provider => [provider, new CircuitBreaker()]));
