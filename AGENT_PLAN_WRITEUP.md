# Agent-First Problem Solving: Write-Up

**Date:** April 9, 2026
**Tool:** Cursor (Claude agent, Agent Mode)
**Problem:** No automated developer environment validation for the habit-tracker project

---

## Problem Identified

After exploring the habit-tracker codebase, the agent identified that while the project has solid CI (lint, typecheck, unit tests), Docker orchestration (dev/prod/test profiles), and comprehensive test suites (31 client + 21 server + 2 E2E), there was **no way for a developer to quickly validate their local environment** is correctly configured.

Developers had to manually:
- Check Node.js version (must be v22+)
- Verify Docker and Docker Compose are installed and running
- Confirm `.env` exists with all required variables (especially `JWT_SECRET` ≥ 32 chars)
- Ensure `npm ci` has been run in all three package directories
- Check if Prisma client is generated
- Verify Docker services are healthy
- Test database connectivity and migration status
- Confirm API and client dev servers are reachable

This is a real onboarding and troubleshooting pain point.

---

## Agent's Plan

The agent proposed creating `scripts/dev-doctor.sh` — a Bash diagnostic script with these design decisions:

| Decision | Rationale |
|---|---|
| **Plain Bash** | No extra dependencies; works on macOS and Linux out of the box |
| **Colored output** | PASS/FAIL/WARN/SKIP indicators make scanning results instant |
| **Non-destructive** | Read-only checks only — never modifies environment state |
| **`--quick` flag** | Skip Docker/network checks for fast pre-commit validation |
| **Exit codes** | 0 = all critical checks pass, 1 = at least one failure |
| **Actionable hints** | Every failure/warning includes a fix command |

### Checks implemented (6 categories, 15+ individual checks):

1. **Toolchain** — Node.js ≥ 22, npm, Docker, Docker Compose
2. **Environment** — `.env` file exists, `DATABASE_URL` set, `JWT_SECRET` set and ≥ 32 chars
3. **Dependencies** — `node_modules` in root/client/server, Prisma client generated
4. **Docker Runtime** — Daemon running, dev profile services (db, server-dev, client-dev) status
5. **Database** — PostgreSQL reachable (via `pg_isready` or container exec), Prisma migrations current
6. **API Health** — `GET /api/health` returns 200, client dev server on :5173 reachable

---

## Execution Process

### Step 1: Context gathering (automated)
The agent launched an exploration subagent to map the project structure, then read `.env.example`, `server/src/config.ts` (Zod env validation schema), `package.json` (existing scripts), `ci.yml` (CI pipeline), and `docker-compose.yml` in parallel. This identified exactly which env vars are required, what versions are expected, and what services exist.

### Step 2: Script creation
The agent wrote `scripts/dev-doctor.sh` (~237 lines) in a single pass, covering all 6 check categories.

### Step 3: Integration
Added `npm run doctor` and `npm run doctor:quick` scripts to root `package.json`.

### Step 4: Testing & bug fix
- **Quick mode** (`--quick`): Ran cleanly on first attempt — all toolchain, env, and dependency checks passed.
- **Full mode**: Revealed a bug — `curl` failure produced `000000` instead of `000` because the `|| echo "000"` fallback concatenated with curl's own `000` output. The agent identified the root cause (command substitution capturing both outputs) and fixed it by using `|| true` outside the substitution.
- **Re-test**: Full mode ran correctly after the fix.

---

## Results

### What Worked Well (minimal/no manual intervention)

- **Codebase exploration was fast and accurate.** The agent correctly identified the gap (no dev validation tooling) by reading project docs, CI config, and existing scripts.
- **Context-aware design.** The script checks the _exact_ env vars the server's Zod schema requires (e.g., `JWT_SECRET` min 32 chars), not generic guesses. It checks the _exact_ Docker Compose service names from `docker-compose.yml`.
- **Single-pass creation.** The 237-line script was written in one shot and worked on the first `--quick` test.
- **Self-debugging.** The agent caught the `000000` curl bug during testing, diagnosed the root cause correctly, and fixed it without any human input.

### What Required Manual Intervention

- **Problem selection.** The human needed to provide the general task direction (solve a real problem). The agent proposed the specific problem after exploring the codebase.
- **Mode switch rejection.** The agent attempted to switch to Plan Mode, but the user kept it in Agent Mode — the agent adapted and documented the plan inline instead.

### Files Created/Modified

| File | Action |
|---|---|
| `scripts/dev-doctor.sh` | **Created** — 237-line environment validation script |
| `package.json` | **Modified** — added `doctor` and `doctor:quick` scripts |
| `AGENT_PLAN_WRITEUP.md` | **Created** — this write-up |

### Usage

```bash
# Full check (includes Docker, DB, API health)
npm run doctor

# Quick check (toolchain, env, dependencies only)
npm run doctor:quick

# Or directly
./scripts/dev-doctor.sh
./scripts/dev-doctor.sh --quick
```
