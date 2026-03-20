# Story 1.2: Docker Containerization & Compose Orchestration

Status: ready-for-dev

## Story

As a developer,
I want Dockerfiles and a Docker Compose setup that containerize and orchestrate the full application,
so that development, testing, and production environments are consistent and reproducible.

## Acceptance Criteria

**Dockerfiles:**
1. `client/Dockerfile` with multi-stage build (build stage → production Nginx stage)
2. `server/Dockerfile` with multi-stage build (build stage → production Node.js stage)
3. Both Dockerfiles run as non-root users for security
4. Both Dockerfiles include `HEALTHCHECK` instructions
5. `.dockerignore` files in both `client/` and `server/` to exclude `node_modules`, `.env`, etc.

**Docker Compose:**
6. `docker-compose.yml` at project root orchestrating `db`, `server`, and `client` services
7. PostgreSQL 16 container on port 5432 with persistent named volume
8. Proper Docker networking between services (internal network for db ↔ server)
9. Volume mounts for source code in development (hot reload)
10. Environment variables passed via `.env` file and `env_file` directive
11. `docker-compose up` brings up all services successfully

**Health Checks:**
12. `GET /api/health` endpoint returns 200 with `{ status: "ok", db: "connected" }` (includes database connectivity check)
13. Docker Compose health check configuration for all services with appropriate intervals and retries
14. Dependent services wait for health checks (e.g., server waits for db to be healthy)
15. Container logs accessible via `docker-compose logs` with service-level filtering

**Environment Configuration:**
16. `.env.example` updated to document all required environment variables with safe defaults
17. Compose profiles for `dev` and `test` environments (`docker compose --profile dev up`)
18. Dev profile: source mounts, hot reload, debug ports exposed
19. Test profile: isolated test database, runs test suites, exits on completion

## Tasks / Subtasks

