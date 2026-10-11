import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser { subject: string; tenantId: string; roles: string[]; expiresAt?: number }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export function verifyToken(token: string): AuthUser {
  const key = process.env.AGENTBREAK_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || process.env.AGENTBREAK_JWT_SECRET;
  if (!key) throw new Error('JWT verification is not configured.');
  const payload = jwt.verify(token, key, {
    algorithms: [process.env.AGENTBREAK_JWT_PUBLIC_KEY ? 'RS256' : 'HS256'],
    issuer: process.env.AGENTBREAK_JWT_ISSUER || 'agentbreak',
    audience: process.env.AGENTBREAK_JWT_AUDIENCE || 'agentbreak-api',
  });
  if (typeof payload === 'string' || !payload.sub || !Number.isFinite(payload.exp) || typeof payload.tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(payload.tenantId)) throw new Error('JWT requires sub, exp, and a valid tenantId.');
  const roles = Array.isArray(payload.roles) ? payload.roles.filter((role): role is string => typeof role === 'string') : [];
  return { subject: payload.sub, tenantId: payload.tenantId, roles, expiresAt: payload.exp! * 1000 };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path === '/health/live' || req.path === '/health/ready') return next();
  const header = req.headers.authorization;
  if (!process.env.AGENTBREAK_JWT_SECRET && !process.env.AGENTBREAK_JWT_PUBLIC_KEY && process.env.NODE_ENV !== 'production') {
    // The legacy operator token protects the entire API when configured.
    if (process.env.AGENTBREAK_OPERATOR_TOKEN && header !== `Bearer ${process.env.AGENTBREAK_OPERATOR_TOKEN}`) return res.status(401).json({ error: 'Operator authentication required.' });
    req.user = { subject: 'local-operator', tenantId: 'default', roles: ['operator'] }; return next();
  }
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('agentbreak_session='))?.slice('agentbreak_session='.length);
  const token = header?.startsWith('Bearer ') ? header.slice(7) : cookie;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try { req.user = verifyToken(token); next(); } catch { res.status(401).json({ error: 'Invalid or expired access token.' }); }
}

export function isPrivileged(req: Request) { return req.user?.roles.some(role => role === 'admin' || role === 'operator') === true; }
export function tenantId(req: Request) { if (!req.user) throw new Error('Authentication required.'); return req.user.tenantId; }

export function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  if (!process.env.DATABASE_URL || process.env.AGENTBREAK_STORAGE === 'file') throw new Error('Production requires PostgreSQL DATABASE_URL.');
  if (!process.env.REDIS_URL) throw new Error('Production requires REDIS_URL.');
  if (!process.env.AGENTBREAK_JWT_PUBLIC_KEY && (process.env.AGENTBREAK_JWT_SECRET?.length || 0) < 32) throw new Error('Configure an RS256 public key or a JWT secret of at least 32 characters.');
  const origins = (process.env.AGENTBREAK_CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => { try { const parsed = new URL(origin); return parsed.origin !== origin || !['http:', 'https:'].includes(parsed.protocol); } catch { return true; } })) throw new Error('Production requires comma-separated exact HTTP(S) origins in AGENTBREAK_CORS_ORIGINS.');
  if (!process.env.AGENTBREAK_AWS_KMS_KEY_ID && (process.env.AGENTBREAK_AUDIT_SIGNING_SECRET?.length || 0) < 32) throw new Error('Configure AWS KMS or an audit signing secret of at least 32 characters.');
  if (process.env.AGENTBREAK_AWS_KMS_KEY_ID && !process.env.AWS_REGION) throw new Error('AWS_REGION is required when AWS KMS audit signing is enabled.');
}
