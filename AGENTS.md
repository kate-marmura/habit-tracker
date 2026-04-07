# AGENTS.md

Rules and context for AI agents working on this repository.

---

## Project Overview

Habit Tracker is a calendar-centric habit tracking SPA with AI coaching (deferred).
Three-tier architecture: React SPA → Express REST API → PostgreSQL.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Client** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack React Query, date-fns, Lucide React |
| **Server** | Node.js 22 LTS, Express 5, TypeScript, Prisma, PostgreSQL 16, Zod, JWT, bcrypt |
| **Testing** | Vitest + React Testing Library (client), Jest + Supertest (server), Playwright (E2E) |
| **Infrastructure** | Docker Compose (dev/prod/test profiles), Nginx (prod SPA proxy) |

---

## Repository Structure

```
habit-tracker/
├── client/          # React SPA (Vite + TypeScript)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       ├── contexts/
│       └── types/
├── server/          # Express API (TypeScript)
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── middleware/
│       ├── lib/
│       └── __tests__/
├── e2e/             # Playwright E2E tests
├── _bmad-output/    # PRD, architecture, epics/stories docs
└── docker-compose.yml
```

---

## Development Rules

### General

- **Read before editing.** Understand the existing code before modifying it.
- **Minimal scope.** Only change what the task requires — no unsolicited refactors, comments, or added features.
- **No speculative abstractions.** Don't create helpers or utilities for one-off operations.
- **No backwards-compat shims.** If something is unused, delete it outright.
- **TypeScript strictly.** Both client and server are TypeScript — maintain type safety throughout.

### Code Style

- Follow the existing patterns in the file you are editing.
- Shared Prettier config is at `.prettierrc` — format before committing.
- Lint with `npm run lint:client` / `npm run lint:server`.

### Security

- Never introduce command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities.
- Validate all external input at system boundaries using Zod (server) or equivalent.
- JWT secrets and DB credentials come from environment variables — never hardcode them.
- Auth-related endpoints must preserve rate limiting (`express-rate-limit`).

---

## Running the App

```bash
# Recommended: Docker dev profile (hot reload)
docker compose --profile dev up --build

# Health check
curl http://localhost:3001/api/health
```

| Profile | Client | Server |
|---|---|---|
| `dev` | `http://localhost:5173` (Vite) | `http://localhost:3001` (hot reload) |
| `prod` | `http://localhost:80` (Nginx) | `http://localhost:3001` (compiled) |
| `test` | — | Isolated DB on `localhost:5433` |

---

## Testing Rules

- **Tests are first-class.** Always include or update tests when changing behaviour.
- **E2E coverage matters.** Playwright covers the core MVP journeys — keep them passing.
- **No mocking the database** in integration or E2E tests — always use the real test DB.
- Run E2E tests: `npm run test:e2e`
- Client unit tests: `cd client && npm test`
- Server unit/integration tests: `cd server && npm test`

---

## Architecture Decisions (Do Not Reverse Without Discussion)

- **Stateless JWT auth** — no server-side sessions.
- **Prisma as the only DB access layer** — do not write raw SQL queries outside of Prisma.
- **AI coaching is deferred (Epic 6)** — the provider abstraction layer exists in the architecture but is not implemented yet. Do not wire it up unless explicitly asked.
- **Client-side rendering only** — no SSR, no service workers.
- **Monorepo, single backend** — no microservices split.

---

## Project-Specific Rules

These rules go beyond general style — they prevent real bugs and inconsistencies found in this codebase.

---

### Rule 1 — Use CalendarDate strings, never raw `Date` objects for habit dates

All habit and entry dates are stored and passed as `YYYY-MM-DD` strings using the project's `CalendarDate` type (see `server/src/lib/calendar-date.ts`). Using JS `Date` objects introduces timezone shift bugs (e.g. a date entered at 11pm UTC-5 becomes the next day in UTC).

