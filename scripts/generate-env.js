#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
const domain = process.argv[2] || process.env.AGENTBREAK_DOMAIN || 'http://localhost:3001';

if (fs.existsSync(envPath) && !process.argv.includes('--force')) {
  console.log('✓ .env already exists. Use --force to regenerate.');
  process.exit(0);
}

const postgresPassword = crypto.randomBytes(24).toString('base64url');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const auditSecret = crypto.randomBytes(32).toString('hex');

const corsOrigins = Array.from(new Set([
  domain,
  'http://localhost:3001',
  'http://localhost:5173',
])).join(',');

const envContent = `# Auto-generated AgentBreak Production Configuration
NODE_ENV=production
PORT=3001

# PostgreSQL Configuration
POSTGRES_DB=agentbreak
POSTGRES_USER=agentbreak
POSTGRES_PASSWORD=${postgresPassword}
DATABASE_URL=postgresql://agentbreak:${postgresPassword}@postgres:5432/agentbreak

# Redis Queue Configuration
REDIS_URL=redis://redis:6379

# Authentication (Minimum 32 characters)
AGENTBREAK_JWT_SECRET=${jwtSecret}
AGENTBREAK_JWT_ISSUER=agentbreak
AGENTBREAK_JWT_AUDIENCE=agentbreak-api

# CORS - Allowed Frontend Origins
AGENTBREAK_CORS_ORIGINS=${corsOrigins}

# Tamper-Evident Audit Head Signing Secret (Minimum 32 characters)
AGENTBREAK_AUDIT_SIGNING_SECRET=${auditSecret}
AGENTBREAK_AUDIT_SIGNING_KEY_ID=key_audit_v1

# Optional Operator Gateway Tokens (leave blank for JWT auth only)
AGENTBREAK_OPERATOR_TOKEN=
AGENTBREAK_GATEWAY_TOKEN=

# Optional: Real Model Testing (OpenAI-compatible endpoint)
AGENTBREAK_MODEL_BASE_URL=
AGENTBREAK_MODEL_NAME=
AGENTBREAK_MODEL_API_KEY=
AGENTBREAK_MODEL_LABEL=
`;

fs.writeFileSync(envPath, envContent, 'utf-8');
console.log(`✓ Generated secure .env with crypto-random secrets at: ${envPath}`);
