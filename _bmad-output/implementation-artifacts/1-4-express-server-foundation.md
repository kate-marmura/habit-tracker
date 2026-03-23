# Story 1.4: Express Server Foundation

Status: ready-for-dev

## Story

As a developer,
I want the Express server configured with middleware, error handling, and health check,
so that API routes can be added incrementally.

## Acceptance Criteria

1. `app.ts` configures Express with JSON body parsing, CORS, and security headers
2. Environment config validated with zod (`config.ts`)
3. Global error handler middleware returns consistent error format: `{ error: { code, message } }`
4. `GET /api/health` returns 200 with `{ status: "ok", db: "connected" }` (includes database connectivity check)
5. Server starts on configurable port (default 3001)
6. Request logging configured for development

## Tasks / Subtasks

- [ ] Task 1: Install new dependencies (AC: #1, #2, #6)
  - [ ] `npm install helmet cors morgan zod`
  - [ ] `npm install -D @types/cors @types/morgan`
  - [ ] Do NOT install `@types/helmet` (helmet ships its own types)

- [ ] Task 2: Create environment config with zod — `server/src/config.ts` (AC: #2, #5)
  - [ ] Define zod schema validating all required env vars:
    - `DATABASE_URL` — string, required
    - `PORT` — coerce to number, default 3001
    - `NODE_ENV` — enum `['development', 'production', 'test']`, default `'development'`
    - `JWT_SECRET` — string, required (minimum 32 chars for security)
    - `JWT_EXPIRY` — string, default `'7d'`
    - `CLIENT_URL` — string, default `'http://localhost:5173'`
  - [ ] Parse `process.env` through the zod schema at import time
  - [ ] Export typed `config` object
  - [ ] If validation fails, log clear error message and exit process (do NOT silently use defaults for required vars)

- [ ] Task 3: Create global error handler — `server/src/middleware/error-handler.ts` (AC: #3)
  - [ ] Create `server/src/middleware/` directory
  - [ ] Define `AppError` class extending `Error`:
    - Properties: `statusCode` (number), `code` (string), `message` (string)
    - Constructor: `new AppError(statusCode, code, message)`
  - [ ] Export error handler middleware function signature: `(err, req, res, next)`
  - [ ] Handle `AppError` instances: return `{ error: { code, message } }` with correct status code
  - [ ] Handle Prisma known errors (e.g., unique constraint → 409, record not found → 404)
  - [ ] Handle zod validation errors: return 422 with `{ error: { code: 'VALIDATION_ERROR', message } }`
  - [ ] Handle unknown errors: return 500 with `{ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }`
  - [ ] Log the full error stack in development, sanitized message in production
  - [ ] IMPORTANT: Express 5 handles async errors natively — thrown/rejected errors in async route handlers are automatically forwarded to error middleware. No need for `express-async-errors` wrapper.

- [ ] Task 4: Create `server/src/app.ts` — Express app setup (AC: #1, #3, #4, #6)
  - [ ] Import and configure middleware in this order:
    1. `helmet()` — security headers (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
    2. `cors({ origin: config.CLIENT_URL, credentials: true })` — CORS for frontend origin
    3. `express.json({ limit: '1mb' })` — JSON body parsing with size limit
    4. `morgan('dev')` — request logging (conditional: only in development)
  - [ ] Mount health check route: `GET /api/health` (see Task 5)
  - [ ] Mount placeholder for future API routes: `app.use('/api', ...)` (stub comment)
  - [ ] Mount global error handler as LAST middleware
  - [ ] Export the configured `app` (do NOT call `app.listen()` here)

- [ ] Task 5: Refactor health endpoint to use Prisma (AC: #4)
  - [ ] Move health route to `app.ts` (no longer in `index.ts`)
  - [ ] Replace raw `pg` connectivity check with Prisma query: `await prisma.$queryRaw\`SELECT 1\``
  - [ ] Return `{ status: "ok", db: "connected" }` on success
  - [ ] Return `{ status: "ok", db: "disconnected" }` on failure (still 200 — keeps container healthy)
  - [ ] Remove `pg` import from `index.ts` (may still be needed as Prisma adapter dependency — check before removing from package.json)

- [ ] Task 6: Refactor `server/src/index.ts` — server startup (AC: #5)
  - [ ] Import `app` from `./app.js`
  - [ ] Import `config` from `./config.js`
  - [ ] Call `app.listen(config.PORT, ...)` to start server
  - [ ] Log startup message with port number
  - [ ] Handle uncaught exceptions and unhandled promise rejections gracefully (log and exit)
  - [ ] Remove ALL existing Express setup code (moved to app.ts)
  - [ ] This file should be ~15-20 lines max

- [ ] Task 7: Create timezone middleware stub — `server/src/middleware/timezone.middleware.ts`
  - [ ] Extract `X-Timezone` header from request
  - [ ] Store timezone on `req` object (extend Express Request type or use `res.locals`)
  - [ ] Default to `'UTC'` if header is missing, log warning in development
  - [ ] This middleware will be used by date-sensitive routes in E4+

- [ ] Task 8: Verify complete setup
  - [ ] Server starts: `npm run dev` → logs "Server listening on port 3001"
  - [ ] Health check: `curl http://localhost:3001/api/health` → `{ "status": "ok", "db": "connected" }`
  - [ ] Error format: hitting an unknown route returns proper 404 or error format
  - [ ] Security headers present: `curl -I http://localhost:3001/api/health` shows helmet headers
  - [ ] CORS headers: preflight OPTIONS request returns correct `Access-Control-Allow-Origin`
  - [ ] Server builds: `npm run build` succeeds
  - [ ] ESLint passes: `npm run lint`
  - [ ] Docker build works: `docker compose build server`
  - [ ] Invalid env crashes cleanly: unset `DATABASE_URL` and verify clear error message on startup

## Dev Notes

### Critical Architecture Constraints

- **app.ts vs index.ts separation**: `app.ts` configures the Express app (middleware, routes, error handler). `index.ts` only imports app and calls `listen()`. This separation enables testing the app without starting a server. [Source: Architecture §7]
- **Service layer pattern**: Routes are thin — parse/validate with zod, delegate to service functions. Services contain business logic and call Prisma. This is the pattern for ALL future routes. [Source: Architecture §7]
- **Error format**: Always `{ error: { code, message } }`. Never raw strings, never different shapes. [Source: Architecture §5]
- **Express 5 async handling**: Express 5.x natively catches rejected promises from async route handlers. Do NOT use `express-async-errors` or manual try/catch in routes for error forwarding. Just `throw` or let promises reject.

### Dependencies to Install

| Package | Purpose | Version Notes |
|---------|---------|---------------|
| `helmet` | Security headers (HSTS, CSP, X-Frame-Options, etc.) | Ships own types |
| `cors` | CORS middleware | Needs `@types/cors` |
| `morgan` | HTTP request logging | Needs `@types/morgan` |
| `zod` | Runtime validation for env config (and future request validation) | Already specified in Architecture §2 |

### Security Headers Configuration

Helmet's defaults cover most requirements from Architecture §9. Customize these:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind may need inline styles
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));
```

Headers per Architecture §9: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.

### CORS Configuration

```typescript
app.use(cors({
  origin: config.CLIENT_URL,    // http://localhost:5173 in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
```

Do NOT use wildcard `*` origin. Use the `CLIENT_URL` env var. [Source: Architecture §9]

### Error Handler Pattern

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

Usage in future routes: `throw new AppError(409, 'HABIT_LIMIT_REACHED', 'You can have up to 10 active habits.')` — Express 5 automatically forwards to error handler.

### Zod Config Pattern

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
});

export const config = envSchema.parse(process.env);
export type Config = z.infer<typeof envSchema>;
```

### Health Endpoint Refactor

Current `index.ts` uses raw `pg.Client` for DB connectivity check. Replace with Prisma:

```typescript
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.json({ status: 'ok', db: 'disconnected' });
  }
});
```

**Important**: `pg` package is still needed as a dependency — it's used by `@prisma/adapter-pg` (the Prisma 7 PostgreSQL adapter from E1-S3). Do NOT remove `pg` from `package.json`. Just remove the direct `import pg from 'pg'` from `index.ts`.

### Existing Codebase State (from E1-S1 through E1-S3)

**Server files:**
- `server/src/index.ts` — Express app + health endpoint + raw pg check (WILL BE REFACTORED into app.ts + index.ts)
- `server/src/lib/prisma.ts` — Prisma client singleton using `@prisma/adapter-pg` + `PrismaPg`
- `server/src/generated/prisma/` — Generated Prisma client (Prisma 7.5.0)
- `server/prisma/schema.prisma` — 4 models: User, Habit, DayEntry, PasswordResetToken

**Package versions:**
- Express 5.2.1, pg 8.20.0, @prisma/client 7.5.0, @prisma/adapter-pg 7.5.0
- TypeScript 5.9.3, tsx 4.21.0
- ESM module (`"type": "module"`)
- tsconfig: strict, module NodeNext, outDir ./dist, rootDir ./src

**Docker:**
- `docker-compose.yml` with db, server, client, dev/test profiles
- Server Dockerfile includes Prisma generate step
- `.env` with DATABASE_URL, JWT_SECRET, PORT, CLIENT_URL

### Target File Structure After This Story

```
server/src/
├── index.ts                    # Server startup only (~15 lines)
├── app.ts                      # Express app config + middleware + routes
├── config.ts                   # Zod-validated environment config
├── middleware/
│   ├── error-handler.ts        # AppError class + global error handler
│   └── timezone.middleware.ts  # X-Timezone header extraction
├── lib/
│   └── prisma.ts               # Prisma client singleton (existing)
└── generated/prisma/           # Generated Prisma client (existing)
```

### What This Story Does NOT Include

- No auth middleware or JWT verification (E2)
- No rate limiting middleware (E2)
- No API routes for habits, entries, or stats (E2+, E3+, E4+, E5+)
- No service layer files (created per-feature in future stories)
- No CI pipeline (E1-S5)
- No test setup (E1-S6)

### References

- [Source: Architecture §5 — API Design (error response format `{ error: { code, message } }`)]
- [Source: Architecture §7 — Backend Architecture (project structure, app.ts, config.ts, middleware/, service layer pattern)]
- [Source: Architecture §9 — Security Architecture (security headers, CORS, HSTS, CSP)]
- [Source: Architecture §4 — Data Model (timezone strategy — X-Timezone header)]
- [Source: Epics — E1-S4 acceptance criteria]
- [Source: Previous Story 1-3 — Prisma singleton, generated client location, adapter-pg pattern]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
