# Story 1.5: CI Pipeline Setup

Status: done

## Story

As a developer,
I want a GitHub Actions CI pipeline,
so that lint, type-check, and tests run on every push.

## Acceptance Criteria

1. `.github/workflows/ci.yml` triggers on push and PR to main
2. Runs TypeScript type-checking for both client and server
3. Runs ESLint for both packages
4. Runs test suites (Jest for server, Vitest for client)
5. Pipeline fails if any step fails
6. PostgreSQL service container available for integration tests

## Tasks / Subtasks

- [x] Task 1: Create `.github/workflows/` directory structure
  - [x] `mkdir -p .github/workflows`

- [x] Task 2: Create `ci.yml` — workflow definition (AC: #1, #5)
  - [x] Name: `CI`
  - [x] Triggers:
    - `push:` branches `[main]`
    - `pull_request:` branches `[main]`
  - [x] Concurrency: cancel in-progress runs for same branch/PR (save CI minutes)

- [x] Task 3: Configure PostgreSQL service container (AC: #6)
  - [x] Service: `postgres`
  - [x] Image: `postgres:16-alpine` (matches Docker Compose)
  - [x] Environment: `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: postgres`, `POSTGRES_DB: habbit_tracker_test`
  - [x] Health check: `pg_isready` with interval 10s, timeout 5s, retries 5
  - [x] Expose port 5432
  - [x] Set `DATABASE_URL` as job-level env var: `postgresql://postgres:postgres@localhost:5432/habbit_tracker_test`

- [x] Task 4: Configure Node.js environment
  - [x] Runner: `ubuntu-latest`
  - [x] Use `actions/setup-node@v4` with Node.js 22
  - [x] Cache npm dependencies (use `actions/cache@v4` or setup-node's built-in cache with `cache: 'npm'` — note: must point to lockfile locations in both packages)

- [x] Task 5: Install dependencies step
  - [x] `npm ci` in `server/` directory
  - [x] `npm ci` in `client/` directory

- [x] Task 6: Server Prisma generate step (CRITICAL)
  - [x] Run `npx prisma generate` in `server/` directory
  - [x] This is REQUIRED because generated Prisma client is gitignored (`server/src/generated/prisma/`)
  - [x] Must run BEFORE server type-check or lint (code imports from generated client)
  - [x] Needs `DATABASE_URL` env var set (Prisma config reads it, even for generate)

- [x] Task 7: Server Prisma migrate step
  - [x] Run `npx prisma migrate deploy` in `server/` directory against the PostgreSQL service container
  - [x] This applies migrations to the CI test database
  - [x] Required for integration tests in future stories (E1-S6+)

- [x] Task 8: TypeScript type-check step (AC: #2, #5)
  - [x] Client: `npx tsc -b --noEmit` in `client/` (uses project references via `-b`)
  - [x] Server: `npx tsc --noEmit` in `server/`
  - [x] Both must pass — any type error fails the pipeline

- [x] Task 9: ESLint step (AC: #3, #5)
  - [x] Client: `npm run lint` in `client/`
  - [x] Server: `npm run lint` in `server/`
  - [x] Both must pass — any lint error fails the pipeline

- [x] Task 10: Test suites step — placeholder (AC: #4)
  - [x] Server: `npm test --if-present` in `server/` (no test script yet — will be added in E1-S6)
  - [x] Client: `npm test --if-present` in `client/` (no test script yet — will be added in E1-S6)
  - [x] Use `--if-present` flag so CI passes now; E1-S6 adds the actual test scripts
  - [x] Add comment in workflow: `# Test frameworks configured in E1-S6`

- [x] Task 11: Add root-level convenience scripts
  - [x] Add to root `package.json`:
    - `"typecheck:client": "npx --prefix client tsc -b --noEmit"`
    - `"typecheck:server": "npx --prefix server tsc --noEmit"`
    - `"test:client": "npm test --prefix client --if-present"`
    - `"test:server": "npm test --prefix server --if-present"`
  - [x] These are optional convenience scripts — the CI workflow can call commands directly

- [x] Task 12: Verify pipeline
  - [x] Validate YAML syntax (yaml-lint passed)
  - [x] Verify workflow file is at correct path: `.github/workflows/ci.yml`
  - [x] Confirmed type-check and lint pass locally for both server and client
  - [x] PostgreSQL service container configured with health check

## Dev Notes

### Critical Implementation Details

- **Prisma generate is mandatory in CI**: The generated client (`server/src/generated/prisma/`) is gitignored. Without `prisma generate`, server type-check and lint will fail because code imports from `../generated/prisma/client.js`. [Source: .gitignore, server/.gitignore]
- **DATABASE_URL must be set**: `server/prisma.config.ts` reads `process.env.DATABASE_URL` — even `prisma generate` may need it. Set it at job level pointing to the PostgreSQL service container.
- **Prisma config**: Prisma 7 uses `prisma.config.ts` (not `schema.prisma` datasource url). The config file imports `dotenv/config` and reads DATABASE_URL.
- **Express 5 async errors**: Not directly relevant to CI, but important context — the server uses Express 5 with native async error handling.

### Recommended Workflow Structure

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: habbit_tracker_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/habbit_tracker_test
      JWT_SECRET: ci-test-secret-must-be-at-least-32-characters-long
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      # Install dependencies
      - run: npm ci
        working-directory: server
      - run: npm ci
        working-directory: client

      # Prisma generate + migrate
      - run: npx prisma generate
        working-directory: server
      - run: npx prisma migrate deploy
        working-directory: server

      # Type-check
      - run: npx tsc --noEmit
        working-directory: server
      - run: npx tsc -b --noEmit
        working-directory: client

      # Lint
      - run: npm run lint
        working-directory: server
      - run: npm run lint
        working-directory: client

      # Tests (frameworks configured in E1-S6)
      - run: npm test --if-present
        working-directory: server
      - run: npm test --if-present
        working-directory: client
```

### Dependency Caching

For npm caching with a monorepo, the `actions/setup-node@v4` `cache` option needs to find lockfiles. Options:

1. **Multiple lockfiles**: If each package has its own `package-lock.json` (current setup), you can use `actions/cache@v4` with a custom key hashing both lockfiles.
2. **Manual cache**:
```yaml
- uses: actions/cache@v4
  with:
    path: |
      server/node_modules
      client/node_modules
    key: ${{ runner.os }}-npm-${{ hashFiles('server/package-lock.json', 'client/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Environment Variables for CI

| Variable | Value | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/habbit_tracker_test` | PostgreSQL service container connection |
| `JWT_SECRET` | `ci-test-secret-must-be-at-least-32-characters-long` | Satisfies zod validation (min 32 chars) in config.ts |
| `NODE_ENV` | `test` | Test environment mode |

**Why JWT_SECRET in CI?** The server's `config.ts` (from E1-S4) validates `JWT_SECRET` with `z.string().min(32)` at import time. If missing, the process exits. Since type-checking and lint may load config transitively, it must be present. Use a dummy value.

### Step Ordering (CRITICAL)

```
1. checkout
2. setup-node
3. npm ci (server)  ← install deps including prisma
4. npm ci (client)
5. prisma generate  ← MUST happen before server type-check/lint
6. prisma migrate deploy  ← prepares test DB
7. tsc --noEmit (server)
8. tsc -b --noEmit (client)
9. lint (server)
10. lint (client)
11. test (server) --if-present
12. test (client) --if-present
```

### Existing Codebase State (E1-S1 through E1-S4)

**Scripts available:**
- `server/`: `build` (tsc), `lint` (eslint .), `dev`, `start`, `db:migrate`, `db:generate`
- `client/`: `build` (tsc -b && vite build), `lint` (eslint .), `dev`, `preview`
- Root: `lint:client`, `lint:server`, `build:client`, `build:server`, `test:e2e` (placeholder)
- Neither package has a `test` script yet (added in E1-S6)

**Server tech:** Express 5.2.1, Prisma 7.5.0 with @prisma/adapter-pg, TypeScript 5.9.3, zod 4.3.6, helmet, cors, morgan
**Client tech:** Vite 8.0.1, React 19.2.4, TypeScript 5.9.3, Tailwind CSS v4, React Router v7

### What This Story Does NOT Include

- No test framework setup (E1-S6 — Jest, Vitest, Playwright)
- No E2E test runner in CI (E1-S6)
- No Docker build/push in CI
- No deployment steps
- No code coverage enforcement
- No branch protection rules (manual GitHub configuration)

### References

- [Source: Architecture §2 — Tech Stack (GitHub Actions for CI/CD)]
- [Source: Architecture §13 — Testing Strategy (test commands, CI integration)]
- [Source: Epics — E1-S5 acceptance criteria, E1-S6 notes about updating CI]
- [Source: Previous Story 1-4 — config.ts zod validation (JWT_SECRET min 32 chars), app.ts structure]
- [Source: Previous Story 1-3 — Prisma 7 config, prisma.config.ts, generated client in src/generated/]

## Dev Agent Record

### Agent Model Used
claude-4.6-opus-high-thinking

### Debug Log References
None — clean implementation, no issues encountered.

### Completion Notes List
- Created `.github/workflows/ci.yml` with full pipeline: checkout, Node.js 22 setup, dependency caching, npm ci for both packages, Prisma generate + migrate, TypeScript type-check, ESLint, and placeholder test steps.
- PostgreSQL 16-alpine service container configured with health check for integration test readiness.
- Concurrency group configured to cancel in-progress runs for same branch/PR.
- `JWT_SECRET` env var included (dummy value, 32+ chars) to satisfy Zod validation in `config.ts`.
- Test steps use `--if-present` flag so pipeline passes now; actual test scripts added in E1-S6.
- Root `package.json` updated with `typecheck:client`, `typecheck:server`, `test:client`, `test:server` convenience scripts.
- YAML syntax validated via yaml-lint. Type-check and lint verified locally for both packages.

### File List
- `.github/workflows/ci.yml` (new)
- `package.json` (modified — added convenience scripts)
