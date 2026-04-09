# Agent-First Problem Solving — Deliverable

**Date:** April 9, 2026
**Activity:** Use an AI agent in Plan Mode to solve a real problem from current work.
**Tool:** Cursor IDE with Claude agent (Agent Mode — Plan Mode switch was attempted but rejected; planning was performed inline instead)

---

## 1. Working Solution

### The Problem

The habit-tracker project is a three-tier monorepo (React SPA, Express API, PostgreSQL) with Docker Compose orchestration, 52+ test files, and a GitHub Actions CI pipeline. Despite all that infrastructure, there was **no automated way for a developer to validate their local environment** — after cloning the repo, pulling new changes, or debugging a broken setup, every prerequisite had to be checked manually: Node version, Docker, `.env` variables, installed dependencies, database connectivity, service health, and more.

### What Was Built

**`scripts/dev-doctor.sh`** — a 237-line Bash diagnostic script that performs 15+ environment checks across 6 categories, with colored PASS/FAIL/WARN/SKIP output and actionable fix hints for every issue detected.

| Category | What It Checks |
|---|---|
| **Toolchain** | Node.js ≥ v22, npm, Docker, Docker Compose |
| **Environment** | `.env` exists, `DATABASE_URL` set, `JWT_SECRET` set and ≥ 32 characters (mirrors the server's Zod validation) |
| **Dependencies** | `node_modules` present in root/, client/, server/; Prisma client generated |
| **Docker Runtime** | Docker daemon running; dev-profile services (db, server-dev, client-dev) status |
| **Database** | PostgreSQL reachable (via `pg_isready` locally or in container); Prisma migrations up to date |
| **API Health** | `GET /api/health` returns 200; client dev server on :5173 reachable |

Two npm scripts were added to `package.json` for convenience:

```bash
npm run doctor        # Full check (includes Docker, DB, API health)
npm run doctor:quick  # Fast check (toolchain, env, dependencies only — skips network)
```

Sample output (quick mode, services not running):

```
🩺 Habit Tracker Dev Doctor
   Root: /Users/katemarmura/habit-tracker

── Toolchain ──
  ✔ PASS  Node.js v22.15.1 (≥ 22 required)
  ✔ PASS  npm 10.9.2
  ✔ PASS  Docker 28.0.1
  ✔ PASS  Docker Compose 2.33.1-desktop.1

── Environment ──
  ✔ PASS  .env file exists
  ✔ PASS  DATABASE_URL is set
  ✔ PASS  JWT_SECRET is set

── Dependencies ──
  ✔ PASS  root/node_modules installed
  ✔ PASS  client/node_modules installed
  ✔ PASS  server/node_modules installed
  ⚠ WARN  Prisma client not generated
         ↳ Run: cd server && npx prisma generate

── Docker Runtime ──
  ⊘ SKIP  Docker runtime checks (--quick mode)

── Database ──
  ⊘ SKIP  Database checks (--quick mode)

── API Health ──
  ⊘ SKIP  API health check (--quick mode)

── Summary ──
  All critical checks passed, 1 warning(s)
```

### Files Created / Modified

| File | Change |
|---|---|
| `scripts/dev-doctor.sh` | **Created** — the diagnostic script (237 lines) |
| `package.json` | **Modified** — added `doctor` and `doctor:quick` scripts |

---

## 2. Agent's Plan and Execution Process

### Planning Phase

I gave the agent a broad directive: "solve a real problem from the current project." The agent then autonomously:

1. **Explored the codebase** — launched a sub-agent to map the full project: Docker services, npm scripts, test suites, CI pipeline, server routes/middleware, and any TODO/gap markers. This ran in parallel with reading key files.
2. **Read 5 context files in parallel** — `.env.example` (required env vars), `server/src/config.ts` (Zod validation schema with exact constraints like `JWT_SECRET.min(32)`), root `package.json` (existing scripts), `.github/workflows/ci.yml` (CI steps), and `docker-compose.yml` (service definitions).
3. **Identified the problem** — no dev environment validation tooling. The agent articulated why this matters (onboarding, post-pull troubleshooting) and proposed a specific solution.
4. **Designed the solution** with explicit decisions:
   - Plain Bash (no extra dependencies)
   - Colored output with PASS/FAIL/WARN/SKIP indicators
   - Non-destructive (read-only, never modifies state)
   - `--quick` flag to skip Docker/network checks
   - Exit code 0 on success, 1 on failure
   - Every failure/warning includes an actionable fix command

### Execution Phase

| Step | What Happened | Agent Autonomy |
|---|---|---|
| **1. Context gathering** | Explored project structure, read 5 files in parallel | Fully autonomous |
| **2. Script creation** | Wrote all 237 lines of `dev-doctor.sh` in a single pass | Fully autonomous |
| **3. Integration** | Added `npm run doctor` / `doctor:quick` to `package.json` | Fully autonomous |
| **4. Quick-mode test** | Ran `--quick` — passed on first attempt | Fully autonomous |
| **5. Full-mode test** | Ran full mode — found a bug (curl output concatenation) | Fully autonomous |
| **6. Bug fix** | Diagnosed root cause, applied fix, re-tested successfully | Fully autonomous |
| **7. Write-up** | Created this document | Fully autonomous |
| **8. Commit & push** | Committed all files, pushed to `origin/main` | Triggered by user request |

---

## 3. What Worked Well and What Required Manual Intervention

### What Worked Well (no manual intervention needed)

- **Problem identification.** Given only "solve a real problem," the agent explored the codebase thoroughly and found a genuine gap — not a toy problem. It cross-referenced `AGENTS.md`, CI config, Docker Compose, and existing scripts to confirm the gap was real.
- **Context-aware implementation.** The script doesn't use generic checks — it validates the *exact* env vars from the server's Zod schema (`JWT_SECRET` ≥ 32 chars), the *exact* Docker Compose service names (`db`, `server-dev`, `client-dev`), and the *exact* Node version the project requires (v22).
- **Single-pass code generation.** The entire 237-line script was written in one shot. The `--quick` mode worked correctly on the first test run.
- **Self-debugging.** During full-mode testing, the agent discovered that `curl` failures produced `000000` instead of `000` (because `|| echo "000"` inside a command substitution concatenated with curl's own `000` output). The agent diagnosed the root cause, fixed it with `|| true` outside the substitution, and verified the fix — all without human input.
- **Parallel operations.** The agent batched independent reads (5 files at once) and independent shell commands to minimise wall-clock time.

### What Required Manual Intervention

| Intervention | Detail |
|---|---|
| **Task direction** | The human provided the general directive ("solve a real problem"). The agent chose the specific problem autonomously after exploration. |
| **Mode switch decision** | The agent requested a switch to Plan Mode to design the solution before implementing. The user rejected this, so the agent adapted and performed planning inline within Agent Mode. No functional impact — the plan was still produced, just embedded in the execution flow rather than a separate phase. |
| **Commit and push** | The agent does not commit/push unless explicitly asked. The user requested this after reviewing the output. |

### Key Takeaway

The agent handled the full lifecycle — discovery, planning, implementation, testing, debugging, and documentation — with minimal human input. The only points requiring human action were the initial task prompt and the decision to commit. The self-debugging of the curl concatenation bug was particularly notable: the agent tested its own output, identified an unexpected result, traced it to a Bash command-substitution issue, and applied a correct fix in one iteration.
