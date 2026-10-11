# AgentBreak: Complete Production Deployment Guide

This guide details how to deploy AgentBreak to production with zero friction.

---

## ⚡ Option 1: 1-Click Fast Deployment (Any Linux VPS, EC2, Droplet, or Local Docker)

### Prerequisites
- Docker Engine & Docker Compose v2 (`docker compose version`)
- Git & Node.js 22+

### Step-by-Step Instructions

1. **Clone the repository on your server**:
   ```bash
   git clone https://github.com/Rohita-pb/SkillIssue_college_round.git
   cd SkillIssue_college_round
   ```

2. **Run the automated deployment script**:
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```
   *(On Windows PowerShell, run: `powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1`)*

   **What this does automatically:**
   - Generates cryptographically secure 32+ character secrets for PostgreSQL, JWT, and HMAC audit signing.
   - Creates a production `.env` file.
   - Runs `docker compose -f docker-compose.production.yml up -d --build`.
   - Runs database migrations (`prisma migrate deploy`).
   - Waits for the API and worker healthcheck to become green.
   - Generates and prints an initial **7-day Admin Operator JWT Token**.

3. **Access the Application**:
   - Open **`http://<your-server-ip>:3001`** (or `http://localhost:3001` if local).
   - Enter your generated Admin JWT Token into the **Auth Gate** screen to start testing.

---

## 🌐 Option 2: Production Domain & HTTPS Setup (Caddy or Nginx)

In production, place a reverse proxy in front of port `3001` for automatic SSL/TLS certificates and unbuffered Server-Sent Events (SSE).

### Using Caddy (Recommended - Automatic SSL)
A pre-configured [Caddyfile](file:///c:/Users/admin/Documents/SkillIssue_college_round/Caddyfile) is included in the project root:

1. Edit `.env` and set your domain:
   ```env
   AGENTBREAK_CORS_ORIGINS=https://agentbreak.yourdomain.com
   ```
2. Run Caddy:
   ```bash
   caddy reverse-proxy --from agentbreak.yourdomain.com --to localhost:3001
   # Or run: caddy run
   ```
Caddy will automatically provision a free Let's Encrypt certificate and disable buffering for live attack event streams.

### Using Nginx
A production Nginx configuration with SSE unbuffered streaming is provided at [nginx/nginx.conf](file:///c:/Users/admin/Documents/SkillIssue_college_round/nginx/nginx.conf).

---

## ☁️ Option 3: 1-Click PaaS Deployment (Render)

If you don't want to manage a Linux server or Docker manually:

1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** -> **Blueprint**.
3. Connect your repository: Render automatically detects [render.yaml](file:///c:/Users/admin/Documents/SkillIssue_college_round/render.yaml) and provisions:
   - Managed PostgreSQL database
   - Managed Redis queue
   - Web service (`api` running on Docker)
   - Background worker (`worker` running BullMQ)
4. Render automatically generates all cryptographic JWT and audit secrets.
5. In Render's API Shell, generate your operator token:
   ```bash
   npm run auth:token -- admin-operator default operator 7d
   ```

---

## 🔑 Token Management & Roles

AgentBreak enforces role-based access control (RBAC):

| Role | Permissions |
|---|---|
| `operator` / `admin` | Full platform control: run campaigns, apply defenses, approve sensitive actions, run gates |
| `analyst` | Read traces, run replay simulations, view compliance & evidence |
| `viewer` | Read-only access to overview, telemetry, and reports |
| `gateway` | Machine-to-machine token for connectors (LangGraph, MCP, Anthropic, OpenAI) |

### Issue a New Token at Any Time
From your server terminal:
```bash
docker compose -f docker-compose.production.yml exec api npm run auth:token -- <username> <tenantId> <role> [expiry]
```
**Examples:**
- 7-day Operator Token:
  ```bash
  docker compose -f docker-compose.production.yml exec api npm run auth:token -- alice tenant-prod operator 7d
  ```
- 30-day Gateway Token (for LangGraph / MCP integration):
  ```bash
  docker compose -f docker-compose.production.yml exec api npm run auth:token -- mcp-gateway tenant-prod gateway 30d
  ```

---

## 🛠️ Operational Maintenance & Healthchecks

### Service Status & Logs
```bash
# View running container status
docker compose -f docker-compose.production.yml ps

# Follow logs across all services
docker compose -f docker-compose.production.yml logs -f api worker
```

### Healthcheck Endpoints
- **Liveness probe**: `GET http://localhost:3001/api/health/live`
- **Readiness probe**: `GET http://localhost:3001/api/health/ready` (validates database connection and at least one live worker heartbeat)
- **General status**: `GET http://localhost:3001/api/health`

### Database Backups
```bash
# Dump the Postgres database
docker compose -f docker-compose.production.yml exec postgres pg_dump -U agentbreak -d agentbreak > backup_$(date +%Y%m%d).sql
```
