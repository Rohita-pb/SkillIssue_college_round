import { createHash, randomUUID } from 'node:crypto';

export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
export const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const uid = (prefix: string) => `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
export const now = () => new Date().toISOString();
