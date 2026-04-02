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

## Key Docs

| Document | Location |
|---|---|
| PRD | `_bmad-output/prd.md` |
| Architecture | `_bmad-output/architecture.md` |
| Epics & Stories | `_bmad-output/epics-and-stories.md` |
| AI Integration Notes | `AI_INTEGRATION_DOCUMENTATION.md` |
