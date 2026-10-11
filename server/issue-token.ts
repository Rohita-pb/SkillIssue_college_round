import jwt from 'jsonwebtoken';

const [subject, tenantId, role = 'operator', expiry = process.env.AGENTBREAK_TOKEN_EXPIRY || '7d'] = process.argv.slice(2);
const secret = process.env.AGENTBREAK_JWT_SECRET;
if (!subject || !tenantId || !/^[a-zA-Z0-9_-]{1,80}$/.test(tenantId) || !['viewer', 'analyst', 'operator', 'gateway'].includes(role) || !secret || secret.length < 32) throw new Error('Usage: npm run auth:token -- <subject> <tenantId> [viewer|analyst|operator|gateway] [expiry]; requires a 32+ character AGENTBREAK_JWT_SECRET.');
console.log(jwt.sign({ tenantId, roles: [role] }, secret, { algorithm: 'HS256', subject, issuer: process.env.AGENTBREAK_JWT_ISSUER || 'agentbreak', audience: process.env.AGENTBREAK_JWT_AUDIENCE || 'agentbreak-api', expiresIn: expiry as any }));