- [ ] Task 1: Create `.dockerignore` files (AC: #5)
  - [ ] Create `client/.dockerignore` excluding: `node_modules`, `dist`, `.env*`, `.git`, `*.md`, `coverage`, `.DS_Store`
  - [ ] Create `server/.dockerignore` excluding: `node_modules`, `dist`, `.env*`, `.git`, `*.md`, `coverage`, `.DS_Store`, `prisma/migrations` (future-proofing)

- [ ] Task 2: Create `server/Dockerfile` — multi-stage (AC: #2, #3, #4)
  - [ ] Stage 1 (`deps`): `FROM node:22-alpine AS deps` → `WORKDIR /app` → copy `package.json` + `package-lock.json` → `RUN npm ci`
  - [ ] Stage 2 (`build`): `FROM deps AS build` → copy source → `RUN npm run build` (runs `tsc`)
  - [ ] Stage 3 (`production`): `FROM node:22-alpine` → copy `package.json` + `package-lock.json` → `RUN npm ci --omit=dev` → copy compiled `dist/` from build stage → create non-root user (`node` or `appuser`) → `USER appuser` → expose port 3001 → `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1` → `CMD ["node", "dist/index.js"]`
  - [ ] Set `NODE_ENV=production` in production stage

- [ ] Task 3: Create `client/Dockerfile` — multi-stage (AC: #1, #3, #4)
  - [ ] Stage 1 (`build`): `FROM node:22-alpine AS build` → `WORKDIR /app` → copy `package.json` + `package-lock.json` → `RUN npm ci` → copy source → `RUN npm run build` (runs `tsc -b && vite build`, outputs to `dist/`)
  - [ ] Stage 2 (`production`): `FROM nginx:alpine` → copy `dist/` from build to `/usr/share/nginx/html` → copy custom `nginx.conf` → create non-root user or use nginx unprivileged image → expose port 80 → `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1` → `CMD ["nginx", "-g", "daemon off;"]`

- [ ] Task 4: Create `client/nginx.conf` (AC: #1)
  - [ ] Handle SPA client-side routing: `try_files $uri $uri/ /index.html`
  - [ ] Proxy `/api/*` requests to the server service: `proxy_pass http://server:3001`
  - [ ] Cache hashed assets with long TTL: `Cache-Control: public, max-age=31536000, immutable` for `*.js`, `*.css`, `*.svg`, `*.png`
  - [ ] No-cache for `index.html` to ensure latest deploys: `Cache-Control: no-cache`
  - [ ] Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`

- [ ] Task 5: Enhance health endpoint with DB connectivity check (AC: #12)
  - [ ] Install `pg` package in server: `npm install pg` and `npm install -D @types/pg`
  - [ ] Modify `server/src/index.ts` health endpoint to check PostgreSQL connectivity using raw `pg` client (NOT Prisma — that's E1-S3)
  - [ ] Health check queries `SELECT 1` against the database
  - [ ] Returns `{ status: "ok", db: "connected" }` when DB is reachable
  - [ ] Returns `{ status: "ok", db: "disconnected" }` with 200 (not 500) when DB is unreachable — keeps container healthy while DB is starting
  - [ ] Read `DATABASE_URL` from environment variable

- [ ] Task 6: Create `docker-compose.yml` (AC: #6, #7, #8, #10, #11, #13, #14, #15)
  - [ ] Define three services: `db`, `server`, `client`
  - [ ] `db` service:
    - Image: `postgres:16-alpine`
    - Port mapping: `5432:5432`
    - Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `.env`
    - Volume: named volume `pgdata` → `/var/lib/postgresql/data`
    - Health check: `pg_isready -U postgres` with interval 5s, timeout 5s, retries 5
    - Restart: `unless-stopped`
  - [ ] `server` service:
    - Build from `./server`
    - Port mapping: `3001:3001`
    - `env_file: .env`
    - `depends_on: db: condition: service_healthy`
    - Health check: `wget --spider http://localhost:3001/api/health` with interval 10s, timeout 5s, retries 5
    - Restart: `unless-stopped`
  - [ ] `client` service:
    - Build from `./client`
    - Port mapping: `80:80` (production Nginx)
    - `depends_on: server: condition: service_healthy`
    - Restart: `unless-stopped`
  - [ ] Define named volume `pgdata`
  - [ ] Define internal network (default compose network is sufficient)

- [ ] Task 7: Add dev profile with hot reload (AC: #9, #17, #18)
  - [ ] Add `profiles: ["dev"]` to dev-specific service overrides OR use separate dev service definitions
  - [ ] Dev `server` override:
    - Volume mount: `./server/src:/app/src` for hot reload via `tsx watch`
    - Command override: `npx tsx watch src/index.ts`
    - Expose debug port 9229 for Node.js inspector
  - [ ] Dev `client` override:
    - Volume mount: `./client/src:/app/src` for Vite HMR
    - Command override: `npx vite --host` (Vite dev server instead of Nginx)
    - Port mapping: `5173:5173` (Vite dev port instead of 80)
  - [ ] Ensure `node_modules` are NOT mounted from host (use anonymous volume or build in container)

- [ ] Task 8: Add test profile (AC: #17, #19)
  - [ ] Add `profiles: ["test"]` to test-specific service definitions
  - [ ] Test database service (`db-test`):
    - Image: `postgres:16-alpine`
    - Port: `5433:5432` (different host port to avoid conflicts)
    - Separate environment: `POSTGRES_DB=habbit_tracker_test`
    - No persistent volume (ephemeral)
    - Health check same as main db
  - [ ] Test runner services can be added later when test frameworks are configured (E1-S6)

- [ ] Task 9: Update `.env.example` and create `.env` for dev (AC: #10, #16)
  - [ ] Add Docker-specific env vars to `.env.example`:
    - `POSTGRES_USER=postgres`
    - `POSTGRES_PASSWORD=postgres`
    - `POSTGRES_DB=habbit_tracker`
  - [ ] Update `DATABASE_URL` to use Docker service name: `postgresql://postgres:postgres@db:5432/habbit_tracker`
  - [ ] Document that `DATABASE_URL` uses `db` (Docker service name) not `localhost` when running in containers
  - [ ] Create `.env` from `.env.example` for local dev (ensure `.env` is in `.gitignore` — already done in E1-S1)

- [ ] Task 10: Verify complete Docker setup
  - [ ] `docker compose up` builds and starts all three services
  - [ ] `docker compose --profile dev up` starts dev mode with hot reload
  - [ ] `curl http://localhost:3001/api/health` returns `{ status: "ok", db: "connected" }`
  - [ ] `docker compose logs server` shows server logs
  - [ ] `docker compose logs db` shows PostgreSQL logs
  - [ ] `docker compose down -v` cleanly stops and removes volumes

## Dev Notes

### Critical Architecture Constraints

- **Three services**: `db` (PostgreSQL 16), `server` (Node.js/Express), `client` (Vite dev or Nginx prod). [Source: Architecture §12]
- **Compose profiles**: `dev` (hot reload), `test` (isolated test DB), default (production-like). [Source: Architecture §12]
- **Internal networking**: Only `client` and `server` ports exposed to host. `db ↔ server` communication on internal Docker network. [Source: Architecture §12]
- **No Prisma yet**: E1-S3 sets up Prisma. Use raw `pg` client for the health check DB connectivity test. The health endpoint will be refactored in E1-S4 when the full Express app setup happens.

### Existing Codebase from E1-S1 (CRITICAL — build on this, don't break it)

**Server (`server/`):**
- Entry point: `server/src/index.ts` — already has Express app with `GET /api/health` returning `{ status: 'ok' }`
- Scripts: `dev` → `tsx watch src/index.ts`, `build` → `tsc`, `start` → `node dist/index.js`
- ESM module: `"type": "module"` in package.json
- Express 5.2.1, TypeScript 5.9.3, tsx 4.21.0
- TypeScript config: `outDir: ./dist`, `rootDir: ./src`, `module: NodeNext`

**Client (`client/`):**
- Build command: `tsc -b && vite build` → outputs to `client/dist/`
- Dev command: `vite` → serves on port 5173
- Vite 8.0.1, React 19.2.4
- Tailwind CSS v4 via `@tailwindcss/vite` plugin

**Root:**
- `.env.example` already exists with DATABASE_URL, JWT_SECRET, PORT, etc.
- `.gitignore` already covers `.env`, `.env.dev`, `.env.test`, `node_modules`, `dist`

### Docker Multi-Stage Build Patterns

**Server Dockerfile stages:**
```
Stage 1 (deps):     node:22-alpine → npm ci (all deps)
Stage 2 (build):    Copy src → tsc compile → outputs to dist/
Stage 3 (prod):     node:22-alpine → npm ci --omit=dev → copy dist/ → non-root user → CMD
```

**Client Dockerfile stages:**
```
Stage 1 (build):    node:22-alpine → npm ci → tsc -b && vite build → outputs to dist/
Stage 2 (prod):     nginx:alpine → copy dist/ to /usr/share/nginx/html → custom nginx.conf
```

**Key build optimization:** Copy `package.json` + `package-lock.json` BEFORE source code to maximize Docker layer cache. Source changes won't trigger dependency reinstall. Use `npm ci` (not `npm install`) for deterministic builds.

### Nginx Configuration for SPA + API Proxy

The Nginx config in the client container must handle:
1. **SPA routing**: All non-file requests serve `index.html` (`try_files $uri $uri/ /index.html`)
2. **API proxying**: `/api/*` → `http://server:3001` (Docker service name, NOT localhost)
3. **Static asset caching**: Vite's hashed filenames enable aggressive caching (`max-age=31536000, immutable`)
4. **Security headers**: `X-Content-Type-Options`, `X-Frame-Options` per Architecture §9

### Health Check Strategy

| Service | Check Method | Interval | Timeout | Retries |
|---------|-------------|----------|---------|---------|
| `db` | `pg_isready -U postgres` | 5s | 5s | 5 |
| `server` | `wget --spider http://localhost:3001/api/health` | 10s | 5s | 5 |
| `client` | `wget --spider http://localhost:80/` | 30s | 5s | 3 |

Use `depends_on` with `condition: service_healthy` to ensure startup order: db → server → client.

### Dev Profile Hot Reload Setup

**Critical**: When mounting source volumes for hot reload, do NOT mount `node_modules` from the host. Use an anonymous volume to preserve container's `node_modules`:

```yaml
volumes:
  - ./server/src:/app/src          # Source code mount for hot reload
  - /app/node_modules              # Anonymous volume — preserves container's node_modules
```

The server dev command must be overridden to use `tsx watch` instead of `node dist/index.js`. The client dev command must use `vite --host` (the `--host` flag is required for Docker to expose Vite's dev server).

### DATABASE_URL in Docker vs Local

- **Docker (in container)**: `postgresql://postgres:postgres@db:5432/habbit_tracker` — uses `db` service name
- **Local (outside container)**: `postgresql://postgres:postgres@localhost:5432/habbit_tracker` — uses `localhost`

Document this difference clearly in `.env.example`.

### What This Story Does NOT Include

- No Prisma ORM or database migrations (E1-S3)
- No Express middleware, error handling, or app.ts refactor (E1-S4)
- No CI pipeline Docker integration (E1-S5)
- No test framework configuration (E1-S6)
- No application routes beyond the health check

### References

- [Source: Architecture §12 — Deployment Architecture (Dockerfiles, Docker Compose, profiles, services, networking)]
- [Source: Architecture §9 — Security Architecture (security headers for Nginx)]
- [Source: Architecture §7 — Backend Architecture (server project structure)]
- [Source: Architecture §11 — Project Structure (monorepo layout)]
- [Source: Epics — E1-S2 acceptance criteria]
- [Source: Previous Story 1-1 — File list, completion notes for existing codebase state]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