```ts
// Before — timezone-unsafe
const today = new Date().toISOString().split('T')[0];

// After — use the project's calendar-date utilities
import { toCalendarDateString } from '../lib/calendar-date';
const today = toCalendarDateString(new Date());
```

---

### Rule 2 — Always include `userId` in Prisma queries

Every habit/entry query must be scoped to the authenticated user. Omitting `userId` from a `where` clause is a data isolation bug — one user can read or mutate another user's data.

```ts
// Before — missing user scope (security bug)
const habit = await prisma.habit.findUnique({ where: { id } });

// After — always scope by userId
const habit = await prisma.habit.findUnique({ where: { id, userId } });
```

---

### Rule 3 — Import `config`, never read `process.env` directly on the server

The server validates all environment variables at startup via `server/src/config.ts`. Reading `process.env` directly bypasses this validation and can produce confusing runtime crashes rather than a clear startup error.

```ts
// Before — bypasses startup validation
const secret = process.env.JWT_SECRET;

// After — always use the validated config module
import { config } from '../config.js';
const secret = config.JWT_SECRET;
```

---

### Rule 4 — Invalidate TanStack Query cache after every mutation

After any mutation (create, update, delete, archive, toggle entry), call `queryClient.invalidateQueries(...)` with the relevant query key. Omitting this leaves the UI silently showing stale data.

```ts
// Before — UI doesn't reflect the change
onSuccess: () => {
  onClose();
}

// After — invalidate so the list re-fetches
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
  onClose();
}
```

---

### Rule 5 — Export Zod schemas from route files

Zod schemas defined in route files must be exported (e.g. `export const createHabitSchema = ...`). Server integration tests import these schemas to build valid request payloads, keeping test data in sync with validation logic.

```ts
// Before — unexported, can't be reused in tests
const schema = z.object({ name: z.string() });

// After — exported for test reuse
export const createHabitSchema = z.object({ name: z.string() });
```

---

### Rule 6 — Never mock the database — always use the test Docker DB

Do not use `jest.mock('../lib/prisma')`, in-memory SQLite substitutes, or any other DB fake in server tests. All server tests run against the real test-profile PostgreSQL instance (`localhost:5433`). Mock/prod divergence has caused migrations to fail silently in the past.

```ts
// Before — mocking hides real query/migration issues
jest.mock('../lib/prisma', () => ({ habit: { findMany: jest.fn() } }));

// After — use the real test DB (docker compose --profile test up)
// No mock — import prisma normally and let it hit localhost:5433
```

---

### Rule 7 — API errors must use `{ error: string }` shape

All Express error responses must use `res.status(4xx/5xx).json({ error: '...' })`. Never use `{ message }`, `{ detail }`, or a plain string body. The client's service layer pattern-matches on `error` — inconsistent shapes cause silent failures.

```ts
// Before — wrong key, client won't surface this error
res.status(400).json({ message: 'Invalid input' });

// After — consistent shape the client expects
res.status(400).json({ error: 'Invalid input' });
```

---

### Rule 8 — Test file placement: colocate on client, `__tests__/` on server

- **Client:** `ComponentName.test.tsx` lives in the same directory as `ComponentName.tsx`. Never create a `__tests__/` folder under `client/src/`.
- **Server:** all test files go in `server/src/__tests__/`. Never colocate test files next to source files on the server.

```
// Before (wrong on client)
client/src/components/__tests__/ConfirmModal.test.tsx

// After (correct on client)
client/src/components/ConfirmModal.test.tsx

// Before (wrong on server)
server/src/routes/habit.routes.test.ts

// After (correct on server)
server/src/__tests__/habit.routes.test.ts
```

---

## Key Docs

| Document | Location |
|---|---|
| PRD | `_bmad-output/prd.md` |
| Architecture | `_bmad-output/architecture.md` |
| Epics & Stories | `_bmad-output/epics-and-stories.md` |
| AI Integration Notes | `AI_INTEGRATION_DOCUMENTATION.md` |
